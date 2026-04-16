import { defineMiddleware } from 'astro:middleware';

/**
 * Genera un nonce criptográfico para CSP.
 * Se usa para permitir scripts inline de Astro en lugar de 'unsafe-inline'.
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const nonce = generateNonce();

  // Exponer el nonce al resto de la app (layouts, componentes)
  context.locals.cspNonce = nonce;

  const response = await next();

  // Clonar la respuesta para obtener un objeto Headers mutable.
  // next() puede devolver una respuesta con headers inmutables en Vite/Workers.
  const mutableResponse = new Response(response.body, response);

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');

  mutableResponse.headers.set('Content-Security-Policy', csp);
  mutableResponse.headers.set('X-Content-Type-Options', 'nosniff');
  mutableResponse.headers.set('X-Frame-Options', 'DENY');
  mutableResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  mutableResponse.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  mutableResponse.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains'
  );

  return mutableResponse;
});
