import { h, clear, btn, link, field, input, select, toast, toastError, confirmDialog, notice, pbadge, extLink, icon } from '../ui.js';
import { get, post, patch, del } from '../api.js';
import { state, setSettings, refreshAll } from '../state.js';
import { GROUPS, TOGGLEABLE, MARKETS } from '/shared/platforms.js';
import { saveFile, canPickFolder, getExportFolder, setExportFolder, shoppingDialog } from '../actions.js';
import { ensureTracks } from '../state.js';

const FORMATS = ['WAV', 'AIFF', 'FLAC', 'ALAC', 'MP3 320', 'AAC', 'Vinyl'];

export async function render(root) {
  const s = state.settings;
  async function save(p, msg = 'Settings saved') {
    try { const r = await patch('/api/settings', p); setSettings(r.settings, r.integrations); toast(msg); return true; } catch (e) { toastError(e); return false; }
  }

  const sections = [
    ['platforms', 'Platforms'], ['market', 'Region and formats'], ['dj', 'DJ preferences'], ['integrations', 'Integrations'],
    ['export', 'Export and rekordbox'], ['appearance', 'Appearance'], ['data', 'Data'], ['account', 'Account'],
  ];

  // ---- platforms
  const off = new Set(s.disabledPlatforms);
  const platforms = h('section', { id: 'platforms', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'Platforms'), h('p', null, 'Choose which destinations appear in searches. Grouped by what they are for.'))),
    GROUPS.map((g) => h('div', { class: 'stack', style: { gap: '8px' } }, h('h3', { class: 'small muted' }, g.name),
      h('div', { class: 'toggle-list' }, TOGGLEABLE.filter((p) => p.group === g.id).map((p) => {
        const st = state.integrations[p.id]?.state || p.integration;
        return h('label', null,
          h('input', { type: 'checkbox', checked: !off.has(p.id), onchange: async (e) => { if (e.target.checked) off.delete(p.id); else off.add(p.id); await save({ disabledPlatforms: [...off] }, `${p.name} ${e.target.checked ? 'shown' : 'hidden'}`); } }),
          pbadge(p.id),
          h('span', { class: 'grow' }, h('span', null, p.name), h('span', { class: 'faint small' }, st === 'live' || st === 'api' ? 'Results in app' : st === 'needs-key' || st === 'api-key' ? 'Results with your key' : 'Search link')));
      })))));

  // ---- market & formats
  const marketSel = select(MARKETS.map((m) => [m.id, `${m.name}${m.qobuz ? '' : ' (no Qobuz store)'}`]), s.market, { onchange: (e) => save({ market: e.target.value }, 'Region saved') });
  const fmts = new Set(s.formats);
  const market = h('section', { id: 'market', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'Region and formats'))),
    field('Purchase region', marketSel, 'Used for Qobuz and Apple Music links and Apple Music results, so you are not sent to the wrong country’s store.'),
    field('Preferred download formats', h('div', { class: 'chips' }, FORMATS.map((f) => h('label', { class: 'check chip' }, h('input', { type: 'checkbox', checked: fmts.has(f), onchange: (e) => { if (e.target.checked) fmts.add(f); else fmts.delete(f); save({ formats: FORMATS.filter((x) => fmts.has(x)) }, 'Formats saved'); } }), f))), 'Offered first when you record a purchase or file format.'));

  // ---- DJ
  const tol = h('input', { type: 'number', min: 0.5, max: 20, step: 0.5, value: s.bpmTolerance });
  tol.addEventListener('change', () => save({ bpmTolerance: Number(tol.value) }, 'BPM tolerance saved'));
  const dj = h('section', { id: 'dj', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'DJ preferences'))),
    h('div', { class: 'grid-2' },
      field('Default BPM tolerance (%)', tol, 'Default 6%. Half- and double-time matches are always shown as such.'),
      field('Key notation', select([['camelot', 'Camelot (8A)'], ['openkey', 'Open Key (1m)'], ['musical', 'Musical (A minor)']], s.keyNotation, { onchange: (e) => save({ keyNotation: e.target.value }, 'Key notation saved') }), 'Keys are stored as Camelot and shown in your notation.')));

  // ---- integrations
  const integ = h('section', { id: 'integrations', class: 'card stack' });
  const drawInteg = () => {
    const st = state.integrations;
    const keyField = (k, label, help, url) => {
      const has = state.settings[k] === '••••';
      const inp = input({ type: 'password', placeholder: has ? 'Saved — type to replace' : 'Paste here', autocomplete: 'off', spellcheck: 'false' });
      return h('div', { class: 'stack', style: { gap: '6px' } },
        h('div', { class: 'row' }, h('div', { class: 'grow' }, field(label, inp, help)),
          btn(has ? 'Replace' : 'Save', async () => { if (!inp.value.trim()) return inp.focus(); if (await save({ [k]: inp.value.trim() }, `${label} saved`)) drawInteg(); }, { cls: 'sm primary' }),
          has ? btn('Remove', async () => { if (await save({ [k]: '' }, `${label} removed`)) drawInteg(); }, { cls: 'sm ghost danger' }) : null),
        extLink(h('span', { class: 'row small' }, 'Get one', icon('ext')), url, { class: 'small' }));
    };
    clear(integ,
      h('div', { class: 'card-head' }, h('div', null, h('h2', 'Integrations'), h('p', null, 'What the app can read directly. Everything else is an external search link.'))),
      h('div', { class: 'list' }, Object.entries(st).map(([id, v]) => h('div', { class: 'list-item' }, pbadge(id), h('div', { class: 'grow' }, h('div', { class: 't1' }, TOGGLEABLE.find((p) => p.id === id)?.name || id), h('div', { class: 'small muted' }, v.note)),
        h('span', { class: ['badge-kind', v.state === 'live' ? 'kind-live' : v.state === 'needs-key' ? 'kind-key' : 'kind-link'] }, v.state === 'live' ? 'Connected' : v.state === 'needs-key' ? 'Needs key' : 'Link only')))),
      keyField('discogsToken', 'Discogs personal access token', 'Enables Discogs search and style browsing. Stored on the server for your account only, never exported in backups.', 'https://www.discogs.com/settings/developers'),
      keyField('lastfmKey', 'Last.fm API key', 'Enables similar artists, related tracks and tag charts.', 'https://www.last.fm/api/account/create'),
      notice('Spotify, SoundCloud and Beatport searches need an approved developer app and sign-in, so they are offered as links rather than in-app results.', '', 'info'));
  };
  drawInteg();

  // ---- export & rekordbox
  const musicDir = input({ value: s.musicDir, placeholder: 'D:\\Music  or  /Users/you/Music', class: 'mono', spellcheck: 'false' });
  musicDir.addEventListener('change', () => save({ musicDir: musicDir.value }, 'Music folder saved'));
  const prefix = input({ value: s.exportPrefix, maxlength: 40 });
  prefix.addEventListener('change', () => save({ exportPrefix: prefix.value }, 'File name prefix saved'));
  const folderInfo = h('span', { class: 'small muted' });
  const drawFolder = async () => {
    const f = canPickFolder ? await getExportFolder() : null;
    clear(folderInfo, canPickFolder ? (f ? ['Exports are written to ', h('strong', f.name), '. '] : 'Exports go to your browser’s downloads folder. ') : 'This browser saves exports to its downloads folder. Chrome and Edge can save to a chosen folder.');
  };
  drawFolder();
  const exportSec = h('section', { id: 'export', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'Export and rekordbox'))),
    notice([h('strong', 'How playlists work. '), 'An M3U8 playlist lists paths to audio files that are already on your computer. It does not download, copy or move music. In rekordbox use File → Import → Import Playlist, and only tracks marked ', h('strong', 'In Library'), ' with a file path are included. You can review what is left out before every export.'], '', 'info'),
    field('Local music folder', musicDir, 'Track file paths that are not absolute are joined to this folder. The app cannot see your drive, so check paths are correct.'),
    h('div', { class: 'grid-2' },
      h('div', { class: 'stack', style: { gap: '6px' } }, h('span', { class: 'small', style: { 'font-family': 'var(--font-display)', 'font-weight': '500', color: 'var(--text-2)' } }, 'Default export folder'), folderInfo,
        canPickFolder ? h('div', { class: 'row' }, btn('Choose folder', async () => {
          try { const hd = await window.showDirectoryPicker({ id: 'cd-export', mode: 'readwrite' }); await setExportFolder(hd); drawFolder(); toast(`Exports will be saved to ${hd.name}`); } catch (e) { if (e.name !== 'AbortError') toastError(e); }
        }, { cls: 'sm', ico: 'folder' }), btn('Use downloads', async () => { await setExportFolder(null); drawFolder(); toast('Exports will download'); }, { cls: 'sm ghost' })) : null),
      field('File name prefix', prefix, 'Added to the start of exported file names.')),
    h('div', { class: 'row' },
      link('Export crate playlists', '/crates', { class: 'btn sm' }),
      btn('Wishlist shopping list', async () => shoppingDialog(await ensureTracks()), { cls: 'sm' }),
      link('Review tracks missing file paths', '/library?view=in_library', { class: 'btn sm ghost' })),
    h('p', { class: 'faint small' }, 'rekordbox XML export is not offered yet: it will only be added once it has been tested against real rekordbox libraries. A future local companion app could analyse BPM and key, match files and read rekordbox XML; the browser cannot do those things today.'));

  // ---- appearance
  const appearance = h('section', { id: 'appearance', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'Appearance'))),
    field('Theme', select([['dark', 'Dark'], ['light', 'Light'], ['system', 'Match my system']], s.theme, { onchange: (e) => save({ theme: e.target.value }, 'Theme saved') })));

  // ---- data
  const restoreFile = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr', id: 'restore-file' });
  restoreFile.addEventListener('change', async () => {
    const f = restoreFile.files[0];
    restoreFile.value = '';
    if (!f) return;
    let data;
    try { data = JSON.parse(await f.text()); } catch { return toast('That file is not valid JSON', { kind: 'bad' }); }
    if (data?.app !== 'y2r-crate-digger') return toast('That file is not a y2r Crate Digger backup', { kind: 'bad' });
    const n = (k) => (Array.isArray(data[k]) ? data[k].length : 0);
    if (!await confirmDialog({ title: 'Restore this backup?', text: `Backup from ${new Date(data.exported_at).toLocaleString()} with ${n('tracks')} tracks, ${n('crates')} crates and ${n('tracklists')} tracklists. Everything currently in your collection is replaced. Download a backup first if you might need it.`, confirm: 'Replace and restore' })) return;
    try {
      const r = await post('/api/restore', data);
      await refreshAll();
      const b = await get('/api/bootstrap'); setSettings(b.settings, b.integrations);
      toast(`Restored ${r.tracks} tracks and ${r.crates} crates`);
      drawData();
    } catch (e) { toastError(e); }
  });
  const data = h('section', { id: 'data', class: 'card stack' });
  const drawData = () => {
    const st = state.stats;
    const hasSample = st.samples || st.sample_crates || st.sample_tracklists;
    clear(data,
      h('div', { class: 'card-head' }, h('div', null, h('h2', 'Data'), h('p', null, `${st.tracks} tracks · ${st.crates} crates · ${st.tracklists} tracklists, stored on this server.`))),
      h('div', { class: 'row' },
        btn('Download backup', async () => {
          try { const b = await get('/api/backup'); await saveFile(`backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b, null, 2), 'application/json'); } catch (e) { toastError(e); }
        }, { cls: 'primary', ico: 'download' }),
        h('label', { for: 'restore-file', class: 'btn', tabindex: '0', onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restoreFile.click(); } } }, icon('upload'), 'Restore from backup'), restoreFile),
      h('p', { class: 'faint small' }, 'Backups include tracks, crates, metadata, tags, tracklists with their original text, discovery trails and settings. API keys are left out.'),
      h('hr', { style: { border: 0, 'border-top': '1px solid var(--border)', width: '100%' } }),
      h('div', { class: 'stack', style: { gap: '8px' } }, h('h3', 'Sample content'),
        h('p', { class: 'muted small' }, 'A small set of clearly labelled, made-up tracks, a crate and a tracklist for trying the app. They are not real releases.'),
        h('div', { class: 'row' }, hasSample
          ? btn('Remove sample content', async () => {
            if (!await confirmDialog({ title: 'Remove sample content?', text: 'Sample tracks, the sample crate and the sample tracklist are deleted. Your own data is untouched.', confirm: 'Remove samples' })) return;
            try { await del('/api/sample'); await refreshAll(); toast('Sample content removed'); drawData(); } catch (e) { toastError(e); }
          }, { cls: '' })
          : btn('Load sample content', async () => { try { await post('/api/sample'); await refreshAll(); toast('Sample content loaded'); drawData(); } catch (e) { toastError(e); } }))),
      h('hr', { style: { border: 0, 'border-top': '1px solid var(--border)', width: '100%' } }),
      h('div', { class: 'stack', style: { gap: '8px' } }, h('h3', 'Delete all collection data'),
        h('p', { class: 'muted small' }, 'Deletes every track, crate and tracklist. Your account and settings remain.'),
        h('div', null, btn('Delete all data', async () => {
          if (!await confirmDialog({ title: 'Delete your whole collection?', text: 'All tracks, crates, tracklists, notes and purchase records are permanently deleted.', confirm: 'Delete everything', typeToConfirm: 'DELETE' })) return;
          try { await post('/api/data/delete-all', { confirm: 'DELETE' }); await refreshAll(); toast('Collection deleted'); drawData(); } catch (e) { toastError(e); }
        }, { cls: 'danger', ico: 'trash' }))));
  };
  drawData();

  // ---- account
  const cur = input({ type: 'password', autocomplete: 'current-password' });
  const next = input({ type: 'password', autocomplete: 'new-password', minlength: 8 });
  const account = h('section', { id: 'account', class: 'card stack' },
    h('div', { class: 'card-head' }, h('div', null, h('h2', 'Account'), h('p', null, `Signed in as ${state.user.username}.`))),
    h('form', { class: 'stack', onsubmit: async (e) => {
      e.preventDefault();
      try { await post('/api/account/password', { current: cur.value, next: next.value }); cur.value = ''; next.value = ''; toast('Password changed'); } catch (err) { toastError(err); }
    } }, h('h3', 'Change password'), h('div', { class: 'grid-2' }, field('Current password', cur), field('New password', next, 'At least 8 characters.')), h('div', null, btn('Change password', null, { type: 'submit', cls: 'sm' }))),
    h('div', { class: 'row' },
      btn('Sign out', async () => { await post('/api/logout'); location.href = '/'; }, { ico: 'user' }),
      btn('Delete account', async () => {
        const pw = input({ type: 'password', autocomplete: 'current-password', 'aria-label': 'Password' });
        if (!await confirmDialog({ title: 'Delete your account?', text: h('div', { class: 'stack' }, h('p', 'Your account and entire collection are permanently deleted. Download a backup first if you want to keep anything.'), field('Password', pw)), confirm: 'Delete account', typeToConfirm: 'DELETE' })) return;
        try { await post('/api/account/delete', { password: pw.value }); location.href = '/'; } catch (err) { toastError(err); }
      }, { cls: 'ghost danger' })));

  root.append(
    h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Settings'), h('h1', 'Settings'))),
    h('div', { class: 'settings-grid' },
      h('nav', { class: 'settings-nav', 'aria-label': 'Settings sections' }, sections.map(([id, label]) => h('a', { href: `#${id}`, onclick: (e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); history.replaceState({}, '', `#${id}`); } }, label))),
      h('div', { class: 'stack-lg' }, platforms, market, dj, integ, exportSec, appearance, data, account)));
  if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView());
}
