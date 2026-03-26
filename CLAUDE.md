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
├── content.config.ts   # esquemas Zod de las Content Collections (blog, events, decks)
├── env.d.ts            # referencias a tipos de Astro y @astrojs/cloudflare
├── middleware.ts       # CSP nonce + security headers, se ejecuta en cada request
├── types.d.ts          # App.Locals — expone cspNonce tipado al resto de la app
├── content/
│   ├── blog/           # artículos de la comunidad (.md/.mdx)
│   ├── events/         # torneos y eventos (.md/.mdx)
│   └── decks/          # decks de referencia (.md/.mdx)
├── layouts/
│   └── Layout.astro    # shell HTML global: nav, footer, fuentes, consume cspNonce
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

## Dependency Constraint

`@cloudflare/vite-plugin` está pinado a `~1.25.6` (tanto en `devDependencies` como en `overrides`). Las versiones 1.26+ introducen un bug donde `require_dist is not a function` al ejecutar `astro build` o `astro sync` en Windows. No actualizar sin verificar que el bug esté resuelto.

## Architecture

### Request Flow

```
Request → Cloudflare Workers → Astro SSR → middleware.ts → page → Layout.astro
```

El middleware (`src/middleware.ts`) se ejecuta en cada request y:
1. Genera un nonce criptográfico por request via `crypto.getRandomValues`
2. Lo expone como `Astro.locals.cspNonce` (tipado en `src/types.d.ts` via `App.Locals`)
3. Inyecta los headers de seguridad en la response: CSP con nonce, HSTS, X-Frame-Options, etc.

Los layouts consumen `Astro.locals.cspNonce` para exponerlo via `<meta name="csp-nonce">`. Si se añaden scripts inline en un componente, deben incluir `nonce={Astro.locals.cspNonce}`.

### Content Layer API (Astro 6)

`src/content.config.ts` (nota: en Astro 6 el archivo está en `src/`, no en `src/content/`) define tres colecciones con `glob()` loader:

| Colección | Directorio              | Campos clave                                            |
|-----------|-------------------------|---------------------------------------------------------|
| `blog`    | `src/content/blog/`     | `title`, `pubDate`, `draft` (filtrable), `tags`         |
| `events`  | `src/content/events/`   | `date`, `city`, `format` (enum), `registrationUrl`      |
| `decks`   | `src/content/decks/`    | `clan`, `discipline[]`, `format` (standard\|limited)    |

Para consultar contenido: `getCollection('blog', ({ data }) => !data.draft)`.

### Tailwind CSS v4

No hay `tailwind.config.js`. La configuración completa está en `src/styles/global.css` usando `@theme {}`. El plugin se registra en `astro.config.ts` vía `@tailwindcss/vite`.

Paleta de colores personalizada disponible como clases de Tailwind:
- `blood-{50..950}` — rojos oscuros (acción, énfasis)
- `night-{50..950}` — grises azulados (fondos, texto)
- `gold-{400,500,600}` — dorado (hover de navegación)

Fuentes: `font-serif` → Cinzel (Google Fonts, títulos), `font-sans` → Inter (cuerpo).

### Cloudflare Adapter

`output: 'server'` — todas las páginas son SSR por defecto. Para prerender rutas estáticas usar `export const prerender = true` en la página.

El `wrangler.toml` usa `compatibility_flags = ["nodejs_compat"]` que es necesario para que Astro funcione en el Workers runtime.

Bindings configurados automáticamente por el adapter (mensajes al iniciar el build):
- `IMAGES` — Cloudflare Images (imagen processing)
- `SESSION` — KV binding para sesiones

### Path Alias

`@/*` → `./src/*` (configurado en `tsconfig.json`). Usar `@/components/Foo.astro` en lugar de rutas relativas.

### TypeScript

Extiende `astro/tsconfigs/strict` con `noUncheckedIndexedAccess: true` y `noImplicitOverride: true`. El tipado de `App.Locals` está en `src/types.d.ts`.
