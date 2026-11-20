import { defineConfig } from 'astro/config';
import { writeFile } from 'node:fs/promises';

const site = process.env.SITE_URL;

export default defineConfig({
  output: 'static',
  site,
  trailingSlash: 'always',
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  integrations: site ? [{
    name: 'portfolio-sitemap',
    hooks: {
      'astro:build:done': async ({ dir, pages }) => {
        const entries = pages.map(({ pathname }) => {
          const url = new URL(`/${pathname.split('/').filter(Boolean).join('/')}`, site);
          if (!url.pathname.endsWith('/')) url.pathname += '/';
          return `  <url><loc>${url.href.replaceAll('&', '&amp;')}</loc></url>`;
        });
        await writeFile(new URL('sitemap.xml', dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
      },
    },
  }] : [],
});
