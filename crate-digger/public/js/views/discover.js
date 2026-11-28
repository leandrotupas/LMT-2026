import { h, clear, btn, icon, art, pbadge, extLink, link, field, input, notice, skeleton, toast, fmtDuration, debounce, empty, trackName, copyText } from '../ui.js';
import { get, qs } from '../api.js';
import { state, startTrail, getTrail } from '../state.js';
import { navigate, setQuery } from '../router.js';
import { detectInput, parseTrackLine, searchQuery, normKey, formatTrack } from '/shared/normalize.js';
import { buildLinks, platformName, isEnabled, PLATFORMS } from '/shared/platforms.js';
import { saveTrackDialog } from '../actions.js';

const EXAMPLES = [
  "DJ Heartstring - Don't Stop",
  'Artist - Track (Original Mix) [FREE DOWNLOAD]',
  '[PREMIERE] Someone feat. Vocalist - Song (Extended Mix) #hardhouse | OUT NOW',
  'https://www.discogs.com/release/1-The-Persuader-Stockholm',
];
const SOURCES = [
  { id: 'applemusic', name: 'Apple Music', needs: null },
  { id: 'musicbrainz', name: 'MusicBrainz', needs: null },
  { id: 'discogs', name: 'Discogs', needs: 'discogsToken' },
  { id: 'lastfm', name: 'Last.fm', needs: 'lastfmKey' },
];

export async function render(root, { query }) {
  const initial = query.get('q') || '';
  const ta = h('textarea', {
    id: 'discover-q', rows: 1, placeholder: 'Paste a track, an artist, a SoundCloud / Bandcamp / Discogs link, or a whole tracklist',
    'aria-label': 'Universal search', 'aria-describedby': 'detect', value: initial, spellcheck: 'false',
  });
  const detect = h('div', { class: 'detect', id: 'detect' });
  const out = h('div', { class: 'stack-lg' });
  const grow = () => { ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight + 2, 320)}px`; };

  function describe() {
    const d = detectInput(ta.value);
    const chip = (t, cls = '') => h('span', { class: ['chip', cls] }, t);
    switch (d.kind) {
      case 'empty': return clear(detect, h('span', { class: 'faint' }, 'Recognises track titles, artists, links and full tracklists.'));
      case 'url': return clear(detect, chip(`${platformName(d.url.platform) === 'web' ? 'Web' : platformName(d.url.platform)} ${d.url.kind}`, 'on'), 'Press Enter to look it up.');
      case 'tracklist': return clear(detect, chip(`Tracklist · ${d.tracks} tracks`, 'on'), 'Press Enter to open it in the tracklist parser.');
      case 'multi': return clear(detect, chip(`${d.lines.length} lines`, 'on'), 'Press Enter to search each line.');
      case 'track': return clear(detect, chip('Artist – title', 'on'), h('span', null, h('strong', d.track.artist), ' – ', d.track.title, d.track.version ? ` (${d.track.version})` : ''));
      default: return clear(detect, chip('Artist, title or label', 'on'), 'Search everywhere, or explore it as an artist or label.');
    }
  }
  ta.addEventListener('input', () => { grow(); describe(); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); go(); }
  });

  function go() {
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    const d = detectInput(text);
    if (d.kind === 'tracklist') {
      try { sessionStorage.setItem('cd-tracklist-draft', text); } catch { /* ignore */ }
      return navigate('/tracklists/new');
    }
    setQuery({ q: text }, { replace: false });
    run(text);
  }

  root.append(
    h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Discover'), h('h1', 'Start with a track'), h('p', 'Paste anything. Messy titles are cleaned, links are recognised, and you get every useful place to find the music.'))),
    h('div', { class: 'card hero-search' },
      ta,
      h('div', { class: 'row between' }, detect, h('div', { class: 'row' }, btn('Search', go, { cls: 'primary', ico: 'search' }))),
      h('div', { class: 'examples', 'aria-label': 'Examples' }, h('span', { class: 'faint small' }, 'Try:'),
        EXAMPLES.map((ex) => h('button', { type: 'button', class: 'chip', onclick: () => { ta.value = ex; grow(); describe(); go(); } }, ex.length > 46 ? `${ex.slice(0, 44)}…` : ex)))),
    out);

  describe();
  requestAnimationFrame(grow);
  if (initial) run(initial); else { ta.focus(); renderIntro(out); }

  async function run(text) {
    const d = detectInput(text);
    clear(out);
    if (d.kind === 'url') return runUrl(out, d.url.url);
    if (d.kind === 'multi') return runMulti(out, d.lines);
    startTrail({ kind: 'search', label: text.length > 60 ? `${text.slice(0, 58)}…` : text });
    const p = d.track || parseTrackLine(text);
    showTrack(out, { artist: p.artist, title: p.title, version: p.version, featured: p.featured, label: p.label }, { removed: p.removed, raw: text, kind: d.kind });
  }
}

function renderIntro(out) {
  const s = state.stats;
  clear(out, h('div', { class: 'grid-3' },
    h('div', { class: 'card stack' }, h('h3', 'Paste a mix tracklist'), h('p', { class: 'muted small' }, 'Timestamps, numbering, “w/” and “ID – ID” lines are understood. The original text is kept.'), link('Open Tracklists', '/tracklists/new', { class: 'btn sm' })),
    h('div', { class: 'card stack' }, h('h3', 'Follow the thread'), h('p', { class: 'muted small' }, 'From a track to its artist, label, remixers and genre, with a trail of how you got there.'), link('Explore', '/explore', { class: 'btn sm' })),
    h('div', { class: 'card stack' }, h('h3', s.tracks ? `${s.tracks} saved track${s.tracks === 1 ? '' : 's'}` : 'Your library is empty'),
      h('p', { class: 'muted small' }, s.tracks ? `${s.wishlist} on the wishlist, ${s.in_library} in your DJ library.` : 'Save tracks to crates as you dig. Load sample content from Settings to look around first.'),
      link(s.tracks ? 'Open Library' : 'Settings → Data', s.tracks ? '/library' : '/settings#data', { class: 'btn sm' }))));
}

// ---------------------------------------------------------------------------

function showTrack(out, initial, { removed = [], raw = '', kind = 'track', fromUrl = null } = {}) {
  const t = { ...initial };
  const f = {
    artist: input({ value: t.artist || '', 'aria-label': 'Artist', autocomplete: 'off' }),
    title: input({ value: t.title || '', 'aria-label': 'Title', autocomplete: 'off' }),
    version: input({ value: t.version || '', 'aria-label': 'Version or remix', placeholder: 'Original Mix, Remix…', autocomplete: 'off' }),
  };
  const dests = h('div');
  const results = h('div', { class: 'results' });
  const exploreRow = h('div', { class: 'row' });
  const current = () => ({ artist: f.artist.value.trim(), title: f.title.value.trim(), version: f.version.value.trim(), featured: t.featured || [], label: t.label || '' });

  const refreshLinks = () => {
    const c = current();
    const q = searchQuery(c) || raw;
    clear(dests, destinations(q, c));
    clear(exploreRow,
      c.artist ? link(h('span', { class: 'row' }, icon('explore'), `Artist: ${c.artist}`), `/explore/artist?${qs({ name: c.artist })}`, { class: 'btn sm' }) : null,
      c.title && c.artist ? link(h('span', { class: 'row' }, icon('explore'), 'Explore this track'), `/explore/track?${qs({ artist: c.artist, title: c.title })}`, { class: 'btn sm' }) : null,
      !c.artist && c.title ? link(h('span', { class: 'row' }, icon('explore'), `Artist: ${c.title}`), `/explore/artist?${qs({ name: c.title })}`, { class: 'btn sm' }) : null,
      !c.artist && c.title ? link(h('span', { class: 'row' }, icon('explore'), `Label: ${c.title}`), `/explore/label?${qs({ name: c.title })}`, { class: 'btn sm' }) : null,
      t.label ? link(h('span', { class: 'row' }, icon('explore'), `Label: ${t.label}`), `/explore/label?${qs({ name: t.label })}`, { class: 'btn sm' }) : null);
  };
  const searchAgain = () => runSearches(results, current(), raw);
  Object.values(f).forEach((el) => {
    el.addEventListener('input', debounce(refreshLinks, 150));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchAgain(); } });
  });

  const saveManual = () => saveTrackDialog({ ...current(), source: fromUrl ? platformName(fromUrl.platform) : 'Manual entry', source_url: fromUrl?.url || '', artwork_url: t.artwork_url || '', release: t.release || '', duration_ms: t.duration_ms }, {
    sources: fromUrl ? [{ platform: fromUrl.platform, url: fromUrl.url, kind: 'discovered', platformName: platformName(fromUrl.platform) }] : [],
    heading: 'Save to library',
  });

  out.append(
    h('section', { class: 'card cleaner', 'aria-labelledby': 'clean-h' },
      h('div', { class: 'card-head' }, h('div', null, h('h2', { id: 'clean-h' }, kind === 'query' ? 'Search' : 'Cleaned track'),
        h('p', null, kind === 'query' ? 'No artist–title separator found, so this searches as typed. Add an artist if you know it.' : 'Edit anything that looks wrong. Version and remix details are kept.')),
        h('div', { class: 'row' }, btn('Copy', () => copyText(formatTrack(current())), { cls: 'sm ghost', ico: 'copy' }), btn('Save to library', saveManual, { cls: 'sm', ico: 'plus' }))),
      h('div', { class: 'fields' }, field('Artist', f.artist), field('Title', f.title), field('Version / remix', f.version)),
      removed.length ? h('div', { class: 'removed' }, h('span', null, 'Removed:'), removed.map((r) => h('s', { class: 'chip' }, r.length > 50 ? `${r.slice(0, 48)}…` : r))) : null,
      t.featured?.length ? h('div', { class: 'removed' }, 'Featuring:', t.featured.map((x) => link(x, `/explore/artist?${qs({ name: x })}`, { class: 'chip' }))) : null,
      h('div', { class: 'row between' }, exploreRow, btn('Search again', searchAgain, { cls: 'sm', ico: 'search' }))),
    h('section', { class: 'card', 'aria-labelledby': 'dest-h' },
      h('div', { class: 'card-head' }, h('div', null, h('h2', { id: 'dest-h' }, 'Find it on'), h('p', null, 'External searches open the platform in a new tab. They are links, not results.'))),
      dests),
    h('section', { 'aria-labelledby': 'res-h' }, h('div', { class: 'section-title' }, h('h2', { id: 'res-h' }, 'Results'), h('span', { class: 'muted' }, 'From services the app can query directly')), results));
  refreshLinks();
  searchAgain();
}

export function destinations(q, track) {
  const groups = buildLinks(q, { settings: state.settings });
  if (!groups.length) return notice('All platforms are turned off. Turn some on in Settings → Platforms.', 'warn');
  const regional = state.settings.market;
  return h('div', { class: 'dest-grid' }, groups.map((g) => h('div', { class: 'dest-group' },
    h('h3', g.name),
    h('div', { class: 'dest-list' }, g.links.map((l) => extLink([
      pbadge(l.id), h('span', null, l.name),
      h('span', { class: 'ext' }, l.regional ? h('span', { class: 'chip solid', title: 'Store region' }, regional.toUpperCase()) : null, h('span', null, 'Search'), icon('ext')),
    ], l.href, { class: 'dest', 'aria-label': `Search ${l.name} for ${q} (opens in a new tab)` }))))));
}

// ---------------------------------------------------------------------------

function classify(r, t) {
  const sameArtist = t.artist && (normKey(r.artist).includes(normKey(t.artist)) || normKey(t.artist).includes(normKey(r.artist)));
  const sameTitle = t.title && normKey(r.title) === normKey(t.title);
  const sameVersion = normKey(r.version || '') === normKey(t.version || '') || (!r.version && /^original( mix)?$/i.test(t.version || '')) || (!t.version && /^original( mix)?$/i.test(r.version || ''));
  if (r.is_release) return sameArtist && normKey(r.title).includes(normKey(t.title)) ? 'versions' : 'related';
  if (sameTitle && (sameArtist || !t.artist) && sameVersion) return 'exact';
  if ((sameTitle || normKey(r.title).includes(normKey(t.title))) && (sameArtist || !t.artist)) return 'versions';
  if (sameTitle || normKey(r.title).startsWith(normKey(t.title))) return 'versions';
  return 'related';
}

async function runSearches(container, track, raw) {
  const q = searchQuery(track, { withVersion: false }) || raw;
  const enabled = SOURCES.filter((s) => isEnabled(PLATFORMS.find((p) => p.id === s.id), state.settings));
  const status = new Map();
  const all = [];
  let active = 'all';
  const tabs = h('div', { class: 'src-tabs', role: 'group', 'aria-label': 'Filter results by source' });
  const list = h('div', { 'aria-live': 'polite' });
  clear(container, tabs, list);

  const draw = () => {
    clear(tabs, h('button', { type: 'button', class: ['chip', active === 'all' ? 'on' : ''], 'aria-pressed': String(active === 'all'), onclick: () => { active = 'all'; draw(); } }, `All (${all.length})`),
      enabled.map((s) => {
        const st = status.get(s.id);
        const n = all.filter((r) => r.platform === s.id).length;
        return h('button', { type: 'button', class: ['chip', active === s.id ? 'on' : '', st?.state === 'error' ? 'bad' : '', st?.state === 'needs-key' ? 'warn' : ''], 'aria-pressed': String(active === s.id), onclick: () => { active = s.id; draw(); } },
          pbadge(s.id), s.name, st?.state === 'loading' ? h('span', { class: 'spinner', 'aria-label': 'loading' }) : st?.state === 'ok' ? ` (${n})` : st?.state === 'needs-key' ? ' · key needed' : st?.state === 'error' ? ' · error' : '');
      }));
    const shown = all.filter((r) => active === 'all' || r.platform === active);
    const groups = [['exact', 'Exact match'], ['versions', 'Other versions, remixes and releases'], ['related', 'Related']];
    const notices = enabled.map((s) => status.get(s.id)).filter((st) => st && (st.state === 'error' || st.state === 'needs-key') && (active === 'all' || active === st.id))
      .map((st) => notice(st.state === 'needs-key' ? [st.message, ' ', link('Open Settings', '/settings#integrations')] : `${st.name}: ${st.message}`, st.state === 'error' ? 'bad' : 'warn', st.state === 'error' ? 'warn' : 'info'));
    const loading = enabled.some((s) => status.get(s.id)?.state === 'loading');
    clear(list, notices.length ? h('div', { class: 'stack', style: { 'margin-bottom': '12px' } }, notices) : null,
      shown.length ? h('div', { class: 'card' }, groups.map(([g, label]) => {
        const items = shown.filter((r) => r.group === g);
        return items.length ? h('div', { class: 'result-group' }, h('h4', `${label} · ${items.length}`), items.map((r) => resultRow(r, raw))) : null;
      })) : loading ? skeleton(4) : empty('No direct results', 'Use the platform links above to search stores and streaming services.'));
  };

  for (const s of enabled) {
    if (s.needs && !state.settings[s.needs]) { status.set(s.id, { id: s.id, name: s.name, state: 'needs-key', message: `Add a ${s.name} ${s.id === 'discogs' ? 'personal access token' : 'API key'} in Settings to see ${s.name} results here.` }); continue; }
    status.set(s.id, { id: s.id, name: s.name, state: 'loading' });
  }
  draw();
  await Promise.all(enabled.filter((s) => status.get(s.id).state === 'loading').map(async (s) => {
    try {
      const params = s.id === 'musicbrainz' && track.title && track.artist ? { source: s.id, artist: track.artist, title: track.title } : { source: s.id, q };
      const res = await get(`/api/search?${qs(params)}`);
      for (const r of res) all.push({ ...r, group: classify(r, track) });
      status.set(s.id, { id: s.id, name: s.name, state: 'ok' });
    } catch (e) {
      status.set(s.id, { id: s.id, name: s.name, state: 'error', message: e.message });
    }
    const order = { exact: 0, versions: 1, related: 2 };
    all.sort((a, b) => order[a.group] - order[b.group] || (b.score || 0) - (a.score || 0));
    draw();
  }));
}

function resultRow(r, raw) {
  const name = platformName(r.platform);
  const meta = [
    r.release && (r.is_release ? null : h('span', null, r.release)),
    r.label && h('span', null, r.label),
    r.catalog && h('span', { class: 'mono' }, r.catalog),
    (r.release_date || r.year) && h('span', null, r.release_date || r.year),
    r.duration_ms && h('span', { class: 'num' }, fmtDuration(r.duration_ms)),
    r.format && h('span', null, r.format),
    r.genre && h('span', null, r.genre),
  ].filter(Boolean);
  const save = () => saveTrackDialog({
    artist: r.artist, title: r.is_release ? r.title : r.title, version: r.version || '', release: r.is_release ? r.release : r.release, label: r.label,
    year: r.year ? String(r.year) : '', duration_ms: r.duration_ms, artwork_url: r.artwork_url || '', artwork_source: r.artwork_url ? name : '',
    source: name, source_url: r.url || '', genre: r.genre && state.genres.some((g) => g.name.toLowerCase() === r.genre.toLowerCase()) ? r.genre : '',
    external_ids: { [r.platform]: r.external_id },
  }, { sources: [{ platform: r.platform, url: r.url, external_id: r.external_id, kind: 'result', platformName: name }], heading: `Save from ${name}` });
  return h('article', { class: 'result' },
    art(r.artwork_url, { alt: r.release || r.title }),
    h('div', { style: { 'min-width': '0' } },
      h('div', { class: 't1' }, r.title, r.version ? h('span', { class: 'muted' }, ` (${r.version})`) : null, r.is_release ? h('span', { class: 'badge-kind kind-link', style: { 'margin-left': '6px' } }, r.kind === 'master' ? 'Master release' : 'Release') : null),
      h('div', { class: 't2' }, r.artist || 'Unknown artist'),
      h('div', { class: 'meta' }, h('span', { class: 'row', style: { gap: '5px' } }, pbadge(r.platform), name), meta)),
    h('div', { class: 'actions' },
      r.url ? extLink(h('span', { class: 'row' }, 'Open', icon('ext')), r.url, { class: 'btn sm ghost', 'aria-label': `Open on ${name} (new tab)` }) : null,
      r.preview_url ? h('audio', { controls: true, preload: 'none', src: r.preview_url, style: { height: '30px', width: '140px' }, 'aria-label': 'Preview clip' }) : null,
      btn('Save', save, { cls: 'sm', ico: 'plus' })));
}

// ---------------------------------------------------------------------------

async function runUrl(out, url) {
  startTrail({ kind: 'url', label: url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60), ref: url });
  clear(out, h('div', { class: 'card' }, skeleton(2)));
  let r;
  try { r = await get(`/api/resolve?${qs({ url })}`); } catch (e) {
    return clear(out, notice(e.message, 'bad', 'warn'));
  }
  const name = platformName(r.platform) === 'web' ? 'Web link' : platformName(r.platform);
  const methodLabel = { api: `Read from the ${name} API`, oembed: `Title from ${name} oEmbed`, url: 'Details from the link only — check before saving' }[r.method];
  clear(out);
  const head = h('section', { class: 'card stack' },
    h('div', { class: 'row between' }, h('div', { class: 'row' }, pbadge(r.platform), h('div', null, h('h2', `${name} ${r.kind}`), h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', class: 'small raw' }, r.url))),
      h('span', { class: ['badge-kind', r.method === 'url' ? 'kind-est' : 'kind-live'] }, methodLabel)),
    r.notes.map((n) => notice(n, 'warn')));
  out.append(head);
  const fromUrl = { platform: r.platform, url: r.url };

  if (r.release) {
    const rel = r.release;
    out.append(h('section', { class: 'card stack' },
      h('div', { class: 'row' }, art(rel.artwork_url, { size: 'md', alt: rel.title }), h('div', { class: 'grow' },
        h('h2', rel.title), h('p', { class: 'muted' }, rel.artist, rel.year ? ` · ${rel.year}` : '', rel.label ? ` · ${rel.label}` : '', rel.catalog ? ` · ${rel.catalog}` : ''),
        h('div', { class: 'chips', style: { 'margin-top': '6px' } }, [...rel.styles, ...rel.genres].map((s) => link(s, `/explore/genre?${qs({ name: s })}`, { class: 'chip' }))))),
      h('div', { class: 'row' }, rel.artist ? link(`Artist: ${rel.artist.split(',')[0]}`, `/explore/artist?${qs({ name: rel.artist.split(',')[0] })}`, { class: 'btn sm' }) : null, rel.label ? link(`Label: ${rel.label}`, `/explore/label?${qs({ name: rel.label })}`, { class: 'btn sm' }) : null),
      h('div', { class: 'list' }, rel.tracklist.map((tr) => h('div', { class: 'list-item' },
        h('span', { class: 'mono faint', style: { width: '34px' } }, tr.position),
        h('div', { class: 'grow' }, h('div', { class: 't1' }, tr.title), h('div', { class: 'small muted' }, tr.artist, tr.extraartists.length ? ` · ${tr.extraartists.join(', ')}` : '')),
        h('span', { class: 'num faint' }, tr.duration),
        btn('Search', () => { const p = parseTrackLine(`${tr.artist} - ${tr.title}`); clear(out); showTrack(out, p, { raw: `${tr.artist} - ${tr.title}` }); }, { cls: 'sm ghost', ico: 'search' }),
        btn('Save', () => saveTrackDialog({ ...parseTrackLine(`${tr.artist} - ${tr.title}`), release: rel.title, label: rel.label, year: String(rel.year || ''), artwork_url: rel.artwork_url, artwork_source: 'Discogs', source: 'Discogs', source_url: rel.url }, { sources: [{ platform: 'discogs', url: rel.url, kind: 'result', platformName: 'Discogs' }] }), { cls: 'sm', ico: 'plus' }))))));
    return;
  }
  if (r.entity) {
    out.append(h('section', { class: 'card stack' }, h('h2', r.entity.name), r.entity.profile ? h('p', { class: 'muted' }, r.entity.profile.slice(0, 400)) : null,
      link(`Explore ${r.entity.kind}`, `/explore/${r.entity.kind}?${qs({ name: r.entity.name })}`, { class: 'btn primary' })));
    return;
  }
  let track = r.track;
  if (!track && r.title_text) track = parseTrackLine(r.title_text);
  if (!track && r.hint_track) track = r.hint_track;
  if (track) return showTrack(out, track, { raw: r.title_text || '', fromUrl, removed: track.removed || [] });
  if (r.hints?.artist) {
    out.append(h('section', { class: 'card stack' }, h('p', null, 'This link points to ', h('strong', r.hints.artist), r.hints.release ? [' · ', r.hints.release] : '', '.'),
      h('div', { class: 'row' }, link(`Explore artist ${r.hints.artist}`, `/explore/artist?${qs({ name: r.hints.artist })}`, { class: 'btn' }),
        r.kind === 'playlist' || r.kind === 'mix' ? link('Paste its tracklist', '/tracklists/new', { class: 'btn' }) : null)));
    return;
  }
  out.append(notice('Nothing could be read from this link. Paste the track title instead.', 'warn'));
}

function runMulti(out, lines) {
  startTrail({ kind: 'search', label: `${lines.length} lines` });
  out.append(h('section', { class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', `${lines.length} entries`), h('p', null, 'Choose one to search, or send them all to the tracklist parser.')),
      btn('Open as tracklist', () => { try { sessionStorage.setItem('cd-tracklist-draft', lines.join('\n')); } catch { /* ignore */ } navigate('/tracklists/new'); }, { cls: 'sm' })),
    h('div', { class: 'list' }, lines.map((l) => {
      const p = parseTrackLine(l);
      return h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, trackName(p) || l), h('div', { class: 'raw' }, l)),
        link('Search', `/discover?${qs({ q: l })}`, { class: 'btn sm' }));
    }))));
}

export { getTrail };
