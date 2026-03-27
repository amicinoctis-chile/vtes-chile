import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/** Noticias y artículos de la comunidad */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('Gabriel Walker'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    img: z.string().optional(),
  }),
});

/** Torneos y eventos */
const events = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    location: z.string(),
    city: z.string(),
    format: z.enum(['V5', 'standard', 'storyline', 'limited', 'casual']),
    proxyesAllowes: z.enum(['si', 'no', 'tba']),
    rounds: z.number().gte(1),
    entryFee: z.number().positive(),
    organizer: z.string(),
    maxPlayers: z.number().int().positive().optional(),
    registrationUrl: z.url().optional(),
    resultsUrl: z.url().optional(),
    img: z.string().optional(),
  }),
});

/** Ligas */
const leagues = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hour: z.iso.time({ precision: -1 }),
    day: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
    month: number().gte(1).lte(12),
    year: number().gte(2026),
    location: z.string(),
    city: z.string(),
    format: z.enum(['V5', 'standard', 'storyline', 'limited', 'casual']),
    proxyesAllowes: z.enum(['si', 'no', 'tba']),
    rounds: z.number().gte(1),
    entryFee: z.number().positive(),
    organizer: z.string(),
    maxPlayers: z.number().int().positive().optional(),
    registrationUrl: z.url().optional(),
    resultsUrl: z.url().optional(),
  }),
});

/** Tiendas */
const stores = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
  schema: z.object({
    name: z.string(),
    location: z.string(),
    city: z.string(),
    url: z.url().optional(),
    instagram: z.url().optional(),
    whatsapp: z.url().optional(), //link to whatsapp group
  }),
});

/** Sitios y comunidades (perfiles RRSS y creadores de contenido) */
const sites = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/events' }),
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
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    comments: z.string().optional(),
  }),
});

export const collections = { blog, events, leagues, stores, sites, decks };
