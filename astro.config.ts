import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',

  adapter: cloudflare(),

  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Cinzel',
      cssVariable: '--font-cinzel',
      weights: [400, 600, 700],
      fallbacks: ['serif'],
    },
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--font-inter',
      weights: [400, 500, 600],
      fallbacks: ['sans-serif'],
    },
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  security: {
    checkOrigin: true,
  },
});
