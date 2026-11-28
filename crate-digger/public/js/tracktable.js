// Reusable track collection: search, filters, sorting, selection, bulk actions, table and grid views.
import { h, clear, btn, icon, art, energyDots, select, link, toast, toastError, confirmDialog, empty, debounce, fmtDate } from './ui.js';
import { post, patch } from './api.js';
import { state, upsertTrack, removeTracks, refreshCrates, refreshTracks } from './state.js';
import { STATUSES, statusLabel } from '/shared/export.js';
import { formatKey, CAMELOT_CODES } from '/shared/camelot.js';
import { pickCratesDialog, exportCsv, exportM3uDialog, shoppingDialog, setStatus } from './actions.js';

const SORTS = [
  ['added_desc', 'Date added (newest)'], ['added_asc', 'Date added (oldest)'], ['updated_desc', 'Recently updated'],
  ['artist', 'Artist A–Z'], ['title', 'Title A–Z'], ['bpm_asc', 'BPM (low–high)'], ['bpm_desc', 'BPM (high–low)'],
  ['key', 'Camelot key'], ['energy_desc', 'Energy (high–low)'],
];
const VIEW_KEY = 'cd-view';

function camelotOrder(c) {
  const m = String(c || '').match(/^(\d+)([AB])$/);
  return m ? Number(m[1]) * 2 + (m[2] === 'B' ? 1 : 0) : 999;
}
const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), undefined, { sensitivity: 'base', numeric: true });

export function sortTracks(list, sort) {
  const s = [...list];
  const by = {
    added_desc: (a, b) => cmp(b.added_at || b.created_at, a.added_at || a.created_at),
    added_asc: (a, b) => cmp(a.added_at || a.created_at, b.added_at || b.created_at),
    updated_desc: (a, b) => cmp(b.updated_at, a.updated_at),
    artist: (a, b) => cmp(a.artist, b.artist) || cmp(a.title, b.title),
    title: (a, b) => cmp(a.title, b.title) || cmp(a.artist, b.artist),
    bpm_asc: (a, b) => (a.bpm ?? 1e9) - (b.bpm ?? 1e9),
    bpm_desc: (a, b) => (b.bpm ?? -1) - (a.bpm ?? -1),
    key: (a, b) => camelotOrder(a.camelot) - camelotOrder(b.camelot) || (a.bpm ?? 1e9) - (b.bpm ?? 1e9),
    energy_desc: (a, b) => (b.energy ?? 0) - (a.energy ?? 0),
    position: (a, b) => (a.position ?? 0) - (b.position ?? 0),
  }[sort] || (() => 0);
  return s.sort(by);
}

export function filterTracks(list, f) {
  const q = (f.q || '').toLowerCase().trim();
  const words = q ? q.split(/\s+/) : [];
  return list.filter((t) => {
    if (words.length) {
      const hay = [t.artist, t.title, t.version, t.label, t.release, t.genre, t.notes, t.camelot, ...(t.tags || []), ...(t.featured || [])].join(' ').toLowerCase();
      if (!words.every((w) => hay.includes(w))) return false;
    }
    if (f.genre && (t.genre || '') !== f.genre) return false;
    if (f.status && t.status !== f.status) return false;
    if (f.key && t.camelot !== f.key) return false;
    if (f.energy && String(t.energy || '') !== String(f.energy)) return false;
    if (f.bpmMin && !(t.bpm >= Number(f.bpmMin))) return false;
    if (f.bpmMax && !(t.bpm <= Number(f.bpmMax))) return false;
    if (f.tag && !(t.tags || []).includes(f.tag)) return false;
    return true;
  });
}

export function statusPill(s) {
  return h('span', { class: `status st-${s}` }, statusLabel(s));
}
export function keyPill(t) {
  if (!t.camelot) return h('span', { class: 'faint' }, '—');
  const est = t.provenance?.camelot === 'estimated';
  return h('span', { class: 'key', title: [t.musical_key, est ? 'estimated' : ''].filter(Boolean).join(' · ') }, formatKey(t.camelot, state.settings.keyNotation), est ? '*' : '');
}
export function bpmCell(t) {
  if (!t.bpm) return h('span', { class: 'faint' }, '—');
  const est = t.provenance?.bpm === 'estimated';
  return h('span', { class: 'num', title: est ? 'Estimated BPM' : null }, String(Math.round(t.bpm * 10) / 10), est ? '*' : '');
}

/**
 * opts: {
 *   getTracks(): track[]    – current list (already scoped to the view)
 *   crate                   – crate context (enables remove/move/reorder)
 *   title                   – export name
 *   emptyState: Node
 *   extraColumns            – [{ head, cell(t) }]
 *   rowClass(t)
 *   initialSort, initialFilters
 *   onChange()              – called after mutations
 * }
 */
export function trackCollection(opts) {
  const root = h('div', { class: 'stack' });
  const sel = new Set();
  // Remembered view, otherwise artwork grid on touchscreens and table elsewhere.
  let view = (() => { try { return localStorage.getItem(VIEW_KEY); } catch { return null; } })() || (matchMedia('(pointer: coarse)').matches ? 'grid' : 'table');
  const f = { q: '', genre: '', status: '', key: '', energy: '', bpmMin: '', bpmMax: '', tag: '', ...(opts.initialFilters || {}) };
  let sort = opts.initialSort || 'added_desc';

  const q = h('input', { type: 'search', class: 'search', placeholder: 'Search artist, title, label, tag…', value: f.q, 'aria-label': 'Search tracks' });
  q.addEventListener('input', debounce(() => { f.q = q.value; draw(); }, 120));
  const genreSel = h('select', { 'aria-label': 'Filter by genre', onchange: (e) => { f.genre = e.target.value; draw(); } });
  const statusSel = select([['', 'Any status'], ...STATUSES], f.status, { 'aria-label': 'Filter by status', onchange: (e) => { f.status = e.target.value; draw(); } });
  const keySel = select([['', 'Any key'], ...CAMELOT_CODES.map((c) => [c, `${c} · ${formatKey(c, 'musical')}`])], f.key, { 'aria-label': 'Filter by Camelot key', onchange: (e) => { f.key = e.target.value; draw(); } });
  const energySel = select([['', 'Any energy'], ...[1, 2, 3, 4, 5].map((n) => [n, `Energy ${n}`])], f.energy, { 'aria-label': 'Filter by energy', onchange: (e) => { f.energy = e.target.value; draw(); } });
  const bpmMin = h('input', { type: 'number', class: 'bpm', placeholder: 'BPM ≥', min: 40, max: 300, value: f.bpmMin, 'aria-label': 'Minimum BPM' });
  const bpmMax = h('input', { type: 'number', class: 'bpm', placeholder: 'BPM ≤', min: 40, max: 300, value: f.bpmMax, 'aria-label': 'Maximum BPM' });
  bpmMin.addEventListener('input', debounce(() => { f.bpmMin = bpmMin.value; draw(); }, 200));
  bpmMax.addEventListener('input', debounce(() => { f.bpmMax = bpmMax.value; draw(); }, 200));
  const sortSel = select([...(opts.crate ? [['position', 'Crate order']] : []), ...SORTS], sort, { 'aria-label': 'Sort', onchange: (e) => { sort = e.target.value; draw(); } });
  const reset = btn('Clear filters', () => {
    Object.assign(f, { q: '', genre: '', status: '', key: '', energy: '', bpmMin: '', bpmMax: '', tag: '' });
    q.value = ''; genreSel.value = ''; statusSel.value = ''; keySel.value = ''; energySel.value = ''; bpmMin.value = ''; bpmMax.value = '';
    draw();
  }, { cls: 'ghost sm' });
  const viewBtns = [['table', 'rows', 'Table view'], ['grid', 'grid', 'Artwork grid']].map(([v, ico, label]) =>
    btn('', () => { view = v; try { localStorage.setItem(VIEW_KEY, v); } catch { /* ignore */ } draw(); }, { cls: 'icon sm', ico, title: label, 'aria-pressed': String(view === v), dataset: { view: v } }));

  const bulk = h('div', { class: 'bulkbar hidden', role: 'region', 'aria-label': 'Bulk actions' });
  const body = h('div');
  const countEl = h('span', { class: 'muted small', 'aria-live': 'polite' });
  root.append(
    h('div', { class: 'toolbar' }, q, h('div', { class: 'filters' }, genreSel, statusSel, keySel, energySel, bpmMin, bpmMax, sortSel, reset), h('div', { class: 'row', style: { 'margin-left': 'auto' } }, countEl, viewBtns)),
    bulk, body);

  function current() { return sortTracks(filterTracks(opts.getTracks(), f), sort); }

  function drawGenres() {
    const names = [...new Set([...state.genres.map((g) => g.name), ...opts.getTracks().map((t) => t.genre).filter(Boolean)])].sort();
    clear(genreSel, h('option', { value: '' }, 'Any genre'), names.map((n) => h('option', { value: n, selected: n === f.genre }, n)));
  }

  function drawBulk(list) {
    const ids = [...sel];
    bulk.classList.toggle('hidden', !ids.length);
    if (!ids.length) return;
    const chosen = list.filter((t) => sel.has(t.id)).length === ids.length ? list.filter((t) => sel.has(t.id)) : (state.tracks || opts.getTracks()).filter((t) => sel.has(t.id));
    const statusChange = select([['', 'Set status…'], ...STATUSES], '', { 'aria-label': 'Set status of selected', onchange: async (e) => {
      if (!e.target.value) return;
      try { await setStatus(ids, e.target.value); opts.onChange?.(); draw(); } catch (err) { toastError(err); }
    } });
    const others = opts.crate ? state.crates.filter((c) => c.id !== opts.crate.id) : [];
    const move = opts.crate && others.length ? select([['', 'Move to…'], ...others.map((c) => [c.id, c.name])], '', { 'aria-label': 'Move selected to crate', onchange: async (e) => {
      const to = Number(e.target.value);
      if (!to) return;
      try {
        await post(`/api/crates/${opts.crate.id}/move`, { to, ids });
        await Promise.all([refreshCrates(), refreshTracks()]);
        toast(`Moved ${ids.length} track${ids.length > 1 ? 's' : ''} to ${others.find((c) => c.id === to).name}`);
        sel.clear(); opts.onChange?.(); draw();
      } catch (err) { toastError(err); }
    } }) : null;
    clear(bulk,
      h('strong', `${ids.length} selected`),
      btn('Clear', () => { sel.clear(); draw(); }, { cls: 'ghost sm' }),
      statusChange,
      btn('Add to crate', async () => { if (await pickCratesDialog(ids, { exclude: opts.crate?.id })) { opts.onChange?.(); draw(); } }, { cls: 'sm', ico: 'plus' }),
      move,
      opts.crate ? btn('Remove from crate', async () => {
        if (!await confirmDialog({ title: `Remove ${ids.length} track${ids.length > 1 ? 's' : ''} from ${opts.crate.name}?`, text: 'They stay in your library and other crates.', confirm: 'Remove' })) return;
        try {
          await post(`/api/crates/${opts.crate.id}/remove`, { ids });
          await Promise.all([refreshCrates(), refreshTracks()]);
          toast('Removed from crate'); sel.clear(); opts.onChange?.(); draw();
        } catch (err) { toastError(err); }
      }, { cls: 'sm' }) : null,
      btn('CSV', () => exportCsv(chosen, opts.title || 'tracks'), { cls: 'sm', ico: 'download', title: 'Export selected as CSV' }),
      btn('M3U8', () => exportM3uDialog(chosen, opts.title || 'playlist'), { cls: 'sm', ico: 'download', title: 'Export selected as M3U8 playlist' }),
      btn('Shopping list', () => shoppingDialog(chosen), { cls: 'sm' }),
      !opts.crate ? btn('Delete', async () => {
        if (!await confirmDialog({ title: `Delete ${ids.length} track${ids.length > 1 ? 's' : ''}?`, text: 'They are removed from your library and every crate, with their notes and purchase records. This cannot be undone.', confirm: 'Delete tracks' })) return;
        try { await post('/api/tracks/bulk', { ids, action: 'delete' }); removeTracks(ids); await refreshCrates(); toast(`Deleted ${ids.length} track${ids.length > 1 ? 's' : ''}`); sel.clear(); opts.onChange?.(); draw(); } catch (err) { toastError(err); }
      }, { cls: 'sm danger', ico: 'trash' }) : null);
  }

  function toggle(id, on) { if (on) sel.add(id); else sel.delete(id); }

  function dragStart(e, t) {
    const ids = sel.has(t.id) ? [...sel] : [t.id];
    e.dataTransfer.setData('application/x-cd-tracks', JSON.stringify(ids));
    e.dataTransfer.setData('text/plain', ids.length > 1 ? `${ids.length} tracks` : `${t.artist} - ${t.title}`);
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  async function quickStatus(t, status) {
    try { const r = await patch(`/api/tracks/${t.id}`, { status }); upsertTrack(r); toast(`${t.title}: ${statusLabel(status)}`); opts.onChange?.(); } catch (err) { toastError(err); draw(); }
  }

  function tableView(list) {
    const all = h('input', { type: 'checkbox', 'aria-label': 'Select all shown tracks', checked: list.length > 0 && list.every((t) => sel.has(t.id)), onchange: (e) => { list.forEach((t) => toggle(t.id, e.target.checked)); draw(); } });
    const sortable = (label, key) => h('button', { type: 'button', onclick: () => { sort = sort === key ? ({ artist: 'artist', title: 'title', bpm_asc: 'bpm_desc', bpm_desc: 'bpm_asc', key: 'key', added_desc: 'added_asc', added_asc: 'added_desc' }[key] || key) : key; sortSel.value = sort; draw(); }, 'aria-label': `Sort by ${label}` }, label, sort === key || (key === 'bpm_asc' && sort === 'bpm_desc') || (key === 'added_desc' && sort === 'added_asc') ? icon('sort') : null);
    const extra = opts.extraColumns || [];
    return h('div', { class: 'table-wrap' }, h('table', { class: 'tracks' },
      h('thead', null, h('tr', null,
        h('th', { class: 'c' }, all),
        h('th', { class: 'hide-sm' }, h('span', { class: 'sr' }, 'Artwork')),
        h('th', null, sortable('Track', 'artist')),
        h('th', { class: 'hide-sm' }, 'Label'),
        h('th', null, sortable('BPM', 'bpm_asc')),
        h('th', null, sortable('Key', 'key')),
        h('th', { class: 'hide-sm' }, 'Genre'),
        h('th', { class: 'hide-sm' }, 'Energy'),
        h('th', null, 'Status'),
        extra.map((c) => h('th', null, c.head)),
        h('th', { class: 'hide-sm' }, sortable('Added', 'added_desc')))),
      h('tbody', null, list.map((t) => {
        const tr = h('tr', { class: [sel.has(t.id) ? 'selected' : '', opts.rowClass?.(t)], draggable: 'true' },
          h('td', { class: 'c' }, h('input', { type: 'checkbox', checked: sel.has(t.id), 'aria-label': `Select ${t.artist} – ${t.title}`, onchange: (e) => { toggle(t.id, e.target.checked); tr.classList.toggle('selected', e.target.checked); all.checked = list.every((x) => sel.has(x.id)); drawBulk(list); } })),
          h('td', { class: 'hide-sm' }, art(t.artwork_url, { size: 'sm' })),
          h('td', { class: 't-title' },
            link(t.title + (t.version ? ` (${t.version})` : ''), `/track/${t.id}`),
            h('div', { class: 'sub' }, t.artist || 'Unknown artist', t.is_sample ? h('span', { class: 'badge-kind kind-sample', style: { 'margin-left': '6px' } }, 'Sample') : null)),
          h('td', { class: 'hide-sm muted small' }, t.label || '—'),
          h('td', null, bpmCell(t)),
          h('td', null, keyPill(t)),
          h('td', { class: 'hide-sm muted small' }, t.genre || '—'),
          h('td', { class: 'hide-sm' }, energyDots(t.energy)),
          h('td', null, select(STATUSES, t.status, { class: 'status-select', 'aria-label': `Status of ${t.title}`, onchange: (e) => quickStatus(t, e.target.value) })),
          extra.map((c) => h('td', null, c.cell(t))),
          h('td', { class: 'hide-sm faint small nowrap' }, fmtDate(t.added_at || t.created_at, { day: 'numeric', month: 'short' })));
        tr.addEventListener('dragstart', (e) => dragStart(e, t));
        return tr;
      }))));
  }

  function gridView(list) {
    return h('div', { class: 'track-grid' }, list.map((t) => {
      const tile = h('div', { class: ['tile', sel.has(t.id) ? 'selected' : ''], draggable: 'true' },
        h('a', { href: `/track/${t.id}`, 'data-link': true, 'aria-label': `${t.artist} – ${t.title}` }, art(t.artwork_url, { alt: `${t.artist} – ${t.title}` })),
        h('label', { class: 'sel' }, h('input', { type: 'checkbox', checked: sel.has(t.id), 'aria-label': `Select ${t.title}`, onchange: (e) => { toggle(t.id, e.target.checked); tile.classList.toggle('selected', e.target.checked); drawBulk(list); } })),
        h('div', null,
          link(h('div', { class: 't1' }, t.title, t.version ? h('span', { class: 'muted' }, ` (${t.version})`) : null), `/track/${t.id}`),
          h('div', { class: 't2' }, t.artist),
          h('div', { class: 'row small', style: { 'margin-top': '4px' } }, bpmCell(t), keyPill(t), statusPill(t.status))));
      tile.addEventListener('dragstart', (e) => dragStart(e, t));
      return tile;
    }));
  }

  function draw() {
    const all = opts.getTracks();
    for (const id of [...sel]) if (!all.some((t) => t.id === id)) sel.delete(id);
    const list = current();
    countEl.textContent = list.length === all.length ? `${all.length} track${all.length === 1 ? '' : 's'}` : `${list.length} of ${all.length}`;
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
    const filtered = Object.entries(f).some(([, v]) => v);
    reset.classList.toggle('hidden', !filtered);
    drawBulk(list);
    if (!all.length) return clear(body, opts.emptyState || empty('No tracks yet', 'Save tracks from Discover or Tracklists.'));
    if (!list.length) return clear(body, empty('No tracks match', 'Try clearing a filter.', btn('Clear filters', () => reset.click())));
    clear(body, view === 'grid' ? gridView(list) : tableView(list));
  }

  drawGenres();
  draw();
  return { el: root, draw: () => { drawGenres(); draw(); }, selection: sel, filters: f, current };
}
