import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { createStore, HttpError, STARTER_CRATES } from './store.js';
import { createAuth } from './auth.js';
import * as api from './integrations.js';
import { market } from '../shared/platforms.js';
import { parseTracklist } from '../shared/tracklist.js';
import { parseTrackLine } from '../shared/normalize.js';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const STATIC = { '/': join(ROOT, 'public'), '/shared/': join(ROOT, 'shared') };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png' };

export function createApp({ dbFile = process.env.CRATE_DIGGER_DB || join(ROOT, 'data', 'crate-digger.db') } = {}) {
  const db = openDb(dbFile);
  const store = createStore(db);
  const auth = createAuth(db, store);
  api.useCache(db);

  const routes = [];
  const route = (method, path, handler, { open = false } = {}) => {
    const keys = [];
    const re = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler, open });
  };
  const id = (v) => { const n = Number(v); if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'Invalid id'); return n; };
  const ids = (v) => { if (!Array.isArray(v) || !v.length) throw new HttpError(400, 'Select at least one track'); return v.map(id); };

  // ----- auth -----
  route('GET', '/api/session', ({ user }) => ({ user, has_users: auth.userCount() > 0 }), { open: true });
  route('POST', '/api/register', ({ body, res }) => { const r = auth.register(body.username, body.password); setCookie(res, r.token); return { user: r.user }; }, { open: true });
  route('POST', '/api/login', ({ body, res }) => { const r = auth.login(body.username, body.password); setCookie(res, r.token); return { user: r.user }; }, { open: true });
  route('POST', '/api/logout', ({ token, res }) => { auth.logout(token); setCookie(res, '', 0); return { ok: true }; }, { open: true });
  route('POST', '/api/account/password', ({ user, body }) => { auth.changePassword(user.id, body.current, body.next); return { ok: true }; });
  route('POST', '/api/account/delete', ({ user, body, res }) => { auth.deleteAccount(user.id, body.password); setCookie(res, '', 0); return { ok: true }; });

  // ----- bootstrap -----
  route('GET', '/api/bootstrap', ({ user }) => {
    const settings = store.getSettings(user.id);
    return {
      user, settings: redact(settings), stats: store.stats(user.id), crates: store.listCrates(user.id), genres: store.listGenres(user.id),
      integrations: api.integrationStatus(settings), starter_crates: STARTER_CRATES,
    };
  });

  // ----- tracks -----
  route('GET', '/api/tracks', ({ user }) => store.listTracks(user.id));
  route('POST', '/api/tracks', ({ user, body }) => store.saveTrack(user.id, body.track || {}, { crateIds: (body.crateIds || []).map(id), discovery: body.discovery, sources: body.sources }));
  route('POST', '/api/tracks/batch', ({ user, body }) => {
    const items = Array.isArray(body.tracks) ? body.tracks : [];
    if (!items.length) throw new HttpError(400, 'No tracks to save');
    const results = items.map((t) => {
      try { return store.saveTrack(user.id, t.track || t, { crateIds: (body.crateIds || []).map(id), discovery: t.discovery || body.discovery, sources: t.sources }); } catch (e) { return { error: e.message }; }
    });
    return { results, created: results.filter((r) => r.created).length, duplicates: results.filter((r) => r.duplicate).length, failed: results.filter((r) => r.error).length };
  });
  route('GET', '/api/tracks/duplicates', ({ user }) => store.duplicates(user.id));
  route('GET', '/api/tracks/:id', ({ user, p }) => store.trackDetail(user.id, id(p.id)));
  route('PATCH', '/api/tracks/:id', ({ user, p, body }) => store.updateTrack(user.id, id(p.id), body));
  route('DELETE', '/api/tracks/:id', ({ user, p }) => ({ deleted: store.deleteTracks(user.id, [id(p.id)]) }));
  route('POST', '/api/tracks/bulk', ({ user, body }) => {
    const list = ids(body.ids);
    if (body.action === 'delete') return { deleted: store.deleteTracks(user.id, list) };
    if (body.action === 'update') return { tracks: store.bulkUpdate(user.id, list, body.patch || {}) };
    throw new HttpError(400, 'Unknown bulk action');
  });
  route('POST', '/api/tracks/:id/merge', ({ user, p, body }) => store.mergeTracks(user.id, id(p.id), id(body.fromId)));
  route('POST', '/api/tracks/:id/acquisitions', ({ user, p, body }) => store.addAcquisition(user.id, id(p.id), body));
  route('DELETE', '/api/tracks/:id/acquisitions/:aid', ({ user, p }) => store.deleteAcquisition(user.id, id(p.id), id(p.aid)));
  route('POST', '/api/tracks/:id/sources', ({ user, p, body }) => { store.getTrack(user.id, id(p.id)); store.addSource(id(p.id), body); return store.trackDetail(user.id, id(p.id)); });
  route('DELETE', '/api/tracks/:id/sources/:sid', ({ user, p }) => { store.deleteSource(user.id, id(p.id), id(p.sid)); return store.trackDetail(user.id, id(p.id)); });
  route('PUT', '/api/tracks/:id/discovery', ({ user, p, body }) => store.updateDiscovery(user.id, id(p.id), body.steps));

  // ----- crates -----
  route('GET', '/api/crates', ({ user }) => store.listCrates(user.id));
  route('POST', '/api/crates', ({ user, body }) => store.createCrate(user.id, body));
  route('POST', '/api/crates/starter', ({ user, body }) => {
    const names = (body.names || []).filter((n) => STARTER_CRATES.includes(n));
    const existing = new Set(store.listCrates(user.id).map((c) => c.name.toLowerCase()));
    const made = names.filter((n) => !existing.has(n.toLowerCase())).map((name) => store.createCrate(user.id, { name }));
    return { created: made.length, crates: store.listCrates(user.id) };
  });
  route('GET', '/api/crates/:id', ({ user, p }) => store.getCrate(user.id, id(p.id)));
  route('PATCH', '/api/crates/:id', ({ user, p, body }) => store.updateCrate(user.id, id(p.id), body));
  route('DELETE', '/api/crates/:id', ({ user, p }) => { store.deleteCrate(user.id, id(p.id)); return { ok: true }; });
  route('POST', '/api/crates/:id/tracks', ({ user, p, body }) => store.addToCrate(user.id, id(p.id), ids(body.ids)));
  route('POST', '/api/crates/:id/remove', ({ user, p, body }) => ({ removed: store.removeFromCrate(user.id, id(p.id), ids(body.ids)) }));
  route('POST', '/api/crates/:id/move', ({ user, p, body }) => store.moveTracks(user.id, id(p.id), id(body.to), ids(body.ids)));
  route('PUT', '/api/crates/:id/order', ({ user, p, body }) => { store.reorderCrate(user.id, id(p.id), ids(body.ids)); return { ok: true }; });

  // ----- genres & lookups -----
  route('GET', '/api/genres', ({ user }) => store.listGenres(user.id));
  route('POST', '/api/genres', ({ user, body }) => store.addGenre(user.id, body.name));
  route('PATCH', '/api/genres/:id', ({ user, p, body }) => store.renameGenre(user.id, id(p.id), body.name));
  route('DELETE', '/api/genres/:id', ({ user, p }) => store.removeGenre(user.id, id(p.id)));
  route('GET', '/api/names', ({ user }) => ({ artists: store.listNames('artists', user.id), labels: store.listNames('labels', user.id), tags: store.listNames('tags', user.id) }));

  // ----- tracklists -----
  route('GET', '/api/tracklists', ({ user }) => store.listTracklists(user.id));
  route('POST', '/api/tracklists/parse', ({ body }) => parseTracklist(String(body.text || '')));
  route('POST', '/api/tracklists', ({ user, body }) => store.createTracklist(user.id, body));
  route('GET', '/api/tracklists/:id', ({ user, p }) => store.getTracklist(user.id, id(p.id)));
  route('PATCH', '/api/tracklists/:id', ({ user, p, body }) => store.updateTracklist(user.id, id(p.id), body));
  route('DELETE', '/api/tracklists/:id', ({ user, p }) => { store.deleteTracklist(user.id, id(p.id)); return { ok: true }; });
  route('PATCH', '/api/tracklists/:id/entries/:eid', ({ user, p, body }) => store.updateEntry(user.id, id(p.id), id(p.eid), body));
  route('POST', '/api/tracklists/:id/entries/delete', ({ user, p, body }) => store.deleteEntries(user.id, id(p.id), body.ids || []));

  // ----- settings & data -----
  route('GET', '/api/settings', ({ user }) => redact(store.getSettings(user.id)));
  route('PATCH', '/api/settings', ({ user, body }) => {
    const patch = { ...body };
    // Secret fields: undefined = keep, '' = clear.
    for (const k of ['discogsToken', 'lastfmKey']) if (patch[k] === undefined || patch[k] === '••••') delete patch[k];
    const s = store.updateSettings(user.id, patch);
    return { settings: redact(s), integrations: api.integrationStatus(s) };
  });
  route('GET', '/api/backup', ({ user }) => store.backup(user.id));
  route('POST', '/api/restore', ({ user, body }) => store.restore(user.id, body));
  route('POST', '/api/sample', ({ user }) => store.loadSample(user.id));
  route('DELETE', '/api/sample', ({ user }) => store.removeSample(user.id));
  route('POST', '/api/data/delete-all', ({ user, body }) => {
    if (body.confirm !== 'DELETE') throw new HttpError(400, 'Type DELETE to confirm');
    return store.deleteAllData(user.id);
  });

  // ----- integrations -----
  route('GET', '/api/search', async ({ user, query }) => {
    const s = store.getSettings(user.id);
    const source = query.get('source');
    const artist = query.get('artist') || '';
    const title = query.get('title') || '';
    const q = query.get('q') || [artist, title].filter(Boolean).join(' ');
    if (!q.trim()) throw new HttpError(400, 'Nothing to search for');
    const m = market(s.market);
    switch (source) {
      case 'applemusic': return api.appleSearch(q, m.apple, 15);
      case 'musicbrainz': return api.mbSearchRecordings(title ? { artist, title } : { query: q }, 15);
      case 'discogs': return api.discogsSearch(q, s.discogsToken);
      case 'lastfm': return api.lastfmSearch(q, s.lastfmKey);
      default: throw new HttpError(400, 'Unknown search source');
    }
  });
  route('GET', '/api/resolve', async ({ user, query }) => api.resolveUrl(query.get('url') || '', { country: market(store.getSettings(user.id).market).apple }));
  route('GET', '/api/explore/artist', async ({ user, query }) => {
    const s = store.getSettings(user.id);
    const name = (query.get('name') || '').trim();
    if (!name && !query.get('mbid')) throw new HttpError(400, 'Enter an artist name');
    const data = await api.exploreArtist(name, { mbid: query.get('mbid'), lastfmKey: s.lastfmKey });
    data.library = store.listTracks(user.id).filter((t) => sameName(t.artist, data.name || name) || t.remixer && sameName(t.remixer, data.name || name) || t.featured.some((f) => sameName(f, data.name || name)));
    return data;
  });
  route('GET', '/api/explore/label', async ({ user, query }) => {
    const name = (query.get('name') || '').trim();
    if (!name && !query.get('mbid')) throw new HttpError(400, 'Enter a label name');
    const data = await api.exploreLabel(name, { mbid: query.get('mbid') });
    data.library = store.listTracks(user.id).filter((t) => sameName(t.label, data.name || name));
    return data;
  });
  route('GET', '/api/explore/track', async ({ user, query }) => {
    const s = store.getSettings(user.id);
    const artist = query.get('artist') || '';
    const title = query.get('title') || '';
    if (!title && !query.get('mbid')) throw new HttpError(400, 'Enter a track');
    return api.exploreTrack({ artist, title, mbid: query.get('mbid') }, { lastfmKey: s.lastfmKey });
  });
  route('GET', '/api/explore/genre', async ({ user, query }) => {
    const s = store.getSettings(user.id);
    const name = (query.get('name') || '').trim();
    if (!name) throw new HttpError(400, 'Choose a genre');
    const data = await api.exploreGenre(name, { lastfmKey: s.lastfmKey, discogsToken: s.discogsToken });
    data.library = store.listTracks(user.id).filter((t) => sameName(t.genre, name) || t.tags.some((g) => sameName(g, name)));
    return data;
  });
  route('POST', '/api/clean', ({ body }) => parseTrackLine(String(body.text || '')), { open: true });

  async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) return serveStatic(url.pathname, res);
    res.setHeader('Cache-Control', 'no-store');
    const r = routes.find((x) => x.method === req.method && x.re.test(url.pathname));
    if (!r) return send(res, 404, { error: 'Not found' });
    try {
      const token = cookie(req, 'cd_session');
      const user = auth.userFor(token);
      if (!r.open && !user) throw new HttpError(401, 'Please sign in');
      if (req.method !== 'GET' && !String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Send JSON');
      const m = url.pathname.match(r.re);
      const p = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const body = req.method === 'GET' ? {} : await readJson(req);
      const out = await r.handler({ req, res, user, token, p, body, query: url.searchParams });
      send(res, 200, out ?? { ok: true });
    } catch (err) {
      if (err instanceof HttpError) send(res, err.status, { error: err.message, service: err.service, existingId: err.existingId });
      else if (/UNIQUE constraint/.test(err.message)) send(res, 409, { error: 'That already exists' });
      else { console.error(err); send(res, 500, { error: 'Something went wrong on the server' }); }
    }
  }

  const server = createServer((req, res) => { handle(req, res).catch((e) => { console.error(e); try { send(res, 500, { error: 'Server error' }); } catch { /* closed */ } }); });
  return { server, db, store, auth };
}

function sameName(a, b) {
  const n = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  return !!a && n(a) === n(b);
}
function redact(s) {
  return { ...s, discogsToken: s.discogsToken ? '••••' : '', lastfmKey: s.lastfmKey ? '••••' : '' };
}
function cookie(req, name) {
  const m = String(req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}
function setCookie(res, token, maxAge = 60 * 864e2) {
  const secure = process.env.CRATE_DIGGER_SECURE_COOKIE === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `cd_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
function send(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data) });
  res.end(data);
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 40 * 1024 * 1024) throw new HttpError(413, 'Request is too large');
    chunks.push(c);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new HttpError(400, 'Invalid JSON'); }
}
async function serveStatic(pathname, res) {
  const base = pathname.startsWith('/shared/') ? STATIC['/shared/'] : STATIC['/'];
  const rel = pathname.startsWith('/shared/') ? pathname.slice('/shared/'.length) : pathname.slice(1);
  let file = normalize(join(base, decodeURIComponent(rel)));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  try {
    const st = await stat(file).catch(() => null);
    if (!st || st.isDirectory()) file = join(STATIC['/'], 'index.html'); // SPA fallback
    const data = await readFile(file);
    const ext = extname(file);
    res.writeHead(200, {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      ...(ext === '.html' ? { 'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; media-src https:; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' } : {}),
    });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('Not found');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.PORT || 4777);
  const host = process.env.HOST || '127.0.0.1';
  const { server } = createApp();
  server.listen(port, host, () => console.log(`y2r Crate Digger running at http://${host}:${port}`));
}
