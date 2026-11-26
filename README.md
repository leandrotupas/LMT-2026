# Yancy Tupas · Portfolio

This workspace contains Yancy’s graphic and brand design portfolio. The homepage pairs Yancy’s initials and name with three flagship projects. The Work index at `/work/` opens 22 projects, including eight Freelance Work projects, seven Professional Work projects and four Misc. projects. The three flagship pages are `/work/advenient/`, `/work/kota-center-davao/` and `/work/wunderbar/`. The introduction and contact information are at `/about/` and `/about/#contact`. [Creative direction](CREATIVE-DIRECTION.md) · [Wireframes](PORTFOLIO-WIREFRAMES.pdf)

## Run locally

This foundation was tested on Windows with Node.js 26.13.0 and npm 11.20.0. It uses Astro 7 with static output, strict TypeScript checks and plain CSS. Run these commands in PowerShell.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local address printed in the terminal. The development server listens on `127.0.0.1` and reloads source edits. Stop it with Ctrl+C.

## Check and build

```powershell
npm.cmd run check
npm.cmd run build
npm.cmd run preview
```

`check` runs Astro and TypeScript diagnostics. `build` writes the static site to `dist/`. `preview` serves that build locally. The final audit records the browser coverage, resolved defects and mobile load measurements. [Final audit](FINAL-AUDIT.md)

## Project structure

| Path | Purpose |
| --- | --- |
| `src/pages/` | Homepage, Work index, individual case studies and About |
| `src/components/HomeSignature.astro`, `FlagshipSelection.astro` | The homepage entrance and three linked project rows |
| `src/components/SiteHeader.astro` | Primary links, current page or section, and skip link |
| `src/layouts/BaseLayout.astro` | Document metadata, display-font preload, shared header and main landmark |
| `src/layouts/CaseLayout.astro` | Shared case title, breadcrumb, credits, document links and navigation within the project’s Work category |
| `src/styles/` | Design tokens, local fonts, type, focus, grid and native page transitions |
| `src/data/profile.ts` | Verified public profile copy, email and professional links |
| `src/pages/about.astro`, `src/assets/profile/yancy-portraits.jpg` | Biography, complete portrait strip, experience, education, skills, core tools, résumé and contact details |
| `public/portfolio/yancy-tupas-resume.pdf` | The two-page résumé from the confirmed Drive folder, served as a local download |
| `src/data/flagships.ts` | Public project titles, dates, disciplines, image descriptions and source colors |
| `src/data/advenient.ts`, `kota.ts`, `wunderbar.ts` and matching folders in `src/assets/` | Case narratives, team credits, captions and source artwork |
| `src/pages/work/yanceyancerevolution.astro`, `src/data/yanceyancerevolution.ts` | Freelance DJ identity case study with eight numbered brand-kit pages, mix covers and posters |
| `src/components/CaseFigure.astro` | Captioned responsive WebP images, including full-size links for detailed artwork |
| `src/data/work.ts`, `src/scripts/work-index.ts` | The public project register, artwork captions, category tracking and desktop preview |
| `src/pages/work/[slug].astro`, `src/data/projects.ts`, `src/data/project-artwork.json` | The 18 gallery projects, including text, credits and responsive image selections |
| `src/components/ArtworkViewer.astro`, `src/scripts/artwork-viewer.ts` | Full-screen artwork viewer with captions, original image links and keyboard navigation |
| `src/scripts/smooth.ts`, `src/scripts/motion.ts` | Lenis wheel smoothing with GSAP and ScrollTrigger; same-page links that move focus; artwork entrances |
| `src/assets/fonts/`, `src/assets/lmt-initials*.png` | Self-hosted WOFF2 fonts and approved initials |
| `public/images/flagships/`, `public/portfolio/` | Responsive flagship artwork, the résumé, three portfolio excerpts and the Advenient and YANCEYANCEREVOLUTION brand guides |
| `public/images/work/`, `public/images/projects/` | Index thumbnails, project covers, complete gallery images and responsive sizes |
| `public/images/share/` | 1,200 × 630 JPEGs for social previews in the Afterhours style, with one portfolio card and one card per project |
| `public/favicon.ico`, `public/*icon*.png`, `public/site.webmanifest` | Browser-tab icon (the LMT square), home-screen and app icons on night, and the web app manifest |
| `src/components/CursorBadge.astro` | The "View" badge beside the pointer over Work rows and next panels |
| `src/pages/404.astro` | The not-found page: the LMT square as the zero, links back to the work, kept out of search |
| `public/licenses/` | The copyright and SIL Open Font License notices distributed with the fonts |

Bricolage Grotesque supplies the display and label weights. DM Sans Regular is the body face for the biography, project introductions and case-study copy. Its Latin WOFF2 is served locally. The 192 px favicon and 408 px signature image come from Yancy’s confirmed square master. [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) · [DM Sans](https://fonts.google.com/specimen/DM+Sans) · [DM Sans license](public/licenses/dm-sans-OFL.txt) · [Original initials](https://drive.google.com/file/d/1DOqXnEnIsjpNqMa0A1FxIClYQeal0LoL/view)

The editorial grid has four columns by default, eight when the space between the page margins reaches 32 rem and twelve at 56 rem. Most case studies place art and text side by side from 43 rem. These thresholds follow the reader’s text size. At smaller sizes the composition changes with the work. For example, KOTA’s opening brief spans the page above its portrait Story on narrow phones. The content width caps at 1,312 px at the default text size.

## Navigation and motion

Work, About and Contact are ordinary links on desktop and phone. The name on inner pages returns home. The first Tab reaches **Skip to content**. The Contact heading is a focusable fragment target, followed by the email address. The browser manages scroll and history.

About uses Yancy’s existing biography and the two-frame portrait from portfolio page 2. The six selected work links use project titles and routes from the Work index. The experience dates follow the résumé, including the July–December 2024 SUM Digital internship. On 21 November 2026, Yancy confirmed the ongoing independent role and the availability line on Contact. The résumé download matches the Drive original byte for byte. [Source inventory](CONTENT-INVENTORY.md)

On the first home visit in a tab, the name appears in outline beside the stationary square initials. Two opposing ink passes fill the words and settle onto their baselines over 660 ms, with the surname starting 70 ms later. Replay restarts the sequence and Tab or Escape settles it immediately. Reduced motion, forced colors and disabled JavaScript show the finished signature. When storage is blocked, visitors can start the motion themselves.

Browsers with cross-document view transitions fade the outgoing page for 120 ms and settle the destination over 260 ms. The primary navigation holds still. The selected title and a matching visible cover move into the case over 420 ms. Wünderbar uses the title transition because its index shows the business cards and its case opens on the clipboard. Browsers without cross-document transitions fade in the destination after pointer activation. Keyboard activation and reduced motion use immediate navigation. Shared page timing is defined in `src/styles/transitions.css`.

Pointer-activated section links and stepped mouse-wheel input use the browser’s smooth scrolling. Precision trackpads, touch gestures, focus changes and Back or Forward retain their native behavior. Section headings and artwork enter once in view, with no waiting animation before visitors can read or act. Switching to reduced motion takes effect immediately.

On a wide homepage, hovering or focusing a flagship fans out three prints from that project. **Show previews** opens all nine images and their captions at any screen size. The smaller layout gives each cover its own line above the two supporting pieces. Each row opens its case with one click or tap. Returning with Back restores the expanded or compact view for that history entry. [Homepage selection](src/components/FlagshipSelection.astro) · [Interaction recording](PORTFOLIO-INTERACTION-PREVIEW.webm)

The homepage and Work index open all three web cases in the current tab. Each case links to its original portfolio excerpt, the next flagship in the approved order and the Case Studies section of the index. [Source portfolio](https://drive.google.com/file/d/1b9dqzXtDh68K4-POqfJyEHdjQOY6kEzR/view)

The Advenient case opens with the playbook mockup from page 20 of the original guide. The current symbol and earlier logo come from portfolio pages 5–6. The construction, color, typography and application images come from guide pages 9, 13–14 and 16–20. Team credits follow guide page 24. Visitors can open the complete 31-page guide or the five-page portfolio excerpt at the end of the case. [Original brand guide](https://drive.google.com/file/d/1ikRrOifhiQv7mk8B_YugnsMK9nrBuqGJ/view)

KOTA pairs the Recollection event cover with a vertical Story. The lockup, symbol references and pattern come from pages 4, 6 and 16 of the 17-page social media guide. The original social templates are on portfolio page 13. The Catholic Recollection graphic on page 14 shows the organization’s work after handover. [KOTA social media guide](https://drive.google.com/file/d/1fN9nZ1Rglu9n9KibvfxH1U5eYQGzNSGG/view)

Wünderbar uses the wordmark, clipboard and card mockups from portfolio page 15, six individual logo studies from page 18 and complete menu and signage artwork from page 19. Its later social example comes from page 20. The menus credit Yancy for the layouts and use “Collaborating illustrator” for the cocktail drawings, as requested for this review. [Artwork and credits inventory](CONTENT-INVENTORY.md)

The four Work categories have native fragment links at `#case-studies`, `#freelance-work`, `#professional-work` and `#misc`. When the index has 67 rem of usable width and a fine pointer that supports hover, each new print replaces the previous one with a 220 ms wipe in the direction of travel. The caption holds its position across portrait and landscape artwork. Keyboard focus and reduced motion change the image immediately. Touchscreens, compact layouts and the static HTML show linked thumbnails. Rotating at a selected category keeps its heading in view. Once the visitor scrolls away, the browser manages the reading position.

The large preview is a link to the displayed project. Its destination, title and caption update together when the requested image is ready. Back restores the project the visitor opened. The primary navigation draws an underline on hover and artwork links show an **Enlarge** cue on hover or keyboard focus. [Work index](src/pages/work/index.astro) · [Preview behavior](src/scripts/work-index.ts) · [Header](src/components/SiteHeader.astro) · [Shared link styles](src/styles/global.css)

The 18 gallery projects present 91 captioned works. Seventeen use artwork from PORTFOLIO 2026, pages 22–23, 25–29, 31–36 and 38–41. The 500D page contains the 16 approved public images, including *Work-Friendly Solo Travel*. Their full-size files match the inventory’s SHA-256 records. YANCEYANCEREVOLUTION is a long-form case study in Freelance Work, with 16 viewer entries. Eight are numbered pages from Yancy’s November 2026 brand kit. The full 25-page PDF is available from the opening and credits. [Artwork inventory](CONTENT-INVENTORY.md)

Selecting an artwork opens a full-screen viewer. The thumbnail expands from its actual position while the full-resolution image loads. Click or tap a detail to magnify it to twice the fitted size. The **2× zoom** button magnifies around the center. Drag, swipe or use the arrow keys to pan. Select the image or button again to fit the print. While fitted, Left and Right move between artworks. Previous and Next work in either view and fit the new print. Closing the same fitted print returns it to its visible thumbnail. Escape closes the viewer and restores focus.

On short landscape screens, the controls sit beside the artwork and scroll independently with enlarged type. **Open full size** opens the original file. Close brings the original selection back into view after rotation. With JavaScript disabled, artwork links open the images directly. [Viewer](src/components/ArtworkViewer.astro) · [Artwork navigation](src/scripts/artwork-viewer.ts) · [Zoom and pan](src/scripts/artwork-zoom.ts)

## Sources and release

Use the root inventory and research files during development. Only copy verified public fields or approved artwork into `src/` or `public/`. The root inventory includes private source references. [Content inventory](CONTENT-INVENTORY.md) · [Visual research](VISUAL-RESEARCH.md)

Page titles, descriptions and social card metadata are prerendered. The sharing JPEGs show each page's own title, section, year and lead artwork, with flagships on their brand color. They were rendered from the built pages on 26 November 2026. Regenerate the matching file in `public/images/share/` if a title or lead image changes.

Deployment is a separate approval stage. Local builds use `noindex`. Set the build environment variable `SITE_URL` to the confirmed public origin when preparing a release. Astro then emits canonical URLs, absolute social URLs and a sitemap containing every public page. The static host serves `dist/` after Yancy approves publication.

### Going live checklist

1. **Choose the host and domain (Yancy's approval).** Any static host works. Netlify, Vercel and Cloudflare Pages all build Astro on their free tiers.
2. **Configure the build.** Build command `npm run build`, output folder `dist`, Node 22 or later, and `SITE_URL` set to the final origin, for example `https://yancytupas.com`.
3. **Serve the 404 page.** Astro emits `dist/404.html`; Netlify, Vercel and Cloudflare Pages serve it automatically for unknown addresses.
4. **Test on real devices.** Check touch momentum, the hero scroll and the artwork viewer on an iPhone in Safari and on an Android phone. The cloud audits used Chromium only.
5. **Turn on analytics.** The site loads Vercel Web Analytics (cookieless) and Speed Insights on deployed hosts only. In the Vercel project, open **Analytics → Enable** and **Speed Insights → Enable**; data appears after the next deployment.
6. **Check link previews.** Paste the live URL into LinkedIn's Post Inspector and the Facebook Sharing Debugger to confirm the cards update.
