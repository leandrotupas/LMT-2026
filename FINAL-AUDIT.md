# Yancy Tupas · Final portfolio audit

22 November 2026 · Milestone 4.9 · Local build

The portfolio contains 25 static pages and 22 projects. The Work index has three flagship case studies, eight freelance projects, seven professional projects and four miscellaneous projects. YANCEYANCEREVOLUTION is a fourth long-form case study, filed under Freelance Work. The two navigation and accessibility defects found during review are fixed. [Local case-study preview](http://127.0.0.1:4321/work/yanceyancerevolution/)

## YANCEYANCEREVOLUTION

The signed November 2026 kit identifies this as Yancy’s own DJ identity. The case study follows UXPH in the alphabetical Freelance Work section. Six narrative sections connect the music brief and design decisions to the finished artwork. Visitors can enlarge 16 pieces, including eight original kit pages, five mix covers and two posters, plus the supplied cover. The six added pages were rendered from the verified PDF at three widths. All eight page images were compared with the corresponding PDF pages. The full download matches the 1,451,728-byte Drive original by SHA-256. [Source register](CONTENT-INVENTORY.md#freelance-work-8)

In Chrome, Firefox and WebKit, the Work entry identified the page as a case study, all 16 full-size artworks loaded with matching captions, and the brand-kit link returned the PDF. With JavaScript disabled on an emulated phone, the Work index and the UXPH footer both reached the case study, artwork opened directly and the breadcrumb returned to Freelance Work. All 22 project footers were checked against the next project in their category.

## Findings and fixes

| Finding | Change and verification |
| --- | --- |
| Keyboard users could skip over the zoomed artwork and miss its pannable region. | Zoom now adds the image area to the tab order and gives it the current artwork caption as its accessible name. Arrow keys moved the magnified image about 151 pixels in all three browser engines. Fitting or closing the artwork restores the usual focus order. |
| On WebKit, rotating immediately after Back from 500D could bring a different Work category into view. | Work section headings now fade in place while the selected fragment settles. In seven consecutive rotation tests, Professional Work landed within one pixel of its intended 24-pixel offset. Scrolling away before rotating preserved the visitor’s reading position. |
| The new project’s long name crowded the cover caption and the preceding project’s footer at 200% text size. | The caption now reads “Brand kit cover.” The project name wraps at its component words in headings and links. A repeat of the 450 layouts found zero horizontal overflows, split words, overlapping elements or interactive targets smaller than 44 × 44 CSS pixels. |

## Site checks

| Area | Verified result |
| --- | --- |
| Build | Astro checked 32 files with zero errors, warnings or hints. The local build and a separate build configured with a reserved example origin each generated 25 pages. |
| Links and artwork | All 249 internal page and fragment references in the local build resolved. All 442 unique local page and asset URLs inspected returned HTTP 200. All 377 distinct responsive image width labels matched their files. The site contains 139 captioned viewer entries. |
| Search and sharing | All 25 pages have unique titles, descriptions, a main heading and social metadata. All 23 sharing cards are 1,200 × 630 JPEGs. The release configuration generated matching canonical URLs and 25 sitemap entries. The local preview uses `noindex`. |
| Layout and typography | Tested widths from 320 to 1,920 CSS pixels and six additional configurations at 200% text size. DM Sans is assigned to all 49 reading blocks across 23 pages. About body text measured 18 px with 27.9 px leading on a phone and 20 px with 31 px leading on desktop. Blocking the reading font left the text readable in the system fallback. |
| Input and motion | Chrome, Firefox and WebKit passed the navigation, history, hover, touch, zoom, reduced-motion and JavaScript-disabled journeys. A failed full-size image kept its thumbnail visible and allowed navigation to the next image. |
| Accessibility | axe-core 4.10.3 reported zero violations across 35 page and interaction states. Manual checks covered the color-contrast items that automation deferred, keyboard panning, focus return, forced-colors focus and the scrollable landscape viewer controls. On the paper background, the measured ratios were 14.90 to 1 for primary text, 6.58 to 1 for secondary text and 7.37 to 1 for links. |
| Editorial checks | The homepage keeps Advenient, KOTA Center Davao and Wünderbar in their approved order. All 16 full-size 500D samples match the approved public hashes. Wünderbar carries the agreed illustration credit. The résumé matches the verified original. About and Contact retain the confirmed dates, availability, skills, tools and profile destinations. |

## Mobile load measurements

Three cold Chrome runs per page used a 390 × 844 CSS pixel viewport at 2× device scale, 4× CPU slowdown, 100 ms simulated latency and 1.6 Mbit/s download throughput. Largest Contentful Paint (LCP) measures when the largest visible content appeared. Cumulative Layout Shift (CLS) measures unexpected movement. Transfer totals include the resources fetched during the test window.

| Page | Median LCP | Highest CLS | Median transferred |
| --- | ---: | ---: | ---: |
| Home | 584 ms | 0 | 109 KiB |
| Work | 548 ms | 0.0003 | 261 KiB |
| About | 580 ms | 0 | 122 KiB |
| Advenient | 588 ms | 0 | 144 KiB |
| Wünderbar | 1,128 ms | 0.0005 | 217 KiB |
| 500D | 1,148 ms | 0.0464 | 467 KiB |
| YANCEYANCEREVOLUTION | 588 ms | 0.0064 | 216 KiB |

## Approval status

On 22 November 2026, Yancy approved the expanded YANCEYANCEREVOLUTION case study under Freelance Work, including the eight numbered brand-kit pages. The portfolio-wide audit is ready for sign-off.

Real-device and live screen-reader sessions remain unverified. The Behance and LinkedIn destinations match the confirmed profile records. External access restrictions prevented independent verification of those live profile pages. Production hosting, a final domain and real-visitor performance measurements belong to the separate deployment stage.
