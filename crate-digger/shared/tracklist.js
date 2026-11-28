// DJ mix tracklist parser. Keeps every original line for reference.
import { tidy, stripNoise, parseTrackLine, SEP_RE, formatTrack, dedupeKey } from './normalize.js';

const TS_RE = /^\s*[[(]?((?:\d{1,2}:)?\d{1,3}:\d{2})[\])]?\s*[-–|.:]?\s*/;
const NUM_RE = /^\s*(?:#\s*)?(\d{1,3})\s*[.)\]:]\s*|^\s*(0\d|\d{1,3}(?=\s*[-–]\s))\s*[-–]?\s+/;

// Lines that are clearly not tracks.
const NOISE_RE = [
  /^\s*(?:tracklist|track list|tracklisting|setlist|playlist)\s*[:\-]?\s*$/i,
  /\b(?:tracklist|track list|tracklisting|setlist)\s*:?\s*$/i, // "My mix — tracklist:"
  /^[^:]*[^\d\s:]\s*:\s*$/, // header lines ending in a colon
  /^\s*(?:follow|subscribe|support|stream|download|listen|buy|booking|bookings|contact|instagram|facebook|twitter|tiktok|soundcloud|spotify|bandcamp|website|mixed by|recorded (?:at|live)|thanks|thank you|all rights|copyright|©)\b/i,
  /^\s*https?:\/\//i,
  /^\s*[-=_*~•.]{3,}\s*$/,
  /^\s*(?:#[\p{L}\p{N}_]+\s*)+$/u,
];

/** Turn "1:23:45" or "12:30" into seconds. */
export function toSeconds(ts) {
  if (!ts) return null;
  return ts.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

function entryFrom(text, base) {
  const p = parseTrackLine(text);
  return {
    ...base,
    artist: p.artist,
    title: p.title,
    version: p.version,
    remixer: p.remixer,
    featured: p.featured,
    collaborators: p.collaborators,
    label: p.label,
    status: p.unknown ? 'unknown' : 'identified',
  };
}

/**
 * Parse pasted tracklist text.
 * Returns { entries, ignored } where each entry keeps `raw` (original line)
 * and `line` (1-based line number in the input).
 */
export function parseTracklist(input) {
  const lines = String(input ?? '').replace(/\r\n?/g, '\n').split('\n');
  const entries = [];
  const ignored = [];
  let pendingNumber = null;
  let pendingTs = null;

  lines.forEach((rawLine, i) => {
    const raw = rawLine.replace(/\t/g, ' ');
    const lineNo = i + 1;
    if (!raw.trim()) return;
    let s = tidy(raw);

    // Lines with only a number or only a timestamp (1001Tracklists copies)
    if (/^\s*\d{1,3}\s*[.)]?\s*$/.test(s)) { pendingNumber = Number(s.match(/\d+/)[0]); return; }
    const onlyTs = s.match(/^\s*[[(]?((?:\d{1,2}:)?\d{1,3}:\d{2})[\])]?\s*$/);
    if (onlyTs) { pendingTs = onlyTs[1]; return; }

    if (NOISE_RE.some((re) => re.test(s))) { ignored.push({ line: lineNo, raw, reason: 'Not a track' }); return; }

    let timestamp = null;
    let number = null;
    // Timestamp and numbering can appear in either order.
    for (let k = 0; k < 2; k++) {
      const t = s.match(TS_RE);
      if (t && !timestamp) { timestamp = t[1]; s = s.slice(t[0].length); continue; }
      const n = s.match(NUM_RE);
      if (n && number == null) {
        const after = s.slice(n[0].length);
        if (SEP_RE.test(after) || /^\s*id\b/i.test(after)) { number = Number(n[1] || n[2]); s = after; continue; }
      }
    }
    timestamp = timestamp || pendingTs;
    number = number ?? pendingNumber;
    pendingTs = null;
    pendingNumber = null;

    // 1001Tracklists "w/" continuation: track played with the previous one.
    let playedWith = false;
    const w = s.match(/^\s*w\/\s*(.*)$/i);
    if (w) { playedWith = true; s = w[1]; }

    const cleaned = stripNoise(s).text;
    if (!SEP_RE.test(cleaned) && !/^\s*id\s*$/i.test(cleaned)) {
      ignored.push({ line: lineNo, raw, reason: 'No artist–title separator' });
      return;
    }

    // Split "A - X / B - Y" mashups and "A - X w/ B - Y" combos into separate entries.
    const segments = splitCombined(cleaned);
    segments.forEach((seg, j) => {
      const e = entryFrom(seg.text, {
        line: lineNo,
        raw,
        timestamp,
        seconds: toSeconds(timestamp),
        number,
        playedWith: playedWith || j > 0,
        relation: j > 0 ? seg.relation : (playedWith ? 'w/' : ''),
      });
      entries.push(e);
    });
  });

  entries.forEach((e, i) => { e.position = i + 1; });
  return { entries, ignored };
}

function splitCombined(text) {
  // Split on " w/ " or " / " only when both sides look like "Artist - Title".
  const parts = text.split(/\s+(w\/|\/)\s+/i);
  if (parts.length < 3) return [{ text }];
  const out = [{ text: parts[0] }];
  for (let i = 1; i < parts.length; i += 2) {
    const seg = parts[i + 1];
    if (SEP_RE.test(seg) && SEP_RE.test(out[out.length - 1].text)) out.push({ text: seg, relation: parts[i].toLowerCase() === 'w/' ? 'w/' : '/' });
    else out[out.length - 1].text += ` ${parts[i]} ${seg}`;
  }
  return out;
}

/** Entries sharing artist+title+version with an earlier entry. */
export function findDuplicates(entries) {
  const seen = new Map();
  const dupes = [];
  entries.forEach((e) => {
    if (e.status === 'unknown') return;
    const k = dedupeKey(e);
    if (seen.has(k)) dupes.push(e); else seen.set(k, e);
  });
  return dupes;
}

/** Clean, copyable tracklist text. */
export function formatTracklist(entries, { timestamps = true } = {}) {
  return entries.map((e, i) => {
    const n = String(i + 1).padStart(2, '0');
    const ts = timestamps && e.timestamp ? `${e.timestamp} ` : '';
    const prefix = e.relation === 'w/' ? 'w/ ' : '';
    const line = e.status === 'unknown' && !e.artist && !e.title ? 'ID - ID' : formatTrack({ artist: e.artist || 'ID', title: e.title || 'ID', version: e.version, featured: e.featured });
    return `${n}. ${ts}${prefix}${line}`;
  }).join('\n');
}

/** Very small CSV reader for imported tracklists (artist,title[,version][,timestamp]). */
export function csvToLines(text) {
  const rows = parseCsv(text);
  if (!rows.length) return '';
  const head = rows[0].map((h) => h.toLowerCase().trim());
  const idx = (names) => head.findIndex((h) => names.includes(h));
  const ai = idx(['artist', 'artists']);
  const ti = idx(['title', 'track', 'name', 'track title']);
  const vi = idx(['version', 'mix', 'remix']);
  const si = idx(['timestamp', 'time', 'start']);
  if (ai < 0 || ti < 0) return rows.map((r) => r.join(' - ')).join('\n');
  return rows.slice(1).filter((r) => r.some(Boolean)).map((r) => {
    const ts = si >= 0 && r[si] ? `${r[si]} ` : '';
    const v = vi >= 0 && r[vi] ? ` (${r[vi]})` : '';
    return `${ts}${r[ai] || 'ID'} - ${r[ti] || 'ID'}${v}`;
  }).join('\n');
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let q = false;
  const s = String(text ?? '').replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
