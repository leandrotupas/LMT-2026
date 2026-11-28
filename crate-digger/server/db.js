import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS artists (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  norm TEXT NOT NULL,
  mbid TEXT, discogs_id TEXT,
  UNIQUE (user_id, norm)
);
CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  norm TEXT NOT NULL,
  mbid TEXT, discogs_id TEXT,
  UNIQUE (user_id, norm)
);
CREATE TABLE IF NOT EXISTS releases (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  norm TEXT NOT NULL,
  label_id INTEGER REFERENCES labels(id) ON DELETE SET NULL,
  year TEXT, catalog TEXT, mbid TEXT, discogs_id TEXT,
  UNIQUE (user_id, norm, label_id)
);
CREATE TABLE IF NOT EXISTS genres (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  norm TEXT NOT NULL,
  shortcut INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  UNIQUE (user_id, norm)
);
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id INTEGER REFERENCES artists(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  remixer TEXT NOT NULL DEFAULT '',
  featured TEXT NOT NULL DEFAULT '[]',
  label_id INTEGER REFERENCES labels(id) ON DELETE SET NULL,
  release_id INTEGER REFERENCES releases(id) ON DELETE SET NULL,
  genre_id INTEGER REFERENCES genres(id) ON DELETE SET NULL,
  year TEXT,
  bpm REAL,
  musical_key TEXT,
  camelot TEXT,
  energy INTEGER CHECK (energy BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('wishlist','purchased','downloaded','in_library','archived')),
  source TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  source_confirmed INTEGER NOT NULL DEFAULT 0,
  store TEXT NOT NULL DEFAULT '',
  store_url TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  file_format TEXT NOT NULL DEFAULT '',
  duration_ms INTEGER,
  artwork_url TEXT NOT NULL DEFAULT '',
  artwork_source TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  provenance TEXT NOT NULL DEFAULT '{}',
  external_ids TEXT NOT NULL DEFAULT '{}',
  dedupe_key TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS tracks_user ON tracks(user_id, created_at);
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  norm TEXT NOT NULL,
  UNIQUE (user_id, norm)
);
CREATE TABLE IF NOT EXISTS track_tags (
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (track_id, tag_id)
);
CREATE TABLE IF NOT EXISTS crates (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  cover_url TEXT NOT NULL DEFAULT '',
  accent TEXT NOT NULL DEFAULT '#A78BFA',
  is_sample INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS crate_tracks (
  crate_id INTEGER NOT NULL REFERENCES crates(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (crate_id, track_id)
);
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  external_id TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'result',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (track_id, platform, url)
);
CREATE TABLE IF NOT EXISTS acquisitions (
  id INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT '',
  purchased_at TEXT,
  price REAL,
  currency TEXT NOT NULL DEFAULT '',
  file_format TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS tracklists (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  original_text TEXT NOT NULL,
  is_sample INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS tracklist_entries (
  id INTEGER PRIMARY KEY,
  tracklist_id INTEGER NOT NULL REFERENCES tracklists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  timestamp TEXT,
  artist TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  featured TEXT NOT NULL DEFAULT '[]',
  relation TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified','unknown','confirmed')),
  raw_line TEXT NOT NULL DEFAULT '',
  line_no INTEGER,
  edited INTEGER NOT NULL DEFAULT 0,
  track_id INTEGER REFERENCES tracks(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS discovery_steps (
  id INTEGER PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('track','artist','label','release','genre','tracklist','search','url')),
  label TEXT NOT NULL,
  ref TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS discovery_track ON discovery_steps(track_id, position);
CREATE TABLE IF NOT EXISTS api_cache (
  key TEXT PRIMARY KEY,
  body TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`;

export function openDb(file) {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  return db;
}

/** Run fn inside a transaction. */
export function tx(db, fn) {
  if (db.isTransaction) return fn(); // nested call joins the outer transaction
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (err) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw err;
  }
}
