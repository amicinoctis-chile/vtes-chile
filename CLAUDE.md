# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

- **Astro 6** — framework web, SSR en Cloudflare Workers via `@astrojs/cloudflare@13`
- **Tailwind CSS v4** — sin `tailwind.config.js`; tema definido en `src/styles/global.css` con `@theme {}`
- **TypeScript strict** — extiende `astro/tsconfigs/strict` con `noUncheckedIndexedAccess` y `noImplicitOverride`
- **Cloudflare Pages** — deploy target con `nodejs_compat` habilitado en `wrangler.toml`
- **Node 22+**

## Commands

```bash
npm run dev          # servidor de desarrollo local (http://localhost:4321)
npm run build        # build de producción → dist/
npm run preview      # preview del build con el adapter de Cloudflare
npm run type-check   # verificación de tipos con astro check
npx astro sync       # regenera .astro/types.d.ts (correr tras cambios en content.config.ts)
npm run cf:dev       # preview en runtime de Cloudflare Workers (requiere build previo)
npm run cf:deploy    # deploy a Cloudflare Pages
```

## Project Structure

```
src/
├── assets/             # imágenes optimizadas por <Image> (e.g. DarkPack_Logo2.png)
├── content.config.ts   # esquemas Zod de todas las Content Collections
├── env.d.ts            # referencias a tipos de Astro y @astrojs/cloudflare
├── middleware.ts       # CSP nonce + security headers, se ejecuta en cada request
├── types.d.ts          # App.Locals — expone cspNonce tipado al resto de la app
├── content/
│   ├── blog/           # artículos de la comunidad (.md/.mdx)
│   ├── decks/          # decks de referencia (.md/.mdx)
│   ├── events/         # eventos (.md/.mdx)
│   ├── leagues/        # ligas recurrentes (.md/.mdx)
│   ├── sites/          # perfiles RRSS y comunidades (.md/.mdx)
│   └── stores/         # tiendas donde se juega (.md/.mdx)
├── layouts/
│   └── BaseLayout.astro  # layout principal: nav, footer, OG tags, Fonts API, CSP nonce
├── pages/              # enrutado basado en archivos (Astro file-based routing)
└── styles/
    └── global.css      # @import "tailwindcss" + paleta blood/night/gold con @theme {}
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

Las variables de entorno se configuran en el dashboard de Cloudflare Pages (Settings → Environment variables). Para desarrollo local se pueden definir en `.dev.vars` (ignorado por git).

Variables requeridas actualmente:

| Variable | Uso |
|---|---|
| `TURNSTILE_SITE_KEY` | Clave pública del widget Cloudflare Turnstile (`/contact`) |
| `TURNSTILE_SECRET_KEY` | Clave secreta para verificación server-side de Turnstile |
| `WEB3FORMS_ACCESS_KEY` | Clave de acceso de Web3Forms para envío de correo |

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

La CSP incluye `https://challenges.cloudflare.com` en `script-src` y `frame-src` para el widget de Cloudflare Turnstile. Los fetch a APIs externas desde el servidor (Turnstile verify, Web3Forms) no requieren cambios en `connect-src` ya que ocurren server-side.

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
- `blood-{50..950}` — rojos oscuros (acción, énfasis)
- `night-{50..950}` — grises azulados (fondos, texto)
- `gold-{400,500,600}` — dorado (hover de navegación)

Fuentes: `font-serif` → `var(--font-cinzel)`, `font-sans` → `var(--font-inter)`. Las variables CSS son generadas por la Fonts API de Astro 6 (configurada en `astro.config.ts` bajo `fonts[]`). Las fuentes se descargan en build time y se sirven desde `'self'` sin depender de Google CDN en runtime.

### Cloudflare Adapter

`output: 'server'` — todas las páginas son SSR por defecto. Para prerender rutas estáticas usar `export const prerender = true` en la página.

El `wrangler.toml` usa `compatibility_flags = ["nodejs_compat"]` que es necesario para que Astro funcione en el Workers runtime.

Bindings configurados automáticamente por el adapter (mensajes al iniciar el build):
- `IMAGES` — Cloudflare Images (imagen processing)
- `SESSION` — KV binding para sesiones

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
| `/contact` | `pages/contact.astro` | Formulario POST server-side; Turnstile + Web3Forms |

#### Patrón formulario de contacto (`/contact`)

La página maneja GET y POST en el mismo archivo Astro:
- **GET**: renderiza el formulario con `TURNSTILE_SITE_KEY` inyectado server-side
- **POST**: verifica el token Turnstile contra `challenges.cloudflare.com/turnstile/v0/siteverify`, luego envía a `api.web3forms.com/submit` — ambas claves secretas nunca llegan al cliente
- El script del widget se carga con `<script is:inline src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` (permitido por la CSP)

### Path Alias

`@/*` → `./src/*` (configurado en `tsconfig.json`). Usar `@/components/Foo.astro` en lugar de rutas relativas.

### TypeScript

Extiende `astro/tsconfigs/strict` con `noUncheckedIndexedAccess: true` y `noImplicitOverride: true`. El tipado de `App.Locals` está en `src/types.d.ts`.
