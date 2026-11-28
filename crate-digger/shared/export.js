// CSV, M3U8 and shopping-list generation. Pure functions.
import { platformName, buildLinks } from './platforms.js';
import { searchQuery } from './normalize.js';

export const CSV_FIELDS = [
  ['artist', 'Artist'], ['title', 'Title'], ['version', 'Remix / version'], ['featured', 'Featured'],
  ['label', 'Label'], ['release', 'Release'], ['year', 'Year'], ['bpm', 'BPM'], ['musical_key', 'Key'],
  ['camelot', 'Camelot'], ['genre', 'Genre'], ['energy', 'Energy'], ['status', 'Status'],
  ['source', 'Source'], ['store', 'Store'], ['file_path', 'File path'], ['file_format', 'File format'],
  ['tags', 'Tags'], ['crates', 'Crates'], ['notes', 'Notes'], ['created_at', 'Date added'],
];

function csvCell(v) {
  if (v == null) return '';
  let s = Array.isArray(v) ? v.join('; ') : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(tracks) {
  const head = CSV_FIELDS.map(([, h]) => h).join(',');
  const rows = tracks.map((t) => CSV_FIELDS.map(([k]) => csvCell(t[k])).join(','));
  return `﻿${[head, ...rows].join('\r\n')}\r\n`;
}

function isAbsolute(p) {
  return /^(?:[a-zA-Z]:[\\/]|\\\\|\/|~[\\/]|file:)/.test(p);
}

/** Resolve a track's file path against the configured music directory. Never invents a path. */
export function resolvePath(filePath, musicDir) {
  const p = String(filePath || '').trim();
  if (!p) return null;
  if (isAbsolute(p) || !musicDir) return isAbsolute(p) ? p : null;
  const sep = /\\/.test(musicDir) || /^[a-zA-Z]:/.test(musicDir) ? '\\' : '/';
  return `${musicDir.replace(/[\\/]+$/, '')}${sep}${p.replace(/^[\\/]+/, '').replace(/[\\/]/g, sep)}`;
}

/**
 * Review which tracks can go into an M3U8 playlist.
 * Only tracks marked In Library with a usable local path are included.
 */
export function reviewPlaylist(tracks, { musicDir = '' } = {}) {
  const included = [];
  const excluded = [];
  for (const t of tracks) {
    const path = resolvePath(t.file_path, musicDir);
    if (t.status !== 'in_library') excluded.push({ track: t, reason: `Status is ${statusLabel(t.status)}, not In Library` });
    else if (!t.file_path) excluded.push({ track: t, reason: 'No local file path' });
    else if (!path) excluded.push({ track: t, reason: 'Relative path but no music folder set in Settings' });
    else included.push({ track: t, path });
  }
  return { included, excluded };
}

export function toM3u8(name, included) {
  const lines = ['#EXTM3U', `#PLAYLIST:${String(name).replace(/[\r\n]/g, ' ')}`];
  for (const { track: t, path } of included) {
    const dur = t.duration_ms ? Math.round(t.duration_ms / 1000) : -1;
    const title = [t.artist, [t.title, t.version ? `(${t.version})` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' - ');
    lines.push(`#EXTINF:${dur},${title.replace(/[\r\n]/g, ' ')}`);
    lines.push(path);
  }
  return `${lines.join('\n')}\n`;
}

export const STATUSES = [
  ['wishlist', 'Wishlist'], ['purchased', 'Purchased'], ['downloaded', 'Downloaded'],
  ['in_library', 'In Library'], ['archived', 'Archived'],
];
export function statusLabel(s) {
  return (STATUSES.find(([k]) => k === s) || [s, s || 'None'])[1];
}

/** Wishlist grouped by store, with the saved store link or a search link. */
export function shoppingList(tracks, settings = {}) {
  const groups = new Map();
  for (const t of tracks.filter((x) => x.status === 'wishlist')) {
    const store = t.store || 'No store chosen';
    if (!groups.has(store)) groups.set(store, []);
    let link = t.store_url || '';
    let linkKind = link ? 'saved' : '';
    if (!link && t.store) {
      const q = searchQuery(t);
      const found = buildLinks(q, { settings }).flatMap((g) => g.links).find((l) => l.name.toLowerCase() === t.store.toLowerCase() || l.platform === t.store.toLowerCase());
      if (found) { link = found.href; linkKind = 'search'; }
    }
    groups.get(store).push({ track: t, link, linkKind });
  }
  return [...groups.entries()].sort((a, b) => (a[0] === 'No store chosen') - (b[0] === 'No store chosen') || a[0].localeCompare(b[0]))
    .map(([store, items]) => ({ store, items }));
}

export function shoppingText(groups) {
  const out = ['y2r Crate Digger — shopping list', ''];
  for (const g of groups) {
    out.push(`## ${g.store} (${g.items.length})`);
    for (const { track: t, link, linkKind } of g.items) {
      const name = [t.artist, t.title + (t.version ? ` (${t.version})` : '')].filter(Boolean).join(' - ');
      out.push(`- ${name}${t.label ? ` [${t.label}]` : ''}${link ? `\n  ${linkKind === 'search' ? 'Search: ' : ''}${link}` : ''}`);
    }
    out.push('');
  }
  return out.join('\n');
}

export { platformName };
