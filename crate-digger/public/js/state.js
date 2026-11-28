// Client-side cache of the user's collection. The server is the source of truth.
import { get } from './api.js';

const listeners = new Set();
export const state = {
  user: null,
  settings: {},
  integrations: {},
  stats: {},
  crates: [],
  genres: [],
  starterCrates: [],
  tracks: null, // loaded lazily
};

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(what) { for (const fn of listeners) fn(what); }

export async function bootstrap() {
  const b = await get('/api/bootstrap');
  Object.assign(state, { user: b.user, settings: b.settings, stats: b.stats, crates: b.crates, genres: b.genres, integrations: b.integrations, starterCrates: b.starter_crates });
  applyTheme();
  emit('all');
}
export async function refreshCrates() { state.crates = await get('/api/crates'); emit('crates'); return state.crates; }
export async function refreshGenres() { state.genres = await get('/api/genres'); emit('genres'); return state.genres; }
export async function refreshTracks() { state.tracks = await get('/api/tracks'); emit('tracks'); return state.tracks; }
export async function ensureTracks() { return state.tracks || refreshTracks(); }
export async function refreshAll() {
  await Promise.all([refreshTracks(), refreshCrates(), refreshGenres(), get('/api/bootstrap').then((b) => { state.stats = b.stats; })]);
  emit('all');
}
/** Merge a changed track into the cache without refetching everything. */
export function upsertTrack(t) {
  if (!state.tracks) return;
  const i = state.tracks.findIndex((x) => x.id === t.id);
  if (i >= 0) state.tracks[i] = { ...state.tracks[i], ...t };
  else state.tracks.unshift(t);
  emit('tracks');
}
export function removeTracks(ids) {
  if (!state.tracks) return;
  const set = new Set(ids);
  state.tracks = state.tracks.filter((t) => !set.has(t.id));
  emit('tracks');
}
export function setSettings(s, integrations) {
  state.settings = s;
  if (integrations) state.integrations = integrations;
  applyTheme();
  emit('settings');
}

export function applyTheme() {
  const pref = state.settings.theme || 'dark';
  const theme = pref === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : pref;
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('cd-theme', theme); } catch { /* private mode */ }
}
matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (state.settings.theme === 'system') applyTheme(); });
try { const t = localStorage.getItem('cd-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* ignore */ }

// ---------- discovery trail (session only) ----------
const TRAIL_KEY = 'cd-trail';
export function getTrail() {
  try { return JSON.parse(sessionStorage.getItem(TRAIL_KEY)) || []; } catch { return []; }
}
export function setTrail(steps) {
  try { sessionStorage.setItem(TRAIL_KEY, JSON.stringify(steps.slice(-12))); } catch { /* ignore */ }
  emit('trail');
}
/** Add a step; if it is already in the trail, cut the trail back to it (navigating back). */
export function pushTrail(step) {
  const t = getTrail();
  const i = t.findIndex((s) => s.kind === step.kind && s.label.toLowerCase() === step.label.toLowerCase());
  if (i >= 0) setTrail(t.slice(0, i + 1));
  else setTrail([...t, step]);
}
export function startTrail(step) { setTrail(step ? [step] : []); }
