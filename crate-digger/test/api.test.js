import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';

let app, base, cookie = '';
async function call(method, path, body) {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const set = res.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const data = await res.json();
  return { status: res.status, data };
}
before(async () => {
  app = createApp({ dbFile: ':memory:' });
  await new Promise((r) => app.server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`;
});
after(() => app.server.close());

test('auth gate and registration', async () => {
  assert.equal((await call('GET', '/api/tracks')).status, 401);
  assert.equal((await call('POST', '/api/register', { username: 'dj', password: 'short' })).status, 400);
  const r = await call('POST', '/api/register', { username: 'digger', password: 'longenough' });
  assert.equal(r.status, 200);
  const b = await call('GET', '/api/bootstrap');
  assert.equal(b.data.genres.length, 19);
});

test('save, dedupe, multi-crate, edit key, status history', async () => {
  const c1 = (await call('POST', '/api/crates', { name: 'Peak Time' })).data;
  const c2 = (await call('POST', '/api/crates', { name: 'To Buy', accent: '#FF8800' })).data;
  assert.equal((await call('POST', '/api/crates', { name: 'peak time' })).status, 409);
  const s1 = await call('POST', '/api/tracks', { track: { artist: 'A', title: 'Song', version: 'Dub Mix', label: 'L1' }, crateIds: [c1.id], discovery: [{ kind: 'artist', label: 'A' }] });
  assert.equal(s1.data.created, true);
  const s2 = await call('POST', '/api/tracks', { track: { artist: 'a', title: 'song', version: 'dub mix', bpm: 140 }, crateIds: [c2.id] });
  assert.equal(s2.data.duplicate, true);
  assert.equal(s2.data.track.id, s1.data.track.id);
  assert.equal(s2.data.track.bpm, 140);
  assert.equal(s2.data.track.crates.length, 2);
  const id = s1.data.track.id;
  const e = await call('PATCH', `/api/tracks/${id}`, { musical_key: 'F# minor', status: 'purchased', tags: ['warm', 'vocal'] });
  assert.equal(e.data.camelot, '11A');
  assert.deepEqual(e.data.tags.sort(), ['vocal', 'warm']);
  assert.equal((await call('PATCH', `/api/tracks/${id}`, { camelot: '14Z' })).status, 400);
  assert.equal((await call('PATCH', `/api/tracks/${id}`, { bpm: 9999 })).status, 400);
  const d = await call('GET', `/api/tracks/${id}`);
  assert.equal(d.data.status_history.length, 2);
  assert.equal(d.data.discovery[0].label, 'A');
  assert.equal(d.data.provenance.camelot, 'manual');
  const other = await call('POST', '/api/tracks', { track: { artist: 'A', title: 'Song', version: 'Original Mix' } });
  assert.equal((await call('PATCH', `/api/tracks/${other.data.track.id}`, { version: 'Dub Mix' })).status, 409);
  const dups = await call('GET', '/api/tracks/duplicates');
  assert.equal(dups.data.length, 1);
  const merged = await call('POST', `/api/tracks/${id}/merge`, { fromId: other.data.track.id });
  assert.equal(merged.status, 200);
  const acq = await call('POST', `/api/tracks/${id}/acquisitions`, { platform: 'Bandcamp', price: '1.5', currency: 'eur', purchased_at: '2026-11-01', file_format: 'WAV' });
  assert.equal(acq.data.acquisitions[0].currency, 'EUR');
  const mv = await call('POST', `/api/crates/${c2.id}/move`, { to: c1.id, ids: [id] });
  assert.equal(mv.status, 200);
  const crates = (await call('GET', '/api/crates')).data;
  assert.equal(crates.find((c) => c.id === c2.id).track_count, 0);
});

test('tracklist store keeps original text and edits', async () => {
  const text = '00:00 A - B\n03:00 ID - ID\nfollow me';
  const tl = (await call('POST', '/api/tracklists', { title: 'Mix', original_text: text })).data;
  assert.equal(tl.entries.length, 2);
  assert.equal(tl.entries[1].status, 'unknown');
  const e = await call('PATCH', `/api/tracklists/${tl.id}/entries/${tl.entries[1].id}`, { artist: 'X', title: 'Y', status: 'confirmed' });
  assert.equal(e.data.edited, true);
  const again = (await call('GET', `/api/tracklists/${tl.id}`)).data;
  assert.equal(again.original_text, text);
});

test('backup and restore round trip', async () => {
  const before = (await call('GET', '/api/tracks')).data;
  const bk = (await call('GET', '/api/backup')).data;
  assert.equal(bk.app, 'y2r-crate-digger');
  const del = await call('POST', '/api/data/delete-all', { confirm: 'DELETE' });
  assert.equal(del.data.tracks, 0);
  const r = await call('POST', '/api/restore', bk);
  assert.equal(r.status, 200);
  const after = (await call('GET', '/api/tracks')).data;
  assert.equal(after.length, before.length);
  assert.deepEqual(after.map((t) => [t.artist, t.title, t.camelot, t.crates.length]).sort(), before.map((t) => [t.artist, t.title, t.camelot, t.crates.length]).sort());
  const tl = (await call('GET', '/api/tracklists')).data;
  assert.equal(tl.length, 1);
  assert.equal((await call('POST', '/api/restore', { nope: 1 })).status, 400);
});

test('sample content is labelled and removable', async () => {
  const s = await call('POST', '/api/sample');
  assert.equal(s.data.samples, 5);
  assert.equal((await call('POST', '/api/sample')).status, 409);
  const r = await call('DELETE', '/api/sample');
  assert.equal(r.data.samples, 0);
  assert.equal(r.data.sample_crates, 0);
});

test('settings validation and secret redaction', async () => {
  const r = await call('PATCH', '/api/settings', { bpmTolerance: 8, market: 'gb', discogsToken: 'abc' });
  assert.equal(r.data.settings.discogsToken, '••••');
  assert.equal(r.data.integrations.discogs.state, 'live');
  assert.equal((await call('PATCH', '/api/settings', { bpmTolerance: 99 })).status, 400);
  const bk = (await call('GET', '/api/backup')).data;
  assert.equal(bk.settings.discogsToken, undefined);
});
