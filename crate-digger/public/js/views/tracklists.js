import { h, clear, btn, icon, link, extLink, field, input, notice, toast, toastError, confirmDialog, dialog, empty, art, fmtDate, copyText, skeleton, select, trackName } from '../ui.js';
import { get, post, patch, del, qs } from '../api.js';
import { state, refreshCrates, refreshTracks, startTrail } from '../state.js';
import { navigate } from '../router.js';
import { parseTracklist, findDuplicates, formatTracklist, csvToLines } from '/shared/tracklist.js';
import { searchQuery, describeUrl, dedupeKey } from '/shared/normalize.js';
import { buildLinks, platformName } from '/shared/platforms.js';
import { saveTrackDialog, pickCratesDialog, saveFile } from '../actions.js';
import { toCsv } from '/shared/export.js';
import { destinations } from './discover.js';

export async function render(root, { params }) {
  if (params[0] === 'new') return renderNew(root);
  if (params[0]) return renderTracklist(root, Number(params[0]));
  return renderIndex(root);
}

async function renderIndex(root) {
  root.append(h('div', { class: 'page-head' },
    h('div', null, h('p', { class: 'eyebrow' }, 'Tracklists'), h('h1', 'Mix tracklists'), h('p', 'Paste a YouTube description, a 1001Tracklists copy or any timestamped list. Every line is parsed into tracks you can search and save.')),
    link(h('span', { class: 'row' }, icon('plus'), 'New tracklist'), '/tracklists/new', { class: 'btn primary' })));
  const body = h('div', null, skeleton(3));
  root.append(body);
  const list = await get('/api/tracklists');
  if (!list.length) return clear(body, h('div', { class: 'card' }, empty('No saved tracklists', 'Parse a mix tracklist and save it to come back to it later.', link('Paste a tracklist', '/tracklists/new', { class: 'btn primary' }))));
  clear(body, h('div', { class: 'card flush' }, h('div', { class: 'list' }, list.map((t) => h('div', { class: 'list-item', style: { padding: '12px 16px' } },
    icon('tracklists'),
    h('div', { class: 'grow' }, link(h('span', { class: 't1' }, t.title), `/tracklists/${t.id}`), t.is_sample ? h('span', { class: 'badge-kind kind-sample', style: { 'margin-left': '8px' } }, 'Sample') : null,
      h('div', { class: 'small muted' }, `${t.entry_count} tracks · ${t.unknown_count || 0} unknown · ${t.saved_count || 0} saved · ${fmtDate(t.created_at)}`)),
    t.source_url ? extLink(h('span', { class: 'row small' }, 'Source', icon('ext')), t.source_url, { class: 'btn sm ghost' }) : null)))));
}

// ---------------------------------------------------------------------------

function renderNew(root) {
  let draft = '';
  try { draft = sessionStorage.getItem('cd-tracklist-draft') || ''; sessionStorage.removeItem('cd-tracklist-draft'); } catch { /* ignore */ }
  const ta = h('textarea', { rows: 12, placeholder: '00:00 Artist - Track (Extended Mix)\n03:45 Artist - Track w/ ID\n07:12 ID - ID', value: draft, 'aria-label': 'Tracklist text', spellcheck: 'false', class: 'mono' });
  const title = input({ placeholder: 'e.g. Boiler Room set, Radio show #42', 'aria-label': 'Tracklist title' });
  const url = input({ type: 'url', placeholder: 'Mix URL (Mixcloud, SoundCloud, YouTube…) — optional', 'aria-label': 'Mix URL' });
  const file = h('input', { type: 'file', accept: '.txt,.csv,text/plain,text/csv', class: 'sr', id: 'tl-file' });
  const urlNote = h('div');
  const out = h('div');
  file.addEventListener('change', async () => {
    const fl = file.files[0];
    if (!fl) return;
    if (fl.size > 2_000_000) return toast('That file is too large (2 MB max).', { kind: 'bad' });
    const text = await fl.text();
    ta.value = /\.csv$/i.test(fl.name) || fl.type === 'text/csv' ? csvToLines(text) : text;
    if (!title.value) title.value = fl.name.replace(/\.(txt|csv)$/i, '');
    toast(`Imported ${fl.name}`);
    parse();
  });
  url.addEventListener('change', async () => {
    const u = url.value.trim();
    clear(urlNote);
    if (!u) return;
    const d = describeUrl(u);
    if (!d) return clear(urlNote, notice('That URL is not valid.', 'bad'));
    urlNote.append(h('span', { class: 'spinner' }));
    try {
      const r = await get(`/api/resolve?${qs({ url: u })}`);
      if (r.release?.tracklist?.length) {
        ta.value = r.release.tracklist.map((t) => `${t.position}. ${t.artist} - ${t.title}`).join('\n');
        title.value ||= `${r.release.artist} – ${r.release.title}`;
        clear(urlNote, notice(`Loaded ${r.release.tracklist.length} tracks from the Discogs API.`, 'good', 'check'));
        parse();
      } else {
        if (r.oembed?.title && !title.value) title.value = r.oembed.title;
        clear(urlNote, notice([`${platformName(d.platform)} does not give apps access to mix tracklists. `, h('strong', 'Paste the tracklist or description text below.'), r.oembed?.title ? ` Title found: “${r.oembed.title}”.` : ''], 'warn'));
      }
    } catch (e) { clear(urlNote, notice(`${e.message} Paste the tracklist text below.`, 'warn')); }
  });
  const parse = () => {
    if (!ta.value.trim()) { ta.focus(); return toast('Paste a tracklist first', { kind: 'bad' }); }
    const parsed = parseTracklist(ta.value);
    showResults(out, {
      id: null, title: title.value.trim() || 'Untitled tracklist', source_url: url.value.trim(), original_text: ta.value,
      entries: parsed.entries.map((e, i) => ({ ...e, id: `d${i}`, raw_line: e.raw, line_no: e.line })), ignored: parsed.ignored,
    });
    out.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  };
  root.append(
    h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, link('Tracklists', '/tracklists')), h('h1', 'Parse a tracklist'), h('p', 'Timestamps, numbering, versions, “w/” combos, “/” mashups and unknown IDs are recognised. Non-track text is set aside, and your original text is always kept.'))),
    h('div', { class: 'card stack' },
      h('div', { class: 'grid-2' }, field('Title', title), field('Mix URL', url)),
      urlNote,
      field('Tracklist', ta),
      h('div', { class: 'row between' },
        h('div', { class: 'row' }, h('label', { for: 'tl-file', class: 'btn sm', tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); file.click(); } } }, icon('upload'), 'Import TXT or CSV'), file,
          h('span', { class: 'faint small' }, 'CSV columns: artist, title, version, timestamp')),
        btn('Parse tracklist', parse, { cls: 'primary', ico: 'tracklists' }))),
    out);
  if (draft) parse(); else ta.focus();
}

async function renderTracklist(root, id) {
  const tl = await get(`/api/tracklists/${id}`);
  const ignored = parseTracklist(tl.original_text).ignored;
  root.append(h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, link('Tracklists', '/tracklists')))));
  const out = h('div');
  root.append(out);
  showResults(out, { ...tl, ignored });
}

// ---------------------------------------------------------------------------

function showResults(out, tl) {
  const saved = () => tl.id != null;
  const sel = new Set();
  const matches = new Map(); // entry id -> Apple Music result | 'none' | 'loading'
  let showOriginal = false;
  startTrail({ kind: 'tracklist', label: tl.title, ref: tl.id ? String(tl.id) : '' });

  const titleInput = input({ value: tl.title, 'aria-label': 'Tracklist title', class: 'h1-input' });
  titleInput.addEventListener('change', async () => {
    tl.title = titleInput.value.trim() || 'Untitled tracklist';
    if (saved()) { try { await patch(`/api/tracklists/${tl.id}`, { title: tl.title }); toast('Title saved'); } catch (e) { toastError(e); } }
  });

  const head = h('div');
  const bulk = h('div', { class: 'bulkbar hidden', role: 'region', 'aria-label': 'Selected entries' });
  const table = h('div');
  const orig = h('div');
  out.replaceChildren(head, bulk, table, orig);

  async function persistEntry(e, patchData) {
    Object.assign(e, patchData, { edited: true });
    if (saved() && typeof e.id === 'number') {
      const r = await patch(`/api/tracklists/${tl.id}/entries/${e.id}`, patchData);
      Object.assign(e, r);
    }
  }

  const known = () => tl.entries.filter((e) => e.status !== 'unknown' && e.title && e.artist && !/^id$/i.test(e.title));
  const libraryKeys = () => new Map((state.tracks || []).map((t) => [dedupeKey(t), t]));

  function drawHead() {
    const unknown = tl.entries.filter((e) => e.status === 'unknown').length;
    const dupes = findDuplicates(tl.entries).length;
    clear(head, h('div', { class: 'card stack', style: { 'margin-bottom': '16px' } },
      h('div', { class: 'row between' },
        h('div', { class: 'grow stack', style: { gap: '4px' } }, h('label', { class: 'sr', for: 'tl-title' }, 'Title'), Object.assign(titleInput, { id: 'tl-title' }),
          h('p', { class: 'muted small' }, `${tl.entries.length} tracks · ${unknown} unknown · ${tl.ignored?.length || 0} non-track lines set aside${dupes ? ` · ${dupes} duplicate${dupes > 1 ? 's' : ''}` : ''}`,
            tl.source_url ? [' · ', extLink('mix source', tl.source_url)] : '', saved() ? '' : ' · not saved yet')),
        h('div', { class: 'row' },
          saved() ? null : btn('Save as collection', saveCollection, { cls: 'primary', ico: 'check' }),
          saved() ? btn('Delete', removeTracklist, { cls: 'ghost danger sm', ico: 'trash' }) : null)),
      h('div', { class: 'row' },
        btn('Search all tracks', searchAll, { cls: 'sm', ico: 'search', title: 'Look up each identified track on Apple Music' }),
        btn('Add identified to crate', () => addEntries(known()), { cls: 'sm', ico: 'plus', disabled: !known().length }),
        btn('Copy cleaned list', () => copyText(formatTracklist(tl.entries)), { cls: 'sm', ico: 'copy' }),
        btn('Export TXT', () => saveFile(`${slug(tl.title)}.txt`, `${tl.title}\n\n${formatTracklist(tl.entries)}\n`, 'text/plain;charset=utf-8'), { cls: 'sm', ico: 'download' }),
        btn('Export CSV', () => saveFile(`${slug(tl.title)}.csv`, toCsv(tl.entries.map((e) => ({ ...e, source: tl.title, notes: e.timestamp ? `At ${e.timestamp}` : '', status: e.status }))), 'text/csv;charset=utf-8'), { cls: 'sm', ico: 'download' }),
        dupes ? btn(`Remove ${dupes} duplicate${dupes > 1 ? 's' : ''}`, removeDupes, { cls: 'sm' }) : null,
        btn(showOriginal ? 'Hide original' : 'Show original text', () => { showOriginal = !showOriginal; drawHead(); drawOrig(); }, { cls: 'sm ghost' }))));
  }

  function drawBulk() {
    bulk.classList.toggle('hidden', !sel.size);
    if (!sel.size) return;
    const entries = tl.entries.filter((e) => sel.has(e.id));
    clear(bulk, h('strong', `${sel.size} selected`), btn('Clear', () => { sel.clear(); draw(); }, { cls: 'ghost sm' }),
      btn('Add to crate', () => addEntries(entries.filter((e) => e.title && e.artist)), { cls: 'sm', ico: 'plus' }),
      btn('Mark as identified', async () => {
        try { for (const e of entries) await persistEntry(e, { status: 'confirmed' }); toast(`Marked ${entries.length} as identified`); draw(); } catch (err) { toastError(err); }
      }, { cls: 'sm', ico: 'check' }),
      btn('Mark as unknown', async () => {
        try { for (const e of entries) await persistEntry(e, { status: 'unknown' }); draw(); } catch (err) { toastError(err); }
      }, { cls: 'sm' }),
      btn('Remove from list', async () => {
        if (!await confirmDialog({ title: `Remove ${entries.length} entr${entries.length > 1 ? 'ies' : 'y'}?`, text: 'They are removed from the parsed list. The original text is unchanged.', confirm: 'Remove' })) return;
        await removeEntries(entries);
      }, { cls: 'sm danger', ico: 'trash' }));
  }

  function idLinks(e) {
    const q = e.artist && !/^id$/i.test(e.artist) ? `${e.artist} ID` : `${tl.title} ${e.timestamp || ''} ID`.trim();
    const links = buildLinks(q, { settings: { ...state.settings, disabledPlatforms: [] } }).flatMap((g) => g.links).filter((l) => ['1001tracklists', 'soundcloud', 'youtube'].includes(l.id));
    return h('div', { class: 'row', style: { gap: '4px' } }, h('span', { class: 'faint small' }, 'Identify:'), links.map((l) => extLink(l.name, l.href, { class: 'chip', 'aria-label': `Search ${l.name} to identify (new tab)` })));
  }

  function statusFor(e, lib) {
    if (e.track_id || lib.has(dedupeKey(e))) return h('span', { class: 'status st-saved' }, 'Saved');
    return h('span', { class: `status st-${e.status}` }, { identified: 'Identified', unknown: 'Unknown ID', confirmed: 'Confirmed' }[e.status]);
  }

  function draw() {
    drawHead();
    drawBulk();
    const lib = libraryKeys();
    const dupes = new Set(findDuplicates(tl.entries).map((e) => e.id));
    if (!tl.entries.length) return clear(table, h('div', { class: 'card' }, empty('No tracks found', 'Nothing in the text looked like “Artist – Title”. Check the original text below.')));
    const all = h('input', { type: 'checkbox', 'aria-label': 'Select all entries', checked: tl.entries.every((e) => sel.has(e.id)), onchange: (ev) => { tl.entries.forEach((e) => (ev.target.checked ? sel.add(e.id) : sel.delete(e.id))); draw(); } });
    clear(table, h('div', { class: 'table-wrap' }, h('table', { class: 'tracks' },
      h('thead', null, h('tr', null, h('th', { class: 'c' }, all), h('th', null, '#'), h('th', null, 'Time'), h('th', null, 'Track'), h('th', { class: 'hide-sm' }, 'Version'), h('th', null, 'Status'), h('th', null, h('span', { class: 'sr' }, 'Actions')))),
      h('tbody', null, tl.entries.flatMap((e, i) => {
        const m = matches.get(e.id);
        const row = h('tr', { class: sel.has(e.id) ? 'selected' : '' },
          h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: sel.has(e.id), 'aria-label': `Select entry ${i + 1}`, onchange: (ev) => { ev.target.checked ? sel.add(e.id) : sel.delete(e.id); row.classList.toggle('selected', ev.target.checked); drawBulk(); } })),
          h('td', { class: 'num faint' }, String(i + 1).padStart(2, '0')),
          h('td', { class: 'num muted' }, e.timestamp || '—'),
          h('td', { class: 't-title' },
            h('div', null, e.relation === 'w/' ? h('span', { class: 'chip solid', title: 'Played with the previous track' }, 'w/') : e.relation === '/' ? h('span', { class: 'chip solid', title: 'Mashed up with the previous track' }, '/') : null, ' ',
              h('strong', e.title || 'ID'), dupes.has(e.id) ? h('span', { class: 'chip warn', style: { 'margin-left': '6px' } }, 'Duplicate') : null),
            h('div', { class: 'sub' }, e.artist || 'ID', e.featured?.length ? ` feat. ${e.featured.join(', ')}` : '', e.label ? h('span', { class: 'faint' }, ` · ${e.label}`) : null),
            e.status === 'unknown' ? idLinks(e) : null,
            m && m !== 'loading' && m !== 'none' ? h('div', { class: 'row small', style: { 'margin-top': '4px' } }, art(m.artwork_url, { size: 'sm' }), h('span', { class: 'muted' }, 'Apple Music: ', m.release, m.year ? ` (${m.year})` : ''), extLink('open', m.url)) : null,
            m === 'none' ? h('div', { class: 'faint small' }, 'No Apple Music match') : null,
            m === 'loading' ? h('span', { class: 'spinner', 'aria-label': 'Searching' }) : null,
            e.edited ? h('div', { class: 'raw', title: 'Original line' }, `Original: ${e.raw_line || e.raw}`) : null),
          h('td', { class: 'hide-sm muted small' }, e.version || '—'),
          h('td', null, statusFor(e, lib)),
          h('td', null, h('div', { class: 'row', style: { gap: '4px', 'flex-wrap': 'nowrap' } },
            btn('', () => searchEntry(e), { cls: 'sm icon ghost', ico: 'search', title: 'Search platforms', disabled: e.status === 'unknown' && !e.artist }),
            btn('', () => editEntry(e), { cls: 'sm icon ghost', ico: 'edit', title: 'Edit entry' }),
            btn('', () => saveEntry(e, m && m !== 'loading' && m !== 'none' ? m : null), { cls: 'sm icon', ico: 'plus', title: 'Save to library or crate', disabled: !e.title || /^id$/i.test(e.title) }))));
        return [row];
      })))));
  }

  function drawOrig() {
    if (!showOriginal) return clear(orig);
    const ign = new Set((tl.ignored || []).map((x) => x.line));
    const lines = tl.original_text.split(/\r?\n/);
    clear(orig, h('section', { class: 'card stack', style: { 'margin-top': '16px' } },
      h('div', { class: 'row between' }, h('h2', 'Original text'), btn('Copy original', () => copyText(tl.original_text), { cls: 'sm ghost', ico: 'copy' })),
      h('p', { class: 'muted small' }, 'Lines set aside as non-track text are struck through.'),
      h('pre', { class: 'raw', style: { 'white-space': 'pre-wrap', margin: 0, 'max-height': '420px', overflow: 'auto' } },
        lines.map((l, i) => h('div', { title: ign.has(i + 1) ? (tl.ignored.find((x) => x.line === i + 1)?.reason) : null }, ign.has(i + 1) ? h('s', l || ' ') : (l || ' '))))));
  }

  async function searchAll() {
    const list = known().filter((e) => !matches.has(e.id) || matches.get(e.id) === 'none');
    if (!list.length) return toast('Every identified track has already been searched');
    toast(`Searching Apple Music for ${list.length} track${list.length > 1 ? 's' : ''}…`);
    list.forEach((e) => matches.set(e.id, 'loading'));
    draw();
    for (const e of list) {
      try {
        const res = await get(`/api/search?${qs({ source: 'applemusic', q: searchQuery(e, { withVersion: false }) })}`);
        const a = (x) => String(x || '').toLowerCase();
        const best = res.find((r) => a(r.title) === a(e.title) && a(r.artist).includes(a(e.artist).split(/[ ,&]/)[0])) || null;
        matches.set(e.id, best || 'none');
      } catch (err) {
        matches.set(e.id, 'none');
        if (err.status !== 404) { toastError(err); break; }
      }
      draw();
    }
    [...matches.entries()].forEach(([k, v]) => { if (v === 'loading') matches.delete(k); });
    draw();
  }

  function searchEntry(e) {
    const q = searchQuery(e);
    dialog({ title: trackName(e) || 'Search', wide: true, body: [destinations(q, e), h('div', { class: 'row' },
      link(h('span', { class: 'row' }, icon('discover'), 'Open in Discover'), `/discover?${qs({ q: `${e.artist} - ${e.title}${e.version ? ` (${e.version})` : ''}` })}`, { class: 'btn sm', onclick: () => document.querySelector('dialog[open]')?.close() }),
      e.artist ? link(h('span', { class: 'row' }, icon('explore'), `Explore ${e.artist}`), `/explore/artist?${qs({ name: e.artist })}`, { class: 'btn sm', onclick: () => document.querySelector('dialog[open]')?.close() }) : null)] });
  }

  function editEntry(e) {
    const f = { artist: input({ value: e.artist }), title: input({ value: e.title }), version: input({ value: e.version }), label: input({ value: e.label || '' }), timestamp: input({ value: e.timestamp || '', placeholder: '1:02:30' }) };
    const st = select([['identified', 'Identified'], ['confirmed', 'Confirmed (checked by you)'], ['unknown', 'Unknown ID']], e.status);
    const d = dialog({
      title: 'Edit entry',
      body: [h('p', { class: 'raw' }, `Original line ${e.line_no || e.line || ''}: ${e.raw_line || e.raw}`),
        h('div', { class: 'grid-2' }, field('Artist', f.artist), field('Title', f.title)),
        h('div', { class: 'grid-3' }, field('Version', f.version), field('Label', f.label), field('Timestamp', f.timestamp)),
        field('Status', st)],
      actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn('Save', async () => {
        if (f.timestamp.value && !/^(\d{1,2}:)?\d{1,3}:\d{2}$/.test(f.timestamp.value.trim())) { f.timestamp.setCustomValidity('Use mm:ss or h:mm:ss'); return f.timestamp.reportValidity(); }
        let status = st.value;
        if (status === 'unknown' && f.title.value && !/^id$/i.test(f.title.value) && f.artist.value && !/^id$/i.test(f.artist.value) && e.status === 'unknown') status = 'confirmed';
        try {
          await persistEntry(e, { artist: f.artist.value.trim(), title: f.title.value.trim(), version: f.version.value.trim(), label: f.label.value.trim(), timestamp: f.timestamp.value.trim() || null, status });
          matches.delete(e.id);
          d.close(); draw(); toast('Entry updated');
        } catch (err) { toastError(err); }
      }, { cls: 'primary' })],
    });
  }

  function trailFor(e) {
    return [{ kind: 'tracklist', label: tl.title, ref: tl.id ? String(tl.id) : '' }, ...(e.artist ? [{ kind: 'artist', label: e.artist }] : [])];
  }

  async function saveEntry(e, m) {
    const data = {
      artist: e.artist, title: e.title, version: e.version, label: e.label, featured: e.featured,
      source: `Tracklist: ${tl.title}`, source_url: tl.source_url || '', notes: e.timestamp ? `Heard at ${e.timestamp} in “${tl.title}”.` : `From “${tl.title}”.`,
      ...(m ? { release: m.release, year: m.year, duration_ms: m.duration_ms, artwork_url: m.artwork_url, artwork_source: 'Apple Music', external_ids: { applemusic: m.external_id } } : {}),
    };
    const r = await saveTrackDialog(data, { discovery: trailFor(e), sources: m ? [{ platform: 'applemusic', url: m.url, external_id: m.external_id, kind: 'result', platformName: 'Apple Music' }] : [] });
    if (r?.track) {
      if (saved() && typeof e.id === 'number') await persistEntry(e, { track_id: r.track.id });
      else e.track_id = r.track.id;
      draw();
    }
  }

  async function addEntries(entries) {
    const list = entries.filter((e) => e.title && e.artist && !/^id$/i.test(e.title));
    if (!list.length) return toast('No identified tracks to add', { kind: 'bad' });
    // Save each track once (existing records are reused), then add to crates.
    let res;
    try {
      res = await post('/api/tracks/batch', { tracks: list.map((e) => ({ track: { artist: e.artist, title: e.title, version: e.version, label: e.label, featured: e.featured, source: `Tracklist: ${tl.title}`, source_url: tl.source_url || '', notes: e.timestamp ? `Heard at ${e.timestamp} in “${tl.title}”.` : '' }, discovery: trailFor(e) })) });
    } catch (err) { return toastError(err); }
    const ids = res.results.filter((r) => r.track).map((r) => r.track.id);
    for (const [i, r] of res.results.entries()) if (r.track) { if (saved() && typeof list[i].id === 'number') await persistEntry(list[i], { track_id: r.track.id }).catch(() => {}); else list[i].track_id = r.track.id; }
    await refreshTracks();
    toast(`${res.created} new, ${res.duplicates} already in library${res.failed ? `, ${res.failed} failed` : ''}`);
    if (ids.length) await pickCratesDialog(ids, { title: `Add ${ids.length} tracks to crates` });
    sel.clear();
    draw();
  }

  async function removeEntries(entries) {
    const ids = new Set(entries.map((e) => e.id));
    try {
      if (saved()) { const r = await post(`/api/tracklists/${tl.id}/entries/delete`, { ids: entries.map((e) => e.id).filter((x) => typeof x === 'number') }); tl.entries = r.entries; }
      else tl.entries = tl.entries.filter((e) => !ids.has(e.id));
      ids.forEach((x) => sel.delete(x));
      toast(`Removed ${ids.size} entr${ids.size > 1 ? 'ies' : 'y'}`);
      draw();
    } catch (err) { toastError(err); }
  }

  async function removeDupes() {
    const d = findDuplicates(tl.entries);
    if (!await confirmDialog({ title: `Remove ${d.length} duplicate${d.length > 1 ? 's' : ''}?`, text: 'Later repeats of the same artist, title and version are removed. The first play is kept.', confirm: 'Remove duplicates', danger: false })) return;
    await removeEntries(d);
  }

  async function saveCollection() {
    try {
      const r = await post('/api/tracklists', { title: titleInput.value.trim() || tl.title, source_url: tl.source_url, original_text: tl.original_text, entries: tl.entries.map((e) => ({ ...e, raw: e.raw_line || e.raw, line: e.line_no || e.line })) });
      toast('Tracklist saved');
      navigate(`/tracklists/${r.id}`, { replace: true });
    } catch (err) { toastError(err); }
  }

  async function removeTracklist() {
    if (!await confirmDialog({ title: `Delete “${tl.title}”?`, text: 'The tracklist and its original text are deleted. Tracks you saved from it stay in your library.', confirm: 'Delete tracklist' })) return;
    try { await del(`/api/tracklists/${tl.id}`); toast('Tracklist deleted'); navigate('/tracklists'); } catch (err) { toastError(err); }
  }

  (state.tracks ? Promise.resolve() : refreshTracks().catch(() => {})).then(draw);
  draw();
  drawOrig();
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tracklist';
