import communityStory from '../assets/kota/community-story.png';
import handoverRecollection from '../assets/kota/handover-recollection.png';
import motif from '../assets/kota/motif.png';
import recollection from '../assets/kota/recollection-cover.png';
import redLockup from '../assets/kota/red-lockup.png';
import squareCutout from '../assets/kota/square-cutout.png';
import squareOutline from '../assets/kota/square-outline.png';
import squarePanel from '../assets/kota/square-panel.png';
import references from '../assets/kota/symbol-references.png';
import { kotaProject, type CaseArtwork } from './flagships';

export const kota = {
  ...kotaProject,
  role: 'Identity and social media design',
  introduction: 'A community identity shaped by listening, a borrowed book, and a motif that became the letter K.',
  brief: 'KOTA Center Davao is a nonprofit community center for young boys. The team needed a logo and social templates they could keep using after I handed over the work.',
  inspiration: 'During an early meeting, the client handed me a book. While skimming it, I noticed a Grand Cross badge. Later that night, the direction came together in a dream. A detail of the emblem looked like the letter K.',
  decision: 'The client felt some of my early ideas leaned too heavily on local culture. We wanted to respect Davao’s Indigenous designs. The detail in the badge gave me a different starting point.',
  symbol: 'I used that K-like detail as the foundation of the mark. The two pieces also suggest a flag for belonging and an open door for welcome.',
  system: 'The client wanted red to remain the main brand color. I paired it with white and set headlines in Poppins Bold. The two pieces of the K could become a solid field, an outline or a frame around a photograph.',
  templates: 'I made Facebook page and event covers, square posts and Instagram Stories. A contributor could change the photograph and copy while keeping the same red, type hierarchy and recognizable frame.',
  outcome: 'The client told me how good it felt for KOTA to finally have an identity. After handover, I saw other contributors adapt it on the center’s Facebook page. The Catholic Recollection artwork is one of the organization’s own applications.',
  credits: [
    { role: 'Creative direction, brand design and social templates', people: 'Yancy Tupas' },
    { role: 'Client and creative feedback', people: 'KOTA Center Davao' },
    { role: 'Post-handover application', people: 'KOTA Center Davao and its contributors' },
  ],
  documents: [{ label: 'Portfolio excerpt', href: '/portfolio/kota-center-davao.pdf', pages: 5 }],
};

export const kotaArt = {
  cover: {
    image: recollection,
    alt: 'A red outline of the K crosses the group photograph on KOTA’s Recollection event cover.',
    caption: 'Recollection event cover template',
  },
  story: {
    image: communityStory,
    alt: 'A team huddle framed by a white K-shaped panel above the Story’s headline and sample copy.',
    caption: 'Instagram Story template',
  },
  references: {
    image: references,
    alt: 'A Grand Cross badge beside two red shapes, a flag for identity and community and an open door for acceptance.',
    caption: 'The badge, flag and door in the original social media guide',
  },
  lockup: {
    image: redLockup,
    alt: 'The white two-piece K and Kota Center Davao wordmark on red.',
    caption: 'Primary identity in reverse',
  },
  motif: {
    image: motif,
    alt: 'Repeating outlines of the K surround the words Circle, Closeness, Community, Bond and Trust.',
    caption: 'The mark extended into a pattern',
  },
  outline: {
    image: squareOutline,
    alt: 'A square post with the red outline of the K around a group of boys sitting outdoors.',
    caption: 'Outline over a photograph',
  },
  panel: {
    image: squarePanel,
    alt: 'A solid red text panel covers the left side of a team huddle photograph.',
    caption: 'Solid panel for a headline',
  },
  cutout: {
    image: squareCutout,
    alt: 'A team photograph shows through an angular opening between solid red corners.',
    caption: 'Photograph inside the mark',
  },
  later: {
    image: handoverRecollection,
    alt: 'Hands lift a communion wafer in front of the words Catholic Recollection on a red KOTA post.',
    caption: 'Catholic Recollection. Produced by KOTA after handover.',
  },
} satisfies Record<string, CaseArtwork>;
