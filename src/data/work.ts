import { flagships } from './flagships';
import type { ProjectFormat } from './project-formats';
import { y2rIndex } from './yanceyancerevolution';

interface Artwork {
  slug: string;
  title: string;
  titleParts?: string[];
  year: number | string;
  caption: string;
  alt: string;
  width: number;
  height: number;
}

interface IndexProject extends Artwork {
  sharesCover: boolean;
  thumbnail: string;
  preview: string;
  href: string;
  format: ProjectFormat;
}

interface WorkSection {
  id: string;
  title: string;
  projects: IndexProject[];
}

function artworkSection(id: string, title: string, artworks: (Artwork & { format?: ProjectFormat })[]): WorkSection {
  return {
    id, title,
    projects: artworks.map((artwork) => {
      const base = `/images/work/${artwork.slug}`;
      return { ...artwork, thumbnail: `${base}-thumb.webp`, preview: `${base}.webp`, href: `/work/${artwork.slug}/`, format: artwork.format ?? 'project', sharesCover: true };
    }),
  };
}

export const workSections: WorkSection[] = [
  {
    id: 'case-studies',
    title: 'Case Studies',
    projects: flagships.map((project) => {
      const base = `/images/flagships/${project.slug}`;
      return {
        slug: project.slug, title: project.title, year: project.year,
        caption: project.applicationCaption, alt: project.applicationAlt,
        width: project.width, height: project.height,
        thumbnail: `${base}-240.webp`, preview: `${base}-${project.largestRendition}.webp`,
        href: project.href, format: project.format, sharesCover: project.sharesCover,
      };
    }),
  },
  artworkSection('freelance-work', 'Freelance Work', [
    {
      slug: 'backstage', title: 'BACKSTAGE', year: 2026,
      caption: 'Primary logo lockup',
      alt: 'White geometric BACKSTAGE mark and wordmark on a black field.',
      width: 958, height: 540,
    },
    {
      slug: 'bire', title: 'Bire Real Estate', year: 2025,
      caption: 'Business card concept',
      alt: 'A pair of Bire business cards in burgundy and white against a blue-grey background.',
      width: 832, height: 543,
    },
    {
      slug: 'cote', title: 'COTE', year: 2025,
      caption: 'Anniversary poster',
      alt: 'A red COTE anniversary poster with dishes arranged beneath an arch.',
      width: 769, height: 1086,
    },
    {
      slug: 'fishwife', title: 'Fishwife', year: 2025,
      caption: 'Smoked salmon social post',
      alt: 'A Fishwife tin surrounded by white illustrations on a navy field.',
      width: 603, height: 604,
    },
    {
      slug: 'ingenuity', title: 'Ingenuity', year: 2025,
      caption: 'Outdoor poster concept',
      alt: 'Three orange, black and white “Built to last” posters against a hedge.',
      width: 724, height: 543,
    },
    {
      slug: 'micah', title: 'Micah Denise Tupas', year: 2025,
      caption: 'Brand guidelines cover',
      alt: 'Pale blue brand guidelines cover with a large abstract M.',
      width: 824, height: 464,
    },
    {
      slug: 'uxph', title: 'UXPH Mini 2025 — Roadshow', year: 2025,
      caption: 'Cebu speaker lineup',
      alt: 'Orange UXPH Mini Cebu event graphic with the speakers arranged in rows.',
      width: 578, height: 325,
    },
    y2rIndex,
  ]),
  artworkSection('professional-work', 'Professional Work', [
    {
      slug: '500d', title: '500D — Selected Social Design', year: 2026,
      caption: 'Work-Friendly Solo Travel cover',
      alt: 'Orange Work-Friendly Solo Travel graphic beside a photograph of a traveler with headphones.',
      width: 1640, height: 856,
    },
    {
      slug: 'beecot', title: 'Beecot', year: 2025,
      caption: 'Construction-site graphic',
      alt: 'A worker in a hard hat framed by translucent teal architectural shapes.',
      width: 1156, height: 658,
    },
    {
      slug: 'burtkadoos', title: 'Burtkadoos', year: 2025,
      caption: 'Voucher campaign post',
      alt: 'A shopper framed by a yellow loop above a dark blue voucher headline.',
      width: 587, height: 587,
    },
    {
      slug: 'doorless', title: 'Doorless', year: 2025,
      caption: 'Onboarding playbook spread',
      alt: 'A two-page Dutch-language playbook spread with green and blue illustrations.',
      width: 910, height: 640,
    },
    {
      slug: 'insifr', title: 'Insifr', year: 2025,
      caption: 'Coming Soon banner',
      alt: 'Cream ribbon shapes frame a seated man in the Insifr banner.',
      width: 916, height: 340,
    },
    {
      slug: 'move-to-happiness', title: 'Move to Happiness', year: 2025,
      caption: 'Whitepaper opening spread',
      alt: 'A Move to Happiness cover and author introduction with a blue portrait panel.',
      width: 1132, height: 798,
    },
    {
      slug: 'pionative', title: 'Pionative', year: 2025,
      caption: 'Kubernetes campaign banner',
      alt: 'Purple Pionative banner advertising its Kubernetes reference architecture.',
      width: 1011, height: 528,
    },
  ]),
  artworkSection('misc', 'Misc.', [
    {
      slug: 'japanese-type', title: 'Japanese Typography Study', year: 2026,
      caption: 'Dimensional lettering study',
      alt: '“Will It Be Like This Forever?” in red, orange and blue dimensional lettering.',
      width: 1800, height: 828,
    },
    {
      slug: 'music', title: 'Music Posters', year: '2023–2026',
      caption: 'OMG poster, NewJeans',
      alt: 'Blue lettering and a heart-eyed phone on a green NewJeans poster.',
      width: 534, height: 755,
    },
    {
      slug: 'stickers', title: 'Sticker Designs', year: 2026,
      caption: 'Parang Like lettering',
      alt: 'Orange and white Parang Like lettering with a pink starburst on purple.',
      width: 1293, height: 480,
    },
    {
      slug: 'tramp-stamps', title: 'Tramp Stamps', year: 2026,
      caption: 'Orange figure stamp',
      alt: 'An orange halftone figure kneels and leans back inside a white perforated border.',
      width: 945, height: 1287,
    },
  ]),
];

export const workEntries = workSections.flatMap((section) =>
  section.projects.map((project, index, siblings) => ({
    ...project,
    category: { title: section.title, href: `/work/#${section.id}` },
    next: siblings[(index + 1) % siblings.length],
  }))
);

