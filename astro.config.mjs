import { defineConfig } from 'astro/config';
import { writeFile } from 'node:fs/promises';

// The public origin. SITE_URL wins when set. Otherwise a Vercel production build uses the project's
// production domain, which Vercel provides at build time. Local and preview builds have no origin,
// so their pages carry `noindex` and relative preview images.
const vercelProduction = process.env.VERCEL_ENV === 'production' && process.env.VERCEL_PROJECT_PRODUCTION_URL;
const site = process.env.SITE_URL || (vercelProduction ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);

export default defineConfig({
  output: 'static',
  site,
  trailingSlash: 'always',
  server: { host: '127.0.0.1' },
  devToolbar: { enabled: false },
  integrations: [{
    name: 'portfolio-sitemap',
    hooks: {
      'astro:build:done': async ({ dir, pages }) => {
        // robots.txt always exists; it points to the sitemap only when there is a public origin.
        await writeFile(new URL('robots.txt', dir),
          `User-agent: *\nAllow: /\n${site ? `\nSitemap: ${new URL('/sitemap.xml', site).href}\n` : ''}`);
        if (!site) return;
        const entries = pages
          .filter(({ pathname }) => !/^404\/?$/.test(pathname))
          .map(({ pathname }) => {
            const url = new URL(`/${pathname.split('/').filter(Boolean).join('/')}`, site);
            if (!url.pathname.endsWith('/')) url.pathname += '/';
            return `  <url><loc>${url.href.replaceAll('&', '&amp;')}</loc></url>`;
          });
        await writeFile(new URL('sitemap.xml', dir),
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`);
      },
    },
  }],
});
