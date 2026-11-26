# Afterhours revamp: full-site audit

## Full audit, 27 November 2026 (live site plus local build)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 4 | No issues on 26 pages, night and day. The day toggle is reachable by keyboard, with a purple focus ring at 8.5:1 |
| 2 | Performance | 3 | The Work index shifts layout after load (CLS 0.091). The homepage hero statement fades in late on phones, delaying its first paint |
| 3 | Theming | 4 | The day palette passes contrast (body text 17.7, secondary 6.4, links 8.5:1). The saved theme applies before first paint |
| 4 | Responsive | 4 | No sideways scroll at 320 to 1920 px (78 page-width checks). Every control is at least 44 px; the day toggle is hidden below 360 px |
| 5 | Implementation integrity | 3 | The live site tells search engines not to index it, uses relative preview-image URLs, and is two deployments behind the branch |
| **Total** | | **18/20** | **Excellent; fix the live-site release settings first** |

### Fix pass (same day)

| Finding | Fix | Verified |
|---|---|---|
| P1 `noindex` and relative preview images on the live site | `astro.config.mjs` uses `SITE_URL`, or on Vercel production builds `https://` plus `VERCEL_PROJECT_PRODUCTION_URL`. Preview and local builds stay `noindex` | Simulated production build: canonical and absolute `og:image` on every page, no `noindex` (except the 404). Simulated preview build: `noindex` |
| P2 Missing `robots.txt` and `sitemap.xml` | The build always writes `robots.txt`; with an origin, it adds the `Sitemap:` line and a 25-URL sitemap that excludes the 404 page | Both present in the production build |
| P2 Work index CLS 0.091 | The preview layout applies with `@media (scripting: enabled) and (hover: hover) and (pointer: fine)` from first paint | CLS 0 at 1440 px. Page weight before scrolling dropped from 523 to 354 KB because the hidden thumbnails no longer load. The preview follows hover. 1024 px still shows thumbnails |
| P2 Hero statement fades in late on phones | The intro is painted at once and only settles into position | Mobile LCP 620 → 132 ms (local) |
| P1 Live site two deployments behind | Needs Yancy in the Vercel dashboard: production branch or promotion, and the build logs | Open |

Estimated score after the code fixes: **19/20.** Implementation integrity returns to 4 once production deploys from this branch.

### Live site (lmt-2026.vercel.app), fetched directly

- **[P1] Every page tells search engines not to index it, and preview images use relative URLs.** The live pages carry `<meta name="robots" content="noindex">`, have no canonical link, and set `og:image` to `/images/share/...`. Google won't list the site, and LinkedIn and Messenger can't load preview images from a relative path. Cause: `SITE_URL` isn't set for the Vercel build. Fix: set it in Vercel, or fall back to Vercel's production URL in `astro.config.mjs`.
- **[P1] The live site is two deployments behind.** It serves `508fc33` (it has the icons, but the header still uses `container` and there's no day toggle). `d40ddf1` (the mobile header fix) and `f438291` (transitions, day mode, analytics) aren't live, and `main` is still the original site. Check Vercel's Deployments for failed builds, or whether production was promoted by hand from a preview; set the production branch accordingly.
- **[P2] `robots.txt` and `sitemap.xml` return 404.** The sitemap is only generated when `SITE_URL` is set. Add a `robots.txt` that points to the sitemap.

### Local build

- **[P2] Work index layout shift: CLS 0.091 at 1440 px.** At 103 ms, `work-index.ts` adds `[data-enhanced]`, which hides the thumbnails and shrinks the rows from 131 to 77 px. Fix: apply the enhanced desktop layout with `@media (scripting: enabled)` so it's correct at first paint.
- **[P2] Hero statement fades in late on phones.** The intro starts at `opacity: 0` with a 0.55 s delay. On a 390 px phone it's the largest element on screen, so its first paint (LCP) waits for the fade: 620 ms locally, slower on real networks. Fix: animate only `y`, or start visible.
- **[P3] Shared motion bundle: 49 KB gzipped on every page** (GSAP, ScrollTrigger, Lenis). Acceptable for the interactions it powers. ScrollTrigger could later load only where scroll moments exist.

### Verified, no issues

- Check: 0 errors, 0 warnings, 0 hints. Build: 26 pages.
- Night crawl of 25 pages: one h1 per page, no skipped heading levels, skip link first, every image has alt text, every control is named, no overflow at 390 or 320 px, no controls under 24 px, no errors under reduced motion, Lenis off under reduced motion.
- Keyboard order: skip link → name → Work → About → Contact → Day mode → content, each with a visible ring.
- Day mode with reduced motion: no errors, and the View badge is off.
- CLS is 0 on the homepage, case studies, project pages and About at 1440 and 390 px.
- Detector: 32 findings, all previously verified false positives (22 empty viewer images in closed dialogs, 9 single-line heading leadings, 1 edge-to-edge band).

---

## Re-audit after YANCEYANCEREVOLUTION became the fourth flagship (26 November 2026)

| # | Dimension | Score | Notes |
|---|---|---|---|
| 1 | Accessibility | 4 | One h1 per page, no skipped levels, skip link first on all 25 pages. Flood title and meta contrast: Advenient 7.64, KOTA 5.89, Wünderbar 14.14, YANCEYANCEREVOLUTION 8.29:1. The focus ring on the purple row is yellow-green |
| 2 | Performance | 4 | Hover motion uses only `transform` and `opacity`. Images below the fold are lazy and have dimensions. The flagship renditions reuse existing optimized files |
| 3 | Theming | 4 | Flood ink lives in the data (`identityInk`) and is shared by the homepage rows and the "Next" panels |
| 4 | Responsive | 4 | No sideways scroll at 390 or 320 px on any page. The four-image fan stays on screen at 1440, 1024 and 390 px, centered within 3 px |
| 5 | Implementation integrity | 4 | The next-case chain loops Advenient → KOTA → Wünderbar → YANCEYANCEREVOLUTION → Advenient. Work counts are 4 / 7 / 7 / 4. Breadcrumbs follow the data |
| **Total** | | **20/20** | **Excellent** |

**Fixed in this pass:**
- On phones, the four-image fan pushed tilted corners 3–5 px past the screen edges. It now spreads less below 600 px, staying between 12 and 381 px on a 390 px screen.

**Unchanged false positives:** the detector reports the same 31 findings as before (22 empty viewer images in closed dialogs, 8 single-line heading leadings, 1 edge-to-edge band). The crawler also flags the teal "Next" panel on the YANCEYANCEREVOLUTION case because the flood is a pseudo-element; measured directly, it's 7.64:1.

**Under reduced motion,** the hero shows the name and mark without the fan. The flagships appear in the rows directly below.

**Still open:** real-device touch and Safari testing; link-preview images in the earlier light design; unused `*-identity.webp` files in `public/images/flagships/`, kept until Yancy decides.

---

26 November 2026 · Built site (`npm run build`, served with `astro preview`) · 25 pages

## Result

All 25 pages pass every check below. The few remaining detector findings are explained under "Verified false positives".

| Check | Method | Result |
|---|---|---|
| Type check | `npm run check` | 0 errors, 0 warnings, 0 hints |
| Build | `npm run build` | 25 pages |
| Page loads | Chromium via Playwright, every page | All return 200. No page errors or console errors |
| Headings | Every page | Exactly one h1. No skipped levels |
| Images | Every page | Every image has alt text. Every page image has width and height, except two script-made images (below) |
| Link names | Every page | No unnamed links or buttons |
| Keyboard | Every page | The first Tab lands on "Skip to content". Same-page links move focus to their target, which lands below the fixed header at 80 px |
| Contrast | Computed text against its effective background, every page | No failures. Flagship floods: Advenient 7.6:1, KOTA 5.2:1, Wünderbar 12.6:1. Body text 17.7:1, secondary text 7.7:1 |
| Phone layout | Every page at 390 and 320 px | No sideways scroll. No control under 24 px. Homepage controls are at least 44 px |
| Reduced motion | Every page | No errors. Lenis stays off, and pages show their final state |
| Case openers | Measured on all four cases | Artwork is contained whole in its frame, never cropped or tinted |
| Work index | Category click, keyboard and Back | The rail highlights the right section, the heading lands at 80 px, focus moves to it, and Back restores the address |

## Fixed during the audit

- **Case openers cropped portrait artwork.** The image's percentage height didn't resolve inside its grid container, which cut off the bottom of Wünderbar and YANCEYANCEREVOLUTION. The image is now pinned to its frame and contained.
- **Same-page links landed 80 px too low.** Lenis already applies `scroll-padding-top`, and an extra offset doubled it. This also made the Work rail highlight the previous section.
- **The Work rail missed clicks.** `pushState` doesn't fire `hashchange`, so the link handler now dispatches the event itself.
- **Focused headings drew a box.** A heading that receives focus after an anchor jump now gets a yellow-green underline instead of a focus box, because it's a destination, not a control.

## Verified false positives

- **Detector "broken image" (22 pages).** The artwork viewer's `<img>` has no `src` while its `<dialog>` is closed. The viewer clears it on close by design, and closed dialogs are hidden from assistive tech.
- **Images without dimensions (24 pages).** The same viewer image, plus the Work preview image, which a script adds into a frame with a fixed aspect ratio. Neither affects layout.
- **Detector "tight leading" (8).** The shared heading line-height of 1.12, which only applies to single-line headings.
- **Detector "cramped padding" (1).** The homepage statement band runs edge to edge by design.

## Still open

- Touch momentum and Safari need checking on real devices. The audit used Chromium with touch emulation.
- The social share images (`public/images/share/`) still use the earlier light design.
- The old homepage components `HomeSignature.astro` and `FlagshipSelection.astro` are no longer used. They can be removed once Yancy approves.
