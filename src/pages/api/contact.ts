import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage, Mailbox } from 'mimetext/browser';

export const prerender = false;

const ALLOWED_ORIGINS = [
  'https://vtes.cl',
  'https://www.vtes.cl',
  'http://localhost:4321',
  'http://localhost:8787',
];

const FROM_ADDRESS = 'contacto@vtes.cl';
const FROM_NAME = 'VTES Chile - Contacto';
const TO_ADDRESS = 'amicinoctis.chile@gmail.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEMAS_VALIDOS = new Set([
  'Aprender a jugar',
  'Publicar un evento, blog o deck',
  'Consultar sobre evento',
  'Borrar información',
  'Consulta general',
]);

type ContactBody = {
  nombre?: unknown;
  correo?: unknown;
  tema?: unknown;
  mensaje?: unknown;
  website?: unknown;
  _ts?: unknown;
  turnstileToken?: unknown;
};

type FieldErrors = Partial<Record<'nombre' | 'correo' | 'tema' | 'mensaje', string>>;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(
  status: number,
  payload: Record<string, unknown>,
  origin: string | null,
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

export const OPTIONS: APIRoute = ({ request }) =>
  new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const origin = request.headers.get('origin');

  try {
    // 1. CORS / Origin allowlist
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      return json(403, { ok: false, error: 'Origen no autorizado.' }, origin);
    }

    // 2. Bindings disponibles
    if (!env.SEND_EMAIL || !env.RATE_LIMITER) {
      console.error('contact: missing bindings', {
        hasSendEmail: Boolean(env.SEND_EMAIL),
        hasRateLimiter: Boolean(env.RATE_LIMITER),
      });
      return json(
        500,
        { ok: false, error: 'El servicio de contacto no está configurado.' },
        origin,
      );
    }

    // 3. Rate limit por IP
    const ip =
      request.headers.get('cf-connecting-ip') ??
      (() => {
        try {
          return clientAddress;
        } catch {
          return 'unknown';
        }
      })() ??
      'unknown';

    const { success: underLimit } = await env.RATE_LIMITER.limit({ key: ip });
    if (!underLimit) {
      return json(
        429,
        { ok: false, error: 'Demasiadas solicitudes. Intenta de nuevo en un minuto.' },
        origin,
      );
    }

    // 4. Parse payload
    let body: ContactBody;
    try {
      body = (await request.json()) as ContactBody;
    } catch {
      return json(400, { ok: false, error: 'Payload inválido.' }, origin);
    }

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
    const correo = typeof body.correo === 'string' ? body.correo.trim() : '';
    const tema = typeof body.tema === 'string' ? body.tema.trim() : '';
    const mensaje = typeof body.mensaje === 'string' ? body.mensaje.trim() : '';
    const website = typeof body.website === 'string' ? body.website : '';
    const ts = typeof body._ts === 'number' ? body._ts : 0;
    const turnstileToken =
      typeof body.turnstileToken === 'string' ? body.turnstileToken : '';

    // 5. Honeypot
    if (website) {
      return json(200, { ok: true }, origin);
    }

    // 6. Timestamp mínimo (3s)
    if (!ts || Date.now() - ts < 3000) {
      return json(
        400,
        { ok: false, error: 'Envío demasiado rápido. Espera unos segundos e intenta de nuevo.' },
        origin,
      );
    }

    // 7. Validación de campos
    const fieldErrors: FieldErrors = {};
    if (!nombre) fieldErrors.nombre = 'El nombre es obligatorio.';
    else if (nombre.length < 3)
      fieldErrors.nombre = 'El nombre debe tener al menos 3 caracteres.';

    if (!correo) fieldErrors.correo = 'El correo electrónico es obligatorio.';
    else if (correo.length < 3)
      fieldErrors.correo = 'El correo debe tener al menos 3 caracteres.';
    else if (!EMAIL_RE.test(correo))
      fieldErrors.correo = 'El formato del correo electrónico no es válido.';

    if (!tema) fieldErrors.tema = 'Debes seleccionar un tema.';
    else if (!TEMAS_VALIDOS.has(tema)) fieldErrors.tema = 'Tema no válido.';

    if (!mensaje) fieldErrors.mensaje = 'El mensaje es obligatorio.';
    else if (mensaje.length < 3)
      fieldErrors.mensaje = 'El mensaje debe tener al menos 3 caracteres.';

    if (Object.keys(fieldErrors).length > 0) {
      return json(400, { ok: false, fieldErrors }, origin);
    }

    // 8. Verificar Turnstile
    if (!turnstileToken) {
      return json(
        400,
        { ok: false, error: 'Completa la verificación de seguridad.' },
        origin,
      );
    }

    const tsParams = new URLSearchParams();
    tsParams.set('secret', env.TURNSTILE_SECRET_KEY);
    tsParams.set('response', turnstileToken);
    tsParams.set('remoteip', ip);

    let turnstileOk = false;
    try {
      const tsRes = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        { method: 'POST', body: tsParams },
      );
      const tsData = (await tsRes.json()) as { success?: boolean };
      turnstileOk = tsData.success === true;
    } catch (err) {
      console.error('contact: turnstile siteverify failed', err);
      turnstileOk = false;
    }

    if (!turnstileOk) {
      return json(
        400,
        { ok: false, error: 'Verificación de seguridad falló. Intenta de nuevo.' },
        origin,
      );
    }

    // 9. Construir MIME
    const msg = createMimeMessage();
    msg.setSender({ name: FROM_NAME, addr: FROM_ADDRESS });
    msg.setRecipient(TO_ADDRESS);
    msg.setHeader(
      'Reply-To',
      new Mailbox({ addr: correo, name: nombre }, { type: 'Reply-To' }),
    );
    msg.setSubject(`[VTES Chile] ${tema}`);
    msg.addMessage({
      contentType: 'text/plain; charset=utf-8',
      data: [
        `De: ${nombre} <${correo}>`,
        `Tema: ${tema}`,
        '',
        mensaje,
      ].join('\r\n'),
    });

    // 10. Enviar
    try {
      const emailMessage = new EmailMessage(FROM_ADDRESS, TO_ADDRESS, msg.asRaw());
      await env.SEND_EMAIL.send(emailMessage);
    } catch (err) {
      console.error('contact: SEND_EMAIL failed', err);
      const detail = err instanceof Error ? err.message : String(err);
      return json(
        502,
        { ok: false, error: `No se pudo enviar el mensaje: ${detail}` },
        origin,
      );
    }

    return json(200, { ok: true }, origin);
  } catch (err) {
    console.error('contact: unhandled error', err);
    const name = err instanceof Error ? err.name : 'Error';
    return json(
      500,
      {
        ok: false,
        error: `Error inesperado en el servidor (${name}). Intenta de nuevo más tarde.`,
      },
      origin,
    );
  }
};
