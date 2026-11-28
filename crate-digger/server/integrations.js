// Legitimate public APIs only. Every function returns real data or throws an
// IntegrationError; nothing is invented when a service is unavailable.
import { HttpError } from './store.js';
import { tidy, normKey, splitVersion, describeUrl } from '../shared/normalize.js';

const CONTACT = process.env.CRATE_DIGGER_CONTACT || 'self-hosted';
const UA = `y2r-CrateDigger/0.1 ( ${CONTACT} )`;

export class IntegrationError extends HttpError {
  constructor(service, message, status = 502) { super(status, message, { service }); }
}

let cacheDb = null;
export function useCache(db) { cacheDb = db; }

function cacheGet(key) {
  if (!cacheDb) return null;
  const row = cacheDb.prepare('SELECT body, expires_at FROM api_cache WHERE key = ?').get(key);
  if (!row || row.expires_at < Date.now()) return null;
  return JSON.parse(row.body);
}
function cacheSet(key, body, ttlMs) {
  if (!cacheDb) return;
  cacheDb.prepare('INSERT INTO api_cache (key, body, expires_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET body = excluded.body, expires_at = excluded.expires_at').run(key, JSON.stringify(body), Date.now() + ttlMs);
}

// Per-host request spacing (MusicBrainz asks for at most 1 request/second).
const SPACING = { 'musicbrainz.org': 1100, 'api.discogs.com': 1100, 'itunes.apple.com': 300, 'ws.audioscrobbler.com': 250 };
const nextSlot = new Map();
async function throttle(host) {
  const gap = SPACING[host] || 0;
  if (!gap) return;
  const t = Math.max(Date.now(), nextSlot.get(host) || 0);
  nextSlot.set(host, t + gap);
  const wait = t - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}

export const SERVICE_NAMES = { 'musicbrainz.org': 'MusicBrainz', 'itunes.apple.com': 'Apple Music', 'api.discogs.com': 'Discogs', 'ws.audioscrobbler.com': 'Last.fm' };

async function getJson(url, { headers = {}, ttl = 6 * 3600e3, service } = {}) {
  const u = new URL(url);
  const name = service || SERVICE_NAMES[u.hostname] || u.hostname;
  const cacheKey = `${u.href}`.replace(/([?&])(token|api_key)=[^&]+/g, '$1$2=*');
  const hit = cacheGet(cacheKey);
  if (hit) return hit;
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    await throttle(u.hostname);
    try {
      res = await fetch(u, { headers: { 'User-Agent': UA, Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(12000) });
    } catch (err) {
      throw new IntegrationError(name, `${name} could not be reached (${err.name === 'TimeoutError' ? 'timed out' : 'network error'}).`);
    }
    if (res.status !== 429 && res.status !== 503) break;
    // Back off politely, then retry.
    const wait = Math.min(Number(res.headers.get('retry-after')) * 1000 || 0, 5000) || 1500 * (attempt + 1);
    nextSlot.set(u.hostname, Date.now() + wait);
  }
  if (res.status === 404) throw new IntegrationError(name, `${name} has no record for this.`, 404);
  if (res.status === 401 || res.status === 403) throw new IntegrationError(name, `${name} refused the request. Check the key in Settings.`, 502);
  if (res.status === 429 || res.status === 503) throw new IntegrationError(name, `${name} is rate limiting requests. Try again in a moment.`, 503);
  if (!res.ok) throw new IntegrationError(name, `${name} returned an error (${res.status}).`);
  let body;
  try { body = await res.json(); } catch { throw new IntegrationError(name, `${name} sent an unreadable response.`); }
  cacheSet(cacheKey, body, ttl);
  return body;
}

const mbArtist = (credit = []) => credit.map((c) => `${c.name}${c.joinphrase || ''}`).join('').trim();
const caa = (releaseId) => (releaseId ? `https://coverartarchive.org/release/${releaseId}/front-250` : '');
const mmss = (ms) => (ms ? Math.round(ms) : null);

function luceneEscape(s) { return String(s).replace(/([+\-&|!(){}[\]^"~*?:\\/])/g, '\\$1'); }

// ---------------------------------------------------------------------------
// Apple Music (iTunes Search API) — public, no key.
export async function appleSearch(query, country = 'us', limit = 15) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}&country=${encodeURIComponent(country)}`;
  const data = await getJson(url, { ttl: 24 * 3600e3 });
  return (data.results || []).filter((r) => r.kind === 'song').map(appleTrack);
}
function appleTrack(r) {
  const sv = splitVersion(r.trackName || '');
  return {
    platform: 'applemusic',
    external_id: String(r.trackId),
    artist: r.artistName || '',
    title: sv.title || r.trackName || '',
    version: sv.version,
    release: r.collectionName || '',
    label: '',
    year: r.releaseDate ? r.releaseDate.slice(0, 4) : '',
    release_date: r.releaseDate ? r.releaseDate.slice(0, 10) : '',
    duration_ms: mmss(r.trackTimeMillis),
    genre: r.primaryGenreName || '',
    format: 'Streaming / purchase (AAC)',
    artwork_url: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '300x300bb') : '',
    url: r.trackViewUrl || '',
    preview_url: r.previewUrl || '',
    copyright: r.copyright || '',
  };
}
export async function appleLookup(id, country = 'us') {
  const data = await getJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}&country=${encodeURIComponent(country)}&entity=song`, { ttl: 24 * 3600e3 });
  return (data.results || []).filter((r) => r.kind === 'song').map(appleTrack);
}

// ---------------------------------------------------------------------------
// MusicBrainz — public, 1 req/s.
const MB = 'https://musicbrainz.org/ws/2';
export async function mbSearchRecordings({ artist, title, query }, limit = 15) {
  let q;
  if (title) q = `recording:"${luceneEscape(title)}"${artist ? ` AND artist:"${luceneEscape(artist)}"` : ''}`;
  else q = luceneEscape(query || artist || '');
  const data = await getJson(`${MB}/recording?query=${encodeURIComponent(q)}&limit=${limit}&fmt=json`);
  return (data.recordings || []).map((r) => {
    const rel = (r.releases || [])[0] || {};
    const sv = splitVersion(r.title || '');
    return {
      platform: 'musicbrainz',
      external_id: r.id,
      artist: mbArtist(r['artist-credit']),
      title: sv.title || r.title,
      version: sv.version || r.disambiguation || '',
      release: rel.title || '',
      release_id: rel.id || '',
      label: '',
      year: (r['first-release-date'] || rel.date || '').slice(0, 4),
      release_date: r['first-release-date'] || rel.date || '',
      duration_ms: mmss(r.length),
      genre: (r.tags || []).sort((a, b) => b.count - a.count)[0]?.name || '',
      format: (rel.media || [])[0]?.format || '',
      artwork_url: caa(rel.id),
      artwork_unverified: !!rel.id,
      url: `https://musicbrainz.org/recording/${r.id}`,
      score: r.score,
      release_count: (r.releases || []).length,
      artist_ids: (r['artist-credit'] || []).map((c) => ({ id: c.artist?.id, name: c.artist?.name })),
    };
  });
}

export async function mbRecording(id) {
  const r = await getJson(`${MB}/recording/${encodeURIComponent(id)}?inc=artists+artist-rels+releases+release-groups+tags+genres+isrcs&fmt=json`);
  return r;
}

async function mbFindArtist(name) {
  const data = await getJson(`${MB}/artist?query=${encodeURIComponent(`artist:"${luceneEscape(name)}"`)}&limit=5&fmt=json`);
  const list = data.artists || [];
  const exact = list.find((a) => normKey(a.name) === normKey(name));
  return { best: exact || list[0] || null, candidates: list.map((a) => ({ id: a.id, name: a.name, disambiguation: a.disambiguation || '', country: a.country || '', type: a.type || '' })) };
}

function discogsIdFromRels(rels = [], kind) {
  for (const r of rels) {
    const href = r.url?.resource || '';
    const m = href.match(new RegExp(`discogs\\.com/${kind}/(\\d+)`));
    if (m) return m[1];
  }
  return null;
}
function linksFromRels(rels = []) {
  return rels.filter((r) => r.url?.resource).map((r) => ({ type: r.type, url: r.url.resource }))
    .filter((l) => /bandcamp|soundcloud|beatport|discogs|youtube|spotify|apple|mixcloud|traxsource|juno|last\.fm|instagram|official homepage|wikipedia/i.test(`${l.type} ${l.url}`))
    .slice(0, 20);
}

export async function exploreArtist(name, { mbid, lastfmKey } = {}) {
  const errors = [];
  let artist = null;
  let candidates = [];
  if (mbid) artist = { id: mbid };
  else {
    const found = await mbFindArtist(name);
    artist = found.best;
    candidates = found.candidates;
  }
  if (!artist) return { name, found: false, candidates, errors };
  const a = await getJson(`${MB}/artist/${artist.id}?inc=url-rels+artist-rels+tags+genres+aliases&fmt=json`);
  const [rgs, releases, recordings, remixes] = await Promise.all([
    getJson(`${MB}/release-group?artist=${a.id}&limit=100&fmt=json`).catch((e) => { errors.push(e.message); return {}; }),
    getJson(`${MB}/release?artist=${a.id}&inc=labels&limit=100&fmt=json`).catch((e) => { errors.push(e.message); return {}; }),
    getJson(`${MB}/recording?query=${encodeURIComponent(`arid:${a.id}`)}&limit=100&fmt=json`).catch((e) => { errors.push(e.message); return {}; }),
    getJson(`${MB}/recording?query=${encodeURIComponent(`recording:"${luceneEscape(a.name)} remix" AND NOT arid:${a.id}`)}&limit=40&fmt=json`).catch((e) => { errors.push(e.message); return {}; }),
  ]);
  const labelCounts = new Map();
  for (const r of releases.releases || []) for (const li of r['label-info'] || []) {
    if (!li.label?.name || /no label|\[no label\]/i.test(li.label.name)) continue;
    const k = li.label.id;
    labelCounts.set(k, { id: k, name: li.label.name, count: (labelCounts.get(k)?.count || 0) + 1 });
  }
  const collab = new Map();
  for (const r of recordings.recordings || []) for (const c of r['artist-credit'] || []) {
    if (c.artist?.id && c.artist.id !== a.id) collab.set(c.artist.id, { id: c.artist.id, name: c.artist.name, count: (collab.get(c.artist.id)?.count || 0) + 1 });
  }
  for (const rel of a.relations || []) if (rel.artist && ['collaboration', 'member of band', 'is person'].includes(rel.type)) collab.set(rel.artist.id, { id: rel.artist.id, name: rel.artist.name, relation: rel.type, count: collab.get(rel.artist.id)?.count || 0 });
  const discography = (rgs['release-groups'] || []).map((g) => ({
    id: g.id, title: g.title, type: [g['primary-type'], ...(g['secondary-types'] || [])].filter(Boolean).join(' · ') || 'Release', date: g['first-release-date'] || '',
    url: `https://musicbrainz.org/release-group/${g.id}`,
  })).sort((x, y) => (y.date || '').localeCompare(x.date || ''));
  const tags = [...(a.genres || []), ...(a.tags || [])].sort((x, y) => y.count - x.count).map((t) => t.name).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 12);
  const out = {
    found: true,
    name: a.name,
    mbid: a.id,
    disambiguation: a.disambiguation || '',
    country: a.country || a.area?.name || '',
    type: a.type || '',
    life: a['life-span'] || {},
    aliases: (a.aliases || []).map((x) => x.name).slice(0, 8),
    tags,
    links: linksFromRels(a.relations),
    discogs_id: discogsIdFromRels(a.relations, 'artist'),
    discography,
    tracks: (recordings.recordings || []).map((r) => ({ id: r.id, artist: mbArtist(r['artist-credit']), title: r.title, date: r['first-release-date'] || '', release: (r.releases || [])[0]?.title || '', url: `https://musicbrainz.org/recording/${r.id}` }))
      .filter((t, i, arr) => arr.findIndex((x) => normKey(x.title) === normKey(t.title)) === i).slice(0, 60),
    remixes: (remixes.recordings || []).map((r) => ({ id: r.id, artist: mbArtist(r['artist-credit']), title: r.title, date: r['first-release-date'] || '', url: `https://musicbrainz.org/recording/${r.id}` }))
      .filter((r) => normKey(r.title).includes(normKey(a.name))).slice(0, 30),
    labels: [...labelCounts.values()].sort((x, y) => y.count - x.count).slice(0, 20),
    collaborators: [...collab.values()].sort((x, y) => y.count - x.count).slice(0, 24),
    candidates,
    similar: null,
    similar_status: lastfmKey ? 'pending' : 'needs-key',
    errors,
  };
  if (lastfmKey) {
    try {
      const s = await getJson(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(a.name)}&limit=20&autocorrect=1&api_key=${encodeURIComponent(lastfmKey)}&format=json`);
      if (s.error) throw new IntegrationError('Last.fm', s.message || 'Last.fm error');
      out.similar = (s.similarartists?.artist || []).map((x) => ({ name: x.name, match: Number(x.match), url: x.url }));
      out.similar_status = 'ok';
    } catch (e) { out.similar_status = 'error'; errors.push(e.message); }
  }
  if (out.discogs_id) {
    try {
      const d = await getJson(`https://api.discogs.com/artists/${out.discogs_id}/releases?sort=year&sort_order=desc&per_page=50`);
      out.discogs_releases = (d.releases || []).map((r) => ({ id: r.id, title: r.title, artist: r.artist, year: r.year || '', role: r.role, label: r.label || '', type: r.type, format: r.format || '', thumb: r.thumb || '', url: `https://www.discogs.com/${r.type === 'master' ? 'master' : 'release'}/${r.id}` }));
    } catch (e) { errors.push(e.message); }
  }
  return out;
}

export async function exploreLabel(name, { mbid } = {}) {
  const errors = [];
  let label = mbid ? { id: mbid } : null;
  let candidates = [];
  if (!label) {
    const data = await getJson(`${MB}/label?query=${encodeURIComponent(`label:"${luceneEscape(name)}"`)}&limit=5&fmt=json`);
    const list = data.labels || [];
    label = list.find((l) => normKey(l.name) === normKey(name)) || list[0] || null;
    candidates = list.map((l) => ({ id: l.id, name: l.name, disambiguation: l.disambiguation || '', country: l.country || '', type: l.type || '' }));
  }
  if (!label) return { name, found: false, candidates, errors };
  const l = await getJson(`${MB}/label/${label.id}?inc=url-rels+label-rels+tags+genres&fmt=json`);
  const rel = await getJson(`${MB}/release?label=${l.id}&inc=artist-credits+release-groups+labels&limit=100&fmt=json`).catch((e) => { errors.push(e.message); return {}; });
  const releases = (rel.releases || []).map((r) => {
    const li = (r['label-info'] || []).find((x) => x.label?.id === l.id) || {};
    return {
      id: r.id, title: r.title, artist: mbArtist(r['artist-credit']), date: r.date || '', catalog: li['catalog-number'] || '',
      type: [r['release-group']?.['primary-type'], ...(r['release-group']?.['secondary-types'] || [])].filter(Boolean).join(' · '),
      artwork_url: r['cover-art-archive']?.front ? caa(r.id) : '',
      url: `https://musicbrainz.org/release/${r.id}`,
    };
  }).filter((r, i, arr) => arr.findIndex((x) => normKey(x.title) === normKey(r.title) && x.artist === r.artist) === i)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const artists = new Map();
  for (const r of rel.releases || []) for (const c of r['artist-credit'] || []) {
    if (!c.artist?.id || /various artists/i.test(c.artist.name)) continue;
    artists.set(c.artist.id, { id: c.artist.id, name: c.artist.name, count: (artists.get(c.artist.id)?.count || 0) + 1 });
  }
  const subLabels = (l.relations || []).filter((r) => r.label && ['label ownership', 'imprint', 'label rename', 'label distribution'].includes(r.type))
    .map((r) => ({ id: r.label.id, name: r.label.name, relation: r.direction === 'backward' ? `${r.type} (parent)` : r.type }));
  const out = {
    found: true,
    name: l.name,
    mbid: l.id,
    disambiguation: l.disambiguation || '',
    country: l.country || l.area?.name || '',
    type: l.type || '',
    life: l['life-span'] || {},
    tags: [...(l.genres || []), ...(l.tags || [])].map((t) => t.name).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 12),
    links: linksFromRels(l.relations),
    discogs_id: discogsIdFromRels(l.relations, 'label'),
    releases,
    recent: releases.slice(0, 12),
    compilations: releases.filter((r) => /compilation/i.test(r.type)),
    artists: [...artists.values()].sort((a, b) => b.count - a.count).slice(0, 30),
    sub_labels: subLabels,
    release_total: rel['release-count'] ?? releases.length,
    candidates,
    errors,
  };
  if (out.discogs_id) {
    try {
      const d = await getJson(`https://api.discogs.com/labels/${out.discogs_id}/releases?per_page=100&sort=year&sort_order=desc`);
      out.discogs_releases = (d.releases || []).map((r) => ({ id: r.id, title: r.title, artist: r.artist, year: r.year || '', catno: r.catno || '', format: r.format || '', thumb: r.thumb || '', url: `https://www.discogs.com/release/${r.id}` }))
        .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
      const sub = await getJson(`https://api.discogs.com/labels/${out.discogs_id}`).catch(() => null);
      if (sub?.sublabels?.length) out.discogs_sublabels = sub.sublabels.map((s) => ({ id: s.id, name: s.name, url: `https://www.discogs.com/label/${s.id}` }));
      if (sub?.parent_label) out.discogs_parent = { id: sub.parent_label.id, name: sub.parent_label.name };
    } catch (e) { errors.push(e.message); }
  }
  return out;
}

export async function exploreTrack({ artist, title, mbid }, { lastfmKey } = {}) {
  const errors = [];
  let id = mbid;
  let candidates = [];
  if (!id) {
    const found = await mbSearchRecordings({ artist, title }, 25);
    // Many recordings exist per song (one per compilation). Prefer the exact match on the most releases.
    const exact = found.filter((r) => normKey(r.title) === normKey(title) && (!artist || normKey(r.artist).includes(normKey(artist))))
      .sort((a, b) => b.release_count - a.release_count);
    id = (exact[0] || found[0])?.external_id;
    candidates = found.slice(0, 8);
  }
  const out = { artist, title, found: false, candidates, errors };
  if (id) {
    const r = await mbRecording(id);
    out.found = true;
    out.mbid = r.id;
    out.mb_title = r.title;
    out.mb_artist = mbArtist(r['artist-credit']);
    out.artists = (r['artist-credit'] || []).map((c) => ({ id: c.artist.id, name: c.artist.name }));
    out.remixers = (r.relations || []).filter((x) => x.type === 'remixer' && x.artist).map((x) => ({ id: x.artist.id, name: x.artist.name }));
    out.producers = (r.relations || []).filter((x) => ['producer', 'mix', 'vocal', 'instrument', 'performer'].includes(x.type) && x.artist).map((x) => ({ id: x.artist.id, name: x.artist.name, role: x.type }))
      .filter((x, i, arr) => arr.findIndex((y) => y.id === x.id) === i).slice(0, 12);
    out.isrcs = r.isrcs || [];
    out.tags = [...(r.genres || []), ...(r.tags || [])].map((t) => t.name).filter((t, i, arr) => arr.indexOf(t) === i).slice(0, 12);
    out.releases = (r.releases || []).map((rel) => ({
      id: rel.id, title: rel.title, date: rel.date || '', country: rel.country || '',
      type: [rel['release-group']?.['primary-type'], ...(rel['release-group']?.['secondary-types'] || [])].filter(Boolean).join(' · '),
      labels: [],
      artwork_url: caa(rel.id), url: `https://musicbrainz.org/release/${rel.id}`,
    })).sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999'));
    // Prefer the earliest non-compilation release as the original.
    const originals = out.releases.filter((x) => !/compilation|dj-mix/i.test(x.type));
    out.original_release = originals[0] || out.releases[0] || null;
    // Recording lookups do not include labels, so read them from up to three original releases.
    for (const rel of [...new Set([out.original_release, ...originals.slice(0, 2)].filter(Boolean))]) {
      try {
        const full = await getJson(`${MB}/release/${rel.id}?inc=labels&fmt=json`);
        rel.labels = (full['label-info'] || []).map((li) => li.label && { id: li.label.id, name: li.label.name, catalog: li['catalog-number'] || '' }).filter(Boolean);
      } catch (e) { errors.push(e.message); }
    }
    const labels = new Map();
    for (const rel of out.releases) for (const lb of rel.labels) if (!/no label/i.test(lb.name)) labels.set(lb.id, lb);
    out.labels = [...labels.values()];
  }
  out.similar_status = lastfmKey ? 'pending' : 'needs-key';
  if (lastfmKey && artist && title) {
    try {
      const s = await getJson(`https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(title)}&limit=20&autocorrect=1&api_key=${encodeURIComponent(lastfmKey)}&format=json`);
      if (s.error) throw new IntegrationError('Last.fm', s.message || 'Last.fm error');
      out.similar = (s.similartracks?.track || []).map((t) => ({ artist: t.artist?.name || '', title: t.name, match: Number(t.match), url: t.url }));
      out.similar_status = 'ok';
      const sa = await getJson(`https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(artist)}&limit=12&autocorrect=1&api_key=${encodeURIComponent(lastfmKey)}&format=json`);
      out.similar_artists = (sa.similarartists?.artist || []).map((x) => ({ name: x.name, match: Number(x.match), url: x.url }));
    } catch (e) { out.similar_status = 'error'; errors.push(e.message); }
  }
  return out;
}

export async function exploreGenre(name, { lastfmKey, discogsToken } = {}) {
  const errors = [];
  const out = { name, errors, lastfm_status: lastfmKey ? 'ok' : 'needs-key', discogs_status: discogsToken ? 'ok' : 'needs-key' };
  try {
    const tag = name.toLowerCase();
    const mb = await getJson(`${MB}/release-group?query=${encodeURIComponent(`tag:"${luceneEscape(tag)}"`)}&limit=25&fmt=json`);
    out.mb_releases = (mb['release-groups'] || []).map((g) => ({ id: g.id, title: g.title, artist: mbArtist(g['artist-credit']), date: g['first-release-date'] || '', type: g['primary-type'] || '', url: `https://musicbrainz.org/release-group/${g.id}` }));
    const ar = await getJson(`${MB}/artist?query=${encodeURIComponent(`tag:"${luceneEscape(tag)}"`)}&limit=25&fmt=json`);
    out.mb_artists = (ar.artists || []).map((a) => ({ id: a.id, name: a.name, country: a.country || '', disambiguation: a.disambiguation || '' }));
  } catch (e) { errors.push(e.message); }
  if (lastfmKey) {
    try {
      const t = await getJson(`https://ws.audioscrobbler.com/2.0/?method=tag.gettoptracks&tag=${encodeURIComponent(name)}&limit=30&api_key=${encodeURIComponent(lastfmKey)}&format=json`);
      out.lastfm_tracks = (t.tracks?.track || []).map((x) => ({ artist: x.artist?.name || '', title: x.name, url: x.url }));
      const a = await getJson(`https://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag=${encodeURIComponent(name)}&limit=30&api_key=${encodeURIComponent(lastfmKey)}&format=json`);
      out.lastfm_artists = (a.topartists?.artist || []).map((x) => ({ name: x.name, url: x.url }));
    } catch (e) { out.lastfm_status = 'error'; errors.push(e.message); }
  }
  if (discogsToken) {
    try {
      const d = await getJson(`https://api.discogs.com/database/search?style=${encodeURIComponent(name)}&type=release&sort=year&sort_order=desc&per_page=30`, { headers: { Authorization: `Discogs token=${discogsToken}` } });
      out.discogs_releases = (d.results || []).map(discogsResult);
    } catch (e) { out.discogs_status = 'error'; errors.push(e.message); }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Discogs — database search requires the user's personal token.
function discogsResult(r) {
  const [artist, ...rest] = String(r.title || '').split(' - ');
  return {
    platform: 'discogs',
    external_id: String(r.id),
    kind: r.type,
    artist: rest.length ? artist : '',
    title: rest.length ? rest.join(' - ') : r.title,
    release: rest.length ? rest.join(' - ') : r.title,
    label: (r.label || [])[0] || '',
    labels: r.label || [],
    catalog: r.catno || '',
    year: r.year || '',
    format: (r.format || []).join(', '),
    genre: [...(r.style || []), ...(r.genre || [])][0] || '',
    styles: r.style || [],
    artwork_url: r.cover_image && !/spacer\.gif/.test(r.cover_image) ? r.cover_image : '',
    url: r.uri ? `https://www.discogs.com${r.uri}` : '',
    is_release: true,
  };
}
export async function discogsSearch(query, token, { type = 'release', perPage = 12 } = {}) {
  if (!token) throw new IntegrationError('Discogs', 'Add a Discogs personal access token in Settings to see Discogs results here.', 400);
  const data = await getJson(`https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=${type}&per_page=${perPage}`, { headers: { Authorization: `Discogs token=${token}` } });
  return (data.results || []).map(discogsResult);
}

// ---------------------------------------------------------------------------
// Last.fm track search (needs the user's API key).
export async function lastfmSearch(query, key, limit = 10) {
  if (!key) throw new IntegrationError('Last.fm', 'Add a Last.fm API key in Settings to see Last.fm results here.', 400);
  const data = await getJson(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&limit=${limit}&api_key=${encodeURIComponent(key)}&format=json`);
  if (data.error) throw new IntegrationError('Last.fm', data.message || 'Last.fm error');
  return (data.results?.trackmatches?.track || []).map((t) => {
    const sv = splitVersion(t.name || '');
    return { platform: 'lastfm', external_id: t.mbid || t.url, artist: t.artist, title: sv.title, version: sv.version, release: '', label: '', year: '', duration_ms: null, format: '', artwork_url: '', url: t.url, listeners: Number(t.listeners) || 0 };
  });
}

// ---------------------------------------------------------------------------
// URL resolution: use what the platform legitimately exposes.
export async function resolveUrl(raw, { country = 'us' } = {}) {
  const info = describeUrl(raw);
  if (!info) throw new HttpError(400, 'That does not look like a valid URL');
  const out = { ...info, track: null, release: null, tracklist: null, method: 'url', notes: [] };
  const hintTrack = () => (info.hints.title ? { artist: info.hints.artist || '', title: info.hints.title, version: '' } : null);
  try {
    if (info.platform === 'applemusic' && info.id) {
      const res = await appleLookup(info.id, info.country || country);
      if (res[0]) { out.track = res[0]; out.method = 'api'; }
      else out.notes.push('Apple Music lookup returned no song for this link.');
    } else if (info.platform === 'discogs' && info.id && ['release', 'master'].includes(info.kind)) {
      const d = await getJson(`https://api.discogs.com/${info.kind}s/${info.id}`);
      out.method = 'api';
      out.release = {
        title: d.title, artist: (d.artists || []).map((a) => a.name.replace(/\s\(\d+\)$/, '')).join(', '), year: d.year || '',
        label: (d.labels || [])[0]?.name || '', catalog: (d.labels || [])[0]?.catno || '', styles: d.styles || [], genres: d.genres || [],
        artwork_url: (d.images || [])[0]?.uri || '', url: d.uri,
        tracklist: (d.tracklist || []).filter((t) => t.type_ === 'track').map((t) => ({
          position: t.position, artist: (t.artists || d.artists || []).map((a) => a.name.replace(/\s\(\d+\)$/, '')).join(', '), title: t.title,
          duration: t.duration, extraartists: (t.extraartists || []).map((x) => `${x.name} (${x.role})`),
        })),
      };
    } else if (info.platform === 'discogs' && info.id && ['artist', 'label'].includes(info.kind)) {
      const d = await getJson(`https://api.discogs.com/${info.kind}s/${info.id}`);
      out.method = 'api';
      out.entity = { kind: info.kind, name: d.name.replace(/\s\(\d+\)$/, ''), profile: d.profile || '', url: d.uri };
    } else if (info.platform === 'musicbrainz' && info.id && info.kind === 'recording') {
      const r = await mbRecording(info.id);
      out.method = 'api';
      const sv = splitVersion(r.title);
      out.track = { platform: 'musicbrainz', external_id: r.id, artist: mbArtist(r['artist-credit']), title: sv.title, version: sv.version, release: r.releases?.[0]?.title || '', duration_ms: r.length || null, url: `https://musicbrainz.org/recording/${r.id}`, artwork_url: caa(r.releases?.[0]?.id), label: r.releases?.[0]?.['label-info']?.[0]?.label?.name || '' };
    } else if (['soundcloud', 'youtube', 'spotify', 'mixcloud'].includes(info.platform)) {
      // oEmbed is the documented public metadata endpoint for these platforms.
      const endpoints = {
        soundcloud: `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(info.url)}`,
        youtube: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(info.url)}`,
        spotify: `https://open.spotify.com/oembed?url=${encodeURIComponent(info.url)}`,
        mixcloud: `https://app.mixcloud.com/oembed/?format=json&url=${encodeURIComponent(info.url)}`,
      };
      try {
        const o = await getJson(endpoints[info.platform], { service: info.platform, ttl: 24 * 3600e3 });
        out.method = 'oembed';
        out.oembed = { title: o.title || '', author: o.author_name || '', thumbnail: o.thumbnail_url || '' };
        const title = tidy(o.title || '');
        out.title_text = info.platform === 'soundcloud' && o.author_name && !/ - /.test(title) ? `${o.author_name.replace(/^.* by /, '')} - ${title.replace(/ by [^-]+$/, '')}` : title.replace(/ by [^-]+$/, '');
      } catch (e) {
        out.notes.push(`${e.service || info.platform} metadata was unavailable (${e.message}). Using details from the link itself.`);
      }
      if (['youtube', 'mixcloud', 'soundcloud'].includes(info.platform) && (info.kind === 'video' || info.kind === 'mix' || info.kind === 'playlist')) {
        out.notes.push(`${info.platform === 'youtube' ? 'YouTube' : info.platform === 'mixcloud' ? 'Mixcloud' : 'SoundCloud'} does not provide mix tracklists to apps. Paste the description or tracklist text in Tracklists.`);
      }
    } else if (info.platform === 'bandcamp') {
      out.notes.push('Bandcamp has no public API. Details below come from the link itself; check them before saving.');
    } else if (info.platform === 'beatport' || info.platform === '1001tracklists') {
      out.notes.push(`${info.platform === 'beatport' ? 'Beatport' : '1001Tracklists'} does not offer a public API. Details come from the link itself.`);
    }
  } catch (e) {
    if (e instanceof HttpError) out.notes.push(e.message); else throw e;
  }
  if (!out.track && !out.release) out.hint_track = hintTrack();
  return out;
}

/** Which integrations are usable for this user. */
export function integrationStatus(settings) {
  return {
    applemusic: { state: 'live', note: 'iTunes Search API, no key required.' },
    musicbrainz: { state: 'live', note: 'Public API, limited to one request per second.' },
    discogs: settings.discogsToken ? { state: 'live', note: 'Using your personal access token.' } : { state: 'needs-key', note: 'Release and label pages work without a token; search needs one.' },
    lastfm: settings.lastfmKey ? { state: 'live', note: 'Using your API key.' } : { state: 'needs-key', note: 'Add an API key for similar artists, tags and track search.' },
    soundcloud: { state: 'link', note: 'Search links. Link metadata via oEmbed where reachable.' },
    spotify: { state: 'link', note: 'Search links. Full search needs an authorised Spotify app.' },
    youtube: { state: 'link', note: 'Search links. Video titles via oEmbed where reachable.' },
    mixcloud: { state: 'link', note: 'Search links.' },
    bandcamp: { state: 'link', note: 'No public API. Search and genre links.' },
    beatport: { state: 'link', note: 'No public API. Search links.' },
    traxsource: { state: 'link', note: 'Search links.' },
    juno: { state: 'link', note: 'Search links.' },
    qobuz: { state: 'link', note: 'Search links for your market.' },
    '1001tracklists': { state: 'link', note: 'Search links.' },
  };
}
