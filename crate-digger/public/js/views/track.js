import { h, clear, btn, icon, link, extLink, art, field, input, select, toast, toastError, confirmDialog, fmtDate, fmtDuration, energyDots, notice, trackName, pbadge, dialog } from '../ui.js';
import { get, patch, post, del, put, qs } from '../api.js';
import { state, upsertTrack, removeTracks, refreshCrates } from '../state.js';
import { navigate } from '../router.js';
import { STATUSES, statusLabel } from '/shared/export.js';
import { formatKey, camelotToOpenKey, camelotToMusical } from '/shared/camelot.js';
import { searchQuery } from '/shared/normalize.js';
import { platformName } from '/shared/platforms.js';
import { destinations } from './discover.js';
import { stepHref } from './explore.js';
import { statusPill } from '../tracktable.js';

const FIELDS = ['artist', 'title', 'version', 'remixer', 'label', 'release', 'year', 'genre', 'bpm', 'musical_key', 'energy', 'status', 'source', 'source_url', 'store', 'store_url', 'file_path', 'file_format', 'artwork_url', 'notes'];

export async function render(root, { params }) {
  const id = Number(params[0]);
  let t = await get(`/api/tracks/${id}`);
  const draw = () => {
    clear(root);
    root.append(
      h('p', { class: 'eyebrow' }, link('Library', '/library'), t.is_sample ? h('span', { class: 'badge-kind kind-sample', style: { 'margin-left': '8px' } }, 'Sample content') : null),
      h('div', { class: 'detail' }, side(), mainCol()));
  };

  const reload = async () => { t = await get(`/api/tracks/${id}`); upsertTrack(t); draw(); };

  function side() {
    return h('aside', { class: 'detail-side' },
      art(t.artwork_url, { size: 'lg', alt: `${trackName(t)} artwork` }),
      t.artwork_url ? h('p', { class: 'faint small' }, `Artwork: ${t.artwork_source || 'link'}`) : h('p', { class: 'faint small' }, 'No artwork. Add an image URL from the release page if you like.'),
      h('div', { class: 'stack', style: { gap: '6px' } },
        link(h('span', { class: 'row' }, icon('match'), 'Find compatible tracks'), `/match/${t.id}`, { class: 'btn primary' }),
        t.artist ? link(h('span', { class: 'row' }, icon('explore'), 'Explore track'), `/explore/track?${qs({ artist: t.artist, title: t.title, mbid: t.external_ids?.musicbrainz })}`, { class: 'btn' }) : null,
        btn('Delete track', async () => {
          if (!await confirmDialog({ title: `Delete “${t.title}”?`, text: 'It is removed from your library and all crates, with notes, sources and purchase records. This cannot be undone.', confirm: 'Delete track' })) return;
          try { await del(`/api/tracks/${t.id}`); removeTracks([t.id]); await refreshCrates(); toast('Track deleted'); navigate('/library'); } catch (e) { toastError(e); }
        }, { cls: 'ghost danger', ico: 'trash' })));
  }

  function facts() {
    const fact = (k, v, extra) => h('div', { class: 'fact' }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v || h('span', { class: 'faint' }, '—'), extra));
    const est = (k) => (t.provenance?.[k] === 'estimated' ? h('span', { class: 'badge-kind kind-est', style: { 'margin-left': '6px' } }, 'est.') : null);
    return h('div', { class: 'facts' },
      fact('BPM', t.bpm ? h('span', { class: 'num' }, t.bpm) : null, est('bpm')),
      fact('Camelot', t.camelot ? h('span', { class: 'mono' }, t.camelot) : null, est('camelot')),
      fact('Key', t.camelot ? camelotToMusical(t.camelot) : null),
      fact('Open Key', t.camelot ? h('span', { class: 'mono' }, camelotToOpenKey(t.camelot)) : null),
      fact('Energy', energyDots(t.energy)),
      fact('Status', statusPill(t.status)),
      fact('Duration', t.duration_ms ? h('span', { class: 'num' }, fmtDuration(t.duration_ms)) : null),
      fact('Year', t.year));
  }

  function mainCol() {
    return h('div', { class: 'stack-lg' },
      h('header', null,
        h('h1', t.title, t.version ? h('span', { class: 'muted' }, ` (${t.version})`) : null),
        h('p', { class: 'artist-line' }, t.artist ? link(t.artist, `/explore/artist?${qs({ name: t.artist })}`) : 'Unknown artist',
          t.featured?.length ? [' feat. ', t.featured.flatMap((f, i) => [i ? ', ' : '', link(f, `/explore/artist?${qs({ name: f })}`)])] : null,
          t.remixer ? [' · remix by ', link(t.remixer, `/explore/artist?${qs({ name: t.remixer })}`)] : null),
        h('p', { class: 'muted', style: { 'margin-top': '6px' } },
          [t.label ? link(t.label, `/explore/label?${qs({ name: t.label })}`) : null, t.release || null, t.genre ? link(t.genre, `/explore/genre?${qs({ name: t.genre })}`) : null]
            .filter(Boolean).flatMap((x, i) => (i ? [' · ', x] : [x]))),
        t.tags.length ? h('div', { class: 'chips', style: { 'margin-top': '10px' } }, t.tags.map((g) => h('span', { class: 'chip' }, g))) : null),
      facts(),
      editForm(),
      cratesCard(),
      acquisitionCard(),
      trailCard(),
      relatedCard(),
      h('section', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', 'Find it on'), h('p', null, 'External searches, opened in a new tab.')), destinations(searchQuery(t), t)),
      sourcesCard(),
      historyCard());
  }

  function editForm() {
    const f = {
      artist: input({ value: t.artist }), title: input({ value: t.title, required: true }), version: input({ value: t.version }), remixer: input({ value: t.remixer }),
      featured: input({ value: (t.featured || []).join(', '), placeholder: 'Comma separated' }),
      label: input({ value: t.label, list: 'lbl-list' }), release: input({ value: t.release }), year: input({ value: t.year || '', inputmode: 'numeric', maxlength: 4 }),
      genre: input({ value: t.genre, list: 'gen-list' }),
      bpm: h('input', { type: 'number', step: '0.01', min: 40, max: 300, value: t.bpm ?? '', inputmode: 'decimal' }),
      bpm_est: h('input', { type: 'checkbox', checked: t.provenance?.bpm === 'estimated' }),
      musical_key: input({ value: t.camelot || t.musical_key || '', placeholder: 'Am, F# minor, 8A, 1m', autocomplete: 'off' }),
      key_est: h('input', { type: 'checkbox', checked: t.provenance?.camelot === 'estimated' }),
      energy: select([['', '—'], ...[1, 2, 3, 4, 5].map((n) => [n, `${n} ${['', 'Low', 'Warm', 'Steady', 'High', 'Peak'][n]}`])], t.energy ?? ''),
      status: select(STATUSES, t.status),
      source: input({ value: t.source }), source_url: input({ type: 'url', value: t.source_url }),
      source_confirmed: h('input', { type: 'checkbox', checked: t.source_confirmed }),
      store: input({ value: t.store, list: 'store-list2' }), store_url: input({ type: 'url', value: t.store_url }),
      file_path: input({ value: t.file_path, placeholder: state.settings.musicDir ? `Relative to ${state.settings.musicDir}, or a full path` : 'D:\\Music\\House\\track.aiff', class: 'mono', spellcheck: 'false' }),
      file_format: input({ value: t.file_format, list: 'fmt-list', placeholder: 'WAV, AIFF, FLAC, MP3 320' }),
      artwork_url: input({ type: 'url', value: t.artwork_url, placeholder: 'https://…' }),
      tags: input({ value: t.tags.join(', '), placeholder: 'Comma separated' }),
      notes: h('textarea', { rows: 3, value: t.notes }),
    };
    const keyHint = h('span', { class: 'field-hint' });
    const showKey = async () => {
      const v = f.musical_key.value.trim();
      if (!v) return (keyHint.textContent = 'Any notation. Stored as Camelot.');
      const { toCamelot } = await import('/shared/camelot.js');
      const c = toCamelot(v);
      keyHint.textContent = c ? `${c} · ${camelotToMusical(c)} · Open Key ${camelotToOpenKey(c)}` : 'Not recognised. Try “Am”, “F# minor” or “8A”.';
      keyHint.style.color = c ? '' : 'var(--bad)';
    };
    f.musical_key.addEventListener('input', showKey);
    showKey();
    const err = h('p', { class: 'error-text', role: 'alert' });
    const saveBtn = btn('Save changes', save, { cls: 'primary', ico: 'check' });
    async function save() {
      err.textContent = '';
      const next = {
        artist: f.artist.value, title: f.title.value, version: f.version.value, remixer: f.remixer.value, label: f.label.value, release: f.release.value, year: f.year.value,
        genre: f.genre.value, bpm: f.bpm.value, musical_key: f.musical_key.value, energy: f.energy.value, status: f.status.value, source: f.source.value,
        source_url: f.source_url.value, store: f.store.value, store_url: f.store_url.value, file_path: f.file_path.value, file_format: f.file_format.value,
        artwork_url: f.artwork_url.value, notes: f.notes.value,
      };
      const body = {};
      const curKey = t.camelot || t.musical_key || '';
      for (const k of FIELDS) {
        const cur = k === 'musical_key' ? curKey : t[k] ?? '';
        if (String(next[k] ?? '').trim() !== String(cur).trim()) body[k] = next[k];
      }
      if (body.musical_key !== undefined) { body.camelot = ''; }
      const tags = f.tags.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (tags.join('|') !== t.tags.join('|')) body.tags = tags;
      const feat = f.featured.value.split(',').map((x) => x.trim()).filter(Boolean);
      if (feat.join('|') !== (t.featured || []).join('|')) body.featured = feat;
      if (f.source_confirmed.checked !== t.source_confirmed) body.source_confirmed = f.source_confirmed.checked;
      const prov = { ...t.provenance };
      if (f.bpm.value) prov.bpm = f.bpm_est.checked ? 'estimated' : (body.bpm !== undefined || prov.bpm === 'estimated' ? 'manual' : prov.bpm || 'manual'); else delete prov.bpm;
      if (f.musical_key.value) prov.camelot = f.key_est.checked ? 'estimated' : (body.musical_key !== undefined || prov.camelot === 'estimated' ? 'manual' : prov.camelot || 'manual'); else delete prov.camelot;
      if (body.label !== undefined) prov.label = 'manual';
      if (JSON.stringify(prov) !== JSON.stringify(t.provenance || {})) body.provenance = prov;
      if (!Object.keys(body).length) return toast('No changes to save');
      saveBtn.disabled = true;
      try {
        const r = await patch(`/api/tracks/${t.id}`, body);
        upsertTrack(r);
        toast('Track updated');
        await reload();
      } catch (e) {
        err.textContent = e.message;
        if (e.data?.existingId) err.append(' ', link('Open the existing track', `/track/${e.data.existingId}`));
        saveBtn.disabled = false;
      }
    }
    const form = h('form', { class: 'card stack', 'aria-labelledby': 'edit-h', onsubmit: (e) => { e.preventDefault(); save(); } },
      h('div', { class: 'card-head' }, h('h2', { id: 'edit-h' }, 'Metadata'), h('p', null, 'Everything here can be changed at any time.')),
      h('datalist', { id: 'lbl-list' }),
      h('datalist', { id: 'gen-list' }, state.genres.map((g) => h('option', { value: g.name }))),
      h('datalist', { id: 'store-list2' }, ['Bandcamp', 'Beatport', 'Traxsource', 'Juno Download', 'Qobuz', 'Discogs', 'Apple Music'].map((s) => h('option', { value: s }))),
      h('datalist', { id: 'fmt-list' }, (state.settings.formats || []).concat(['WAV', 'AIFF', 'FLAC', 'ALAC', 'MP3 320', 'AAC', 'Vinyl']).filter((x, i, a) => a.indexOf(x) === i).map((s) => h('option', { value: s }))),
      h('div', { class: 'grid-3' }, field('Artist', f.artist), field('Title', f.title), field('Remix / version', f.version)),
      h('div', { class: 'grid-3' }, field('Remixer', f.remixer), field('Featured artists', f.featured), field('Genre', f.genre)),
      h('div', { class: 'grid-3' }, field('Label', f.label), field('Release', f.release), field('Year', f.year)),
      h('div', { class: 'grid-4' },
        h('div', { class: 'stack', style: { gap: '4px' } }, field('BPM', f.bpm), h('label', { class: 'check small muted' }, f.bpm_est, 'Estimated')),
        h('div', { class: 'stack', style: { gap: '4px' } }, h('label', { class: 'field' }, h('span', 'Key'), f.musical_key, keyHint), h('label', { class: 'check small muted' }, f.key_est, 'Estimated')),
        field('Energy', f.energy), field('Status', f.status)),
      h('div', { class: 'grid-3' }, field('Source', f.source, 'Where you found it'), field('Source link', f.source_url), h('label', { class: 'check small', style: { 'align-self': 'end', 'padding-bottom': '10px' } }, f.source_confirmed, 'Source confirmed')),
      h('div', { class: 'grid-2' }, field('Store', f.store, 'Where it can be bought'), field('Store link', f.store_url)),
      h('div', { class: 'grid-3' }, h('div', { style: { 'grid-column': 'span 2' } }, field('Local file path', f.file_path, 'Used for M3U8 playlists. The app never moves or reads your files.')), field('File format', f.file_format)),
      h('div', { class: 'grid-2' }, field('Artwork URL', f.artwork_url), field('Tags', f.tags)),
      field('Notes', f.notes),
      err,
      h('div', { class: 'row' }, saveBtn, btn('Reset', () => draw(), { cls: 'ghost' })));
    get('/api/names').then((n) => { form.querySelector('#lbl-list').replaceChildren(...n.labels.map((l) => h('option', { value: l }))); }).catch(() => {});
    return form;
  }

  function cratesCard() {
    const member = new Set(t.crates.map((c) => c.id));
    return h('section', { class: 'card stack' }, h('div', { class: 'card-head' }, h('h2', 'Crates'), h('p', null, 'Tick to add or remove. The track stays one record.')),
      state.crates.length ? h('div', { class: 'toggle-list' }, state.crates.map((c) => h('label', null,
        h('input', { type: 'checkbox', checked: member.has(c.id), onchange: async (e) => {
          try {
            if (e.target.checked) await post(`/api/crates/${c.id}/tracks`, { ids: [t.id] });
            else await post(`/api/crates/${c.id}/remove`, { ids: [t.id] });
            await refreshCrates();
            toast(e.target.checked ? `Added to ${c.name}` : `Removed from ${c.name}`);
            await reload();
          } catch (err) { toastError(err); e.target.checked = !e.target.checked; }
        } }),
        h('span', { style: { width: '9px', height: '9px', 'border-radius': '50%', background: c.accent, flex: 'none' } }),
        h('span', { class: 'grow' }, link(c.name, `/crates/${c.id}`))))) : h('p', { class: 'muted small' }, 'No crates yet. ', link('Create one', '/crates')));
  }

  function acquisitionCard() {
    const f = {
      platform: input({ value: t.store || '', list: 'store-list2', placeholder: 'Bandcamp' }),
      date: h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) }),
      price: h('input', { type: 'number', min: 0, step: '0.01', placeholder: '1.99' }),
      currency: input({ maxlength: 3, placeholder: 'EUR', value: t.acquisitions[0]?.currency || '' }),
      format: input({ list: 'fmt-list', value: t.file_format || '' }),
    };
    const markPurchased = h('input', { type: 'checkbox', checked: t.status === 'wishlist' });
    return h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', 'Acquisition'), h('p', null, 'Purchased, downloaded and in your DJ library are tracked separately.')),
      t.acquisitions.length ? h('div', { class: 'list' }, t.acquisitions.map((a) => h('div', { class: 'list-item' },
        icon('check'),
        h('div', { class: 'grow' }, h('div', { class: 't1' }, a.platform || 'Purchase'), h('div', { class: 'small muted' }, [a.purchased_at && fmtDate(a.purchased_at), a.price != null && `${a.price.toFixed(2)} ${a.currency}`.trim(), a.file_format].filter(Boolean).join(' · '))),
        btn('', async () => {
          if (!await confirmDialog({ title: 'Delete this purchase record?', text: 'Only the record is removed. The track status is unchanged.', confirm: 'Delete' })) return;
          try { await del(`/api/tracks/${t.id}/acquisitions/${a.id}`); await reload(); toast('Purchase record deleted'); } catch (e) { toastError(e); }
        }, { cls: 'sm icon ghost', ico: 'trash', title: 'Delete purchase record' })))) : h('p', { class: 'muted small' }, 'No purchases recorded.'),
      h('details', null, h('summary', { class: 'btn sm' }, 'Record a purchase'),
        h('form', { class: 'stack', style: { 'margin-top': '12px' }, onsubmit: async (e) => {
          e.preventDefault();
          try {
            await post(`/api/tracks/${t.id}/acquisitions`, { platform: f.platform.value, purchased_at: f.date.value, price: f.price.value, currency: f.currency.value, file_format: f.format.value });
            const p = {};
            if (markPurchased.checked && t.status === 'wishlist') p.status = 'purchased';
            if (f.format.value && !t.file_format) p.file_format = f.format.value;
            if (f.platform.value && !t.store) p.store = f.platform.value;
            if (Object.keys(p).length) await patch(`/api/tracks/${t.id}`, p);
            toast('Purchase recorded');
            await reload();
          } catch (err) { toastError(err); }
        } },
          h('div', { class: 'grid-4' }, field('Platform', f.platform), field('Date', f.date), field('Price', f.price), field('Currency', f.currency)),
          h('div', { class: 'grid-2' }, field('File format', f.format), t.status === 'wishlist' ? h('label', { class: 'check small', style: { 'align-self': 'end', 'padding-bottom': '10px' } }, markPurchased, 'Change status to Purchased') : h('span')),
          h('div', null, btn('Save purchase', null, { type: 'submit', cls: 'primary sm' })))));
  }

  function trailCard() {
    const steps = t.discovery;
    return h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', 'Discovery trail'), h('p', null, 'How you found this track.')),
      steps.length ? h('div', { class: 'trail' }, [...steps, { kind: 'track', label: trackName(t), current: true }].flatMap((s, i) => [
        i ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→') : null,
        s.current ? h('span', { class: 'step current' }, h('span', { class: 'k' }, 'this track'), s.label)
          : stepHref(s) ? (stepHref(s).startsWith('http') ? extLink([h('span', { class: 'k' }, s.kind), s.label], stepHref(s), { class: 'step' }) : link([h('span', { class: 'k' }, s.kind), s.label], stepHref(s), { class: 'step' }))
            : h('span', { class: 'step' }, h('span', { class: 'k' }, s.kind), s.label)])) : h('p', { class: 'muted small' }, 'No trail recorded.'),
      t.discovered_from_here.length ? h('div', { class: 'stack', style: { gap: '4px' } }, h('h3', 'Led you to'), h('div', { class: 'chips' }, t.discovered_from_here.map((x) => link(trackName(x), `/track/${x.id}`, { class: 'chip' })))) : null,
      h('div', { class: 'row' }, btn('Edit trail', editTrail, { cls: 'sm', ico: 'edit' })));
  }
  function editTrail() {
    const steps = t.discovery.map((s) => ({ ...s }));
    const list = h('div', { class: 'stack' });
    const kinds = [['search', 'Search'], ['url', 'Link'], ['tracklist', 'Tracklist'], ['track', 'Track'], ['artist', 'Artist'], ['label', 'Label'], ['release', 'Release'], ['genre', 'Genre']];
    const drawList = () => clear(list, steps.map((s, i) => h('div', { class: 'row' },
      select(kinds, s.kind, { 'aria-label': `Step ${i + 1} type`, onchange: (e) => { s.kind = e.target.value; } }),
      h('div', { class: 'grow' }, input({ value: s.label, 'aria-label': `Step ${i + 1}`, oninput: (e) => { s.label = e.target.value; } })),
      btn('', () => { steps.splice(i, 1); drawList(); }, { cls: 'sm icon ghost', ico: 'x', title: 'Remove step' }))),
    btn('Add step', () => { steps.push({ kind: 'artist', label: '' }); drawList(); }, { cls: 'sm', ico: 'plus' }));
    const tracks = (state.tracks || []).filter((x) => x.id !== t.id);
    const fromSel = select([['', 'Link to a saved track…'], ...tracks.slice(0, 500).map((x) => [x.id, trackName(x)])], '', { 'aria-label': 'Discovered from a saved track', onchange: (e) => {
      const x = tracks.find((y) => y.id === Number(e.target.value));
      if (x) { steps.push({ kind: 'track', label: `${x.artist} - ${x.title}`, ref: String(x.id) }); drawList(); e.target.value = ''; }
    } });
    drawList();
    const d = dialog({ title: 'Edit discovery trail', body: [h('p', { class: 'muted small' }, 'Steps run from where you started to this track. Linking a saved track builds the discovery graph.'), list, fromSel],
      actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn('Save trail', async () => {
        try { await put(`/api/tracks/${t.id}/discovery`, { steps: steps.filter((s) => s.label.trim()) }); d.close(); await reload(); toast('Trail saved'); } catch (e) { toastError(e); }
      }, { cls: 'primary' })] });
  }

  function relatedCard() {
    const row = (x) => h('div', { class: 'list-item' }, art(x.artwork_url, { size: 'sm' }), h('div', { class: 'grow' }, link(h('span', { class: 't1' }, x.title, x.version ? ` (${x.version})` : ''), `/track/${x.id}`), h('div', { class: 'small muted' }, x.artist)));
    return h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', 'Related in your library')),
      h('div', { class: 'grid-2' },
        h('div', null, h('h3', { class: 'small muted' }, t.artist ? `More from ${t.artist}` : 'Same artist'), t.same_artist.length ? h('div', { class: 'list' }, t.same_artist.map(row)) : h('p', { class: 'faint small' }, 'None saved.'),
          t.artist ? link(`Explore ${t.artist} →`, `/explore/artist?${qs({ name: t.artist })}`, { class: 'small' }) : null),
        h('div', null, h('h3', { class: 'small muted' }, t.label ? `More on ${t.label}` : 'Same label'), t.same_label.length ? h('div', { class: 'list' }, t.same_label.map(row)) : h('p', { class: 'faint small' }, 'None saved.'),
          t.label ? link(`Explore ${t.label} →`, `/explore/label?${qs({ name: t.label })}`, { class: 'small' }) : null)));
  }

  function sourcesCard() {
    return h('section', { class: 'card stack' },
      h('div', { class: 'card-head' }, h('h2', 'Sources'), h('p', null, 'Results and links this track was saved from.')),
      t.sources.length ? h('div', { class: 'list' }, t.sources.map((s) => h('div', { class: 'list-item' }, pbadge(s.platform), h('div', { class: 'grow' }, h('div', { class: 't1' }, platformName(s.platform)), s.url ? extLink(s.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 70), s.url, { class: 'small' }) : null),
        h('span', { class: 'faint small' }, fmtDate(s.created_at)),
        btn('', async () => { try { t = await del(`/api/tracks/${t.id}/sources/${s.id}`); draw(); toast('Source removed'); } catch (e) { toastError(e); } }, { cls: 'sm icon ghost', ico: 'x', title: 'Remove source' })))) : h('p', { class: 'muted small' }, 'No linked sources.'),
      t.tracklists.length ? h('p', { class: 'small' }, 'In tracklists: ', t.tracklists.flatMap((x, i) => [i ? ', ' : '', link(x.title, `/tracklists/${x.id}`)])) : null);
  }

  function historyCard() {
    return h('section', { class: 'card stack' }, h('h2', 'History'),
      h('ul', { class: 'plain timeline' },
        t.status_history.map((s) => h('li', null, h('span', { class: 'faint nowrap' }, fmtDate(s.changed_at, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })), h('span', null, `Status: ${statusLabel(s.status)}`))),
        h('li', null, h('span', { class: 'faint nowrap' }, fmtDate(t.created_at)), h('span', null, 'Added to library'))));
  }

  draw();
}

export { formatKey, notice };
