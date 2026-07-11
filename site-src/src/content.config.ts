import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const lenses = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/lenses' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    tagline: z.string(),
    status: z.enum(['installed', 'available', 'coming-soon']),
    color: z.string(),
    category: z.string(),
    icon: z.string().nullable(),
    downloadUrl: z.string().nullable(),
    docsUrl: z.string().nullable(),
    summary: z.string(),
    overviewDescription: z.string(),
    detail: z
      .object({
        heroIntro: z.string(),
        whatItShows: z.string(),
        whatsInside: z.string(),
        dataRequirements: z.string(),
        getIntro: z.string(),
        tiers: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            pbit: z.string(),
          }),
        ),
        disclaimer: z.string(),
      })
      .optional(),
  }),
});

export const collections = { lenses };
