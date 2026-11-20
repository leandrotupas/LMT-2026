// The index artwork comes from the PORTFOLIO 2026 master.
export interface CaseArtwork {
  image: ImageMetadata;
  alt: string;
  caption: string;
}

export const flagships = [
  {
    slug: 'advenient',
    sharesCover: true,
    href: '/work/advenient/',
    format: 'case',
    title: 'Advenient',
    year: 2024,
    discipline: 'Identity and print',
    applicationCaption: 'The Advenient Playbook',
    applicationAlt: 'The Advenient Playbook with its turquoise and yellow cover.',
    width: 844,
    height: 475,
    largestRendition: 840,
    identityColor: '#09b2b5',
  },
  {
    slug: 'kota-center-davao',
    sharesCover: true,
    href: '/work/kota-center-davao/',
    format: 'case',
    title: 'KOTA Center Davao',
    year: 2024,
    discipline: 'Identity and social templates',
    applicationCaption: 'Recollection event cover',
    applicationAlt: 'KOTA’s Recollection event graphic with a red line over the team photograph.',
    width: 1201,
    height: 631,
    largestRendition: 840,
    identityColor: '#cc0000',
  },
  {
    slug: 'wunderbar',
    sharesCover: false,
    href: '/work/wunderbar/',
    format: 'case',
    title: 'Wünderbar',
    year: 2025,
    discipline: 'Identity and menus',
    applicationCaption: 'Business cards',
    applicationAlt: 'Two navy Wünderbar business cards arranged on a wooden block.',
    width: 595,
    height: 447,
    largestRendition: 595,
    identityColor: '#03256c',
  },
] as const;

export const [advenientProject, kotaProject, wunderbarProject] = flagships;

export type CaseStudy = (typeof flagships)[number] & {
  introduction: string;
  role: string;
  credits: { role: string; people: string }[];
  documents: { label: string; href: string; pages: number }[];
};
