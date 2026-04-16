# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Astro 6** — framework web, SSR en Cloudflare Workers via `@astrojs/cloudflare@13`
- **Tailwind CSS v4** — sin `tailwind.config.js`; tema definido en `src/styles/global.css` con `@theme {}`
- **TypeScript strict** — extiende `astro/tsconfigs/strict` con `noUncheckedIndexedAccess` y `noImplicitOverride`
- **Cloudflare Workers** — deploy target con `nodejs_compat` habilitado en `wrangler.toml`
- **Node 22+**

## Commands

```bash
npm run dev          # servidor de desarrollo local (http://localhost:4321)
npm run build        # build de producción → dist/
npm run preview      # preview del build con el adapter de Cloudflare
npm run type-check   # verificación de tipos con astro check
npx astro sync       # regenera .astro/types.d.ts (correr tras cambios en content.config.ts)
npm run cf:dev       # preview local en runtime de Cloudflare Workers (requiere build previo)
npm run cf:deploy    # deploy a Cloudflare Workers
```

## Project Structure

```
src/
├── assets/             # imágenes optimizadas por <Image> (e.g. DarkPack_Logo2.png, footer-image.jpg)
├── content.config.ts   # esquemas Zod de todas las Content Collections
├── env.d.ts            # referencias a tipos de Astro y @astrojs/cloudflare
├── middleware.ts       # CSP nonce + security headers, se ejecuta en cada request
├── types.d.ts          # App.Locals — expone cspNonce tipado al resto de la app
├── components/
│   ├── global/
│   │   ├── Header.astro    # navegación sticky con logo y toggle mobile
│   │   └── Footer.astro    # footer con navegación, branding y disclaimer legal
│   ├── ui/
│   │   └── Button.astro    # botón reutilizable (primary/outline, sm/md/lg, <a> o <button>)
│   └── HeroSection.astro   # sección hero de la homepage
├── content/
│   ├── blog/           # artículos de la comunidad (.md/.mdx)
│   ├── decks/          # decks de referencia (.md/.mdx)
│   ├── events/         # eventos (.md/.mdx)
│   ├── leagues/        # ligas recurrentes (.md/.mdx)
│   ├── sites/          # perfiles RRSS y comunidades (.md/.mdx)
│   └── stores/         # tiendas donde se juega (.md/.mdx)
├── layouts/
│   └── BaseLayout.astro  # layout principal: importa Header/Footer, OG tags, Fonts API, CSP nonce
├── pages/              # enrutado basado en archivos (Astro file-based routing)
└── styles/
    └── global.css      # @import "tailwindcss" + paleta blood/night/marfil/gold con @theme {}
```

## Code Conventions

1. **ES modules**: el proyecto usa `"type": "module"`. Todos los imports son ESM; prohibido `require()`.

2. **Componentes Astro para contenido estático**: usar `.astro` para cualquier UI sin estado del cliente. Los componentes `.astro` se renderizan únicamente en el servidor.

3. **Islas React solo con interactividad**: si un componente necesita estado del cliente, eventos del DOM o hooks, crearlo en `src/components/` como `.tsx` y montarlo con directiva de cliente (`client:load` / `client:visible` / `client:idle`). No instalar React para componentes puramente estáticos.

4. **Content Collections con Zod 4**: los esquemas van en `src/content.config.ts`. Importar `z` desde `'astro/zod'`; `defineCollection` desde `'astro:content'`; `glob` desde `'astro/loaders'`:

   ```ts
   import { defineCollection } from 'astro:content';
   import { z } from 'astro/zod';
   import { glob } from 'astro/loaders';
   ```

5. **Imágenes de contenido**: el campo `img` de cualquier colección almacena solo el nombre de archivo (ej: `"mi-imagen.jpg"`). Las imágenes van en `public/images/{colección}/` (ej: `public/images/events/grand-prix.jpg`). Para referenciarlas en templates: `src={`/images/events/${entry.data.img}`}`.

6. **Fechas en frontmatter**: usar siempre formato ISO 8601.
   - `pubDate`/`updatedDate` en `blog` y `decks`: `"2026-03-29T00:00:00Z"` (`z.iso.datetime()`)
   - `date` en `events`: `"2026-04-26"` (`z.iso.date()`, sin hora)
   - `hour` en `leagues`: `"19:30"` (`z.iso.time()`, formato HH:MM)

## Environment Variables (Cloudflare Workers)

Para acceder a variables de entorno en páginas SSR, usar el módulo de Cloudflare directamente:

```ts
import { env } from 'cloudflare:workers';

const myVar = (env as Record<string, string | undefined>).MY_VAR ?? '';
```

> **No usar** `Astro.locals.runtime.env` — fue removido en Astro v6.

Las variables de entorno se configuran en el dashboard de Cloudflare Workers (Workers & Pages → vtes-chile → Settings → Variables). Para desarrollo local se pueden definir en `.dev.vars` (ignorado por git).

Variables requeridas actualmente:

| Variable | Uso |
|---|---|
| `TURNSTILE_SITE_KEY` | Site key pública del widget Turnstile (se inyecta en el HTML del form de `/contact`) |
| `TURNSTILE_SECRET_KEY` | Secret key usada server-side para verificar el token Turnstile vía `siteverify` |

Los tipos de los bindings de Cloudflare (`SEND_EMAIL`, `RATE_LIMITER`) y de estas variables están declarados en `src/env.d.ts` via `declare module 'cloudflare:workers'`, por lo que `env.*` queda tipado sin casts.

## Architecture

### Request Flow

```
Request → Cloudflare Workers → Astro SSR → middleware.ts → page → BaseLayout.astro
```

El middleware (`src/middleware.ts`) se ejecuta en cada request y:
1. Genera un nonce criptográfico por request via `crypto.getRandomValues`
2. Lo expone como `Astro.locals.cspNonce` (tipado en `src/types.d.ts` via `App.Locals`)
3. Inyecta los headers de seguridad en la response: CSP con nonce, HSTS, X-Frame-Options, etc.

Los layouts consumen `Astro.locals.cspNonce` para exponerlo via `<meta name="csp-nonce">`. Si se añaden scripts inline en un componente, deben incluir `nonce={Astro.locals.cspNonce}`.

La CSP permite `https://challenges.cloudflare.com` en `script-src`, `connect-src` y `frame-src` para que el widget de Turnstile cargue y se verifique desde el cliente. Los fetch a APIs externas desde el servidor (p. ej. `siteverify` en `/api/contact`, `send_email` binding) no requieren cambios en `connect-src` ya que ocurren server-side.

### Content Layer API (Astro 6)

`src/content.config.ts` (nota: en Astro 6 el archivo está en `src/`, no en `src/content/`) define seis colecciones con `glob()` loader. Cada colección carga desde su propio subdirectorio:

| Colección | Directorio              | Campos clave                                                   |
|-----------|-------------------------|----------------------------------------------------------------|
| `blog`    | `src/content/blog/`     | `title`, `pubDate` (datetime), `draft` (filtrable), `tags`     |
| `events`  | `src/content/events/`   | `date` (ISO date), `city`, `format`, `entryFee`, `rounds`      |
| `leagues` | `src/content/leagues/`  | `hour` (HH:MM), `day`, `month`, `year`, `format`, `entryFee`   |
| `stores`  | `src/content/stores/`   | `name`, `location`, `city`, `url`, `instagram`, `whatsapp`     |
| `sites`   | `src/content/sites/`    | `name`, `platform` (enum 9 valores), `url`, `active`, `img`   |
| `decks`   | `src/content/decks/`    | `clan[]`, `discipline[]`, `format` (standard\|v5), `pubDate`   |

Para consultar contenido: `getCollection('blog', ({ data }) => !data.draft)`.

### Tailwind CSS v4

No hay `tailwind.config.js`. La configuración completa está en `src/styles/global.css` usando `@theme {}`. El plugin se registra en `astro.config.ts` vía `@tailwindcss/vite`.

Paleta de colores personalizada disponible como clases de Tailwind:
- `blood-{50..950}` — rojos oscuros (acción, énfasis, hover de enlaces)
- `night-{50..950}` — grises azulados (fondos, bordes)
- `marfil-{50..950}` — tonos cálidos marfil (texto principal, reemplaza `night-*` para textos)
- `gold-{50..950}` — dorado (precios, hover de navegación)
- `ember-{50..950}` — naranjas cálidos
- `success-{50..950}` — verdes (estados positivos)

Fuentes: `font-serif` → `var(--font-cinzel)`, `font-sans` → `var(--font-inter)`. Las variables CSS son generadas por la Fonts API de Astro 6 (configurada en `astro.config.ts` bajo `fonts[]`). Las fuentes se descargan en build time y se sirven desde `'self'` sin depender de Google CDN en runtime.

### Cloudflare Adapter

`output: 'server'` — todas las páginas son SSR por defecto. Para prerender rutas estáticas usar `export const prerender = true` en la página.

El `wrangler.toml` declara bindings explícitos para `/contact` (ver abajo). El adapter genera automáticamente `dist/server/wrangler.json` durante el build con la configuración completa del Worker (entry point, assets, bindings).

El `wrangler.toml` usa `compatibility_flags = ["nodejs_compat"]` que es necesario para que Astro funcione en el Workers runtime.

Bindings declarados en `wrangler.toml`:
- `SEND_EMAIL` (`[[send_email]]`) — Email Routing binding; restringido a enviar únicamente a `amicinoctis.chile@gmail.com`.
- `RATE_LIMITER` (`[[unsafe.bindings]]` type `ratelimit`) — 5 requests / 60s por clave (IP); consumido en `src/pages/api/contact.ts`.

Bindings configurados automáticamente por el adapter (mensajes al iniciar el build):
- `IMAGES` — Cloudflare Images (imagen processing)
- `SESSION` — KV binding para sesiones

### CI/CD (GitHub Actions)

El workflow `.github/workflows/deploy.yml` ejecuta el pipeline de deploy:

- **Push a `main`**: `npm ci` → `build` → `wrangler deploy` (producción)
- **Pull Request a `main`**: mismo pipeline (verificación de build)

> **Nota:** `type-check` (`astro check`) está excluido del CI porque `@astrojs/check` no soporta TypeScript 6 aún. Correr localmente con `npm run type-check` (instala la dependencia interactivamente).

Secrets requeridos en GitHub (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN` (con permisos "Edit Cloudflare Workers")

### Páginas del sitio

| Ruta | Archivo | Notas |
|---|---|---|
| `/` | `pages/index.astro` | Homepage con secciones de todas las colecciones |
| `/events` | `pages/events/index.astro` | Listado con filtros y paginación |
| `/events/[slug]` | `pages/events/[slug].astro` | Detalle; CTA condicional futuro/pasado |
| `/leagues` | `pages/leagues/index.astro` | Listado con filtros mes/año/formato |
| `/leagues/[slug]` | `pages/leagues/[slug].astro` | Detalle |
| `/stores` | `pages/stores/index.astro` | Listado con filtro por ciudad |
| `/sites` | `pages/sites/index.astro` | Grid activos + sección inactivos |
| `/blog` | `pages/blog/index.astro` | Listado con chip-filters de tags |
| `/blog/[slug]` | `pages/blog/[slug].astro` | Detalle con prose |
| `/decks` | `pages/decks/index.astro` | Listado con 4 filtros |
| `/decks/[slug]` | `pages/decks/[slug].astro` | Detalle con CTA externo |
| `/contact` | `pages/contact.astro` | Form + widget Turnstile; envía por `fetch` a `/api/contact` |
| `/api/contact` | `pages/api/contact.ts` | Endpoint POST-only: CORS, rate limit, Turnstile, MIME + `send_email` |

#### Patrón formulario de contacto (`/contact`)

Flujo:
- `contact.astro` renderiza el form (HTML puro) con widget Turnstile (`managed`, dark theme), honeypot (`website`) y timestamp (`_ts`). Un `<script is:inline nonce>` intercepta el submit, arma JSON y hace `fetch('/api/contact')` mostrando éxito/error sin recargar.
- `api/contact.ts` (POST-only) valida en orden: Origin en allowlist (`https://vtes.cl`, `www.vtes.cl`, `localhost:4321/8787`) → rate limit por `cf-connecting-ip` (5/60s) → honeypot (éxito silencioso si hay valor) → timestamp ≥3s → validación de campos → verificación del token Turnstile contra `challenges.cloudflare.com/turnstile/v0/siteverify` → construcción MIME con `mimetext` (From `contacto@vtes.cl`, Reply-To `{nombre} <{correo}>`) → envío vía `env.SEND_EMAIL.send(new EmailMessage(...))`. Responde JSON `{ ok, error?, fieldErrors? }`.
- El endpoint también responde a `OPTIONS` para preflight CORS.
- Requiere correr en runtime real de Workers para probar `send_email` (`npm run build && npm run cf:dev`); `astro dev` no expone el binding.

### Path Alias

`@/*` → `./src/*` (configurado en `tsconfig.json`). Usar `@/components/Foo.astro` en lugar de rutas relativas.

### TypeScript

Extiende `astro/tsconfigs/strict` con `noUncheckedIndexedAccess: true` y `noImplicitOverride: true`. El tipado de `App.Locals` está en `src/types.d.ts`.
