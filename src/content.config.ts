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
    author: z.string().default('Comunidad VTES Chile'),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    heroImage: z.string().optional(),
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
    format: z.enum(['standard', 'storyline', 'limited', 'casual']),
    organizer: z.string(),
    maxPlayers: z.number().int().positive().optional(),
    registrationUrl: z.string().url().optional(),
    resultsUrl: z.string().url().optional(),
  }),
});

/** Decks de referencia y estrategias */
const decks = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/decks' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    clan: z.string(),
    discipline: z.array(z.string()).default([]),
    format: z.enum(['standard', 'limited']).default('standard'),
    pubDate: z.coerce.date(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, events, decks };
