# Yancy Tupas · Visual and interaction research

20 November 2026 · Step 2

**Give Yancy Tupas the opening moment.** Of the references, Ross Mason offers the clearest lesson for that choice. His name is recognizable on its own, then stays visible as the work takes over. For your portfolio, I’d test a brief introduction that leaves the route to Work available from the first frame. A still version should carry the same identity. [Ross Mason](https://iamrossmason.com/)

Across the references, three things make the work easier to read. A large name or image gets the first look, with quieter labels nearby. Something familiar stays in place when the view changes. And the strongest phone layouts rearrange the content so that project names and artwork are legible together. [Grégory Lallé](https://gregorylalle.com/) · [Super 8 Studio](https://supereightstudio.com/) · [Moiséz](https://moisez.com/)

## What the eleven references show

The ten standalone sites were opened at 1,440 × 900 and at an emulated phone size of 390 × 844. I followed project links and tested selected controls. Saboor’s X post was accessible on mobile with four original still images. Those images support observations about composition and typography. They supply no evidence of interaction, responsive behavior or motion timing.

### Introducing a designer

- **Ross Mason.** A small image sits between the two parts of his name during the introduction. The settled view pairs an image rail with an oversized wordmark along the bottom. Switching to *List* keeps the name in place and brings the project names forward. On phone, an adjacent image peeks into view and the wordmark stacks. The continuity matters more than the length of the entrance. [Opening](https://iamrossmason.com/) · [List view](https://iamrossmason.com/list)
- **Olha Lazarieva.** A ring of rotating lettering precedes a wide, tightly set professional title and a black-and-white portrait. The phone layout breaks the title into two lines, places the portrait below, and keeps a recent-work link in reach. Tapping it opened a case with a large image followed by the service, industry and year. That short path gives the introduction somewhere to lead. [Portfolio](https://www.olhalazarieva.com/) · [Yevgeniya Grab case](https://www.olhalazarieva.com/grab)
- **Studio Null.** A faceted blue pyramid occupies the center of an otherwise sparse white screen. Small controls sit at the edges. *Info* opens reading matter on the right on desktop and in one column on phone. The visible control changes to *Close*. This demonstrates the force of a single focal point, and how much attention an object can take from the designer’s name. [Studio Null](https://www.madebynull.com/)
- **Moiséz.** Three small project images interrupt enormous, closely spaced words on a faint grid. Each image leads to work in a physical or digital setting. On phone, the words stack and the images form one strip underneath. The Tribu case carries the grid into a different palette. For Yancy, the transferable idea is to use real applications as evidence of range. [Portfolio](https://moisez.com/) · [Tribu](https://moisez.com/work/tribu/)

### Finding a project and staying oriented

- **Grégory Lallé.** Rows of small project images flank a narrow index on a white field. Choosing an Orage thumbnail brought a much larger image into focus while the project number and index stayed visible. On phone, the media forms a vertical strip beside the list. The index tells visitors which project they’re examining even after its image changes scale. [Work index](https://gregorylalle.com/) · [Orage focus view](https://gregorylalle.com/focus#orage)
- **Francesco Michelini.** A wide, shallow artwork strip shares the screen with a project number, title and compact production credits. Both *Next* and the mouse wheel advanced the selection. The image and title changed together, then the briefly scrambled metadata settled. The phone menu exposes three plainly named destinations. This sequencing suits a short selection of projects. Wheel-driven switching would interrupt a long case-study read. [Francesco Michelini](https://www.francescomichelini.com/)
- **Jetton.** A condensed headline and sparse monospaced captions give way on scroll to a full-width photographic project. The headline measured about 134 px on desktop and 50 px on phone. Hovering over *Works* added a circular pointer treatment. Selecting it cleared the page before the work index appeared with grid, list and category controls. The larger photograph makes the project feel distinct from its introduction. The extra wait offers little on a return visit. [Home](https://demo.clapat-templates.com/jetton/) · [Work index](https://demo.clapat-templates.com/jetton/portfolio-grid.html)
- **Super 8 Studio.** A condensed black-and-turquoise headline overlaps an orange sun on a warm ground. Scrolling reveals a dark work section with a serif heading and paired project covers. Phone visitors get a single column. Selecting Ripple Treasury carries the same blue identity into the case, where a short line gives the context. A recognizable cover does some of the work of a page transition. [Home](https://supereightstudio.com/) · [Ripple Treasury](https://supereightstudio.com/work/ripple-treasury)

### Directing attention with images

- **LEEROY.** A centered serif headline sits in generous space above a reel. The headline measured 100 px on desktop and about 42 px on phone. Hovering over *Projets* inverted the link’s contrast. On phone, *Menu* opens large, full-width links. The small navigation leaves room for the reel without sacrificing a direct route to the projects. [Home](https://www.leeroy.ca/) · [Projects](https://www.leeroy.ca/projets)
- **Voy Design.** On a dark green field, a runner anchors the center while smaller images occupy the edges. On phone, the identity and headline move into the middle. *Explore artwork* reveals directional controls and a reset. Scrolling still reaches the editorial content. The footer’s *Pause motion* changed to *Resume motion* when activated. With reduced motion enabled, the page started paused. Exploration works here because the reader can choose it. [Voy Design](https://design.joinvoy.com/)
- **Saboor’s X post.** Four tall product-site studies each commit to a different image. One uses a face and hand emerging from clouds, another a handheld device on cream, and a third a blue sculptural figure. In the fourth, green hills frame a software interface. Headlines are sized and placed around those particular images. For a brand portfolio, an actual application can do that compositional work. The SaaS dashboards, customer logos and sales metrics belong to the examples. [Original post with four images](https://x.com/uisabor/status/2123394478853513496)

## Motion the browser confirmed

| Observed behavior | Verified implementation detail |
| --- | --- |
| Studio Null’s *Info* button changes to *Close* as the information panel opens. | Its button background transition measured 180 ms with CSS `ease`. The central object uses paired forward and reverse video elements. [Studio Null](https://www.madebynull.com/) |
| Super 8 introduces the breadcrumb and title as the Ripple case opens. | The breadcrumb’s opacity ran for 800 ms and its movement for 900 ms, both with `cubic-bezier(0.2, 0.65, 0.25, 1)`. [Ripple case](https://supereightstudio.com/work/ripple-treasury) |
| LEEROY splits lettering into upper and lower parts on entry to Projects. | The upper and lower letter wrappers each reported a 1,000 ms transform with an ease-in-out curve. [LEEROY Projects](https://www.leeroy.ca/projets) |
| Jetton’s *Works* link shows a circular hover cue before the transition to the index. | The desktop demo loaded GSAP 3.13 and Lenis. The browser also reported a 200 ms animation on the navigation word during the transition. [Jetton](https://demo.clapat-templates.com/jetton/) |

## What to carry into Yancy’s portfolio

- **Let the name introduce the work once.** The hypothesis to test is that keeping the name or selected project title visible through the first change of view will make the handoff easier to follow. Compare a single reveal with a still opening. An obligatory percentage loader, cursor-only instruction or repeated introduction would add friction for someone returning to a case.
- **Give the three flagships room for different evidence.** Advenient can follow the caret from the growth brief to the identity and staff ID. KOTA can follow the mark into templates and identify the organization’s later uses after handover. Wünderbar can connect the identity to a menu while keeping Yancy’s layout credit distinct from the cocktail illustration credit. Let the reader stop and inspect these details at their own pace. [Content inventory](CONTENT-INVENTORY.md)
- **Make the other 18 projects easy to scan.** Keep project names visible and reachable by touch or keyboard, with hover previews as an extra. The 16 approved 500D samples can be browsed as a selection. Show portrait music posters with their edges intact. For *back to friends*, both the published image and the Drive original are 682 px wide. Neither collection needs a manufactured case-study narrative. [Content inventory](CONTENT-INVENTORY.md)

## Questions for creative direction

1. Within the name-led opening, would you like the name to stand alone, or share the frame with a personal mark or portrait you choose?
2. After the introduction, would you prefer to invite visitors into one flagship or let them choose among all three?
