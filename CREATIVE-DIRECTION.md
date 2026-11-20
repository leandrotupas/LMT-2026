# Yancy Tupas · Creative direction

20 November 2026 · Step 3 proposal for review

**The mark in use** is the organizing idea. Your black LMT initials sit inside their original square beside *Yancy Tupas*. Immediately below, visitors choose among the Advenient playbook, a KOTA event template and Wünderbar stationery. Inside each case, they can trace a decision from the brief to the design it shaped. [Desktop and phone wireframes](PORTFOLIO-WIREFRAMES.pdf)

## Art direction

You confirmed the initials file and equal access to all three flagships. Keep the mark’s proportions, black border and interior space intact. Its left edge aligns with the project images below. The name and project titles share a second left edge. A returning visitor can use Work from the first frame. The alphabetical sequence in the drawings is for review. Public display order is still open. [Confirmed mark](https://drive.google.com/file/d/1DOqXnEnIsjpNqMa0A1FxIClYQeal0LoL/view)

Ross Mason’s introduction showed how a name can remain legible as the work comes into view. Here, the square initials establish that first point of recognition. Grégory Lallé’s index showed why it helps to keep project names in place while an image changes. The Work wireframe applies that principle to KOTA’s template, with its title, year and focus outline still visible alongside it. [Visual research](VISUAL-RESEARCH.md)

Use open margins, flush-left text, thin dividers and square-edged images. In each case, give one application the largest area. A smaller mark, sketch or piece of typography can explain a detail the reader has just seen. Captions name the object. Credits identify who made it. Advenient’s orange caret, KOTA’s red and Wünderbar’s navy and gold belong to their artwork. Keep each original’s proportions and colors, and put any additional mounting space outside it. [Content inventory](CONTENT-INVENTORY.md)

## Typography

**Bricolage Grotesque** gives the full name weight beside the squared initials. Its curved lowercase *y* remains distinct even when the name breaks across two lines. Use the same family at a smaller optical size for links and labels. For the website, set Yancy’s first-person writing in **DM Sans Regular**, following his request for a modern sans serif. The original wireframe PDF shows the earlier Spectral pairing.

| Use | Phone | Wide desktop | Setting |
| --- | --- | --- | --- |
| Full name | 56–76 px, two lines as needed | 108–168 px, one line where it fits | Bricolage 650, optical size 96, normal width. Line height 0.94–0.98, tracking −0.012 to −0.022 em. |
| Page or case title | 48–76 px | 72–116 px | Bricolage 600–650, line height 1.0, tracking around −0.016 em. |
| Group headings and project links | 21–32 px | 26–42 px | Bricolage 600, line height 1.08–1.22. Keep original spelling and capitalization. Long project names wrap in full. |
| Case introduction and prose | Lead 21/29 px, body 18/28 px | Lead 30/39 px, body 20/31 px | DM Sans 400, normal tracking. Keep longer passages to roughly 55–65 characters per line where space allows. |
| Navigation, credits and captions | 14–17 px | 16–21 px | Bricolage 500, small optical size, line height about 1.4. Set credits in sentence case. |

Serve the variable Bricolage Grotesque face and DM Sans Regular locally with their SIL Open Font License notices. Both stacks fall back to Arial and the system sans serif. [Bricolage license](public/licenses/bricolage-grotesque-OFL.txt) · [DM Sans license](public/licenses/dm-sans-OFL.txt)

## Color, grid and spacing

| Role | Value | Use |
| --- | --- | --- |
| Paper | `#F8F6F1` | Primary page and reading background |
| Secondary surface | `#EFEBE4` | Occasional backing around a transparent or white artwork |
| Ink | `#22211F` | Names, headings and main text |
| Secondary text | `#5A5853` | Captions, roles and years |
| Link and focus | `#314AA3` | Underlined inline links, current-category underline and visible focus outline |
| Divider | `#CCC6BE` | Decorative separation between already identifiable rows |

Calculated contrast against Paper is **14.90:1** for Ink, **6.58:1** for Secondary text and **7.37:1** for Link and focus. Against the secondary surface these are **13.54:1**, **5.98:1** and **6.70:1**. Use a 3 px focus outline with clearance. Keep captions on a neutral surface where their contrast is predictable. These values cover the proposed swatches. Keyboard, zoom and responsive behavior need checking in the built site. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

| Viewport | Columns | Outer margin | Gutter |
| --- | ---: | --- | ---: |
| 320–599 px | 4 | 16 px at the narrow end, 20 px at 390 px | 12 px |
| 600–1023 px | 8 | 32 px | 20 px |
| 1024 px and wider | 12 | 48–64 px, then center the content | 24 px |

Cap the inner width at 1,312 px. Use 8–16 px between an image and its caption, 24–32 px between related elements and 64–128 px between sections. Give every navigation or project link a touch target of at least 44 × 44 px, allowing the whole row to act as one link. Let short screens scroll naturally. On narrower screens the name wraps, the project register gains thumbnails, and artwork and captions stay in reading order.

## Pages and preliminary layouts

| Destination | Layout and reader action |
| --- | --- |
| **Home** `/` | Show the initials at about 110–136 px on desktop or 64–76 px on phone. Pair them with the full name, verified role and city. Follow with three equal linked rows for Advenient, KOTA Center Davao and Wünderbar. Each has a real application, title and year. *All work* opens the full index. See wireframe 1. |
| **Work** `/work/` | Give *Case Studies* (3), *Freelance Work* (7), *Professional Work* (7) and *Misc.* (4) their own anchors within one index. Visitors can share a section link such as `/work/#professional-work`. On wide screens use three columns of the grid for category links, five for project rows and four for a captioned preview. Below about 1,200 px, move the thumbnail into each row. Phone category links wrap onto two lines as space permits. The list stays usable with a keyboard and with JavaScript off. See wireframe 2. |
| **Project** `/work/{slug}/` | A stable address for each published project. The three flagships carry full narratives. The other 18 can use a short description, role and selected work. Keep *500D — Selected Social Design* under Professional Work with its 16 approved samples. Link back to the relevant index section. |
| **About** `/about/` | Use the existing biography, experience and education, followed by the seven approved skills, five core tools and résumé link. Set the biography in the same reading measure as case prose. |
| **Contact** `/about/#contact` | The global Contact link lands directly on the published email address and verified Behance and LinkedIn profiles. Use ordinary links. The availability statement can wait for confirmation. |

**Flagship page.** In the Advenient example, the title, role, year and existing introduction precede the playbook image. The smaller caret sits beside Yancy’s explanation of the growth brief. Continue into the development of the identity, its applications and the complete credits. Yancy led design and shares identity and application credit with Harriette Haw and Coleen Yuson. KOTA’s case instead needs a clear boundary between Yancy’s templates and later work by the organization. Wünderbar’s menu captions must distinguish Yancy’s layout from the cocktail illustrations. See wireframe 3. [Wireframes](PORTFOLIO-WIREFRAMES.pdf) · [Project sources and credits](CONTENT-INVENTORY.md)

## Motion and input

| Moment | Proposed behavior |
| --- | --- |
| First entrance | Render name, mark, links and artwork immediately. Once per tab, the identity group may settle upward by 4–6 px over 280–340 ms with `cubic-bezier(.2,.75,.25,1)`. Keep the name readable throughout and allow immediate navigation. Repeat visits use the settled composition. |
| Hover or keyboard focus | Underline the project link. On wide screens, update the adjacent preview and caption together with a 140–180 ms ease-out fade. The focus outline appears immediately. Rapid movement always resolves to the latest item. On touch, the first tap opens the project. |
| Scroll | Use native browser scroll. A desktop category rail may stay in view while its index is on screen. Case prose, menus and posters stay still for inspection. |
| Entering or leaving a case | Follow the ordinary link immediately. Where supported, let the selected project title connect the index and case for 220–300 ms. Other content can fade out over 100–140 ms with ease-in. Back should restore the reader’s index position. |
| Reduced motion and fallbacks | Show the final name and mark at first paint. Replace preview fades with immediate changes and use ordinary page navigation. Every title and destination is present in HTML. Keep the native pointer. |

## Technology recommendation

**Use Astro with static output and plain CSS.** A small vanilla JavaScript enhancement can handle desktop preview selection and the once-per-tab entrance. Generate the 21 project routes from a validated collection of approved public fields and assets. Keep the private Drive inventory out of the browser bundle. Pre-render project text, links, credits and image dimensions. Supply responsive image sizes and load images below the fold as needed. This gives every project a direct link and keeps client-side work proportional to the interaction. [Astro components](https://docs.astro.build/en/basics/astro-components/) · [Static and on-demand rendering](https://docs.astro.build/en/guides/on-demand-rendering/) · [Content collections](https://docs.astro.build/en/guides/content-collections/)

| Option | Trade-off for this portfolio |
| --- | --- |
| Next.js / React with Vite | Next.js can export static HTML and offers room for future server features. Those features have little to do here. Vite supports multi-page builds, but a React-first approach needs a routing and pre-rendering plan for independently readable projects. Astro already fits the editorial structure. [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports) · [Vite production builds](https://vite.dev/guide/build.html) |
| Native CSS / View Transitions API | CSS covers focus, fades and the small entrance. A cross-document transition is an optional enhancement for same-origin pages that both opt in. Standard links remain the underlying navigation. [Cross-document transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document) · [Reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion) |
| GSAP / Lenis / WebGL | GSAP would earn a place if a later approved sequence needed timeline control. Lenis adds a scrolling layer to maintain, and WebGL adds rendering, loading and fallback work. The existing photographs, vectors and short transitions can carry this direction with native scrolling and ordinary images. [GSAP timelines](https://gsap.com/docs/v3/GSAP/Timeline/) · [Lenis](https://github.com/darkroomengineering/lenis) · [WebGL specification](https://registry.khronos.org/webgl/specs/latest/1.0/) |

## Approval for the foundation

The confirmed choices are the **name with the selected initials** and **a choice among all three flagships**. For Milestone 4.1, the proposed approval covers the type pair, neutral palette and blue interaction color, responsive grid, single Work index, Contact on About, static Astro foundation and native scrolling. The timed effects are targets for later interaction review. The three sheets show the proposed compositions. Public flagship order is a separate editorial decision before the homepage is built.

## Motion refinement in Milestone 4.6

Yancy requested smooth scrolling, transitions and motion across the portfolio. The selected project title carries from the index or the preceding project into its heading. Section links and stepped mouse wheels ease to their destination. Typography settles first and artwork rises a short distance as it enters view. Choosing an image brings it into a full-screen viewer with its caption. The signed homepage entrance retains its original timing. Touch and trackpad momentum, immediate keyboard access and reduced motion remain part of the approved direction.

## Final motion treatment for review

The square initials hold their place while solid ink meets an outline of Yancy’s name. The two words fill from opposite edges and meet their baselines in 730 ms. In Work, the edge of the outgoing print follows the visitor’s direction through the list. Its caption stays in place as the image proportions change.

Where the index and case show the same artwork, the visible cover travels into the case with its title. Wünderbar carries the title between its stationery preview and menu-led opening. Opening an artwork expands the selected print from its own position, with its full-resolution file loading during the move. Reduced motion shows the finished composition and direct state changes.
