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
    version: z.string().optional(),
    releaseDate: z.string().optional(),
    detail: z
      .object({
        heroIntro: z.string(),
        whatItShows: z.string(),
        whatsInside: z.string(),
        whatsInsideGroups: z
          .array(
            z.object({
              label: z.string(),
              pre: z.string(),
              items: z.array(z.string()),
              oxford: z.boolean(),
              post: z.string(),
            }),
          )
          .optional(),
        dataRequirements: z.string(),
        getIntro: z.string(),
        tiers: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            pbit: z.string(),
            icon: z.string().optional(),
            badge: z.string().optional(),
            accent: z.string().optional(),
            checks: z.array(z.string()).optional(),
          }),
        ),
        disclaimer: z.string(),
        stats: z
          .array(z.object({ value: z.string(), label: z.string() }))
          .optional(),
        whatItShowsLead: z.string().optional(),
        features: z
          .array(z.object({ icon: z.string(), title: z.string(), desc: z.string() }))
          .optional(),
        valueFlow: z.array(z.string()).optional(),
        valueFlowNote: z.string().optional(),
        whatsInsideLead: z.string().optional(),
        pageGroups: z
          .array(
            z.object({
              label: z.string().optional(),
              note: z.string().optional(),
              items: z.array(z.object({ icon: z.string(), name: z.string() })),
            }),
          )
          .optional(),
        buildCards: z
          .array(
            z.object({
              icon: z.string().optional(),
              name: z.string(),
              badge: z.string().optional(),
              checks: z.array(z.string()),
            }),
          )
          .optional(),
        whatsInsideNote: z.string().optional(),
        dataRequirementsLead: z.string().optional(),
        dataSources: z
          .array(
            z.object({
              icon: z.string(),
              source: z.string(),
              description: z.string(),
              requirement: z.string(),
            }),
          )
          .optional(),
        dataNote: z.string().optional(),
        getNote: z.string().optional(),
      })
      .optional(),
  }),
});

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
  schema: z.object({
    lens: z.enum(['valuelens', 'studiolens']),
    title: z.string(),
    description: z.string(),
    status: z.enum(['scaffold', 'published']),
    sourceFiles: z.array(z.string()),
  }),
});

export const collections = { lenses, docs };

