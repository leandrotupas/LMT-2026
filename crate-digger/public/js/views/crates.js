import { h, clear, btn, link, empty, toast, toastError, fmtDate, icon, notice } from '../ui.js';
import { get, post, put } from '../api.js';
import { state, refreshCrates, ensureTracks, subscribe } from '../state.js';
import { navigate } from '../router.js';
import { crateDialog, deleteCrate, exportCsv, exportM3uDialog, shoppingDialog } from '../actions.js';
import { trackCollection } from '../tracktable.js';

export async function render(root, { params }) {
  if (params[0]) return crateDetail(root, Number(params[0]));
  return crateIndex(root);
}

function cover(c, single = false) {
  const el = h('div', { class: ['crate-cover', single || c.cover_url || (c.artwork || []).length < 4 ? 'single' : ''], style: { '--accent': c.accent } });
  if (c.cover_url) el.append(h('img', { src: c.cover_url, alt: '' }));
  else if ((c.artwork || []).length >= 4 && !single) c.artwork.slice(0, 4).forEach((u) => el.append(h('img', { src: u, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' })));
  else if ((c.artwork || []).length) el.append(h('img', { src: c.artwork[0], alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }));
  else el.append(h('div', { class: 'ph', 'aria-hidden': 'true' }, c.name.slice(0, 1).toUpperCase()));
  el.querySelectorAll('img').forEach((img) => img.addEventListener('error', () => img.remove(), { once: true }));
  return el;
}

function crateIndex(root) {
  const body = h('div');
  const draw = () => {
    const crates = state.crates;
    const starters = state.starterCrates.filter((n) => !crates.some((c) => c.name.toLowerCase() === n.toLowerCase()));
    const chosen = new Set();
    const starterEl = starters.length ? h('section', { class: 'card stack' },
      h('div', null, h('h2', crates.length ? 'More crate ideas' : 'Start with a few crates'), h('p', { class: 'muted small' }, 'Suggestions only. Pick any that fit how you play, or make your own.')),
      h('div', { class: 'starter' }, starters.map((n) => h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: (e) => {
        const on = !chosen.has(n);
        if (on) chosen.add(n); else chosen.delete(n);
        e.currentTarget.classList.toggle('on', on);
        e.currentTarget.setAttribute('aria-pressed', String(on));
        createBtn.disabled = !chosen.size;
        createBtn.textContent = chosen.size ? `Create ${chosen.size} crate${chosen.size > 1 ? 's' : ''}` : 'Create selected';
      } }, n))),
      h('div', null, h('button', { type: 'button', class: 'btn sm primary', disabled: true, id: 'starter-go', onclick: async () => {
        try { const r = await post('/api/crates/starter', { names: [...chosen] }); state.crates = r.crates; await refreshCrates(); toast(`Created ${r.created} crate${r.created === 1 ? '' : 's'}`); draw(); } catch (e) { toastError(e); }
      } }, 'Create selected'))) : null;
    const createBtn = starterEl?.querySelector('#starter-go');
    clear(body,
      crates.length ? h('div', { class: 'crate-grid', style: { 'margin-bottom': '28px' } }, crates.map((c) => h('a', { class: 'crate-card', href: `/crates/${c.id}`, 'data-link': true },
        cover(c),
        h('div', null, h('div', { class: 't1' }, c.name, c.is_sample ? h('span', { class: 'badge-kind kind-sample', style: { 'margin-left': '6px' } }, 'Sample') : null),
          h('div', { class: 'small muted' }, `${c.track_count} track${c.track_count === 1 ? '' : 's'}${c.genre ? ` · ${c.genre}` : ''}`))))) : h('div', { class: 'card', style: { 'margin-bottom': '20px' } }, empty('No crates yet', 'Crates hold tracks by mood, genre, set or idea. One track can be in many crates.', btn('New crate', newCrate, { cls: 'primary', ico: 'plus' }))),
      starterEl);
  };
  const newCrate = async () => { const c = await crateDialog(); if (c) navigate(`/crates/${c.id}`); };
  root.append(h('div', { class: 'page-head' },
    h('div', null, h('p', { class: 'eyebrow' }, 'My Crates'), h('h1', 'Crates'), h('p', 'Collections for moods, genres, sets and ideas.')),
    btn('New crate', newCrate, { cls: 'primary', ico: 'plus' })), body);
  draw();
  return subscribe((w) => { if (w === 'crates' || w === 'all') draw(); });
}

async function crateDetail(root, id) {
  let crate = await get(`/api/crates/${id}`);
  await ensureTracks();
  const order = () => new Map(crate.track_ids.map((x, i) => [x.track_id, { position: i, added_at: x.added_at }]));
  let positions = order();
  const tracks = () => (state.tracks || []).filter((t) => positions.has(t.id)).map((t) => ({ ...t, ...positions.get(t.id) }));
  const head = h('div');
  const drawHead = () => clear(head, h('div', { class: 'crate-head' },
    cover(crate, true),
    h('div', { class: 'stack' },
      h('p', { class: 'eyebrow' }, link('My Crates', '/crates')),
      h('h1', crate.name, crate.is_sample ? h('span', { class: 'badge-kind kind-sample', style: { 'margin-left': '8px', 'vertical-align': 'middle' } }, 'Sample') : null),
      crate.description ? h('p', { class: 'muted' }, crate.description) : null,
      h('p', { class: 'small faint' }, [`${crate.track_count} track${crate.track_count === 1 ? '' : 's'}`, crate.genre, `created ${fmtDate(crate.created_at)}`].filter(Boolean).join(' · ')),
      h('div', { class: 'row' },
        btn('Edit', async () => { const c = await crateDialog(crate); if (c) { crate = c; positions = order(); drawHead(); coll.draw(); } }, { cls: 'sm', ico: 'edit' }),
        btn('Export M3U8', () => exportM3uDialog(sortedForExport(), crate.name), { cls: 'sm', ico: 'download' }),
        btn('Export CSV', () => exportCsv(sortedForExport(), crate.name), { cls: 'sm', ico: 'download' }),
        btn('Shopping list', () => shoppingDialog(tracks()), { cls: 'sm' }),
        link(h('span', { class: 'row' }, icon('merge'), 'Duplicates'), `/library?view=duplicates&crate=${crate.id}`, { class: 'btn sm ghost' }),
        btn('Delete crate', async () => { try { if (await deleteCrate(crate)) navigate('/crates'); } catch (e) { toastError(e); } }, { cls: 'sm ghost danger', ico: 'trash' })))));
  const sortedForExport = () => coll.current();
  const coll = trackCollection({
    getTracks: tracks,
    crate,
    title: crate.name,
    initialSort: 'position',
    emptyState: h('div', { class: 'card' }, empty('This crate is empty', 'Save tracks to it from Discover, Tracklists or Explore, select tracks in the Library, or drag rows onto the crate in the sidebar.', link('Open Library', '/library', { class: 'btn' }), link('Discover', '/discover', { class: 'btn primary' }))),
    onChange: async () => { crate = await get(`/api/crates/${id}`); positions = order(); drawHead(); coll.draw(); },
  });
  // Reorder within the crate by dragging rows onto each other while sorted by crate order.
  coll.el.addEventListener('dragover', (e) => { if (e.target.closest('tr') && coll.el.querySelector('select[aria-label="Sort"]')?.value === 'position') e.preventDefault(); });
  coll.el.addEventListener('drop', async (e) => {
    const tr = e.target.closest('tbody tr');
    if (!tr || coll.el.querySelector('select[aria-label="Sort"]')?.value !== 'position') return;
    e.preventDefault();
    const moved = JSON.parse(e.dataTransfer.getData('application/x-cd-tracks') || '[]');
    const rows = [...coll.el.querySelectorAll('tbody tr')];
    const list = coll.current().map((t) => t.id);
    const target = list[rows.indexOf(tr)];
    if (target == null || moved.includes(target)) return;
    const rest = list.filter((x) => !moved.includes(x));
    rest.splice(rest.indexOf(target), 0, ...moved);
    try {
      await put(`/api/crates/${id}/order`, { ids: rest });
      crate = await get(`/api/crates/${id}`); positions = order(); coll.draw();
      toast('Crate order updated');
    } catch (err) { toastError(err); }
  });
  drawHead();
  root.append(head, h('p', { class: 'faint small', style: { 'margin-bottom': '8px' } }, 'Sorted by crate order, drag rows to reorder. Drag onto a crate in the sidebar to copy tracks there.'), coll.el);
  const unsub = subscribe(async (w) => { if (w === 'tracks') coll.draw(); if (w === 'crates') { const c = state.crates.find((x) => x.id === id); if (!c) return; crate = { ...crate, ...c }; drawHead(); } });
  return unsub;
}

export { notice };
