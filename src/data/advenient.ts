import businessCards from '../assets/advenient/business-cards.png';
import construction from '../assets/advenient/construction.png';
import identitySymbol from '../assets/advenient/identity-symbol.png';
import outdoorPosters from '../assets/advenient/outdoor-posters.png';
import palette from '../assets/advenient/palette.png';
import playbook from '../assets/advenient/playbook.png';
import previousLogo from '../assets/advenient/previous-logo.png';
import socialPost from '../assets/advenient/social-post.png';
import staffId from '../assets/advenient/staff-id.png';
import typography from '../assets/advenient/typography.png';
import { advenientProject, type CaseArtwork } from './flagships';

// Yancy’s published case narrative and the full credit block on page 24 of the guide.
export const advenient = {
  ...advenientProject,
  role: 'Lead brand designer',
  introduction: 'From a generic visual identity to a distinct, forward-moving brand built for a growing digital marketing company.',
  growth: 'The client wanted the logo to symbolize growth. To make that idea simple and immediately recognizable, I used a caret (^)—a symbol commonly used to express exponents—as the foundation of the mark.',
  context: 'Advenient is a digital marketing company focused on helping businesses grow and giving talent space to develop their careers. The company had outgrown its original visual identity, which no longer reflected the energy or breadth of its work.',
  approach: 'I personally led the project from client communication through design. The client wanted teal and orange because they felt this combination differentiated Advenient from other digital marketing companies.',
  exploration: 'Before settling on the identity, I considered gradient treatments, a different logo concept and alternative color directions.',
  system: 'The guide includes the approved primary wordmark, single-color and outline treatments, and a stand-alone brand symbol. I developed each to retain the upward exponent gesture while adapting to different backgrounds and applications.',
  colorAndType: 'Verdigris teal and warm orange anchor the identity. A wider palette offers contrast and variety where needed, while DM Sans keeps everything legible, from oversized headlines to smaller body text.',
  applications: 'Once the identity direction was established, the client and I worked closely on tangible brand applications, particularly business cards, staff IDs and ID slings, alongside social and print designs.',
  outcome: 'Every final deliverable received client approval after a collaborative revision process. For each design, I generally prepared about two to three rounds of refinements, considering the client’s preferences alongside my own design recommendations.',
  credits: [
    { role: 'Creative direction and lead design', people: 'Yancy Tupas (Leandro Miguel B. Tupas)' },
    { role: 'Identity and application design', people: 'Harriette Haw, Leandro Miguel B. Tupas, Coleen Yuson' },
    { role: 'Strategy direction and brand strategy', people: 'Harriette Haw, Coleen Yuson' },
    { role: 'Project management', people: 'Valentin Jose Adrian Bonite' },
  ],
  documents: [
    { label: 'Original brand guide', href: '/portfolio/advenient-brand-guide.pdf', pages: 31 },
    { label: 'Portfolio excerpt', href: '/portfolio/advenient.pdf', pages: 5 },
  ],
};

export const advenientArt = {
  playbook: {
    image: playbook,
    alt: advenientProject.applicationAlt,
    caption: advenientProject.applicationCaption,
  },
  symbol: {
    image: identitySymbol,
    alt: 'Rounded orange caret on a square verdigris field.',
    caption: 'Identity symbol',
  },
  previous: {
    image: previousLogo,
    alt: 'Earlier angular A formed from dark blue and light blue triangles.',
    caption: 'Previous identity',
  },
  construction: {
    image: construction,
    alt: 'The caret on its construction grid beside two arrangements of the Advenient wordmark.',
    caption: 'Brandmark construction and wordmark arrangements',
  },
  palette: {
    image: palette,
    alt: 'The guide groups verdigris, white and orange beside charcoal, royal purple, magenta and tekhelet.',
    caption: 'Identity color palette',
  },
  typography: {
    image: typography,
    alt: 'DM Sans in black, bold and regular weights, set in teal on white and white on teal.',
    caption: 'DM Sans type hierarchy',
  },
  outdoor: {
    image: outdoorPosters,
    alt: 'Three outdoor poster mockups in white, orange and teal use the caret shape to frame photographs.',
    caption: 'Outdoor poster mockup',
  },
  social: {
    image: socialPost,
    alt: 'Teal square post with the headline “Outsourcing – simplified.” and a photo inside the angled brand shape.',
    caption: 'Square social post template',
  },
  cards: {
    image: businessCards,
    alt: 'A stack of teal business card fronts carrying the orange caret and white wordmark.',
    caption: 'Business card fronts',
  },
  staff: {
    image: staffId,
    alt: 'A teal staff ID and matching lanyard, with an enlarged orange caret at the foot of the card.',
    caption: 'Staff ID and lanyard mockup',
  },
} satisfies Record<string, CaseArtwork>;
