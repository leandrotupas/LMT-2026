import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTrackLine, detectInput, stripNoise, describeUrl, dedupeKey } from '../shared/normalize.js';
import { parseTracklist, findDuplicates, formatTracklist, csvToLines } from '../shared/tracklist.js';
import { toCamelot, harmonic, tempo, matchTracks, camelotToOpenKey, formatKey } from '../shared/camelot.js';
import { buildLinks } from '../shared/platforms.js';
import { toCsv, reviewPlaylist, toM3u8, shoppingList, resolvePath } from '../shared/export.js';

test('cleaner removes promo text and keeps versions', () => {
  const t = parseTrackLine('Artist - Track (Original Mix) [FREE DOWNLOAD]');
  assert.equal(t.artist, 'Artist');
  assert.equal(t.title, 'Track');
  assert.equal(t.version, 'Original Mix');
  const u = parseTrackLine('[PREMIERE] DJ Heartstring - Don\'t Stop (Extended Mix) #hardhouse #trance | Out now on Fake Records');
  assert.equal(u.artist, 'DJ Heartstring');
  assert.equal(u.title, "Don't Stop");
  assert.equal(u.version, 'Extended Mix');
  const v = parseTrackLine('03. Someone feat. Vocalist - Song (Other Artist Remix) [OFFICIAL VIDEO]');
  assert.equal(v.artist, 'Someone');
  assert.deepEqual(v.featured, ['Vocalist']);
  assert.equal(v.version, 'Other Artist Remix');
  assert.equal(v.remixer, 'Other Artist');
  const w = parseTrackLine('Artist - Track (VIP) (Dub Mix) [Free DL]');
  assert.equal(w.version, 'VIP / Dub Mix');
  const x = parseTrackLine('Artist – Track - Extended Mix');
  assert.equal(x.title, 'Track');
  assert.equal(x.version, 'Extended Mix');
});

test('cleaner does not strip meaningful numbers', () => {
  assert.equal(parseTrackLine('808 State - Pacific 707').artist, '808 State');
  assert.equal(parseTrackLine('2 Unlimited - Get Ready').artist, '2 Unlimited');
  assert.equal(parseTrackLine('Artist - Track (Instrumental)').version, 'Instrumental');
  assert.equal(stripNoise('Artist - Track [EXCLUSIVE PREMIERE]').text, 'Artist - Track');
});

test('input detection', () => {
  assert.equal(detectInput('').kind, 'empty');
  assert.equal(detectInput('Bicep').kind, 'query');
  assert.equal(detectInput('Bicep - Glue').kind, 'track');
  assert.equal(detectInput('https://someone.bandcamp.com/track/my-song').url.platform, 'bandcamp');
  assert.equal(detectInput('00:00 A - B\n03:10 C - D\n06:00 E - F').kind, 'tracklist');
  const am = describeUrl('https://music.apple.com/gb/album/x/123?i=456');
  assert.equal(am.kind, 'track'); assert.equal(am.id, '456'); assert.equal(am.country, 'gb');
  const sc = describeUrl('https://soundcloud.com/some-dj/a-tune');
  assert.equal(sc.kind, 'track'); assert.equal(sc.hints.title, 'a tune');
  const dg = describeUrl('https://www.discogs.com/release/12345-Artist-Title');
  assert.equal(dg.kind, 'release'); assert.equal(dg.id, '12345');
  assert.equal(describeUrl('https://youtu.be/abc123').id, 'abc123');
});

test('dedupe keys keep versions distinct', () => {
  assert.equal(dedupeKey({ artist: 'A&B', title: 'Song!' }), dedupeKey({ artist: 'a and b', title: 'song' }));
  assert.notEqual(dedupeKey({ artist: 'A', title: 'S', version: 'Dub Mix' }), dedupeKey({ artist: 'A', title: 'S', version: 'Original Mix' }));
  assert.equal(dedupeKey({ artist: 'A', title: 'S', version: 'Original Mix' }), dedupeKey({ artist: 'A', title: 'S' }));
});

test('tracklist parser handles common formats', () => {
  const text = `Tracklist:
00:00 Artist One - First Track
01. Artist Two - Second (Extended Mix)
1:23:45 Artist Three - Third Track [LABEL REC]
Artist Four - Mash A / Artist Five - Mash B
Artist Six - Track w/ ID
ID - ID
Follow me on Instagram
w/ Artist Seven - Layered
Artist One - First Track`;
  const { entries, ignored } = parseTracklist(`My mix — tracklist:\n${text}`);
  assert.ok(ignored.some((i) => /My mix/.test(i.raw)));
  assert.equal(entries[0].timestamp, '00:00');
  assert.equal(entries[0].artist, 'Artist One');
  assert.equal(entries[1].number, 1);
  assert.equal(entries[1].version, 'Extended Mix');
  assert.equal(entries[2].timestamp, '1:23:45');
  assert.equal(entries[2].seconds, 5025);
  assert.equal(entries[2].label, 'LABEL REC');
  assert.equal(entries[3].title, 'Mash A');
  assert.equal(entries[4].artist, 'Artist Five');
  assert.equal(entries[4].relation, '/');
  assert.equal(entries[5].title, 'Track w/ ID');
  assert.equal(entries[6].status, 'unknown');
  assert.equal(entries[7].relation, 'w/');
  assert.ok(ignored.some((i) => /Instagram/.test(i.raw)));
  assert.ok(ignored.some((i) => /Tracklist/.test(i.raw)));
  assert.ok(entries.every((e) => e.raw));
  assert.equal(findDuplicates(entries).length, 1);
  assert.match(formatTracklist(entries), /^01\. 00:00 Artist One - First Track/);
});

test('1001Tracklists split-line copies', () => {
  const { entries } = parseTracklist('01\nArtist - Title [LABEL]\n02\n05:30\nOther - Song');
  assert.equal(entries[0].number, 1);
  assert.equal(entries[1].number, 2);
  assert.equal(entries[1].timestamp, '05:30');
});

test('csv import', () => {
  assert.equal(csvToLines('artist,title,version\n"A, B",T,Dub'), 'A, B - T (Dub)');
});

test('camelot conversions', () => {
  assert.equal(toCamelot('Am'), '8A');
  assert.equal(toCamelot('A minor'), '8A');
  assert.equal(toCamelot('A Minor'), '8A');
  assert.equal(toCamelot('C'), '8B');
  assert.equal(toCamelot('Db major'), '3B');
  assert.equal(toCamelot('F#m'), '11A');
  assert.equal(toCamelot('Gb'), '2B');
  assert.equal(toCamelot('8a'), '8A');
  assert.equal(toCamelot('1m'), '8A');
  assert.equal(toCamelot('1d'), '8B');
  assert.equal(toCamelot('13A'), null);
  assert.equal(toCamelot('banana'), null);
  assert.equal(camelotToOpenKey('8A'), '1m');
  assert.equal(formatKey('8A', 'musical'), 'A minor');
});

test('harmonic compatibility', () => {
  assert.equal(harmonic('8A', '8A').tier, 'strong');
  assert.equal(harmonic('8A', '9A').label, 'Adjacent key');
  assert.equal(harmonic('12A', '1A').label, 'Adjacent key');
  assert.equal(harmonic('8A', '8B').tier, 'strong');
  assert.equal(harmonic('8A', '10A').tier, 'partial');
  assert.equal(harmonic('8A', '3A').label, 'Semitone lift (+7)');
  assert.equal(harmonic('8A', '9B').tier, 'partial');
  assert.equal(harmonic('8A', '2B').tier, 'weak');
  assert.equal(harmonic(null, '8A'), null);
});

test('tempo compatibility and half/double time', () => {
  assert.equal(tempo(128, 130).tier, 'strong');
  assert.equal(tempo(128, 135).tier, 'partial');
  assert.equal(tempo(128, 150).tier, 'weak');
  const h = tempo(140, 70);
  assert.equal(h.relation, 'Half-time');
  assert.equal(h.tier, 'partial'); // never "perfect" automatically
  assert.equal(tempo(75, 150).relation, 'Double-time');
  assert.equal(tempo(128, 136, 10).within, true);
  const m = matchTracks({ bpm: 128, camelot: '8A' }, { bpm: 129, camelot: '9A' });
  assert.equal(m.overall, 'strong');
  assert.equal(matchTracks({ bpm: 128, camelot: '8A' }, { bpm: null, camelot: '8A' }).overall, 'partial');
});

test('platform links are grouped and respect market and toggles', () => {
  const groups = buildLinks('a b', { settings: { market: 'gb', disabledPlatforms: ['spotify'] } });
  assert.deepEqual(groups.map((g) => g.id), ['buy', 'stream', 'research']);
  const all = groups.flatMap((g) => g.links);
  assert.ok(all.find((l) => l.id === 'qobuz').href.includes('/gb-en/'));
  assert.ok(all.find((l) => l.id === 'applemusic').href.includes('/gb/'));
  assert.ok(!all.find((l) => l.id === 'spotify'));
  assert.ok(all.find((l) => l.id === 'bandcamp').href.includes('q=a+b'));
});

test('exports', () => {
  const tracks = [
    { artist: 'A', title: '=cmd', status: 'in_library', file_path: '/music/a.flac', duration_ms: 300000 },
    { artist: 'B', title: 'T2', status: 'purchased', file_path: '/music/b.flac' },
    { artist: 'C', title: 'T3', status: 'in_library', file_path: '' },
    { artist: 'D', title: 'T4', status: 'in_library', file_path: 'House/d.aiff' },
    { artist: 'E', title: 'T5', status: 'wishlist', store: 'Bandcamp' },
  ];
  assert.match(toCsv(tracks), /'=cmd/);
  const r = reviewPlaylist(tracks, { musicDir: '' });
  assert.equal(r.included.length, 1);
  assert.equal(r.excluded.length, 4);
  const r2 = reviewPlaylist(tracks, { musicDir: 'D:\\Music' });
  assert.equal(r2.included[1].path, 'D:\\Music\\House\\d.aiff');
  const m3u = toM3u8('Test', r2.included);
  assert.match(m3u, /^#EXTM3U/);
  assert.match(m3u, /#EXTINF:300,A - =cmd\n\/music\/a\.flac/);
  assert.equal(resolvePath('', '/x'), null);
  const s = shoppingList(tracks);
  assert.equal(s[0].store, 'Bandcamp');
  assert.equal(s[0].items[0].linkKind, 'search');
});
