import { h, clear, btn, link, empty, toast, toastError, confirmDialog, art, notice, trackName } from '../ui.js';
import { get, post } from '../api.js';
import { state, ensureTracks, refreshTracks, refreshCrates, subscribe } from '../state.js';
import { setQuery } from '../router.js';
import { trackCollection, statusPill } from '../tracktable.js';
import { exportCsv, exportM3uDialog, shoppingDialog } from '../actions.js';

const DAY = 864e5;
export const VIEWS = [
  ['all', 'All tracks', () => true],
  ['recent', 'Recently added', (t) => Date.now() - Date.parse(t.created_at) < 14 * DAY],
  ['updated', 'Recently updated', (t) => t.updated_at !== t.created_at && Date.now() - Date.parse(t.updated_at) < 14 * DAY],
  ['wishlist', 'Wishlist', (t) => t.status === 'wishlist'],
  ['purchased', 'Purchased', (t) => t.status === 'purchased'],
  ['downloaded', 'Downloaded', (t) => t.status === 'downloaded'],
  ['in_library', 'In Library', (t) => t.status === 'in_library'],
  ['missing', 'Missing BPM or key', (t) => !t.bpm || !t.camelot],
  ['unconfirmed', 'Source not confirmed', (t) => !t.source_confirmed],
  ['archived', 'Archived', (t) => t.status === 'archived'],
  ['duplicates', 'Possible duplicates', null],
];

export async function render(root, { query }) {
  let view = VIEWS.some(([k]) => k === query.get('view')) ? query.get('view') : 'all';
  const crateFilter = Number(query.get('crate')) || null;
  await ensureTracks();
  const tabs = h('nav', { class: 'tabs', 'aria-label': 'Library views' });
  const body = h('div');
  const sorts = { recent: 'added_desc', updated: 'updated_desc' };
  let coll = null;

  const drawTabs = () => clear(tabs, VIEWS.map(([k, label, fn]) => {
    const n = fn ? state.tracks.filter(fn).length : null;
    return h('button', { type: 'button', 'aria-selected': String(view === k), role: 'tab', onclick: () => { view = k; setQuery({ view: k === 'all' ? '' : k, crate: '' }); drawTabs(); drawBody(); } }, label, n != null ? h('span', { class: 'faint' }, ` ${n}`) : null);
  }));
  const drawBody = () => {
    if (view === 'duplicates') { coll = null; return duplicates(body, crateFilter); }
    const fn = VIEWS.find(([k]) => k === view)[2];
    coll = trackCollection({
      getTracks: () => state.tracks.filter(fn),
      title: VIEWS.find(([k]) => k === view)[1],
      initialSort: sorts[view],
      emptyState: h('div', { class: 'card' }, view === 'all'
        ? empty('Your library is empty', 'Everything you save from Discover, Tracklists or Explore lands here, whatever crates it is in.', link('Discover music', '/discover', { class: 'btn primary' }), link('Load sample content', '/settings#data', { class: 'btn' }))
        : empty('Nothing here', 'No tracks match this view right now.')),
    });
    clear(body, coll.el);
  };
  const exportAll = () => coll?.current() || state.tracks;
  root.append(
    h('div', { class: 'page-head' },
      h('div', null, h('p', { class: 'eyebrow' }, 'Library'), h('h1', 'Library'), h('p', 'Every saved track, whatever crate it is in. Select tracks for bulk changes and exports.')),
      h('div', { class: 'row' },
        btn('Export CSV', () => exportCsv(exportAll(), 'library'), { cls: 'sm', ico: 'download', title: 'Export the tracks shown' }),
        btn('Export M3U8', () => exportM3uDialog(exportAll(), 'library'), { cls: 'sm', ico: 'download' }),
        btn('Shopping list', () => shoppingDialog(exportAll()), { cls: 'sm' }))),
    tabs, body);
  drawTabs();
  drawBody();
  return subscribe((w) => { if (w === 'tracks' || w === 'all') { drawTabs(); if (coll) coll.draw(); else if (view === 'duplicates') duplicates(body, crateFilter); } });
}

async function duplicates(body, crateId) {
  clear(body, h('p', { class: 'muted' }, 'Checking…'));
  let groups;
  try { groups = await get('/api/tracks/duplicates'); } catch (e) { return clear(body, notice(e.message, 'bad')); }
  if (crateId) groups = groups.filter((g) => g.some((t) => t.crates.some((c) => c.id === crateId)));
  if (!groups.length) return clear(body, h('div', { class: 'card' }, empty('No duplicates', 'No two saved tracks share an artist and title. Exact duplicates are always merged when saved.')));
  clear(body,
    notice('These tracks share an artist and title but differ in version. Keep them if they are different mixes. Merge them if they are the same record: crates, tags, sources and purchase history move to the track you keep.', ''),
    h('div', { class: 'stack', style: { 'margin-top': '14px' } }, groups.map((g) => h('section', { class: 'card stack' },
      h('h3', `${g[0].artist} – ${g[0].title}`),
      h('div', { class: 'list' }, g.map((t) => h('div', { class: 'list-item' }, art(t.artwork_url, { size: 'sm' }),
        h('div', { class: 'grow' }, link(h('span', { class: 't1' }, trackName(t)), `/track/${t.id}`), h('div', { class: 'small muted' }, [t.label, t.bpm && `${t.bpm} BPM`, t.camelot, `${t.crates.length} crate${t.crates.length === 1 ? '' : 's'}`].filter(Boolean).join(' · '))),
        statusPill(t.status),
        g.length > 1 ? btn('Keep this, merge others', async () => {
          const others = g.filter((x) => x.id !== t.id);
          if (!await confirmDialog({ title: 'Merge duplicates?', text: `Keep “${trackName(t)}” and merge ${others.length} other version${others.length > 1 ? 's' : ''} into it. Empty fields are filled from the others, then they are deleted.`, confirm: 'Merge' })) return;
          try {
            for (const o of others) await post(`/api/tracks/${t.id}/merge`, { fromId: o.id });
            await Promise.all([refreshTracks(), refreshCrates()]);
            toast('Merged');
          } catch (e) { toastError(e); }
        }, { cls: 'sm' }) : null)))))));
}
