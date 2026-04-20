import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** Noticias y artículos de la comunidad */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.iso.datetime(),
    updatedDate: z.iso.datetime().optional(),
    author: z.string().default('Daniel Ibarra'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    img: z.string().default("default.jpg"),
  }),
});

/** Eventos */
const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    startDate: z.iso.date(),
    startTime: z.iso.time(),
    endDate: z.iso.date(),
    endTime: z.iso.time(),
    location: z.string(),
    city: z.string(),
    format: z.enum(['V5', 'standard', 'storyline', 'limited', 'casual']),
    proxyesAllowed: z.enum(['si', 'no', 'tba']),
    rounds: z.number().gte(1),
    entryFee: z.number().nonnegative(),
    organizer: z.string(),
    maxPlayers: z.number().int().positive().optional(),
    registrationUrl: z.url().optional(),
    resultsUrl: z.url().optional(),
    img: z.string().default("default.jpg"),
  }),
});

/** Ligas */
const leagues = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/leagues' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hour: z.iso.time(),
    day: z.enum(['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']),
    month: z.number().int().gte(1).lte(12),
    year: z.number().int().gte(2026),
    location: z.string(),
    city: z.string(),
    format: z.enum(['V5', 'standard', 'storyline', 'limited', 'casual']),
    proxyesAllowed: z.enum(['si', 'no', 'tba']),
    rounds: z.number().gte(1).default(1),
    entryFee: z.number().nonnegative(),
    organizer: z.string(),
    maxPlayers: z.number().int().positive().optional(),
    registrationUrl: z.url().optional(),
    resultsUrl: z.url().optional(),
  }),
});

/** Tiendas */
const stores = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/stores' }),
  schema: z.object({
    name: z.string(),
    location: z.string(),
    city: z.string(),
    url: z.url().optional(),
    instagram: z.url().optional(),
    whatsapp: z.url().optional(),
  }),
});

/** Sitios y comunidades (perfiles RRSS y creadores de contenido) */
const sites = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/sites' }),
  schema: z.object({
    name: z.string(),
    platform: z.enum([
      "Instagram",
      "YouTube",
      "Discord",
      "WhatsApp",
      "X",
      "Facebook",
      "Twitch",
      "Web",
      "Podcast"
    ]),
    url: z.url().optional(),
    description: z.string(),
    active: z.boolean().default(true),
    img: z.string().optional(),
    comments: z.string().optional(),
  }),
});

/** Decks de referencia y estrategias */
const decks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/decks' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    clan: z.array(z.string()).default([]),
    discipline: z.array(z.string()).default([]),
    format: z.enum(['standard', 'v5']).default('standard'),
    url: z.url().optional(),
    pubDate: z.iso.datetime(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    comments: z.string().optional(),
  }),
});

export const collections = { blog, events, leagues, stores, sites, decks };
