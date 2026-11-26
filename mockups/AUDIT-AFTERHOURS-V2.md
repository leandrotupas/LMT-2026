# Afterhours v2 audit

26 November 2026 · Target: `mockups/afterhours-v2.html` (homepage) and `mockups/afterhours-v2-case.html` (Advenient case study)

Method: impeccable `audit` (5 dimensions) with its bundled detector on the source. Each finding was verified in Chromium through Playwright at 1440×900, 390×844 and 320 px, covering keyboard order, focus, contrast, touch targets and overflow. Also used: Vercel Web Interface Guidelines and the taste-skill `copy-lint`. The taste-skill layout checker was not run because its page rules conflict with the portfolio brief.

## Fix pass, 26 November 2026: all 12 fixed and verified

| Finding | Fix | Verified result |
|---|---|---|
| P1 Homepage skip link | The Lenis handler now moves focus to the target, and `main` has `tabindex="-1"` | The next Tab after the skip link lands on "All work", with or without reduced motion |
| P1 Advenient flood contrast | Each row has a `--on` ink color, night on teal | Title and meta at 7.64:1. KOTA 5.22:1, Wünderbar 12.55:1 |
| P1 Next-panel label | Solid white | 5.89:1 |
| P2 Heading outline | Visually hidden h2 "All work". Counts are `aria-hidden` | h2 › h3 order is correct |
| P2 Focus under header | `scroll-padding-top: 80px`, plus an 80 px offset on Lenis scrolls | The case page's first focus after the skip sits at 134 px, clear of the header |
| P2 320 px overflow | Title clamp minimum is now 60 px | Width 320 at 320 px, 390 at 390 px |
| P2 Layout animation | The hover moves the title span with `transform` | Index links transition `color` only |
| P2 Image hints | Every image has width and height. Below-fold images are lazy, and the opener has `fetchpriority="high"` | No image is missing dimensions |
| P2 Placeholder links | About goes to `/about/`, Résumé and the PDFs to their real files, rows and the index to `/work/{slug}/` | These are real site routes, so they work in the build but not from the local mockup file |
| P3 color-scheme | `color-scheme: dark` | Computed value is `dark` |
| P3 Reduced motion | Targeted rules. The flood becomes an opacity fade, and the pause button is hidden | Pause button hidden. Color and opacity feedback stays |
| P3 Preview `src` | Transparent placeholder with dimensions | The detector's broken-image finding is gone |
| Also | The skip link is now 44 px tall | No target under 44 px at 390 or 320 px |

After the fixes, the detector still raises 6 tight-leading findings and 1 advisory note on single-line headings, plus one contrast finding on `:hover` that compares the text against the row's night background. It can't see the colored flood layer behind the text, where the measured contrast is 7.64:1. These are false positives. There are no console errors, the first Tab still lands on the skip link, and neither page scrolls sideways at 1440, 390 or 320 px. The pre-audit templates are kept beside the sources as `*.pre-audit.html`.

**Estimated score after fixes: 19/20.** Accessibility 4, Performance 4, Theming 4, Responsive 4, Integrity 3. Integrity stays at 3 until the design moves into the Astro build with self-hosted fonts.

## Health score (before fixes)

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | The homepage skip link does nothing, and the Advenient hover state drops title contrast to 2.3:1 |
| 2 | Performance | 3 | A layout-property hover animation and an always-running marquee loop |
| 3 | Theming | 3 | Tokens are used throughout. `color-scheme: dark` and a few raw values are missing |
| 4 | Responsive design | 3 | The case page overflows by 6 px at 320 px. Every touch target is at least 44 px |
| 5 | Implementation integrity | 3 | The system is coherent and specific to the brief. About points at the band, and some links are still placeholders |
| **Total** | | **14/20** | **Good: address accessibility first** |

## Implementation integrity verdict

**Pass.** The pages express a specific system:
- the palette comes from the YANCEYANCEREVOLUTION kit (#670DA8, #E7FA60)
- the type is Yancy's own Bricolage Grotesque, condensed, with DM Sans
- each flagship's own color appears on hover
- all copy comes from the approved text, and the case headings match the live site

The detector raised 7 findings and 1 advisory note. Two were verified as real: the 4.0:1 label and the empty `src` on the preview image. Five are false positives: the "tight leading" findings are single-line headings and labels set at 1.16–1.29, and the "flat hierarchy" advisory misreads `clamp()` sizes. copy-lint reported no failures. Its stat-strip warning counts the project years in the index, which is a false positive.

## Executive summary

- **Issues found:** 0 P0, 3 P1, 6 P2, 3 P3
- **Fix first:** the homepage skip link, the contrast of the Advenient hover state, and the contrast of the label on the red "Next case study" panel
- **Then:** the heading outline, focus landing under the header, 320 px overflow, image sizing and loading, and the misleading About link

## Findings

### P1, major

**[P1] Homepage skip link does nothing**
- **Location:** `afterhours-v2.html`, the Lenis anchor handler (`a[href^="#"]`)
- **Category:** Accessibility
- **Impact:** The handler cancels the link's default action and smooth-scrolls instead. Focus stays on the skip link, so the next Tab goes to the header. Keyboard users can't skip the navigation.
- **Standard:** WCAG 2.4.1 Bypass Blocks
- **Fix:** Exclude `.skip` from the handler, or after `lenis.scrollTo`, focus the target with `tabindex="-1"` and `preventScroll`.
- **Command:** `$impeccable harden`

**[P1] Advenient hover and focus flood fails contrast**
- **Location:** `afterhours-v2.html`, `.row::before` with `--c:#09b2b5`
- **Category:** Accessibility
- **Impact:** Bone text on teal measures 2.32:1, so the title and meta are hard to read during hover and keyboard focus. KOTA on red (5.9:1) and Wünderbar on navy (14:1) pass.
- **Standard:** WCAG 1.4.3 and 1.4.11
- **Fix:** Use night ink on light floods (night on teal is about 7.6:1). Set the ink per row with a `--on` variable next to `--c`.
- **Command:** `$impeccable colorize`

**[P1] "Next case study" label at 4.0:1**
- **Location:** `afterhours-v2-case.html`, `.next .lab` (`rgba(255,255,255,.8)` on #CC0000)
- **Category:** Accessibility
- **Impact:** Small text falls below AA.
- **Standard:** WCAG 1.4.3
- **Fix:** Use solid white (5.9:1).
- **Command:** `$impeccable polish`

### P2, minor

**[P2] Index headings nest under "Case Studies"**
- **Location:** Homepage `.cols h3`
- **Category:** Accessibility
- **Impact:** Screen readers announce Freelance, Professional and Misc. as subsections of Case Studies. The section has only an `aria-label`. The counts also read as part of the heading ("Freelance Work 8").
- **Fix:** Add an h2 for the index section, visible or visually hidden. Mark the count `aria-hidden`, or phrase it as "(8 projects)".
- **Command:** `$impeccable harden`

**[P2] Focus lands under the fixed header**
- **Location:** Case page, crumb link "Case Studies" (top 54 px, header ends at about 65 px)
- **Category:** Accessibility
- **Impact:** After a skip or an anchor jump, the focused link is partly hidden.
- **Standard:** WCAG 2.4.11 Focus Not Obscured
- **Fix:** Add `scroll-padding-top` to `html` that matches the header height, plus `scroll-margin-top` on anchor targets.
- **Command:** `$impeccable harden`

**[P2] Case page overflows at 320 px**
- **Location:** `afterhours-v2-case.html`, `.title h1` (92 px minimum size)
- **Category:** Responsive
- **Impact:** A 6 px sideways scroll on the smallest phones.
- **Fix:** Lower the clamp minimum to about 26vw, or size the title from the container.
- **Command:** `$impeccable adapt`

**[P2] Hover animates layout**
- **Location:** Homepage `.cols li a`, which transitions `padding`
- **Category:** Performance
- **Impact:** Every hover triggers layout across a 19-item list.
- **Fix:** Animate `transform: translateX()` on an inner span.
- **Command:** `$impeccable optimize`

**[P2] Images lack sizes and loading hints**
- **Location:** Homepage index `.thumb` images have no width or height. No image has `loading="lazy"`. The case opener has no `fetchpriority="high"`.
- **Category:** Performance
- **Impact:** Layout shift and wasted bandwidth in the real build. The mockups embed everything, so it doesn't show there.
- **Fix:** Use Astro `<Image>` with dimensions, lazy loading below the fold and high priority on the opener.
- **Command:** `$impeccable optimize`

**[P2] About link points to the marquee band**
- **Location:** Homepage nav `#about`
- **Category:** Implementation integrity
- **Impact:** A visitor who chooses About lands on moving words, not the biography. The Résumé and footer links are also `#` placeholders.
- **Fix:** Point them to `/about/` and the real PDF in the build.
- **Command:** `$impeccable harden`

### P3, polish

- **[P3] No `color-scheme: dark`.** Native scrollbars and form controls render in light mode on some platforms. Add it to `:root`. (`$impeccable polish`)
- **[P3] Pause button does nothing under reduced motion.** The marquee is already still, so the button is dead weight. Hide it when motion is reduced. The global `transition-duration: 0s` also removes helpful color feedback, so keep opacity and color fades. (`$impeccable animate`)
- **[P3] Preview image has no `src` until hover.** Set a transparent placeholder or create the image on first hover. (`$impeccable polish`)

## Patterns and systemic issues

- **The motion layer overrides native behavior without restoring it.** The Lenis anchor handler broke the skip link. The real build needs one shared navigation helper that scrolls, updates history and moves focus.
- **Per-project colors need paired ink.** Each flagship color needs a matching text color for its flood, the next panel and any future case.

## Positive findings

- Focus is visible on every control in the lime outline, and the tab order follows the reading order.
- Every touch target is at least 44 px at 390 and 320 px. Touch keeps native momentum because Lenis smooths wheel input only.
- Reduced motion shows the final composition at first paint, with nothing hidden.
- Base text contrast is strong: bone on night 17.7:1, dim on night 7.7:1, lime on purple 8.3:1.
- Artwork keeps its original proportions and colors, and captions and credits stay intact.
- There are no console errors, and the marquee has a pause control (WCAG 2.2.2).

## Recommended actions

1. **[P1] `$impeccable harden`:** fix the skip link with focus management in the Lenis handler, then the heading outline, scroll padding and real About link
2. **[P1] `$impeccable colorize`:** add paired ink for each flagship flood, starting with Advenient
3. **[P2] `$impeccable adapt`:** fix the 320 px title overflow on the case page
4. **[P2] `$impeccable optimize`:** replace the padding animation with a transform, and add image dimensions and loading hints in the build
5. **[P3] `$impeccable polish`:** add `color-scheme`, a solid label on the next panel, the reduced-motion pause button and the preview placeholder
