// Data access for one user's collection.
import { tx } from './db.js';
import { normKey, tidy, dedupeKey, splitVersion } from '../shared/normalize.js';
import { toCamelot, camelotToMusical } from '../shared/camelot.js';
import { parseTracklist } from '../shared/tracklist.js';

export const DEFAULT_GENRES = [
  'Hard House', 'Hard Groove', 'Trance', 'Progressive Trance', 'Speed Garage', 'UK Garage', 'House',
  'Deep House', 'Tech House', 'Techno', 'Hard Techno', 'Breakbeat', 'Electro', 'Progressive House',
  'Minimal', 'Bass House', 'Jersey Club', 'Baile Funk', 'Experimental Electronic',
];
export const STARTER_CRATES = [
  'Hard House', 'Trance', 'Speed Garage', 'House', 'Techno', 'Warm-up', 'Peak Time',
  'Closing Tracks', 'Emotional', 'Unreleased / IDs', 'To Buy',
];
export const DEFAULT_SETTINGS = {
  market: 'us',
  disabledPlatforms: [],
  formats: ['WAV', 'AIFF', 'FLAC', 'MP3 320'],
  bpmTolerance: 6,
  keyNotation: 'camelot',
  musicDir: '',
  exportPrefix: 'y2r',
  theme: 'dark',
  discogsToken: '',
  lastfmKey: '',
};
const STATUSES = ['wishlist', 'purchased', 'downloaded', 'in_library', 'archived'];
const TEXT_FIELDS = ['title', 'version', 'remixer', 'source', 'source_url', 'store', 'store_url', 'file_path', 'file_format', 'artwork_url', 'artwork_source', 'notes', 'year'];

export class HttpError extends Error {
  constructor(status, message, extra = {}) { super(message); this.status = status; Object.assign(this, extra); }
}

const now = () => new Date().toISOString();
const j = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

export function createStore(db) {
  const q = (sql) => db.prepare(sql);

  // ---------- entities ----------
  function entity(table, userId, name, extra = {}) {
    const n = tidy(name);
    if (!n) return null;
    const norm = normKey(n);
    const row = q(`SELECT id FROM ${table} WHERE user_id = ? AND norm = ?`).get(userId, norm);
    if (row) {
      for (const [k, v] of Object.entries(extra)) if (v) q(`UPDATE ${table} SET ${k} = COALESCE(${k}, ?) WHERE id = ?`).run(String(v), row.id);
      return row.id;
    }
    return Number(q(`INSERT INTO ${table} (user_id, name, norm) VALUES (?, ?, ?)`).run(userId, n, norm).lastInsertRowid);
  }
  function release(userId, title, labelId, year) {
    const t = tidy(title);
    if (!t) return null;
    const norm = normKey(t);
    const row = q('SELECT id FROM releases WHERE user_id = ? AND norm = ? AND label_id IS ?').get(userId, norm, labelId ?? null);
    if (row) { if (year) q('UPDATE releases SET year = COALESCE(year, ?) WHERE id = ?').run(String(year), row.id); return row.id; }
    return Number(q('INSERT INTO releases (user_id, title, norm, label_id, year) VALUES (?, ?, ?, ?, ?)').run(userId, t, norm, labelId ?? null, year ? String(year) : null).lastInsertRowid);
  }
  function setTags(userId, trackId, tags) {
    q('DELETE FROM track_tags WHERE track_id = ?').run(trackId);
    for (const name of [...new Set((tags || []).map(tidy).filter(Boolean))]) {
      const id = entity('tags', userId, name);
      q('INSERT OR IGNORE INTO track_tags (track_id, tag_id) VALUES (?, ?)').run(trackId, id);
    }
  }

  // ---------- reading ----------
  const TRACK_SELECT = `
    SELECT t.*, a.name AS artist, l.name AS label, r.title AS release, g.name AS genre,
      (SELECT json_group_array(tg.name) FROM track_tags tt JOIN tags tg ON tg.id = tt.tag_id WHERE tt.track_id = t.id) AS tags_json,
      (SELECT json_group_array(json_object('id', c.id, 'name', c.name, 'accent', c.accent)) FROM crate_tracks ct JOIN crates c ON c.id = ct.crate_id WHERE ct.track_id = t.id) AS crates_json
    FROM tracks t
    LEFT JOIN artists a ON a.id = t.artist_id
    LEFT JOIN labels l ON l.id = t.label_id
    LEFT JOIN releases r ON r.id = t.release_id
    LEFT JOIN genres g ON g.id = t.genre_id`;

  function shape(row) {
    if (!row) return null;
    const { tags_json, crates_json, dedupe_key, user_id, ...t } = row;
    return {
      ...t,
      artist: t.artist || '',
      label: t.label || '',
      release: t.release || '',
      genre: t.genre || '',
      featured: j(t.featured, []),
      provenance: j(t.provenance, {}),
      external_ids: j(t.external_ids, {}),
      tags: j(tags_json, []).filter(Boolean),
      crates: j(crates_json, []).filter((c) => c && c.id),
      is_sample: !!t.is_sample,
      source_confirmed: !!t.source_confirmed,
    };
  }

  function listTracks(userId) {
    return q(`${TRACK_SELECT} WHERE t.user_id = ? ORDER BY t.created_at DESC, t.id DESC`).all(userId).map(shape);
  }
  function getTrack(userId, id) {
    const t = shape(q(`${TRACK_SELECT} WHERE t.user_id = ? AND t.id = ?`).get(userId, id));
    if (!t) throw new HttpError(404, 'Track not found');
    return t;
  }
  function trackDetail(userId, id) {
    const t = getTrack(userId, id);
    t.sources = q('SELECT id, platform, url, external_id, kind, created_at FROM sources WHERE track_id = ? ORDER BY created_at').all(id);
    t.acquisitions = q('SELECT * FROM acquisitions WHERE track_id = ? ORDER BY COALESCE(purchased_at, created_at) DESC').all(id);
    t.status_history = q('SELECT status, changed_at FROM status_history WHERE track_id = ? ORDER BY changed_at DESC, id DESC').all(id);
    t.discovery = q('SELECT kind, label, ref FROM discovery_steps WHERE track_id = ? ORDER BY position').all(id);
    t.tracklists = q(`SELECT DISTINCT tl.id, tl.title FROM tracklist_entries te JOIN tracklists tl ON tl.id = te.tracklist_id WHERE te.track_id = ? AND tl.user_id = ?`).all(id, userId);
    const related = (col, val) => (val ? q(`${TRACK_SELECT} WHERE t.user_id = ? AND t.${col} = ? AND t.id != ? LIMIT 12`).all(userId, val, id).map(shape) : []);
    t.same_artist = related('artist_id', t.artist_id);
    t.same_label = related('label_id', t.label_id);
    t.discovered_from_here = q(`SELECT DISTINCT ds.track_id AS id FROM discovery_steps ds JOIN tracks x ON x.id = ds.track_id WHERE x.user_id = ? AND ds.kind = 'track' AND ds.ref = ?`).all(userId, String(id)).map((r) => getTrack(userId, r.id));
    return t;
  }

  // ---------- writing tracks ----------
  function normaliseInput(data) {
    const out = {};
    for (const k of TEXT_FIELDS) if (data[k] !== undefined) out[k] = tidy(data[k] ?? '');
    if (data.notes !== undefined) out.notes = String(data.notes ?? '').trim();
    if (data.file_path !== undefined) out.file_path = String(data.file_path ?? '').trim();
    for (const k of ['source_url', 'store_url', 'artwork_url']) {
      if (out[k] && !/^https?:\/\/[^\s]+$/i.test(out[k])) throw new HttpError(400, `${k === 'artwork_url' ? 'Artwork' : k === 'store_url' ? 'Store link' : 'Source link'} must start with http:// or https://`);
    }
    if (data.bpm !== undefined) {
      if (data.bpm === '' || data.bpm == null) out.bpm = null;
      else {
        const b = Number(data.bpm);
        if (!Number.isFinite(b) || b < 40 || b > 300) throw new HttpError(400, 'BPM must be a number between 40 and 300');
        out.bpm = Math.round(b * 100) / 100;
      }
    }
    if (data.energy !== undefined) {
      if (data.energy === '' || data.energy == null) out.energy = null;
      else {
        const e = Number(data.energy);
        if (!Number.isInteger(e) || e < 1 || e > 5) throw new HttpError(400, 'Energy must be 1–5');
        out.energy = e;
      }
    }
    if (data.status !== undefined) {
      if (!STATUSES.includes(data.status)) throw new HttpError(400, 'Unknown status');
      out.status = data.status;
    }
    if (data.musical_key !== undefined || data.camelot !== undefined) {
      const rawKey = tidy(data.musical_key ?? '');
      const rawCam = tidy(data.camelot ?? '');
      const cam = rawCam ? toCamelot(rawCam) : rawKey ? toCamelot(rawKey) : null;
      if (rawCam && !cam) throw new HttpError(400, `“${rawCam}” is not a Camelot key (use 1A–12B)`);
      if (rawKey && !cam) throw new HttpError(400, `Could not read the key “${rawKey}”. Try “Am”, “F# minor” or “8A”.`);
      out.camelot = cam;
      out.musical_key = cam ? (rawKey && toCamelot(rawKey) === cam ? rawKey : camelotToMusical(cam)) : null;
    }
    if (data.duration_ms !== undefined) out.duration_ms = data.duration_ms ? Math.round(Number(data.duration_ms)) || null : null;
    if (data.featured !== undefined) out.featured = JSON.stringify((Array.isArray(data.featured) ? data.featured : String(data.featured || '').split(',')).map(tidy).filter(Boolean));
    if (data.provenance !== undefined) out.provenance = JSON.stringify(data.provenance || {});
    if (data.external_ids !== undefined) out.external_ids = JSON.stringify(data.external_ids || {});
    if (data.source_confirmed !== undefined) out.source_confirmed = data.source_confirmed ? 1 : 0;
    return out;
  }

  function resolveRefs(userId, data, current = {}) {
    const out = {};
    if (data.artist !== undefined) out.artist_id = entity('artists', userId, data.artist);
    if (data.label !== undefined) out.label_id = entity('labels', userId, data.label);
    if (data.genre !== undefined) out.genre_id = entity('genres', userId, data.genre);
    if (data.release !== undefined) {
      const labelId = out.label_id !== undefined ? out.label_id : current.label_id;
      out.release_id = release(userId, data.release, labelId, data.year);
    }
    return out;
  }

  function computeKey(userId, artistId, title, version) {
    const artist = artistId ? q('SELECT name FROM artists WHERE id = ?').get(artistId).name : '';
    return dedupeKey({ artist, title, version });
  }

  function recordStatus(trackId, status) {
    q('INSERT INTO status_history (track_id, status) VALUES (?, ?)').run(trackId, status);
  }

  /**
   * Save a track, reusing an existing record when artist/title/version already exist.
   * opts: { crateIds, discovery: [{kind,label,ref}], sources: [{platform,url,external_id,kind}] }
   */
  function saveTrack(userId, data, opts = {}) {
    return tx(db, () => {
      if (!tidy(data.title)) throw new HttpError(400, 'A track needs a title');
      let title = tidy(data.title);
      let version = tidy(data.version ?? '');
      if (!version) { const sv = splitVersion(title); if (sv.version) { title = sv.title; version = sv.version; } }
      const key = dedupeKey({ artist: data.artist, title, version });
      const existing = q('SELECT id FROM tracks WHERE user_id = ? AND dedupe_key = ?').get(userId, key);
      let id;
      let created = false;
      if (existing) {
        id = existing.id;
        // Fill empty fields only: never overwrite what the user already entered.
        const cur = q('SELECT * FROM tracks WHERE id = ?').get(id);
        const fill = normaliseInput(data);
        const sets = [];
        const vals = [];
        for (const [k, v] of Object.entries(fill)) {
          if (['status', 'title', 'version', 'provenance', 'external_ids', 'featured'].includes(k)) continue;
          if ((cur[k] == null || cur[k] === '') && v != null && v !== '') { sets.push(`${k} = ?`); vals.push(v); }
        }
        const refs = resolveRefs(userId, { label: cur.label_id ? undefined : data.label, genre: cur.genre_id ? undefined : data.genre, release: cur.release_id ? undefined : data.release, year: data.year }, cur);
        for (const [k, v] of Object.entries(refs)) if (v) { sets.push(`${k} = ?`); vals.push(v); }
        if (data.external_ids) {
          sets.push('external_ids = ?');
          vals.push(JSON.stringify({ ...j(cur.external_ids, {}), ...data.external_ids }));
        }
        if (sets.length) q(`UPDATE tracks SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals, now(), id);
      } else {
        const fields = normaliseInput({ ...data, title, version });
        const refs = resolveRefs(userId, data);
        const row = { ...fields, ...refs, user_id: userId, dedupe_key: key, is_sample: data.is_sample ? 1 : 0 };
        row.status = row.status || 'wishlist';
        const cols = Object.keys(row);
        id = Number(q(`INSERT INTO tracks (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => row[c])).lastInsertRowid);
        recordStatus(id, row.status);
        created = true;
        if (data.tags) setTags(userId, id, data.tags);
        if (opts.discovery?.length) setDiscovery(id, opts.discovery);
      }
      for (const s of opts.sources || []) addSource(id, s);
      for (const cid of opts.crateIds || []) addToCrate(userId, cid, [id]);
      return { track: getTrack(userId, id), created, duplicate: !created };
    });
  }

  function updateTrack(userId, id, data) {
    return tx(db, () => {
      const cur = q('SELECT * FROM tracks WHERE id = ? AND user_id = ?').get(id, userId);
      if (!cur) throw new HttpError(404, 'Track not found');
      if (data.title !== undefined && !tidy(data.title)) throw new HttpError(400, 'A track needs a title');
      const fields = normaliseInput(data);
      const refs = resolveRefs(userId, data, cur);
      const next = { ...cur, ...fields, ...refs };
      const key = computeKey(userId, next.artist_id, next.title, next.version);
      const clash = q('SELECT id FROM tracks WHERE user_id = ? AND dedupe_key = ? AND id != ?').get(userId, key, id);
      if (clash) throw new HttpError(409, 'Another saved track already has this artist, title and version', { existingId: clash.id });
      const row = { ...fields, ...refs, dedupe_key: key };
      // Track which fields the user entered by hand.
      if (data.provenance === undefined) {
        const prov = j(cur.provenance, {});
        for (const k of ['bpm', 'camelot', 'musical_key', 'energy', 'label', 'release', 'genre']) if (data[k] !== undefined) prov[k === 'musical_key' ? 'camelot' : k] = data[`${k}_estimated`] ? 'estimated' : 'manual';
        row.provenance = JSON.stringify(prov);
      }
      const cols = Object.keys(row);
      if (cols.length) q(`UPDATE tracks SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...cols.map((c) => row[c]), now(), id);
      if (fields.status && fields.status !== cur.status) recordStatus(id, fields.status);
      if (data.tags !== undefined) setTags(userId, id, data.tags);
      return getTrack(userId, id);
    });
  }

  function bulkUpdate(userId, ids, patch) {
    return tx(db, () => ids.map((id) => updateTrack(userId, Number(id), patch)));
  }

  function deleteTracks(userId, ids) {
    return tx(db, () => {
      let n = 0;
      for (const id of ids) n += Number(q('DELETE FROM tracks WHERE id = ? AND user_id = ?').run(Number(id), userId).changes);
      return n;
    });
  }

  /** Merge duplicate `fromId` into `intoId`: crates, sources, history and empty fields move across. */
  function mergeTracks(userId, intoId, fromId) {
    return tx(db, () => {
      const a = q('SELECT * FROM tracks WHERE id = ? AND user_id = ?').get(intoId, userId);
      const b = q('SELECT * FROM tracks WHERE id = ? AND user_id = ?').get(fromId, userId);
      if (!a || !b || a.id === b.id) throw new HttpError(400, 'Choose two different tracks to merge');
      const sets = [];
      const vals = [];
      for (const k of ['label_id', 'release_id', 'genre_id', 'bpm', 'musical_key', 'camelot', 'energy', 'source', 'source_url', 'store', 'store_url', 'file_path', 'file_format', 'duration_ms', 'artwork_url', 'artwork_source', 'year']) {
        if ((a[k] == null || a[k] === '') && b[k] != null && b[k] !== '') { sets.push(`${k} = ?`); vals.push(b[k]); }
      }
      if (b.notes && b.notes !== a.notes) { sets.push('notes = ?'); vals.push([a.notes, b.notes].filter(Boolean).join('\n\n')); }
      if (sets.length) q(`UPDATE tracks SET ${sets.join(', ')}, updated_at = ? WHERE id = ?`).run(...vals, now(), a.id);
      q('UPDATE OR IGNORE crate_tracks SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      q('UPDATE OR IGNORE track_tags SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      q('UPDATE OR IGNORE sources SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      q('UPDATE acquisitions SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      q('UPDATE tracklist_entries SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      if (!q('SELECT 1 FROM discovery_steps WHERE track_id = ?').get(a.id)) q('UPDATE discovery_steps SET track_id = ? WHERE track_id = ?').run(a.id, b.id);
      q('DELETE FROM tracks WHERE id = ?').run(b.id);
      return getTrack(userId, a.id);
    });
  }

  /** Groups of tracks with the same artist and title (versions may differ). */
  function duplicates(userId, trackIds = null) {
    const rows = listTracks(userId).filter((t) => !trackIds || trackIds.includes(t.id));
    const groups = new Map();
    for (const t of rows) {
      const k = `${normKey(t.artist)}|${normKey(t.title)}`;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(t);
    }
    return [...groups.values()].filter((g) => g.length > 1);
  }

  const safeUrl = (u) => (/^https?:\/\/\S+$/i.test(String(u || '')) ? String(u) : '');
  function addSource(trackId, s) {
    if (!s?.platform) return;
    s = { ...s, url: safeUrl(s.url) };
    q('INSERT OR IGNORE INTO sources (track_id, platform, url, external_id, kind) VALUES (?, ?, ?, ?, ?)').run(trackId, String(s.platform), String(s.url || ''), String(s.external_id || ''), String(s.kind || 'result'));
  }
  function deleteSource(userId, trackId, sourceId) {
    getTrack(userId, trackId);
    q('DELETE FROM sources WHERE id = ? AND track_id = ?').run(sourceId, trackId);
  }

  function setDiscovery(trackId, steps) {
    q('DELETE FROM discovery_steps WHERE track_id = ?').run(trackId);
    const kinds = ['track', 'artist', 'label', 'release', 'genre', 'tracklist', 'search', 'url'];
    steps.filter((s) => s && kinds.includes(s.kind) && tidy(s.label)).slice(0, 30).forEach((s, i) => {
      q('INSERT INTO discovery_steps (track_id, position, kind, label, ref) VALUES (?, ?, ?, ?, ?)').run(trackId, i, s.kind, tidy(s.label), String(s.ref ?? ''));
    });
  }
  function updateDiscovery(userId, trackId, steps) {
    getTrack(userId, trackId);
    tx(db, () => setDiscovery(trackId, steps || []));
    return trackDetail(userId, trackId);
  }

  function addAcquisition(userId, trackId, a) {
    getTrack(userId, trackId);
    const price = a.price === '' || a.price == null ? null : Number(a.price);
    if (price != null && (!Number.isFinite(price) || price < 0)) throw new HttpError(400, 'Price must be a positive number');
    if (a.purchased_at && Number.isNaN(Date.parse(a.purchased_at))) throw new HttpError(400, 'Purchase date is not a valid date');
    q('INSERT INTO acquisitions (track_id, platform, purchased_at, price, currency, file_format, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(trackId, tidy(a.platform || ''), a.purchased_at || null, price, tidy(a.currency || '').toUpperCase().slice(0, 3), tidy(a.file_format || ''), String(a.notes || ''));
    return trackDetail(userId, trackId);
  }
  function deleteAcquisition(userId, trackId, acqId) {
    getTrack(userId, trackId);
    q('DELETE FROM acquisitions WHERE id = ? AND track_id = ?').run(acqId, trackId);
    return trackDetail(userId, trackId);
  }

  // ---------- crates ----------
  function listCrates(userId) {
    return q(`SELECT c.*, COUNT(ct.track_id) AS track_count,
      (SELECT json_group_array(artwork_url) FROM (SELECT t.artwork_url FROM crate_tracks x JOIN tracks t ON t.id = x.track_id WHERE x.crate_id = c.id AND t.artwork_url != '' ORDER BY x.added_at DESC LIMIT 4)) AS art_json
      FROM crates c LEFT JOIN crate_tracks ct ON ct.crate_id = c.id
      WHERE c.user_id = ? GROUP BY c.id ORDER BY c.position, c.created_at`).all(userId)
      .map(({ art_json, ...c }) => ({ ...c, is_sample: !!c.is_sample, artwork: j(art_json, []) }));
  }
  function getCrate(userId, id) {
    const c = listCrates(userId).find((x) => x.id === Number(id));
    if (!c) throw new HttpError(404, 'Crate not found');
    c.track_ids = q('SELECT track_id, added_at FROM crate_tracks WHERE crate_id = ? ORDER BY position, added_at').all(c.id);
    return c;
  }
  function crateFields(data, partial) {
    const out = {};
    if (data.name !== undefined || !partial) {
      const n = tidy(data.name);
      if (!n) throw new HttpError(400, 'A crate needs a name');
      if (n.length > 80) throw new HttpError(400, 'Crate names can be up to 80 characters');
      out.name = n;
    }
    for (const k of ['description', 'genre', 'cover_url']) if (data[k] !== undefined) out[k] = String(data[k] ?? '').trim();
    if (out.cover_url && !/^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(out.cover_url)) throw new HttpError(400, 'Cover must be an https image URL or an uploaded image');
    if (out.cover_url && out.cover_url.length > 1_500_000) throw new HttpError(400, 'Cover image is too large (max ~1 MB)');
    if (data.accent !== undefined) {
      if (!/^#[0-9a-fA-F]{6}$/.test(data.accent)) throw new HttpError(400, 'Accent must be a hex colour like #A78BFA');
      out.accent = data.accent.toUpperCase();
    }
    return out;
  }
  function createCrate(userId, data) {
    const f = crateFields(data, false);
    if (q('SELECT 1 FROM crates WHERE user_id = ? AND name = ? COLLATE NOCASE').get(userId, f.name)) throw new HttpError(409, `You already have a crate called “${f.name}”`);
    f.position = (q('SELECT MAX(position) AS m FROM crates WHERE user_id = ?').get(userId).m ?? -1) + 1;
    f.is_sample = data.is_sample ? 1 : 0;
    const cols = Object.keys(f);
    const id = Number(q(`INSERT INTO crates (user_id, ${cols.join(',')}) VALUES (?, ${cols.map(() => '?').join(',')})`).run(userId, ...cols.map((c) => f[c])).lastInsertRowid);
    return getCrate(userId, id);
  }
  function updateCrate(userId, id, data) {
    getCrate(userId, id);
    const f = crateFields(data, true);
    if (f.name && q('SELECT 1 FROM crates WHERE user_id = ? AND name = ? COLLATE NOCASE AND id != ?').get(userId, f.name, id)) throw new HttpError(409, `You already have a crate called “${f.name}”`);
    const cols = Object.keys(f);
    if (cols.length) q(`UPDATE crates SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ?`).run(...cols.map((c) => f[c]), now(), id);
    return getCrate(userId, id);
  }
  function deleteCrate(userId, id) {
    getCrate(userId, id);
    q('DELETE FROM crates WHERE id = ? AND user_id = ?').run(id, userId);
  }
  function addToCrate(userId, crateId, trackIds) {
    const c = q('SELECT id FROM crates WHERE id = ? AND user_id = ?').get(Number(crateId), userId);
    if (!c) throw new HttpError(404, 'Crate not found');
    let added = 0;
    let pos = (q('SELECT MAX(position) AS m FROM crate_tracks WHERE crate_id = ?').get(c.id).m ?? -1) + 1;
    for (const tid of trackIds) {
      if (!q('SELECT 1 FROM tracks WHERE id = ? AND user_id = ?').get(Number(tid), userId)) continue;
      added += Number(q('INSERT OR IGNORE INTO crate_tracks (crate_id, track_id, position) VALUES (?, ?, ?)').run(c.id, Number(tid), pos++).changes);
    }
    return { added, already: trackIds.length - added };
  }
  function removeFromCrate(userId, crateId, trackIds) {
    getCrate(userId, crateId);
    let n = 0;
    for (const tid of trackIds) n += Number(q('DELETE FROM crate_tracks WHERE crate_id = ? AND track_id = ?').run(Number(crateId), Number(tid)).changes);
    return n;
  }
  function moveTracks(userId, fromId, toId, trackIds) {
    return tx(db, () => {
      const r = addToCrate(userId, toId, trackIds);
      removeFromCrate(userId, fromId, trackIds);
      return r;
    });
  }
  function reorderCrate(userId, crateId, trackIds) {
    getCrate(userId, crateId);
    tx(db, () => trackIds.forEach((tid, i) => q('UPDATE crate_tracks SET position = ? WHERE crate_id = ? AND track_id = ?').run(i, crateId, Number(tid))));
  }

  // ---------- genres ----------
  function listGenres(userId) {
    return q(`SELECT g.id, g.name, g.shortcut, g.position, COUNT(t.id) AS track_count FROM genres g LEFT JOIN tracks t ON t.genre_id = g.id
      WHERE g.user_id = ? GROUP BY g.id ORDER BY g.shortcut DESC, g.position, g.name`).all(userId).map((g) => ({ ...g, shortcut: !!g.shortcut }));
  }
  function seedGenres(userId) {
    DEFAULT_GENRES.forEach((name, i) => q('INSERT OR IGNORE INTO genres (user_id, name, norm, position) VALUES (?, ?, ?, ?)').run(userId, name, normKey(name), i));
  }
  function addGenre(userId, name) {
    const n = tidy(name);
    if (!n) throw new HttpError(400, 'Genre needs a name');
    const ex = q('SELECT id, shortcut FROM genres WHERE user_id = ? AND norm = ?').get(userId, normKey(n));
    if (ex?.shortcut) throw new HttpError(409, `“${n}” is already a genre shortcut`);
    if (ex) q('UPDATE genres SET shortcut = 1 WHERE id = ?').run(ex.id);
    else {
      const pos = (q('SELECT MAX(position) AS m FROM genres WHERE user_id = ?').get(userId).m ?? -1) + 1;
      q('INSERT INTO genres (user_id, name, norm, position) VALUES (?, ?, ?, ?)').run(userId, n, normKey(n), pos);
    }
    return listGenres(userId);
  }
  function renameGenre(userId, id, name) {
    const n = tidy(name);
    if (!n) throw new HttpError(400, 'Genre needs a name');
    const clash = q('SELECT id FROM genres WHERE user_id = ? AND norm = ? AND id != ?').get(userId, normKey(n), id);
    if (clash) throw new HttpError(409, `“${n}” already exists`);
    const r = q('UPDATE genres SET name = ?, norm = ? WHERE id = ? AND user_id = ?').run(n, normKey(n), id, userId);
    if (!r.changes) throw new HttpError(404, 'Genre not found');
    return listGenres(userId);
  }
  function removeGenre(userId, id) {
    // Keep the genre on tracks that use it; just remove the shortcut. Unused genres are deleted.
    const g = q('SELECT id FROM genres WHERE id = ? AND user_id = ?').get(id, userId);
    if (!g) throw new HttpError(404, 'Genre not found');
    const used = q('SELECT 1 FROM tracks WHERE genre_id = ? LIMIT 1').get(id);
    if (used) q('UPDATE genres SET shortcut = 0 WHERE id = ?').run(id);
    else q('DELETE FROM genres WHERE id = ?').run(id);
    return listGenres(userId);
  }
  function listNames(table, userId) {
    return q(`SELECT name FROM ${table} WHERE user_id = ? ORDER BY name`).all(userId).map((r) => r.name);
  }

  // ---------- tracklists ----------
  function listTracklists(userId) {
    return q(`SELECT tl.id, tl.title, tl.source_url, tl.created_at, tl.updated_at, tl.is_sample,
      COUNT(te.id) AS entry_count, SUM(te.status = 'unknown') AS unknown_count, SUM(te.track_id IS NOT NULL) AS saved_count
      FROM tracklists tl LEFT JOIN tracklist_entries te ON te.tracklist_id = tl.id
      WHERE tl.user_id = ? GROUP BY tl.id ORDER BY tl.created_at DESC`).all(userId).map((t) => ({ ...t, is_sample: !!t.is_sample }));
  }
  function getTracklist(userId, id) {
    const tl = q('SELECT * FROM tracklists WHERE id = ? AND user_id = ?').get(id, userId);
    if (!tl) throw new HttpError(404, 'Tracklist not found');
    tl.is_sample = !!tl.is_sample;
    tl.entries = q('SELECT * FROM tracklist_entries WHERE tracklist_id = ? ORDER BY position').all(id).map((e) => ({ ...e, featured: j(e.featured, []), edited: !!e.edited }));
    return tl;
  }
  function entryRow(e) {
    const status = ['identified', 'unknown', 'confirmed'].includes(e.status) ? e.status : 'identified';
    return [e.timestamp || null, tidy(e.artist || ''), tidy(e.title || ''), tidy(e.version || ''), tidy(e.label || ''), JSON.stringify(e.featured || []), e.relation || '', status, String(e.raw ?? e.raw_line ?? ''), e.line ?? e.line_no ?? null];
  }
  function createTracklist(userId, { title, source_url = '', original_text, entries, is_sample = false }) {
    const text = String(original_text ?? '');
    if (!text.trim()) throw new HttpError(400, 'Paste a tracklist first');
    if (text.length > 200_000) throw new HttpError(400, 'Tracklist is too long (200,000 characters max)');
    const parsed = entries || parseTracklist(text).entries;
    return tx(db, () => {
      const id = Number(q('INSERT INTO tracklists (user_id, title, source_url, original_text, is_sample) VALUES (?, ?, ?, ?, ?)').run(userId, tidy(title) || 'Untitled tracklist', safeUrl(source_url), text, is_sample ? 1 : 0).lastInsertRowid);
      parsed.forEach((e, i) => {
        const trackId = e.track_id && q('SELECT 1 FROM tracks WHERE id = ? AND user_id = ?').get(Number(e.track_id), userId) ? Number(e.track_id) : null;
        q('INSERT INTO tracklist_entries (tracklist_id, position, timestamp, artist, title, version, label, featured, relation, status, raw_line, line_no, edited, track_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, i + 1, ...entryRow(e), e.edited ? 1 : 0, trackId);
      });
      return getTracklist(userId, id);
    });
  }
  function updateTracklist(userId, id, data) {
    getTracklist(userId, id);
    if (data.title !== undefined) q('UPDATE tracklists SET title = ?, updated_at = ? WHERE id = ?').run(tidy(data.title) || 'Untitled tracklist', now(), id);
    return getTracklist(userId, id);
  }
  function updateEntry(userId, tlId, entryId, data) {
    getTracklist(userId, tlId);
    const e = q('SELECT * FROM tracklist_entries WHERE id = ? AND tracklist_id = ?').get(entryId, tlId);
    if (!e) throw new HttpError(404, 'Entry not found');
    const next = { ...e, ...Object.fromEntries(Object.entries(data).filter(([k]) => ['artist', 'title', 'version', 'label', 'timestamp', 'status', 'track_id'].includes(k))) };
    if (next.status && !['identified', 'unknown', 'confirmed'].includes(next.status)) throw new HttpError(400, 'Unknown status');
    if (next.track_id != null && !q('SELECT 1 FROM tracks WHERE id = ? AND user_id = ?').get(Number(next.track_id), userId)) throw new HttpError(400, 'Unknown track');
    q('UPDATE tracklist_entries SET artist = ?, title = ?, version = ?, label = ?, timestamp = ?, status = ?, track_id = ?, edited = 1 WHERE id = ?')
      .run(tidy(next.artist), tidy(next.title), tidy(next.version), tidy(next.label), next.timestamp || null, next.status, next.track_id ?? null, entryId);
    q('UPDATE tracklists SET updated_at = ? WHERE id = ?').run(now(), tlId);
    return getTracklist(userId, tlId).entries.find((x) => x.id === entryId);
  }
  function deleteEntries(userId, tlId, entryIds) {
    getTracklist(userId, tlId);
    tx(db, () => {
      for (const id of entryIds) q('DELETE FROM tracklist_entries WHERE id = ? AND tracklist_id = ?').run(Number(id), tlId);
      q('SELECT id FROM tracklist_entries WHERE tracklist_id = ? ORDER BY position').all(tlId).forEach((r, i) => q('UPDATE tracklist_entries SET position = ? WHERE id = ?').run(i + 1, r.id));
    });
    return getTracklist(userId, tlId);
  }
  function deleteTracklist(userId, id) {
    getTracklist(userId, id);
    q('DELETE FROM tracklists WHERE id = ?').run(id);
  }

  // ---------- settings ----------
  function getSettings(userId) {
    const row = q('SELECT data FROM settings WHERE user_id = ?').get(userId);
    return { ...DEFAULT_SETTINGS, ...j(row?.data, {}) };
  }
  function updateSettings(userId, patch) {
    const cur = getSettings(userId);
    const next = { ...cur };
    for (const k of Object.keys(DEFAULT_SETTINGS)) if (patch[k] !== undefined) next[k] = patch[k];
    const tol = Number(next.bpmTolerance);
    if (!Number.isFinite(tol) || tol < 0.5 || tol > 20) throw new HttpError(400, 'BPM tolerance must be between 0.5% and 20%');
    next.bpmTolerance = tol;
    if (!['camelot', 'openkey', 'musical'].includes(next.keyNotation)) throw new HttpError(400, 'Unknown key notation');
    if (!['dark', 'light', 'system'].includes(next.theme)) throw new HttpError(400, 'Unknown theme');
    if (!Array.isArray(next.disabledPlatforms) || !Array.isArray(next.formats)) throw new HttpError(400, 'Invalid platform or format list');
    next.musicDir = String(next.musicDir || '').trim();
    next.exportPrefix = String(next.exportPrefix || '').trim().replace(/[^\w\- ]+/g, '').slice(0, 40) || 'y2r';
    next.discogsToken = String(next.discogsToken || '').trim();
    next.lastfmKey = String(next.lastfmKey || '').trim();
    q('INSERT INTO settings (user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data').run(userId, JSON.stringify(next));
    return next;
  }

  // ---------- stats ----------
  function stats(userId) {
    const r = q(`SELECT COUNT(*) AS tracks, SUM(status='wishlist') AS wishlist, SUM(status='in_library') AS in_library,
      SUM(bpm IS NULL OR camelot IS NULL) AS missing_bpm_key, SUM(is_sample) AS samples FROM tracks WHERE user_id = ?`).get(userId);
    r.crates = q('SELECT COUNT(*) AS n FROM crates WHERE user_id = ?').get(userId).n;
    r.tracklists = q('SELECT COUNT(*) AS n FROM tracklists WHERE user_id = ?').get(userId).n;
    r.sample_crates = q('SELECT COUNT(*) AS n FROM crates WHERE user_id = ? AND is_sample = 1').get(userId).n;
    r.sample_tracklists = q('SELECT COUNT(*) AS n FROM tracklists WHERE user_id = ? AND is_sample = 1').get(userId).n;
    for (const k of Object.keys(r)) r[k] = r[k] ?? 0;
    return r;
  }

  // ---------- backup / restore ----------
  const BACKUP_VERSION = 1;
  function backup(userId) {
    const all = (sql, ...a) => q(sql).all(...a);
    const settings = getSettings(userId);
    delete settings.discogsToken; // never write secrets into a portable file
    delete settings.lastfmKey;
    return {
      app: 'y2r-crate-digger',
      version: BACKUP_VERSION,
      exported_at: now(),
      settings,
      artists: all('SELECT id, name, mbid, discogs_id FROM artists WHERE user_id = ?', userId),
      labels: all('SELECT id, name, mbid, discogs_id FROM labels WHERE user_id = ?', userId),
      releases: all('SELECT id, title, label_id, year, catalog, mbid, discogs_id FROM releases WHERE user_id = ?', userId),
      genres: all('SELECT id, name, shortcut, position FROM genres WHERE user_id = ?', userId),
      tags: all('SELECT id, name FROM tags WHERE user_id = ?', userId),
      tracks: all('SELECT * FROM tracks WHERE user_id = ?', userId).map(({ user_id, ...t }) => t),
      track_tags: all('SELECT tt.* FROM track_tags tt JOIN tracks t ON t.id = tt.track_id WHERE t.user_id = ?', userId),
      crates: all('SELECT * FROM crates WHERE user_id = ?', userId).map(({ user_id, ...c }) => c),
      crate_tracks: all('SELECT ct.* FROM crate_tracks ct JOIN crates c ON c.id = ct.crate_id WHERE c.user_id = ?', userId),
      sources: all('SELECT s.* FROM sources s JOIN tracks t ON t.id = s.track_id WHERE t.user_id = ?', userId),
      acquisitions: all('SELECT a.* FROM acquisitions a JOIN tracks t ON t.id = a.track_id WHERE t.user_id = ?', userId),
      status_history: all('SELECT h.* FROM status_history h JOIN tracks t ON t.id = h.track_id WHERE t.user_id = ?', userId),
      tracklists: all('SELECT * FROM tracklists WHERE user_id = ?', userId).map(({ user_id, ...t }) => t),
      tracklist_entries: all('SELECT e.* FROM tracklist_entries e JOIN tracklists tl ON tl.id = e.tracklist_id WHERE tl.user_id = ?', userId),
      discovery_steps: all('SELECT d.* FROM discovery_steps d JOIN tracks t ON t.id = d.track_id WHERE t.user_id = ?', userId),
    };
  }

  function restore(userId, data) {
    if (!data || data.app !== 'y2r-crate-digger') throw new HttpError(400, 'This file is not a y2r Crate Digger backup');
    if (data.version > BACKUP_VERSION) throw new HttpError(400, 'This backup was made by a newer version of the app');
    const arr = (k) => (Array.isArray(data[k]) ? data[k] : []);
    return tx(db, () => {
      for (const t of ['tracks', 'crates', 'tracklists', 'releases', 'artists', 'labels', 'genres', 'tags']) q(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
      const map = {};
      const ins = (table, rows, cols, remap = {}) => {
        map[table] = new Map();
        for (const r of rows) {
          const row = { ...r };
          for (const [col, ref] of Object.entries(remap)) row[col] = row[col] == null ? null : map[ref].get(row[col]) ?? null;
          const values = cols.map((c) => (row[c] === undefined ? null : row[c]));
          const res = q(`INSERT INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...values);
          map[table].set(r.id, Number(res.lastInsertRowid));
        }
      };
      const withUser = (rows, norm = 'name') => rows.map((r) => ({ ...r, user_id: userId, norm: normKey(r[norm]) }));
      ins('artists', withUser(arr('artists')), ['user_id', 'name', 'norm', 'mbid', 'discogs_id']);
      ins('labels', withUser(arr('labels')), ['user_id', 'name', 'norm', 'mbid', 'discogs_id']);
      ins('releases', withUser(arr('releases'), 'title'), ['user_id', 'title', 'norm', 'label_id', 'year', 'catalog', 'mbid', 'discogs_id'], { label_id: 'labels' });
      ins('genres', withUser(arr('genres')), ['user_id', 'name', 'norm', 'shortcut', 'position']);
      ins('tags', withUser(arr('tags')), ['user_id', 'name', 'norm']);
      const trackCols = ['user_id', 'artist_id', 'title', 'version', 'remixer', 'featured', 'label_id', 'release_id', 'genre_id', 'year', 'bpm', 'musical_key', 'camelot', 'energy', 'status', 'source', 'source_url', 'source_confirmed', 'store', 'store_url', 'file_path', 'file_format', 'duration_ms', 'artwork_url', 'artwork_source', 'notes', 'provenance', 'external_ids', 'dedupe_key', 'is_sample', 'created_at', 'updated_at'];
      const defaults = { version: '', remixer: '', featured: '[]', status: 'wishlist', source: '', source_url: '', source_confirmed: 0, store: '', store_url: '', file_path: '', file_format: '', artwork_url: '', artwork_source: '', notes: '', provenance: '{}', external_ids: '{}', is_sample: 0, created_at: now(), updated_at: now() };
      ins('tracks', arr('tracks').map((t) => ({ ...defaults, ...Object.fromEntries(Object.entries(t).filter(([, v]) => v != null)), source_url: safeUrl(t.source_url), store_url: safeUrl(t.store_url), artwork_url: safeUrl(t.artwork_url), user_id: userId, dedupe_key: t.dedupe_key || `${normKey(t.title)}|${t.id}` })), trackCols, { artist_id: 'artists', label_id: 'labels', release_id: 'releases', genre_id: 'genres' });
      ins('crates', arr('crates').map((c) => ({ description: '', genre: '', accent: '#A78BFA', is_sample: 0, position: 0, created_at: now(), updated_at: now(), ...c, cover_url: /^(https:\/\/|data:image\/(png|jpeg|webp|gif);base64,)/.test(c.cover_url || '') ? c.cover_url : '', user_id: userId })), ['user_id', 'name', 'description', 'genre', 'cover_url', 'accent', 'is_sample', 'position', 'created_at', 'updated_at']);
      ins('tracklists', arr('tracklists').map((t) => ({ is_sample: 0, created_at: now(), updated_at: now(), ...t, source_url: safeUrl(t.source_url), user_id: userId })), ['user_id', 'title', 'source_url', 'original_text', 'is_sample', 'created_at', 'updated_at']);
      const link = (table, rows, cols, remap) => {
        for (const r of rows) {
          const row = { ...r };
          let ok = true;
          for (const [col, ref] of Object.entries(remap)) {
            if (row[col] == null) continue;
            row[col] = map[ref].get(row[col]);
            if (row[col] == null) { if (col === 'track_id' && table === 'tracklist_entries') row[col] = null; else ok = false; }
          }
          if (ok) q(`INSERT OR IGNORE INTO ${table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => (row[c] === undefined ? null : row[c])));
        }
      };
      link('track_tags', arr('track_tags'), ['track_id', 'tag_id'], { track_id: 'tracks', tag_id: 'tags' });
      link('crate_tracks', arr('crate_tracks'), ['crate_id', 'track_id', 'position', 'added_at'], { crate_id: 'crates', track_id: 'tracks' });
      link('sources', arr('sources').map((s) => ({ url: '', external_id: '', kind: 'result', ...s })), ['track_id', 'platform', 'url', 'external_id', 'kind', 'created_at'], { track_id: 'tracks' });
      link('acquisitions', arr('acquisitions').map((a) => ({ platform: '', currency: '', file_format: '', notes: '', ...a })), ['track_id', 'platform', 'purchased_at', 'price', 'currency', 'file_format', 'notes', 'created_at'], { track_id: 'tracks' });
      link('status_history', arr('status_history'), ['track_id', 'status', 'changed_at'], { track_id: 'tracks' });
      link('tracklist_entries', arr('tracklist_entries').map((e) => ({ artist: '', title: '', version: '', label: '', featured: '[]', relation: '', status: 'identified', raw_line: '', edited: 0, ...e })), ['tracklist_id', 'position', 'timestamp', 'artist', 'title', 'version', 'label', 'featured', 'relation', 'status', 'raw_line', 'line_no', 'edited', 'track_id'], { tracklist_id: 'tracklists', track_id: 'tracks' });
      // Discovery steps that point at a track id need the new id.
      link('discovery_steps', arr('discovery_steps').map((d) => ({ ...d, ref: d.kind === 'track' && map.tracks.get(Number(d.ref)) ? String(map.tracks.get(Number(d.ref))) : d.ref })), ['track_id', 'position', 'kind', 'label', 'ref'], { track_id: 'tracks' });
      if (data.settings) {
        const keep = getSettings(userId);
        updateSettings(userId, { ...data.settings, discogsToken: keep.discogsToken, lastfmKey: keep.lastfmKey });
      }
      return stats(userId);
    });
  }

  // ---------- sample content ----------
  function loadSample(userId) {
    const existing = q('SELECT 1 FROM tracks WHERE user_id = ? AND is_sample = 1 LIMIT 1').get(userId);
    if (existing) throw new HttpError(409, 'Sample content is already loaded');
    return tx(db, () => {
      const crate = q('SELECT id FROM crates WHERE user_id = ? AND name = ?').get(userId, 'Sample: Peak Time')
        || { id: Number(q('INSERT INTO crates (user_id, name, description, genre, accent, is_sample) VALUES (?, ?, ?, ?, ?, 1)').run(userId, 'Sample: Peak Time', 'Sample content for trying the app. Remove it from Settings → Data.', 'Hard House', '#A78BFA').lastInsertRowid) };
      const samples = [
        ['Sample Artist One', 'Pressure Point', 'Original Mix', 'Sample Label', 150, '8A', 'Hard House', 5, 'in_library', '/Music/Samples/sample-artist-one-pressure-point.aiff'],
        ['Sample Artist Two', 'Night Bus', 'Extended Mix', 'Sample Label', 148, '9A', 'Hard House', 4, 'purchased', ''],
        ['Sample Artist Three', 'Glass Floor', 'Dub Mix', 'Another Sample Label', 140, '8B', 'Trance', 3, 'wishlist', ''],
        ['Sample Artist Four', 'Halftime Ghost', '', 'Another Sample Label', 75, '7A', 'Breakbeat', 2, 'wishlist', ''],
        ['Sample Artist Five', 'Unfinished Business', 'VIP', '', 132, '3A', 'Techno', 4, 'downloaded', ''],
      ];
      const ids = samples.map(([artist, title, version, label, bpm, camelot, genre, energy, status, file_path]) => {
        const r = saveTrack(userId, { artist, title, version, label, bpm, camelot, genre, energy, status, file_path, source: 'Sample content', notes: 'Sample track for onboarding — not a real release.', is_sample: true }, {
          discovery: [{ kind: 'tracklist', label: 'Sample mix tracklist' }, { kind: 'artist', label: artist }, { kind: 'track', label: `${artist} - ${title}` }],
        });
        return r.track.id;
      });
      q('UPDATE tracks SET is_sample = 1 WHERE id IN (' + ids.map(() => '?').join(',') + ')').run(...ids);
      addToCrate(userId, crate.id, ids);
      createTracklist(userId, {
        title: 'Sample: Mix tracklist',
        is_sample: true,
        original_text: 'Sample mix — tracklist:\n00:00 Sample Artist One - Pressure Point (Original Mix) [FREE DOWNLOAD]\n04:12 Sample Artist Two - Night Bus (Extended Mix)\n08:40 ID - ID\n12:05 Sample Artist Three - Glass Floor (Dub Mix) w/ Sample Artist Five - Unfinished Business (VIP)\n#hardhouse #sample',
      });
      return stats(userId);
    });
  }
  function removeSample(userId) {
    return tx(db, () => {
      q('DELETE FROM tracks WHERE user_id = ? AND is_sample = 1').run(userId);
      q('DELETE FROM crates WHERE user_id = ? AND is_sample = 1').run(userId);
      q('DELETE FROM tracklists WHERE user_id = ? AND is_sample = 1').run(userId);
      q("DELETE FROM labels WHERE user_id = ? AND name IN ('Sample Label','Another Sample Label') AND id NOT IN (SELECT label_id FROM tracks WHERE label_id IS NOT NULL)").run(userId);
      q("DELETE FROM artists WHERE user_id = ? AND name LIKE 'Sample Artist %' AND id NOT IN (SELECT artist_id FROM tracks WHERE artist_id IS NOT NULL)").run(userId);
      return stats(userId);
    });
  }

  function deleteAllData(userId) {
    return tx(db, () => {
      for (const t of ['tracks', 'crates', 'tracklists', 'releases', 'artists', 'labels', 'tags']) q(`DELETE FROM ${t} WHERE user_id = ?`).run(userId);
      return stats(userId);
    });
  }

  return {
    listTracks, getTrack, trackDetail, saveTrack, updateTrack, bulkUpdate, deleteTracks, mergeTracks, duplicates,
    addSource, deleteSource, updateDiscovery, addAcquisition, deleteAcquisition,
    listCrates, getCrate, createCrate, updateCrate, deleteCrate, addToCrate, removeFromCrate, moveTracks, reorderCrate,
    listGenres, seedGenres, addGenre, renameGenre, removeGenre, listNames,
    listTracklists, getTracklist, createTracklist, updateTracklist, updateEntry, deleteEntries, deleteTracklist,
    getSettings, updateSettings, stats, backup, restore, loadSample, removeSample, deleteAllData,
  };
}
