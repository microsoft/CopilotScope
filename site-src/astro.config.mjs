// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://microsoft.github.io',
  base: '/CopilotScope',
  trailingSlash: 'ignore',
  prefetch: true,
});
