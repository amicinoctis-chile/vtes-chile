/// <reference types="astro/client" />
/// <reference types="@astrojs/cloudflare" />
/// <reference types="@cloudflare/workers-types" />

interface CloudflareBindings {
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  SEND_EMAIL: SendEmail;
  RATE_LIMITER: RateLimit;
}

declare module 'cloudflare:workers' {
  export const env: CloudflareBindings;
}
