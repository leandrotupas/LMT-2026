import type { GalleryArtwork } from './projects';

const slug = 'yanceyancerevolution';
const gallery = `/images/projects/${slug}`;
const index = `/images/work/${slug}`;

export const y2rIndex = {
  slug, title: 'YANCEYANCEREVOLUTION', titleParts: ['YANCE', 'YANCE', 'REVOLUTION'],
  year: 2026, format: 'case' as const, width: 809, height: 633,
  caption: 'Brand kit cover',
  alt: 'The purple y2r mark fills the right side of a yellow-green cover, with the lowercase wordmark on the left.',
};

const brandKit = { label: 'View the brand kit', href: '/portfolio/yanceyancerevolution-brand-kit.pdf', pages: 25 };

export const y2r = {
  slug, role: 'DJ and identity designer',
  introduction: 'I named my DJ project after Dance Dance Revolution. I wanted the artwork to change with each mix and still feel like it came from the same pair of decks.',
  brief: 'I play hard house, techno, trance and speed garage. An unexpected change of pace is part of what I enjoy about a set. I gave myself a similar brief for the visuals. How far could I change one shape and still recognize it on the next cover?',
  mark: 'I use the full name as a signature and y2r when space is tight. I drew the Y and the R so the gap between them traces a 2. The same curve works above the name, beside it or on its own.',
  system: 'I set the headings tight in Neue Haas Grotesk Pro Bold and gave the body copy more space in Roman. Purple, yellow-green and white run through the kit. Keeping those choices consistent let me take more liberties with the mark.',
  mixes: 'On the funk cover, the curve sweeps off the edge. For Brazilian funk, I pulled it into spikes. For hyperpop, I turned the curve into a staircase of pixels. Hard angles and repeating outlines gave me two more ways to work with the same silhouette.',
  posters: 'For the first volume of the dream mix, I ran a field of tiny stars through the mark. One poster carries the name across the bottom. In the other, a tilted photo strip cuts through the pattern and puts my face on the poster.',
  applications: 'On the stickers, the shape itself becomes the edge of the piece. In a video frame I can push just a piece of it into a corner and leave the decks in view. The finished 25-page kit brings those uses together with the logo, lettering, covers and posters.',
  credits: [{ role: 'Identity, brand kit and application design', people: 'Yancy Tupas' }],
  documents: [brandKit],
};

export const y2rCover: GalleryArtwork = {
  src: `${index}.webp`, srcset: `${index}-thumb.webp 240w, ${gallery}/cover-480.webp 480w, ${index}.webp 809w`,
  width: y2rIndex.width, height: y2rIndex.height, alt: y2rIndex.alt, caption: y2rIndex.caption,
};

function plate(file: string, width: number, height: number, caption: string, alt: string): GalleryArtwork {
  const base = `${gallery}/${file}`;
  return {
    src: `${base}.webp`, srcset: `${base}-480.webp 480w, ${base}-900.webp 900w, ${base}.webp ${width}w`,
    width, height, caption, alt,
  };
}

function kitPage(file: string, page: number, title: string, alt: string, width = 1920) {
  return plate(file, width, width * 9 / 16, `${title} · Brand kit, p. ${page}`, alt);
}

export const kit = {
  sound: kitPage('sonic-identity', 6, 'Sonic identity', 'The sound brief sits on a purple field beside a blurred figure under red and blue club lights.'),
  lockups: kitPage('primary-logo', 10, 'Primary lockups', 'The purple y2r symbol sits above the two-line name in one lockup and to its left in the other.'),
  construction: kitPage('mark-construction', 11, 'How the y2r mark is built', 'A diagram labels the Y and R in purple and the number 2 in the white space between them.', 1600),
  type: kitPage('type-family', 13, 'Type family', 'The type specimen pairs tightly spaced bold Neue Haas Grotesk Pro headings with open-set Roman body copy.'),
  palette: kitPage('color-palette', 14, 'Color palette', 'Three labeled swatches show white, purple and yellow-green in that order.'),
  experiments: kitPage('experimentation', 17, 'Mark experiments', 'Four versions of y2r translate its curves into pixels, spikes, a dot screen and sharp corners.'),
  stickers: kitPage('stickers', 20, 'Sticker designs', 'Six yellow-green and purple stickers show the y2r symbol on its own and paired with the wordmark.', 1600),
  overlays: kitPage('video-overlays', 23, 'Video overlays', 'Two stills show a DJ at the decks with purple corner graphics in one frame and a small signature along the bottom of the other.'),
};

export const mixCovers = [
  plate('funk-mix', 1440, 1440, 'Funk mix, volume 1', 'A smooth purple y2r mark runs off the edges of the yellow-green square beside the funk mix title.'),
  plate('angular-mark', 1440, 1440, 'Angular mark', 'The curves of the y2r symbol become flat planes and sharp purple corners.'),
  plate('brazilian-funk', 1440, 1440, 'Brazilian funk mix, volume 1', 'Spiky purple shapes burst across the cover around the small Brazilian funk title.'),
  plate('hyperpop', 1440, 1440, 'Hyperpop mix, volume 1', 'A stair-stepped purple y2r mark sits below the hyperpop mix title.'),
  plate('echo-mark', 1440, 1440, 'Repeating contours', 'Purple and yellow-green outlines repeat around the rounded y2r symbol and extend beyond the edges.'),
];

export const dreamPosters = [
  plate('dream-mix-poster', 1440, 1920, 'Dream mix, volume 1', 'A field of tiny purple stars overlays a pale yellow-green mark above the large wordmark at the foot of the poster.'),
  plate('dream-mix-portraits', 1440, 1920, 'Dream mix, portrait strip', 'An angled black photo strip repeats Yancy’s portrait across a lavender and yellow-green star pattern.'),
];
