// Track title cleaning and input recognition.
// Shared by the browser and the server. No dependencies.

// Promotional tags removed when they appear in brackets or as trailing noise.
const PROMO_WORDS = [
  'free\\s*download', 'free\\s*dl', 'free', 'premiere', 'exclusive premiere', 'exclusive',
  'out now', 'out soon', 'available now', 'buy\\s*=\\s*free\\s*download', 'buy', 'preview', 'snippet',
  'official video', 'official music video', 'official audio', 'official visualizer', 'official lyric video',
  'lyric video', 'lyrics', 'visualizer', 'audio', 'video', 'hq', 'hd', '4k', 'full version',
  'clip', 'teaser', 'promo', 'supported by [^\\]\\)]*', 'played by [^\\]\\)]*', 'as played by [^\\]\\)]*',
  'click buy for free download', 'link in description', 'free dl in description', 'out on [^\\]\\)]*',
  'forthcoming', 'unreleased', 'master', 'final master', 'wip', 'demo',
];
const PROMO_RE = new RegExp(`^\\s*(?:${PROMO_WORDS.join('|')})\\s*[!.]*\\s*$`, 'i');

// Version descriptors that must be preserved.
const VERSION_WORDS = /\b(original|extended|club|dub|radio|vocal|instrumental|acapella|a cappella|vip|edit|remix|rmx|mix|rework|re-?edit|bootleg|flip|version|refix|remaster(?:ed)?|reprise|dub mix|mashup|cover|live|interpretation|re-?mix|rerub|re-?work)\b/i;

const FEAT_RE = /\s*[([]?\s*\b(?:feat\.?|ft\.?|featuring)\s+([^)\]]+?)\s*[)\]]?\s*$/i;

/** Collapse whitespace and odd punctuation copied from web pages. */
export function tidy(s) {
  return String(s ?? '')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Lowercase key for duplicate detection. Keeps version text distinct. */
export function normKey(s) {
  return tidy(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Spaced dash separators used between artist and title. */
export const SEP_RE = /\s+[-–—]{1,2}\s+|\s+[-–—]\s*(?=\S)|(?<=\S)\s*[–—]\s+/;

function stripPromoBrackets(s) {
  let prev;
  do {
    prev = s;
    s = s.replace(/\s*[[(【{]\s*([^\])】}]*)\s*[\])】}]/g, (m, inner) => (PROMO_RE.test(inner) ? ' ' : m));
  } while (s !== prev);
  return s;
}

/**
 * Remove promotional and upload noise from a single line while preserving
 * version and remix information.
 * Returns { text, removed: string[] }.
 */
export function stripNoise(input) {
  let s = tidy(input);
  const removed = [];
  const take = (re, repl = ' ') => {
    s = s.replace(re, (m) => { if (m.trim()) removed.push(m.trim()); return repl; });
  };
  take(/https?:\/\/\S+/gi);
  take(/(?:^|\s)#[\p{L}\p{N}_]+/gu);
  take(/(?:^|\s)@[\p{L}\p{N}_.]+(?=\s|$)/gu);
  // Leading timestamps like 00:00, [1:23:45], (12:30)
  take(/^\s*[[(]?\d{1,2}(?::\d{2}){1,2}[\])]?\s*[-–|.:]?\s*/);
  // Leading track numbers: "01.", "1)", "#3", "03 -" but not bare years or titles like "808 State"
  take(/^\s*(?:#\s*\d{1,3}|\d{1,3}\s*[.)\]]|\d{1,2}\s+-\s+)\s*/);
  const before = s;
  s = stripPromoBrackets(s);
  if (s !== before) removed.push(...diffBrackets(before, s));
  // Trailing promo phrases without brackets, after a separator: "Title | FREE DOWNLOAD", "Title - OUT NOW"
  take(/\s*[|/•]\s*(?:free\s*(?:download|dl)|out now|premiere|official (?:music )?video|buy link[^|]*)\s*!*\s*$/i);
  take(/\s+(?:free\s*(?:download|dl)|out now)\s*!*\s*$/i);
  take(/^\s*(?:premiere|exclusive premiere|free\s*(?:download|dl))\s*[:|\-–]\s*/i);
  // Upload description tails after a pipe: "Artist - Title | Label Records 2024"
  const pipe = s.split(/\s+\|\s+/);
  if (pipe.length > 1 && SEP_RE.test(pipe[0])) {
    removed.push(pipe.slice(1).join(' | '));
    s = pipe[0];
  }
  s = s.replace(/\s*[|]\s*$/, '').replace(/^\s*[-–|:]\s*/, '').replace(/\s{2,}/g, ' ').trim();
  return { text: s, removed: removed.filter(Boolean) };
}

function diffBrackets(a, b) {
  const all = a.match(/[[(【{][^\])】}]*[\])】}]/g) || [];
  const kept = new Set(b.match(/[[(【{][^\])】}]*[\])】}]/g) || []);
  return all.filter((x) => !kept.has(x));
}

/** Split "Artist A feat. B" into main artist and featured list. */
export function splitArtists(artist) {
  const s = tidy(artist);
  const m = s.match(/^(.*?)\s+(?:feat\.?|ft\.?|featuring)\s+(.+)$/i);
  const main = m ? m[1] : s;
  const featured = m ? splitList(m[2]) : [];
  const collaborators = splitList(main, /\s*(?:,|&|\band\b|\bx\b|\bvs\.?\b|\bb2b\b|\bwith\b)\s*/i);
  return { main, featured, collaborators: collaborators.length > 1 ? collaborators : [] };
}

function splitList(s, re = /\s*(?:,|&|\band\b)\s*/i) {
  return tidy(s).split(re).map((x) => x.trim()).filter(Boolean);
}

/**
 * Pull version / remix information out of a title.
 * "Track (Artist Remix)" -> { title: "Track", version: "Artist Remix", remixer: "Artist" }
 */
export function splitVersion(rawTitle) {
  let title = tidy(rawTitle);
  const versions = [];
  let featured = [];
  let label = '';
  // Featured artists in the title: "Track (feat. X)"
  const fm = title.match(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]/i);
  if (fm) { featured = splitList(fm[1]); title = title.replace(fm[0], ' '); }
  else {
    const tail = title.match(FEAT_RE);
    if (tail && !/[([]/.test(tail[0].trim()[0] || '')) { featured = splitList(tail[1]); title = title.replace(tail[0], ''); }
  }
  // Bracketed groups at the end
  let m;
  while ((m = title.match(/\s*([[(])\s*([^()[\]]+?)\s*[)\]]\s*$/))) {
    const inner = m[2].trim();
    if (VERSION_WORDS.test(inner)) versions.unshift(inner);
    else if (m[1] === '[' && /^[A-Z0-9 &.'\-/]+$/.test(inner) && inner.length > 1) label = label || inner; // 1001TL "[LABEL]"
    else break;
    title = title.slice(0, m.index);
  }
  // Unbracketed trailing " - Extended Mix" style
  const dash = title.match(/\s+[-–]\s+([^-–]*\b(?:mix|remix|edit|dub|vip|version|rework|bootleg|instrumental)\b[^-–]*)$/i);
  if (dash) { versions.unshift(dash[1].trim()); title = title.slice(0, dash.index); }
  const version = versions.join(' / ');
  const rm = version.match(/^(.+?)\s+(?:remix|rmx|re-?mix|rework|re-?edit|edit|bootleg|flip|dub|vip mix|refix|rerub)\b/i);
  const remixer = rm && !/^(original|extended|club|radio|vocal|instrumental|dub|vip|short|long|main)$/i.test(rm[1].trim()) ? rm[1].trim() : '';
  return { title: tidy(title), version, remixer, featured, label };
}

/**
 * Parse a messy single-line entry into artist/title/version.
 * Returns null fields where nothing could be identified.
 */
export function parseTrackLine(line) {
  const { text, removed } = stripNoise(line);
  const parts = text.split(SEP_RE);
  let artist = '';
  let rest = text;
  if (parts.length >= 2) {
    artist = parts[0];
    rest = parts.slice(1).join(' - ');
  }
  const v = splitVersion(rest);
  const a = splitArtists(artist);
  const featured = [...new Set([...a.featured, ...v.featured])];
  const unknownArtist = /^(id|\?+|unknown)$/i.test(a.main.trim());
  const unknownTitle = /^(id|\?+|unknown|untitled id)$/i.test(v.title.trim());
  return {
    artist: a.main,
    title: v.title,
    version: v.version,
    remixer: v.remixer,
    featured,
    collaborators: a.collaborators,
    label: v.label,
    unknown: !!(unknownArtist || unknownTitle || !v.title),
    partial: !!(unknownArtist !== unknownTitle),
    hasArtist: !!artist,
    removed,
    cleaned: text,
  };
}

/** Format a track back into one canonical line. */
export function formatTrack(t) {
  const artist = [t.artist, t.featured?.length ? `feat. ${t.featured.join(', ')}` : ''].filter(Boolean).join(' ');
  const title = t.version ? `${t.title} (${t.version})` : t.title;
  return artist ? `${artist} - ${title}` : title;
}

/** Query string suitable for store searches: artist + title + meaningful version. */
export function searchQuery(t, { withVersion = true } = {}) {
  const parts = [t.artist, t.title];
  if (withVersion && t.version && !/^original mix$/i.test(t.version)) parts.push(t.version);
  return tidy(parts.filter(Boolean).join(' '));
}

/** Duplicate detection key for a track. */
export function dedupeKey(t) {
  // "Original Mix" is how many stores label the unremixed version; treat it as no version.
  const v = normKey(t.version || '').replace(/^original(?: mix| version)?$/, '');
  return [normKey(t.artist), normKey(t.title), v].join('|');
}

const URL_PATTERNS = [
  ['soundcloud', /^https?:\/\/(?:www\.|m\.)?soundcloud\.com\//i],
  ['soundcloud', /^https?:\/\/on\.soundcloud\.com\//i],
  ['bandcamp', /^https?:\/\/[^/]+\.bandcamp\.com\//i],
  ['youtube', /^https?:\/\/(?:www\.|m\.|music\.)?youtube\.com\//i],
  ['youtube', /^https?:\/\/youtu\.be\//i],
  ['spotify', /^https?:\/\/open\.spotify\.com\//i],
  ['applemusic', /^https?:\/\/(?:music|itunes)\.apple\.com\//i],
  ['discogs', /^https?:\/\/(?:www\.)?discogs\.com\//i],
  ['mixcloud', /^https?:\/\/(?:www\.)?mixcloud\.com\//i],
  ['beatport', /^https?:\/\/(?:www\.)?beatport\.com\//i],
  ['musicbrainz', /^https?:\/\/(?:www\.)?musicbrainz\.org\//i],
  ['1001tracklists', /^https?:\/\/(?:www\.)?1001tracklists\.com\//i],
];

/** Describe what a URL points at, using only the URL itself. */
export function describeUrl(raw) {
  let url;
  try { url = new URL(raw.trim()); } catch { return null; }
  const platform = (URL_PATTERNS.find(([, re]) => re.test(url.href)) || ['web'])[0];
  const path = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const info = { platform, url: url.href, kind: 'link', hints: {} };
  const deslug = (s) => tidy(String(s || '').replace(/-\d+$/, '').replace(/[-_]+/g, ' '));
  switch (platform) {
    case 'bandcamp': {
      const sub = url.hostname.split('.')[0];
      info.hints.artist = deslug(sub);
      if (path[0] === 'track') { info.kind = 'track'; info.hints.title = deslug(path[1]); }
      else if (path[0] === 'album') { info.kind = 'release'; info.hints.release = deslug(path[1]); }
      else info.kind = 'artist';
      break;
    }
    case 'soundcloud': {
      if (url.hostname.startsWith('on.')) { info.kind = 'short'; break; }
      info.hints.artist = deslug(path[0]);
      if (path[1] === 'sets') { info.kind = 'playlist'; info.hints.release = deslug(path[2]); }
      else if (path[1] && !['tracks', 'albums', 'reposts', 'likes', 'popular-tracks', 'sets'].includes(path[1])) {
        info.kind = 'track'; info.hints.title = deslug(path[1]);
      } else info.kind = 'artist';
      break;
    }
    case 'youtube': {
      const id = url.hostname === 'youtu.be' ? path[0] : url.searchParams.get('v') || (path[0] === 'shorts' ? path[1] : '');
      if (id) { info.kind = 'video'; info.id = id; } else if (url.searchParams.get('list')) info.kind = 'playlist';
      break;
    }
    case 'spotify': {
      const i = path[0]?.startsWith('intl-') ? 1 : 0;
      info.kind = path[i] || 'link'; info.id = path[i + 1];
      break;
    }
    case 'applemusic': {
      const i = path.findIndex((p) => ['album', 'song', 'artist', 'playlist'].includes(p));
      if (i >= 0) {
        info.kind = path[i] === 'song' ? 'track' : path[i];
        info.id = path[path.length - 1].replace(/^id/, '');
        if (path[i] === 'album' && url.searchParams.get('i')) { info.kind = 'track'; info.id = url.searchParams.get('i'); }
        info.country = path[0]?.length === 2 ? path[0] : undefined;
      }
      break;
    }
    case 'discogs': {
      const i = path.findIndex((p) => /^(release|master|artist|label)$/.test(p));
      if (i >= 0) {
        info.kind = path[i];
        info.id = (path[i + 1] || '').match(/^\d+/)?.[0];
        info.hints.slug = deslug((path[i + 1] || '').replace(/^\d+-?/, ''));
      }
      break;
    }
    case 'mixcloud': {
      if (path.length >= 2 && !['discover', 'search', 'live'].includes(path[0])) { info.kind = 'mix'; info.hints.artist = deslug(path[0]); info.hints.title = deslug(path[1]); }
      else if (path.length === 1) info.kind = 'artist';
      break;
    }
    case 'musicbrainz': {
      info.kind = path[0]; info.id = path[1];
      break;
    }
    case 'beatport': {
      info.kind = path[0]; info.id = path[2]; info.hints.slug = deslug(path[1]);
      break;
    }
    default: break;
  }
  return info;
}

/**
 * Recognise what the user typed into universal search.
 * kind: 'empty' | 'url' | 'tracklist' | 'track' | 'query'
 */
export function detectInput(raw) {
  const text = String(raw ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return { kind: 'empty' };
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && /^https?:\/\/\S+$/i.test(lines[0])) {
    return { kind: 'url', url: describeUrl(lines[0]) };
  }
  const trackish = lines.filter((l) => SEP_RE.test(stripNoise(l).text) || /^\s*[[(]?\d{1,2}:\d{2}/.test(l));
  if (lines.length > 1 && trackish.length >= 2) return { kind: 'tracklist', lines: lines.length, tracks: trackish.length };
  if (lines.length > 1) return { kind: 'multi', lines };
  const parsed = parseTrackLine(lines[0]);
  if (parsed.hasArtist && parsed.title) return { kind: 'track', track: parsed };
  return { kind: 'query', query: parsed.cleaned || lines[0], track: parsed };
}
