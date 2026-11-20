import cards from '../assets/wunderbar/business-cards.png';
import clipboard from '../assets/wunderbar/clipboard.png';
import board from '../assets/wunderbar/drinks-board.png';
import drinksMenu from '../assets/wunderbar/drinks-menu.png';
import later from '../assets/wunderbar/handover-drink.png';
import illustratedMenu from '../assets/wunderbar/illustrated-menu.png';
import blackletter from '../assets/wunderbar/study-blackletter.png';
import cartouche from '../assets/wunderbar/study-cartouche.png';
import octagon from '../assets/wunderbar/study-octagon.png';
import oval from '../assets/wunderbar/study-oval.png';
import spoon from '../assets/wunderbar/study-spoon.png';
import stacked from '../assets/wunderbar/study-stacked.png';
import wordmark from '../assets/wunderbar/wordmark.png';
import { wunderbarProject, type CaseArtwork } from './flagships';

export const wunderbar = {
  ...wunderbarProject,
  role: 'Lead brand identity designer',
  introduction: 'Wünderbar is a mobile pop-up bar created to bring European-inspired cocktails and social rituals into Davao’s events and gatherings.',
  idea: 'I chose Gothic-inspired lettering for the European character the client had in mind. The cocktail-stirring spoon came from the work of making drinks. Beneath the name, DVO, MMXXV and PH stand for Davao, 2025 and the Philippines.',
  exploration: 'I explored more than twenty logo variations with the client. In the badges, the spoon could stand upright. In the wordmarks, it could run the length of the name. The client’s favorite was the same one I wanted to see selected.',
  system: 'The navy and gold came from the client. I paired Squealer’s Gothic letterforms with DM Sans so the drink names, descriptions and supporting text would stay legible on a menu.',
  menus: 'I designed the menu layouts, including how the cocktail drawings sat beside the drink names and descriptions. Another illustrator made the drawings.',
  applications: 'I carried the chosen wordmark into business cards, promotional graphics and signs for the mobile bar. The same lettering had to work on a card someone could take home and on a board at an event.',
  outcome: 'After handover, the client kept in touch. They told me they had taken Wünderbar to flea markets and weddings. Other contributors have since made their own social posts using the identity.',
  credits: [
    { role: 'Brand identity, collateral and menu layouts', people: 'Yancy Tupas' },
    { role: 'Cocktail illustrations', people: 'Collaborating illustrator' },
    { role: 'Creative direction and final selection', people: 'Yancy Tupas and the Wünderbar client' },
    { role: 'Post-handover social artwork', people: 'Wünderbar and its contributors' },
  ],
  documents: [{ label: 'Portfolio excerpt', href: '/portfolio/wunderbar.pdf', pages: 6 }],
};

export const wunderbarArt = {
  clipboard: {
    image: clipboard,
    alt: 'A navy drinks menu clipped to a gold-edged board on rough wooden planks beside a sprig of greenery.',
    caption: 'Drinks menu on a clipboard, design mockup',
  },
  wordmark: {
    image: wordmark,
    alt: 'The white Wünderbar blackletter wordmark on navy, with a gold bar spoon above and DVO, MMXXV and PH below.',
    caption: 'Selected wordmark with the cocktail spoon',
  },
  menu: {
    image: drinksMenu,
    alt: 'A navy menu with the white wordmark above two columns of cocktails and a lower section for mocktails.',
    caption: 'Cocktail and mocktail menu, navy version',
  },
  illustrated: {
    image: illustratedMenu,
    alt: 'On the white menu, colored drawings of a Munich Mule, a Radler and other drinks sit beside their names, descriptions and prices.',
    caption: 'Illustrated menu layout by Yancy Tupas. Drink drawings by a collaborating illustrator.',
  },
  cards: {
    image: cards,
    alt: wunderbarProject.applicationAlt,
    caption: 'Business card mockup',
  },
  board: {
    image: board,
    alt: 'A portrait drinks board combines the Wünderbar wordmark with photographs of three cocktails.',
    caption: 'Event drinks board, design layout',
  },
  later: {
    image: later,
    alt: 'A later Wünderbar post shows a lemon twist above a drink with a line about light beer and sparkling lemonade.',
    caption: 'Social artwork produced by Wünderbar after handover',
  },
} satisfies Record<string, CaseArtwork>;

// A selection of the individual designs on portfolio page 18, in their original proportions.
export const wunderbarStudies = [
  { image: octagon, alt: 'Tall, clipped-corner badge with an upright spoon.' },
  { image: oval, alt: 'Navy oval badge with the spoon in gold.' },
  { image: stacked, alt: 'Angled stacked lettering with a separate Bar.' },
  { image: spoon, alt: 'Narrow lettering with a long spoon beneath it.' },
  { image: cartouche, alt: 'Gold lettering inside a low, rounded navy badge.' },
  { image: blackletter, alt: 'Blackletter wordmark with a horizontal spoon above it.' },
];
