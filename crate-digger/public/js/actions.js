// Actions shared by several views: saving tracks, crates, exports.
import { h, btn, dialog, field, input, select, toast, toastError, icon, notice, trackName, extLink, confirmDialog, art } from './ui.js';
import { post, patch, del } from './api.js';
import { state, refreshCrates, refreshTracks, upsertTrack, getTrail } from './state.js';
import { STATUSES, toCsv, reviewPlaylist, toM3u8, shoppingList, shoppingText } from '/shared/export.js';
import { formatKey } from '/shared/camelot.js';

export const statusOptions = STATUSES;

// ---------- crate picker used inside dialogs ----------
function cratePicker(selected = new Set()) {
  const list = h('div', { class: 'crate-pick', role: 'group', 'aria-label': 'Crates' });
  const draw = () => {
    list.replaceChildren(...(state.crates.length ? state.crates.map((c) => h('label', null,
      h('input', { type: 'checkbox', value: c.id, checked: selected.has(c.id), onchange: (e) => (e.target.checked ? selected.add(c.id) : selected.delete(c.id)) }),
      h('span', { class: 'dot', style: { width: '9px', height: '9px', 'border-radius': '50%', background: c.accent } }),
      h('span', { class: 'grow' }, c.name), h('span', { class: 'faint small' }, c.track_count))) : [h('p', { class: 'muted small' }, 'No crates yet. Create one below.')]));
  };
  draw();
  const name = input({ placeholder: 'New crate name', 'aria-label': 'New crate name' });
  const add = btn('Create', async () => {
    if (!name.value.trim()) return name.focus();
    try {
      const c = await post('/api/crates', { name: name.value.trim() });
      await refreshCrates();
      selected.add(c.id);
      name.value = '';
      draw();
      toast(`Created crate “${c.name}”`);
    } catch (e) { toastError(e); }
  }, { cls: 'sm', ico: 'plus' });
  name.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); add.click(); } });
  return { el: h('div', { class: 'stack' }, list, h('div', { class: 'row' }, h('div', { class: 'grow' }, name), add)), selected };
}

function trailView(steps, onChange) {
  const wrap = h('div', { class: 'trail' });
  const draw = () => {
    wrap.replaceChildren(...(steps.length ? steps.flatMap((s, i) => [
      i ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→') : null,
      h('span', { class: 'step' }, h('span', { class: 'k' }, s.kind), s.label,
        h('button', { type: 'button', class: 'chip x', 'aria-label': `Remove ${s.label} from trail`, onclick: () => { steps.splice(i, 1); onChange?.(steps); draw(); } }, '×')),
    ]) : [h('span', { class: 'faint small' }, 'No discovery trail. That is fine.')]));
  };
  draw();
  return wrap;
}

/**
 * Save a track (from a search result, URL or tracklist) to the library and crates.
 * data: track fields; opts: { sources, discovery, heading }
 */
export function saveTrackDialog(data, { sources = [], discovery, heading = 'Save track' } = {}) {
  return new Promise((resolve) => {
    let result = null;
    const f = {
      artist: input({ value: data.artist || '', required: true, autocomplete: 'off' }),
      title: input({ value: data.title || '', required: true, autocomplete: 'off' }),
      version: input({ value: data.version || '', placeholder: 'Original Mix, Dub, Remix…', autocomplete: 'off' }),
      label: input({ value: data.label || '', autocomplete: 'off' }),
      release: input({ value: data.release || '', autocomplete: 'off' }),
      status: select(STATUSES, data.status || 'wishlist'),
      store: input({ value: data.store || '', placeholder: 'Bandcamp, Beatport…', list: 'store-list' }),
      notes: h('textarea', { rows: 2, value: data.notes || '' }),
    };
    const steps = [...(discovery || getTrail())];
    const picker = cratePicker(new Set(data.crateIds || []));
    const err = h('p', { class: 'error-text', role: 'alert' });
    const meta = [data.year && `Year ${data.year}`, data.genre && data.genre, data.bpm && `${data.bpm} BPM`, data.camelot && formatKey(data.camelot, state.settings.keyNotation)].filter(Boolean).join(' · ');
    const d = dialog({
      title: heading,
      wide: true,
      body: [
        h('div', { class: 'row' }, art(data.artwork_url, { size: 'md' }), h('div', { class: 'grow stack', style: { gap: '4px' } },
          h('strong', trackName(data) || 'New track'),
          sources[0] ? h('span', { class: 'muted small' }, `From ${sources[0].platformName || sources[0].platform}`, sources[0].url ? [' · ', extLink('open', sources[0].url)] : null) : null,
          meta ? h('span', { class: 'faint small' }, meta) : null)),
        h('div', { class: 'grid-3' }, field('Artist', f.artist), field('Title', f.title), field('Version / remix', f.version)),
        h('div', { class: 'grid-4' }, field('Label', f.label), field('Release', f.release), field('Status', f.status), field('Store', f.store)),
        h('datalist', { id: 'store-list' }, ['Bandcamp', 'Beatport', 'Traxsource', 'Juno Download', 'Qobuz', 'Discogs', 'Apple Music'].map((s) => h('option', { value: s }))),
        field('Add to crates', picker.el, 'A track can live in several crates. The library keeps one record.'),
        field('Discovery trail', trailView(steps), 'How you found this track. Remove steps that do not matter.'),
        field('Notes', f.notes),
        err,
      ],
      actions: [
        btn('Cancel', () => d.close(), { cls: 'ghost' }),
        btn('Save', async (e) => {
          if (!f.title.value.trim()) { err.textContent = 'A title is required.'; return f.title.focus(); }
          const track = { ...data, artist: f.artist.value, title: f.title.value, version: f.version.value, label: f.label.value, release: f.release.value, status: f.status.value, store: f.store.value, notes: f.notes.value };
          delete track.crateIds;
          const b = e.currentTarget;
          b.disabled = true;
          try {
            const r = await post('/api/tracks', { track, crateIds: [...picker.selected], discovery: steps, sources: sources.map(({ platformName, ...s }) => s) });
            result = r;
            await Promise.all([refreshCrates(), state.tracks ? refreshTracks() : null]);
            const where = picker.selected.size ? ` and ${picker.selected.size} crate${picker.selected.size > 1 ? 's' : ''}` : '';
            toast(r.created ? `Saved to library${where}` : `Already in your library${where ? `. Added to ${picker.selected.size} crate${picker.selected.size > 1 ? 's' : ''}` : ''}. Empty fields were filled in.`, {
              action: { label: 'View', run: () => import('./router.js').then((m) => m.navigate(`/track/${r.track.id}`)) },
            });
            d.close('saved');
          } catch (ex) { err.textContent = ex.message; b.disabled = false; }
        }, { cls: 'primary', ico: 'check' }),
      ],
      onClose: () => resolve(result),
    });
  });
}

export async function addToCrate(crate, ids) {
  const r = await post(`/api/crates/${crate.id}/tracks`, { ids });
  await Promise.all([refreshCrates(), state.tracks ? refreshTracks() : null]);
  toast(r.added ? `Added ${r.added} track${r.added > 1 ? 's' : ''} to ${crate.name}${r.already ? ` (${r.already} already there)` : ''}` : `Already in ${crate.name}`);
  return r;
}

export function pickCratesDialog(ids, { title = 'Add to crates', exclude } = {}) {
  return new Promise((resolve) => {
    const picker = cratePicker(new Set());
    let done = false;
    const d = dialog({
      title,
      body: [h('p', { class: 'muted' }, `${ids.length} track${ids.length > 1 ? 's' : ''} selected.`), picker.el],
      actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn('Add', async () => {
        if (!picker.selected.size) return toast('Choose at least one crate', { kind: 'bad' });
        try {
          for (const cid of picker.selected) if (cid !== exclude) await post(`/api/crates/${cid}/tracks`, { ids });
          await Promise.all([refreshCrates(), state.tracks ? refreshTracks() : null]);
          toast(`Added to ${picker.selected.size} crate${picker.selected.size > 1 ? 's' : ''}`);
          done = true;
          d.close();
        } catch (e) { toastError(e); }
      }, { cls: 'primary' })],
      onClose: () => resolve(done),
    });
  });
}

function resizeImage(file, max = 600) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('Choose a PNG, JPEG, WebP or GIF image'));
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('That image could not be read'));
    img.src = URL.createObjectURL(file);
  });
}

export function crateDialog(crate = null) {
  return new Promise((resolve) => {
    let saved = null;
    let cover = crate?.cover_url || '';
    const f = {
      name: input({ value: crate?.name || '', required: true, maxlength: 80 }),
      description: h('textarea', { rows: 2, value: crate?.description || '' }),
      genre: input({ value: crate?.genre || '', list: 'genre-list' }),
      accent: h('input', { type: 'color', value: crate?.accent || '#A78BFA', 'aria-label': 'Accent colour' }),
      coverUrl: input({ type: 'url', value: cover.startsWith('https://') ? cover : '', placeholder: 'https://…' }),
      file: h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif' }),
    };
    const preview = h('div', { class: 'crate-cover single', style: { width: '96px', '--accent': f.accent.value } });
    const drawPreview = () => {
      preview.style.setProperty('--accent', f.accent.value);
      preview.replaceChildren(cover ? h('img', { src: cover, alt: '' }) : h('div', { class: 'ph' }, (f.name.value || '?').slice(0, 1).toUpperCase()));
    };
    drawPreview();
    f.accent.addEventListener('input', drawPreview);
    f.name.addEventListener('input', drawPreview);
    f.coverUrl.addEventListener('change', () => { cover = f.coverUrl.value.trim(); drawPreview(); });
    f.file.addEventListener('change', async () => {
      const file = f.file.files[0];
      if (!file) return;
      try { cover = await resizeImage(file); f.coverUrl.value = ''; drawPreview(); } catch (e) { toastError(e); }
    });
    const err = h('p', { class: 'error-text', role: 'alert' });
    const d = dialog({
      title: crate ? 'Edit crate' : 'New crate',
      body: [
        field('Name', f.name),
        field('Description', f.description),
        h('datalist', { id: 'genre-list' }, state.genres.map((g) => h('option', { value: g.name }))),
        h('div', { class: 'grid-2' }, field('Genre', f.genre), field('Accent colour', f.accent)),
        h('div', { class: 'row', style: { 'align-items': 'flex-end' } }, preview, h('div', { class: 'grow stack' },
          field('Cover image URL', f.coverUrl, 'Or upload an image. Leave empty to use track artwork.'),
          h('div', { class: 'row' }, f.file, cover ? btn('Remove cover', () => { cover = ''; f.coverUrl.value = ''; f.file.value = ''; drawPreview(); }, { cls: 'sm ghost' }) : null))),
        err,
      ],
      actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn(crate ? 'Save' : 'Create crate', async () => {
        if (!f.name.value.trim()) { err.textContent = 'Give the crate a name.'; return f.name.focus(); }
        const body = { name: f.name.value, description: f.description.value, genre: f.genre.value, accent: f.accent.value, cover_url: cover };
        try {
          saved = crate ? await patch(`/api/crates/${crate.id}`, body) : await post('/api/crates', body);
          await refreshCrates();
          toast(crate ? 'Crate updated' : `Created “${saved.name}”`);
          d.close();
        } catch (e) { err.textContent = e.message; }
      }, { cls: 'primary' })],
      onClose: () => resolve(saved),
    });
  });
}

export async function deleteCrate(crate) {
  const ok = await confirmDialog({ title: `Delete “${crate.name}”?`, text: `The crate is removed. Its ${crate.track_count} track${crate.track_count === 1 ? '' : 's'} stay in your library and in any other crates.`, confirm: 'Delete crate' });
  if (!ok) return false;
  await del(`/api/crates/${crate.id}`);
  await Promise.all([refreshCrates(), state.tracks ? refreshTracks() : null]);
  toast('Crate deleted');
  return true;
}

export async function setStatus(ids, status) {
  const r = await post('/api/tracks/bulk', { ids, action: 'update', patch: { status } });
  r.tracks.forEach(upsertTrack);
  toast(`Marked ${ids.length} track${ids.length > 1 ? 's' : ''} as ${STATUSES.find(([k]) => k === status)[1]}`);
}

// ---------- files ----------
const IDB = 'cd-handles';
function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('h');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function getExportFolder() {
  try {
    const db = await idb();
    return await new Promise((res) => { const t = db.transaction('h').objectStore('h').get('export'); t.onsuccess = () => res(t.result || null); t.onerror = () => res(null); });
  } catch { return null; }
}
export async function setExportFolder(handle) {
  const db = await idb();
  await new Promise((res, rej) => { const t = db.transaction('h', 'readwrite').objectStore('h')[handle ? 'put' : 'delete'](handle || 'export', handle ? 'export' : undefined); t.onsuccess = res; t.onerror = () => rej(t.error); });
}
export const canPickFolder = typeof window.showDirectoryPicker === 'function';

/** Save into the chosen export folder when allowed, otherwise download. */
export async function saveFile(name, content, type) {
  const prefix = state.settings.exportPrefix ? `${state.settings.exportPrefix}-` : '';
  const filename = `${prefix}${name}`.replace(/[\\/:*?"<>|]+/g, '-');
  const folder = canPickFolder ? await getExportFolder() : null;
  if (folder) {
    try {
      let perm = await folder.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') perm = await folder.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        const fh = await folder.getFileHandle(filename, { create: true });
        const w = await fh.createWritable();
        await w.write(new Blob([content], { type }));
        await w.close();
        toast(`Saved ${filename} to ${folder.name}`);
        return;
      }
    } catch (e) { console.warn('Folder save failed, downloading instead', e); }
  }
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = h('a', { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  toast(`Downloaded ${filename}`);
}
const stamp = () => new Date().toISOString().slice(0, 10);
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tracks';

function withCrates(tracks) {
  return tracks.map((t) => ({ ...t, crates: (t.crates || []).map((c) => c.name) }));
}
export function exportCsv(tracks, name = 'tracks') {
  if (!tracks.length) return toast('Nothing to export', { kind: 'bad' });
  saveFile(`${slug(name)}-${stamp()}.csv`, toCsv(withCrates(tracks)), 'text/csv;charset=utf-8');
}

export function exportM3uDialog(tracks, name = 'playlist') {
  const r = reviewPlaylist(tracks, { musicDir: state.settings.musicDir });
  const body = [
    notice('An M3U8 playlist only points at audio files already on your computer. It does not download or move music. rekordbox can import it from File → Import → Import Playlist.', '', 'info'),
    h('p', null, h('strong', `${r.included.length} of ${tracks.length}`), ' tracks will be in the playlist.'),
  ];
  if (r.included.length) body.push(h('details', null, h('summary', 'Included tracks'), h('ul', { class: 'plain small stack', style: { gap: '4px', 'margin-top': '8px' } }, r.included.map((x) => h('li', null, trackName(x.track), h('div', { class: 'raw' }, x.path))))));
  if (r.excluded.length) {
    body.push(h('div', { class: 'stack' }, h('h3', `Excluded (${r.excluded.length})`),
      h('ul', { class: 'plain small stack scroll-list', style: { gap: '4px', 'max-height': '220px' } }, r.excluded.map((x) => h('li', { class: 'row between' }, h('span', { class: 'grow' }, trackName(x.track)), h('span', { class: 'chip warn' }, x.reason)))),
      h('p', { class: 'faint small' }, 'Excluded tracks are left out; no file paths are invented. Set paths on each track, or set your music folder in Settings for relative paths.')));
  }
  const d = dialog({
    title: `Export “${name}” as M3U8`,
    wide: true,
    body,
    actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn('Export M3U8', () => {
      saveFile(`${slug(name)}-${stamp()}.m3u8`, toM3u8(name, r.included), 'audio/x-mpegurl;charset=utf-8');
      d.close();
    }, { cls: 'primary', ico: 'download', disabled: !r.included.length })],
  });
}

export function shoppingDialog(tracks) {
  const groups = shoppingList(tracks, state.settings);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const d = dialog({
    title: 'Shopping list',
    wide: true,
    body: total ? groups.map((g) => h('section', { class: 'stack', style: { gap: '6px' } },
      h('h3', `${g.store} · ${g.items.length}`),
      h('ul', { class: 'plain stack', style: { gap: '4px' } }, g.items.map((it) => h('li', { class: 'row between' },
        h('span', { class: 'grow' }, trackName(it.track), it.track.label ? h('span', { class: 'faint' }, ` · ${it.track.label}`) : null),
        it.link ? extLink(h('span', { class: 'row' }, it.linkKind === 'search' ? 'Search' : 'Open', icon('ext')), it.link, { class: 'btn sm' }) : h('span', { class: 'faint small' }, 'No link')))))) : [h('p', { class: 'muted' }, 'No wishlist tracks in this selection.')],
    actions: [
      btn('Close', () => d.close(), { cls: 'ghost' }),
      btn('Copy as text', () => navigator.clipboard.writeText(shoppingText(groups)).then(() => toast('Copied'), () => toast('Copy failed', { kind: 'bad' })), { ico: 'copy', disabled: !total }),
      btn('Download', () => saveFile(`shopping-list-${stamp()}.txt`, shoppingText(groups), 'text/plain;charset=utf-8'), { cls: 'primary', ico: 'download', disabled: !total }),
    ],
  });
}
