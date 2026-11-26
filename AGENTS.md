# Working on Yancy Tupas’s portfolio

Yancy makes the final creative decisions. The master brief governs the project. Use the approved [creative direction](CREATIVE-DIRECTION.md) and [wireframes](PORTFOLIO-WIREFRAMES.pdf) when implementing an approved milestone.

## Milestones and approval

Start each milestone with **CURRENT STEP** and identify the intended change, files and decisions. End with **STEP SUMMARY**, verified results, outstanding decisions and a request for approval. Stop at each gate. A request for revisions authorizes work on the current milestone. Explain and obtain approval before changing an earlier creative decision.

Steps 0–3 and Milestones 4.1–4.8 are approved. Yancy approved the look of the Milestone 4.9 motion, interaction and DM Sans revisions and requested a final audit. On 22 November 2026, Yancy approved the expanded YANCEYANCEREVOLUTION case study under Freelance Work. The portfolio-wide audit is ready for sign-off. [Final audit](FINAL-AUDIT.md) · [Interaction recording](PORTFOLIO-INTERACTION-PREVIEW.webm) · [Implementation notes](README.md#navigation-and-motion)

Deployment requires separate approval of the host and final domain.

**Revamp (in progress, 26 November 2026).** Yancy asked for a full look-and-feel revamp that keeps all work and text. From three homepage concepts in `mockups/`, Yancy chose **Afterhours**: dark and expressive, drawing on the YANCEYANCEREVOLUTION palette. Yancy approved GSAP with Lenis for smooth scrolling and transitions, which replaces the earlier native-scrolling rule. Reduced motion, keyboard access, touch momentum and browser history must still work. The taste-skill (`.agents/skills/design-taste-frontend`) is used for its checks only. Where it conflicts with this brief, this brief wins, so captions and credits stay. Yancy approved the Afterhours v2 homepage and the full-bleed case opener, along with the audit fixes, and asked for the Astro build. Milestone R1 (foundations and homepage) is implemented and awaits approval. [Afterhours direction](CREATIVE-DIRECTION.md#afterhours-revamp-from-26-november-2026) · [Audit](mockups/AUDIT-AFTERHOURS-V2.md). Where the Afterhours direction differs from the rules below, it supersedes them: the palette (night, bone, yellow-green, purple), the condensed display type, Lenis with GSAP motion and the fixed header. Every other rule still applies.

## Content and visual direction

- Use **Yancy Tupas** as the display name. The approved homepage keeps the square LMT initials fixed while the two words of the name settle on their baselines. Give the three flagships equal prominence in their confirmed order of Advenient, KOTA Center Davao, then Wünderbar.
- Use PORTFOLIO 2026 as the primary source. The old site supplies existing wording and artwork associations. Preserve the original voice, aspect ratios, credits and files. Confirm missing facts and material changes with Yancy. [Content inventory](CONTENT-INVENTORY.md)
- Yancy added **YANCEYANCEREVOLUTION** to Freelance Work on 22 November 2026 and requested a case-study treatment. Its separate Drive folder contains the signed November 2026 kit for Yancy’s DJ alias. The case study presents eight full kit pages alongside the original cover, five mix covers and two posters. Its index entry, breadcrumb and next project follow Freelance Work. [Source register](CONTENT-INVENTORY.md#freelance-work-8)
- Yancy confirmed **2021–Present** for independent freelance work. On 21 November 2026, Yancy confirmed the public availability line “Open to full-time, freelance and contract work. Remote-friendly.” Contact uses the published email address, Behance and LinkedIn.
- About pairs Yancy’s biography with the original two-frame portrait and links to the verified two-page résumé. Credit the Wünderbar cocktail drawings to “Collaborating illustrator” for this review and the menu layouts to Yancy.
- Keep **Case Studies**, **Freelance Work**, **Professional Work** and **Misc.** as four sections of one Work index. Keep 500D under Professional Work with its existing 16 approved public samples. Yancy confirmed **2025** as the display year for all six SUM Digital projects. Follow the inventory for the seven skills and five core tools.
- Use Bricolage Grotesque for names, headings and labels. Use self-hosted DM Sans Regular for body copy and introductions. Use the approved paper and ink palette with blue for links and focus. Give project images room to show their own colors. Keep shared values in `src/styles/tokens.css`.

## Implementation and review

- Use static Astro, plain CSS, self-hosted fonts and native scrolling. Prerender readable content and ordinary links. Add small JavaScript enhancements only for approved interactions.
- Yancy approved smooth scrolling and motion across the site. Use native smooth scrolling for pointer-activated section links and stepped mouse wheels. Preserve touch and trackpad momentum, keyboard navigation, browser history and the visitor’s reduced-motion preference. Carry the selected title into the project and introduce artwork once as it enters view.
- Keep shared public profile copy in `src/data/`. Keep private inventory records and review documents outside the public site. Use verified, optimized derivatives in the site and retain their sources.
- Preserve semantic headings, keyboard access, visible focus, generous touch targets, image proportions and accessible text contrast. Keep links usable by touch and keyboard. Respect reduced motion and let visitors reach the work immediately.
- Base editorial columns on the usable width of the page at the reader’s text size. Use thumbnails on touchscreens. Give the artwork the full available height in the landscape viewer and return visitors to their selected image on close.
- On Windows use `npm.cmd`. Run `npm.cmd run check` and `npm.cmd run build` for implementation changes and test the affected behavior in the browser. Report actual measurements and any checks that remain open. [Local development](README.md)
- Get explicit approval before committing, pushing, publishing, deleting original files or changing Windows security settings. Update this file as milestones and creative decisions are approved.
