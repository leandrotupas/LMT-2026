import artwork from './project-artwork.json';
import { workEntries } from './work';

interface ProjectNotes {
  role: string;
  description: string;
  credit?: string;
}

const notes: Record<keyof typeof artwork, ProjectNotes> = {
  backstage: {
    role: 'Logo and wordmark exploration',
    description: 'I tested arrangements of the mark and text to balance readability, distinctive character and scalability across dark and light applications.',
  },
  bire: {
    role: 'Independent identity study',
    description: 'The logo combines the letter B with a house motif. I explored the identity through business cards, social templates and a 23-page brand guide.',
  },
  cote: {
    role: 'Independent social design study',
    description: 'A social media design challenge built around COTE, including a promotional poster, feed posts, Stories and countdown concepts for its Singapore anniversary.',
  },
  fishwife: {
    role: 'Independent social design study',
    description: 'I used bold motifs, product imagery and expressive composition to explore a series of Fishwife-inspired promotional posts.',
  },
  ingenuity: {
    role: 'Brand design assessment',
    description: 'For a brand-design assessment, I developed a proposed identity refresh for Ingenuity Software. I tested the orange, black and white system on stationery, outdoor posters and digital layouts.',
  },
  micah: {
    role: 'Visual identity and brand guidelines',
    description: 'Micah Denise Tupas is an architectural designer. I built the identity around a sculptural two-part monogram and a graduated blue palette, then documented its use in a 22-page guide.',
  },
  uxph: {
    role: 'Event communication design',
    description: 'For UXPH Mini 2025, I created city-specific promotions, speaker announcements and partner graphics for the roadshow in Manila, Cebu and Davao.',
    credit: 'Produced with Brickroad Studios. I worked with the team’s illustrator on the city artwork.',
  },
  '500d': {
    role: 'Social graphics and production adaptation',
    description: 'I selected sixteen pieces from 123 exports to show how I adapt typography, photography and composition for travel, hospitality, community events and small-business campaigns.',
  },
  beecot: {
    role: 'Brand collateral and brochure layout at SUM Digital',
    description: 'I worked with Beecot’s existing identity on marketing collateral and brochure mockups. Translucent teal shapes frame the architecture and construction photographs.',
  },
  burtkadoos: {
    role: 'Campaign and social graphics at SUM Digital',
    description: 'A series of Dutch-language campaign posts. I paired lifestyle photographs with bold brand shapes to carry different retail messages across the set.',
  },
  doorless: {
    role: 'Editorial design at SUM Digital',
    description: 'A twelve-page Dutch onboarding playbook. Blue headings, illustrated figures and a repeatable page structure organize the introduction, practical steps and frameworks.',
  },
  insifr: {
    role: 'Digital collateral at SUM Digital',
    description: 'I explored Insifr’s brand across screen mockups and digital layouts. The ribbon motif moves between a photographic frame, a background pattern and the wordmark.',
  },
  'move-to-happiness': {
    role: 'Whitepaper layout at SUM Digital',
    description: 'A twelve-page whitepaper on measuring well-being initiatives. I used tables, diagrams and team photography to guide the reader through the methods and reporting examples.',
  },
  pionative: {
    role: 'Campaign graphics at SUM Digital',
    description: 'I adapted a Kubernetes guide campaign for landscape, portrait and square placements, keeping the headline and guide recognizable across formats.',
  },
  'japanese-type': {
    role: 'Personal lettering study',
    description: 'A personal study of Japanese-inspired typography. I explored dramatic letterforms, outlines and dimensional effects in the phrase “Will It Be Like This Forever?”',
  },
  music: {
    role: 'Personal poster design',
    description: 'An independent collection of fan-made posters. I use music as a starting point for experimenting with photography, collage, typography and digital-era nostalgia.',
  },
  stickers: {
    role: 'Illustration and lettering',
    description: 'I focused on punchy composition, self-contained forms and lettering that could carry an idea even at sticker size.',
  },
  'tramp-stamps': {
    role: 'Personal graphic studies',
    description: 'I experimented with compact shapes, layered imagery and bold type. Each piece uses a postage-stamp format to hold a different motif.',
  },
};

export interface GalleryArtwork {
  src: string;
  srcset: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

export const projects = workEntries
  .filter((project) => project.format === 'project')
  .map((project) => {
    const slug = project.slug as keyof typeof artwork;
    const gallery = artwork[slug];
    const cover: GalleryArtwork = {
      src: project.preview, srcset: gallery.coverSet, width: project.width, height: project.height,
      alt: project.alt, caption: project.caption,
    };
    return { ...project, ...notes[slug], cover, groups: gallery.groups };
  });
