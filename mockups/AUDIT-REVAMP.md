# Afterhours revamp: full-site audit

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
