// Platform catalogue and external search link builders.
// `integration` describes what the app can do in-app:
//   'api'      – real results fetched through the server (no key needed)
//   'api-key'  – real results once the user adds their own key in Settings
//   'link'     – external search link only

export const GROUPS = [
  { id: 'buy', name: 'Purchase and download' },
  { id: 'stream', name: 'Streaming and previews' },
  { id: 'research', name: 'Research and identification' },
];

export const MARKETS = [
  { id: 'us', name: 'United States', qobuz: 'us-en', apple: 'us' },
  { id: 'gb', name: 'United Kingdom', qobuz: 'gb-en', apple: 'gb' },
  { id: 'ie', name: 'Ireland', qobuz: 'ie-en', apple: 'ie' },
  { id: 'de', name: 'Germany', qobuz: 'de-de', apple: 'de' },
  { id: 'fr', name: 'France', qobuz: 'fr-fr', apple: 'fr' },
  { id: 'nl', name: 'Netherlands', qobuz: 'nl-nl', apple: 'nl' },
  { id: 'be', name: 'Belgium', qobuz: 'be-fr', apple: 'be' },
  { id: 'es', name: 'Spain', qobuz: 'es-es', apple: 'es' },
  { id: 'it', name: 'Italy', qobuz: 'it-it', apple: 'it' },
  { id: 'se', name: 'Sweden', qobuz: 'se-en', apple: 'se' },
  { id: 'au', name: 'Australia', qobuz: 'au-en', apple: 'au' },
  { id: 'nz', name: 'New Zealand', qobuz: 'nz-en', apple: 'nz' },
  { id: 'ca', name: 'Canada', qobuz: 'ca-en', apple: 'ca' },
  { id: 'jp', name: 'Japan', qobuz: 'jp-ja', apple: 'jp' },
  { id: 'ph', name: 'Philippines', qobuz: null, apple: 'ph' },
];

export function market(id) {
  return MARKETS.find((m) => m.id === id) || MARKETS[0];
}

const e = encodeURIComponent;
const plus = (q) => e(q).replace(/%20/g, '+');

export const PLATFORMS = [
  { id: 'bandcamp', name: 'Bandcamp', group: 'buy', color: '#629aa9', integration: 'link',
    search: (q) => `https://bandcamp.com/search?q=${plus(q)}&item_type=t`,
    artist: (q) => `https://bandcamp.com/search?q=${plus(q)}&item_type=b`,
    label: (q) => `https://bandcamp.com/search?q=${plus(q)}&item_type=b`,
    genre: (g) => `https://bandcamp.com/discover/${e(slug(g))}` },
  { id: 'beatport', name: 'Beatport', group: 'buy', color: '#01ff95', integration: 'link',
    search: (q) => `https://www.beatport.com/search/tracks?q=${plus(q)}`,
    artist: (q) => `https://www.beatport.com/search/artists?q=${plus(q)}`,
    label: (q) => `https://www.beatport.com/search/labels?q=${plus(q)}`,
    genre: (g) => `https://www.beatport.com/search?q=${plus(g)}` },
  { id: 'traxsource', name: 'Traxsource', group: 'buy', color: '#3a8fd6', integration: 'link',
    search: (q) => `https://www.traxsource.com/search?term=${plus(q)}`,
    artist: (q) => `https://www.traxsource.com/search?term=${plus(q)}`,
    label: (q) => `https://www.traxsource.com/search?term=${plus(q)}` },
  { id: 'juno', name: 'Juno Download', group: 'buy', color: '#f5a623', integration: 'link',
    search: (q) => `https://www.junodownload.com/search/?q%5Ball%5D%5B%5D=${plus(q)}`,
    artist: (q) => `https://www.junodownload.com/search/?q%5Bartist%5D%5B%5D=${plus(q)}`,
    label: (q) => `https://www.junodownload.com/search/?q%5Blabel%5D%5B%5D=${plus(q)}` },
  { id: 'qobuz', name: 'Qobuz', group: 'buy', color: '#5ea0ef', integration: 'link', regional: true,
    search: (q, m) => (m.qobuz ? `https://www.qobuz.com/${m.qobuz}/search?q=${e(q)}` : null),
    artist: (q, m) => (m.qobuz ? `https://www.qobuz.com/${m.qobuz}/search?q=${e(q)}` : null) },
  { id: 'discogs', name: 'Discogs', group: 'buy', color: '#b9b9b9', integration: 'api-key', research: true,
    search: (q) => `https://www.discogs.com/search/?q=${plus(q)}&type=all`,
    artist: (q) => `https://www.discogs.com/search/?q=${plus(q)}&type=artist`,
    label: (q) => `https://www.discogs.com/search/?q=${plus(q)}&type=label`,
    genre: (g) => `https://www.discogs.com/search/?style_exact=${plus(g)}&type=release` },

  { id: 'soundcloud', name: 'SoundCloud', group: 'stream', color: '#ff5500', integration: 'link',
    search: (q) => `https://soundcloud.com/search/sounds?q=${e(q)}`,
    artist: (q) => `https://soundcloud.com/search/people?q=${e(q)}`,
    label: (q) => `https://soundcloud.com/search/people?q=${e(q)}`,
    genre: (g) => `https://soundcloud.com/tags/${e(slug(g))}` },
  { id: 'spotify', name: 'Spotify', group: 'stream', color: '#1ed760', integration: 'link',
    search: (q) => `https://open.spotify.com/search/${e(q)}/tracks`,
    artist: (q) => `https://open.spotify.com/search/${e(q)}/artists`,
    genre: (g) => `https://open.spotify.com/search/${e(g)}/playlists` },
  { id: 'applemusic', name: 'Apple Music', group: 'stream', color: '#fa2d48', integration: 'api', regional: true,
    search: (q, m) => `https://music.apple.com/${m.apple}/search?term=${e(q)}`,
    artist: (q, m) => `https://music.apple.com/${m.apple}/search?term=${e(q)}` },
  { id: 'youtube', name: 'YouTube', group: 'stream', color: '#ff3b30', integration: 'link',
    search: (q) => `https://www.youtube.com/results?search_query=${plus(q)}`,
    artist: (q) => `https://www.youtube.com/results?search_query=${plus(q)}`,
    label: (q) => `https://www.youtube.com/results?search_query=${plus(q)}`,
    genre: (g) => `https://www.youtube.com/results?search_query=${plus(`${g} mix`)}` },
  { id: 'mixcloud', name: 'Mixcloud', group: 'stream', color: '#5000ff', integration: 'link',
    search: (q) => `https://www.mixcloud.com/search/?q=${e(q)}`,
    artist: (q) => `https://www.mixcloud.com/search/?q=${e(q)}&type=user`,
    genre: (g) => `https://www.mixcloud.com/discover/${e(slug(g))}/` },

  { id: '1001tracklists', name: '1001Tracklists', group: 'research', color: '#e8e8e8', integration: 'link',
    search: (q) => `https://www.1001tracklists.com/search/result.php?main_search=${plus(q)}&search_selection=2`,
    artist: (q) => `https://www.1001tracklists.com/search/result.php?main_search=${plus(q)}&search_selection=2` },
  { id: 'discogs-research', alias: 'discogs', name: 'Discogs', group: 'research', color: '#b9b9b9', integration: 'api-key',
    search: (q) => `https://www.discogs.com/search/?q=${plus(q)}&type=release` },
  { id: 'musicbrainz', name: 'MusicBrainz', group: 'research', color: '#ba478f', integration: 'api',
    search: (q) => `https://musicbrainz.org/search?query=${plus(q)}&type=recording&method=indexed`,
    artist: (q) => `https://musicbrainz.org/search?query=${plus(q)}&type=artist&method=indexed`,
    label: (q) => `https://musicbrainz.org/search?query=${plus(q)}&type=label&method=indexed`,
    genre: (g) => `https://musicbrainz.org/tag/${e(g.toLowerCase())}` },
  { id: 'lastfm', name: 'Last.fm', group: 'research', color: '#d51007', integration: 'api-key',
    search: (q) => `https://www.last.fm/search/tracks?q=${plus(q)}`,
    artist: (q) => `https://www.last.fm/search/artists?q=${plus(q)}`,
    genre: (g) => `https://www.last.fm/tag/${plus(g.toLowerCase())}` },
];

// Platforms the user can toggle (aliases follow their parent).
export const TOGGLEABLE = PLATFORMS.filter((p) => !p.alias);

function slug(s) {
  return String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function isEnabled(p, settings) {
  const off = settings?.disabledPlatforms || [];
  return !off.includes(p.alias || p.id);
}

/**
 * Build grouped external links for a query.
 * kind: 'search' | 'artist' | 'label' | 'genre'
 */
export function buildLinks(query, { kind = 'search', settings = {} } = {}) {
  const m = market(settings.market);
  const out = [];
  for (const g of GROUPS) {
    const links = PLATFORMS.filter((p) => p.group === g.id && isEnabled(p, settings)).map((p) => {
      const fn = p[kind];
      const href = fn ? fn(query, m) : null;
      return href ? { id: p.id, platform: p.alias || p.id, name: p.name, color: p.color, href, regional: !!p.regional } : null;
    }).filter(Boolean);
    if (links.length) out.push({ ...g, links });
  }
  return out;
}

export function platformName(id) {
  return PLATFORMS.find((p) => p.id === id || p.alias === id)?.name || id;
}

/** Short monogram used inside the platform badge. */
export const MONOGRAM = {
  bandcamp: 'bc', beatport: 'bp', traxsource: 'tx', juno: 'jd', qobuz: 'qb', discogs: 'dg', 'discogs-research': 'dg',
  soundcloud: 'sc', spotify: 'sp', applemusic: 'am', youtube: 'yt', mixcloud: 'mc',
  '1001tracklists': '1k', musicbrainz: 'mb', lastfm: 'fm', web: '↗',
};
