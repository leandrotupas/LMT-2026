import { h, clear, btn, icon, link, extLink, art, notice, skeleton, empty, input, toast, toastError, confirmDialog, pbadge, dialog, field } from '../ui.js';
import { get, post, patch, del, qs } from '../api.js';
import { state, refreshGenres, pushTrail, getTrail, startTrail, subscribe } from '../state.js';
import { navigate } from '../router.js';
import { buildLinks } from '/shared/platforms.js';
import { parseTrackLine } from '/shared/normalize.js';
import { saveTrackDialog } from '../actions.js';
import { trackCollection } from '../tracktable.js';

const TABS = [['track', 'Track'], ['artist', 'Artist'], ['label', 'Label'], ['genre', 'Genre']];

export async function render(root, { params, query }) {
  const kind = TABS.some(([k]) => k === params[0]) ? params[0] : null;
  root.append(
    h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, 'Explore'), h('h1', heading(kind, query)), h('p', 'Branch out from one discovery: artists, remixers, labels, releases and genres.'))),
    h('nav', { class: 'tabs', 'aria-label': 'Explore by' }, TABS.map(([k, l]) => link(l, `/explore/${k}`, { 'aria-current': k === (kind || 'artist') ? 'page' : null }))),
    trailBar());
  const body = h('div');
  root.append(body);
  const unsub = subscribe((w) => { if (w === 'trail') root.querySelector('.trail-bar')?.replaceWith(trailBar()); });
  try {
    if (kind === 'artist' && (query.get('name') || query.get('mbid'))) await artistPage(body, query);
    else if (kind === 'label' && (query.get('name') || query.get('mbid'))) await labelPage(body, query);
    else if (kind === 'track' && (query.get('title') || query.get('mbid'))) await trackPage(body, query);
    else if (kind === 'genre' && query.get('name')) await genrePage(body, query.get('name'));
    else if (kind === 'genre') await genreIndex(body);
    else searchForm(body, kind || 'artist');
  } catch (e) {
    clear(body, notice(e.message, 'bad', 'warn'));
  }
  return unsub;
}

function heading(kind, q) {
  if (kind === 'artist' && q.get('name')) return q.get('name');
  if (kind === 'label' && q.get('name')) return q.get('name');
  if (kind === 'track' && q.get('title')) return `${q.get('artist') ? `${q.get('artist')} – ` : ''}${q.get('title')}`;
  if (kind === 'genre' && q.get('name')) return q.get('name');
  return kind === 'genre' ? 'Genres' : 'Explore';
}

function trailBar() {
  const t = getTrail();
  if (!t.length) return h('div', { class: 'trail-bar' });
  return h('div', { class: 'trail-bar row', style: { 'margin-bottom': '18px' } },
    h('span', { class: 'faint small' }, 'Your trail:'),
    h('div', { class: 'trail' }, t.flatMap((s, i) => [i ? h('span', { class: 'arrow', 'aria-hidden': 'true' }, '→') : null,
      stepHref(s) ? link([h('span', { class: 'k' }, s.kind), s.label], stepHref(s), { class: ['step', i === t.length - 1 ? 'current' : ''] }) : h('span', { class: 'step' }, h('span', { class: 'k' }, s.kind), s.label)])),
    btn('Clear', () => startTrail(null), { cls: 'ghost sm' }));
}
export function stepHref(s) {
  switch (s.kind) {
    case 'artist': return `/explore/artist?${qs({ name: s.label })}`;
    case 'label': return `/explore/label?${qs({ name: s.label })}`;
    case 'genre': return `/explore/genre?${qs({ name: s.label })}`;
    case 'track': {
      if (/^\d+$/.test(s.ref || '')) return `/track/${s.ref}`;
      const p = parseTrackLine(s.label);
      return `/explore/track?${qs({ artist: p.artist, title: p.title })}`;
    }
    case 'tracklist': return s.ref ? `/tracklists/${s.ref}` : null;
    case 'search': return `/discover?${qs({ q: s.label })}`;
    case 'url': return s.ref ? `/discover?${qs({ q: s.ref })}` : null;
    case 'release': return s.ref ? `https://musicbrainz.org/release/${s.ref}` : null;
    default: return null;
  }
}

function searchForm(body, kind) {
  const a = input({ placeholder: kind === 'track' ? 'Artist' : kind === 'label' ? 'Label name, e.g. Ninja Tune' : 'Artist name', 'aria-label': kind === 'track' ? 'Artist' : `${kind} name` });
  const t = input({ placeholder: 'Track title', 'aria-label': 'Track title' });
  const go = () => {
    if (kind === 'track') {
      if (!t.value.trim()) return t.focus();
      const p = !a.value.trim() ? parseTrackLine(t.value) : { artist: a.value.trim(), title: t.value.trim() };
      navigate(`/explore/track?${qs({ artist: p.artist, title: p.title })}`);
    } else {
      if (!a.value.trim()) return a.focus();
      navigate(`/explore/${kind}?${qs({ name: a.value.trim() })}`);
    }
  };
  clear(body, h('form', { class: 'card stack', onsubmit: (e) => { e.preventDefault(); go(); } },
    h('h2', kind === 'track' ? 'Explore a track' : kind === 'label' ? 'Explore a record label' : 'Explore an artist'),
    h('div', { class: kind === 'track' ? 'grid-2' : '' }, a, kind === 'track' ? t : null),
    h('div', { class: 'row' }, btn('Explore', null, { cls: 'primary', type: 'submit', ico: 'explore' })),
    h('p', { class: 'faint small' }, 'Data comes from MusicBrainz (and Discogs and Last.fm where available). Lookups are rate-limited to one per second, so pages can take a few seconds.')));
  a.focus();
}

const itemArtist = (name, sub) => h('div', { class: 'list-item' }, icon('user'), h('div', { class: 'grow' }, link(h('span', { class: 't1' }, name), `/explore/artist?${qs({ name })}`), sub ? h('div', { class: 'small muted' }, sub) : null));
const itemLabel = (name, sub) => h('div', { class: 'list-item' }, icon('disc'), h('div', { class: 'grow' }, link(h('span', { class: 't1' }, name), `/explore/label?${qs({ name })}`), sub ? h('div', { class: 'small muted' }, sub) : null));

function linksCard(name, kind) {
  const groups = buildLinks(name, { kind, settings: state.settings });
  return h('section', { class: 'card stack' }, h('h3', 'Find on platforms'), h('p', { class: 'faint small' }, 'External searches, opened in a new tab.'),
    h('div', { class: 'dest-list' }, groups.flatMap((g) => g.links).filter((l, i, arr) => arr.findIndex((x) => x.platform === l.platform) === i).map((l) =>
      extLink([pbadge(l.id), h('span', null, l.name), h('span', { class: 'ext' }, icon('ext'))], l.href, { class: 'dest', 'aria-label': `${l.name} (new tab)` }))));
}
function profileLinks(links) {
  if (!links?.length) return null;
  return h('section', { class: 'card stack' }, h('h3', 'Official and profile links'), h('p', { class: 'faint small' }, 'Listed on MusicBrainz.'),
    h('div', { class: 'list' }, links.map((l) => h('div', { class: 'list-item' }, h('span', { class: 'chip solid' }, l.type), extLink(l.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 48), l.url, { class: 'small' })))));
}
function libraryCard(tracks, label) {
  if (!tracks?.length) return h('section', { class: 'card' }, h('h3', label), h('p', { class: 'muted small', style: { 'margin-top': '6px' } }, 'Nothing saved yet.'));
  return h('section', { class: 'card stack' }, h('h3', `${label} · ${tracks.length}`),
    h('div', { class: 'list' }, tracks.slice(0, 12).map((t) => h('div', { class: 'list-item' }, art(t.artwork_url, { size: 'sm' }), h('div', { class: 'grow' }, link(h('span', { class: 't1' }, t.title, t.version ? ` (${t.version})` : ''), `/track/${t.id}`), h('div', { class: 'small muted' }, t.artist))))));
}
function candidates(list, kind) {
  if (!list || list.length < 2) return null;
  return h('details', { class: 'small' }, h('summary', { class: 'muted' }, `Not the right ${kind}? ${list.length} matches`),
    h('div', { class: 'list' }, list.map((c) => h('div', { class: 'list-item' }, link(c.name, `/explore/${kind}?${qs({ name: c.name, mbid: c.id })}`), h('span', { class: 'faint' }, [c.disambiguation, c.country, c.type].filter(Boolean).join(' · '))))));
}
function errorsNote(errs) {
  return errs?.length ? notice(`Some details could not load: ${[...new Set(errs)].join(' ')}`, 'warn') : null;
}
function needsKey(service, what) {
  return notice([`${what} needs a ${service} ${service === 'Discogs' ? 'token' : 'API key'}. `, link('Add it in Settings', '/settings#integrations')], '', 'info');
}
function saveFromMb(t, extra = {}) {
  const p = parseTrackLine(`${t.artist} - ${t.title}`);
  return saveTrackDialog({ artist: p.artist, title: p.title, version: p.version, year: (t.date || '').slice(0, 4), release: t.release || '', source: 'MusicBrainz', source_url: t.url, external_ids: { musicbrainz: t.id }, ...extra },
    { sources: [{ platform: 'musicbrainz', url: t.url, external_id: t.id, kind: 'result', platformName: 'MusicBrainz' }] });
}
const loading = (body, what) => clear(body, h('div', { class: 'card stack' }, h('p', { class: 'muted row' }, h('span', { class: 'spinner' }), `Looking up ${what} on MusicBrainz…`), skeleton(4)));

// ---------------------------------------------------------------------------

async function artistPage(body, query) {
  loading(body, 'the artist');
  const a = await get(`/api/explore/artist?${qs({ name: query.get('name'), mbid: query.get('mbid') })}`);
  if (!a.found) return clear(body, h('div', { class: 'card stack' }, empty(`No artist called “${query.get('name')}” on MusicBrainz`, 'Check the spelling, or search the platforms below.'), linksCard(query.get('name'), 'artist'), libraryCard(a.library, 'In your library')));
  pushTrail({ kind: 'artist', label: a.name, ref: a.mbid });
  const [tab, setTab] = tabState(['tracks', 'discography', 'remixes', 'discogs']);
  const discog = h('div');
  const drawDiscog = () => {
    const panes = {
      tracks: a.tracks.length ? a.tracks.map((t) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, t.title), h('div', { class: 'small muted' }, [t.artist !== a.name ? t.artist : '', t.release, t.date].filter(Boolean).join(' · '))),
        link(icon('explore'), `/explore/track?${qs({ artist: t.artist, title: t.title, mbid: t.id })}`, { class: 'btn sm ghost icon', 'aria-label': `Explore ${t.title}`, title: 'Explore track' }), btn('', () => saveFromMb(t), { cls: 'sm icon', ico: 'plus', title: 'Save' }))) : [h('p', { class: 'muted' }, 'No recordings listed.')],
      discography: a.discography.length ? a.discography.map((d) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, d.title), h('div', { class: 'small muted' }, [d.type, d.date].filter(Boolean).join(' · '))), extLink(icon('ext'), d.url, { class: 'btn sm ghost icon', 'aria-label': `${d.title} on MusicBrainz` }))) : [h('p', { class: 'muted' }, 'No releases listed.')],
      remixes: a.remixes.length ? a.remixes.map((t) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, t.title), h('div', { class: 'small muted' }, [t.artist, t.date].filter(Boolean).join(' · '))), btn('', () => saveFromMb(t, { remixer: a.name }), { cls: 'sm icon', ico: 'plus', title: 'Save' }))) : [h('p', { class: 'muted' }, `No recordings titled “${a.name} Remix” on MusicBrainz.`)],
      discogs: a.discogs_releases?.length ? a.discogs_releases.map((r) => h('div', { class: 'list-item' }, art(r.thumb, { size: 'sm' }), h('div', { class: 'grow' }, h('div', { class: 't1' }, r.title), h('div', { class: 'small muted' }, [r.artist !== a.name ? r.artist : '', r.role !== 'Main' ? r.role : '', r.label, r.format, r.year].filter(Boolean).join(' · '))), extLink(icon('ext'), r.url, { class: 'btn sm ghost icon', 'aria-label': `${r.title} on Discogs` }))) : [h('p', { class: 'muted' }, a.discogs_id ? 'Discogs returned no releases.' : 'No Discogs profile is linked from MusicBrainz.')],
    };
    clear(discog, h('div', { class: 'tabs', role: 'tablist' }, [['tracks', `Tracks (${a.tracks.length})`], ['discography', `Releases (${a.discography.length})`], ['remixes', `Remixes (${a.remixes.length})`], ['discogs', `Discogs (${a.discogs_releases?.length || 0})`]].map(([k, l]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab() === k), onclick: () => { setTab(k); drawDiscog(); } }, l))),
    h('div', { class: 'list scroll-list', role: 'tabpanel' }, panes[tab()]));
  };
  drawDiscog();
  clear(body,
    errorsNote(a.errors),
    h('div', { class: 'explore-grid' },
      h('div', { class: 'stack-lg' },
        h('section', { class: 'card stack' },
          h('div', { class: 'row between' }, h('div', null, h('h2', a.name), h('p', { class: 'muted small' }, [a.type, a.country, a.disambiguation, a.life?.begin ? `since ${a.life.begin.slice(0, 4)}` : ''].filter(Boolean).join(' · '))),
            extLink(h('span', { class: 'row' }, pbadge('musicbrainz'), 'MusicBrainz', icon('ext')), `https://musicbrainz.org/artist/${a.mbid}`, { class: 'btn sm ghost' })),
          a.aliases.length ? h('p', { class: 'small faint' }, `Also known as ${a.aliases.join(', ')}`) : null,
          a.tags.length ? h('div', { class: 'chips' }, a.tags.map((t) => link(t, `/explore/genre?${qs({ name: t })}`, { class: 'chip' }))) : null,
          candidates(a.candidates, 'artist')),
        h('section', { class: 'card' }, discog)),
      h('div', { class: 'stack-lg' },
        libraryCard(a.library, 'In your library'),
        h('section', { class: 'card stack' }, h('h3', 'Similar artists'), a.similar_status === 'needs-key' ? needsKey('Last.fm', 'Similar artists') : a.similar?.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '300px' } }, a.similar.map((s) => itemArtist(s.name, `${Math.round(s.match * 100)}% match on Last.fm`))) : h('p', { class: 'muted small' }, 'Last.fm returned no similar artists.')),
        h('section', { class: 'card stack' }, h('h3', 'Labels'), a.labels.length ? h('div', { class: 'list' }, a.labels.map((l) => itemLabel(l.name, `${l.count} release${l.count > 1 ? 's' : ''}`))) : h('p', { class: 'muted small' }, 'No labels listed.')),
        h('section', { class: 'card stack' }, h('h3', 'Collaborators'), a.collaborators.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '300px' } }, a.collaborators.map((c) => itemArtist(c.name, c.relation || (c.count ? `${c.count} shared recording${c.count > 1 ? 's' : ''}` : '')))) : h('p', { class: 'muted small' }, 'No collaborations listed.')),
        linksCard(a.name, 'artist'),
        profileLinks(a.links))));
}

function tabState(keys) {
  let v = keys[0];
  return [() => v, (k) => { v = k; }];
}

async function labelPage(body, query) {
  loading(body, 'the label');
  const l = await get(`/api/explore/label?${qs({ name: query.get('name'), mbid: query.get('mbid') })}`);
  if (!l.found) return clear(body, h('div', { class: 'card stack' }, empty(`No label called “${query.get('name')}” on MusicBrainz`, 'Try Discogs, Bandcamp or Beatport below.'), linksCard(query.get('name'), 'label'), libraryCard(l.library, 'In your library')));
  pushTrail({ kind: 'label', label: l.name, ref: l.mbid });
  let tab = 'recent';
  const pane = h('div');
  const rel = (r) => h('div', { class: 'list-item' }, art(r.artwork_url || r.thumb, { size: 'sm' }),
    h('div', { class: 'grow' }, h('div', { class: 't1' }, r.title), h('div', { class: 'small muted' }, [r.artist, r.catalog || r.catno, r.type || r.format, r.date || r.year].filter(Boolean).join(' · '))),
    extLink(icon('ext'), r.url, { class: 'btn sm ghost icon', 'aria-label': `${r.title} (new tab)` }));
  const draw = () => {
    const sets = { recent: l.recent, catalog: l.releases, compilations: l.compilations, discogs: l.discogs_releases || [] };
    clear(pane, h('div', { class: 'tabs', role: 'tablist' }, [['recent', 'Recent'], ['catalog', `Catalogue (${l.releases.length})`], ['compilations', `Compilations (${l.compilations.length})`], ['discogs', `Discogs (${l.discogs_releases?.length || 0})`]].map(([k, t]) =>
      h('button', { type: 'button', role: 'tab', 'aria-selected': String(tab === k), onclick: () => { tab = k; draw(); } }, t))),
    h('div', { class: 'list scroll-list', role: 'tabpanel' }, sets[tab].length ? sets[tab].map(rel) : h('p', { class: 'muted' }, tab === 'discogs' && !l.discogs_id ? 'No Discogs profile is linked from MusicBrainz.' : 'Nothing listed.')),
    l.release_total > l.releases.length && tab === 'catalog' ? h('p', { class: 'faint small', style: { 'margin-top': '8px' } }, `Showing ${l.releases.length} of ${l.release_total} releases on MusicBrainz.`) : null);
  };
  draw();
  const subs = [...l.sub_labels, ...(l.discogs_sublabels || []).map((s) => ({ name: s.name, relation: 'sub-label on Discogs' })), ...(l.discogs_parent ? [{ name: l.discogs_parent.name, relation: 'parent label on Discogs' }] : [])]
    .filter((s, i, arr) => arr.findIndex((x) => x.name === s.name) === i);
  clear(body,
    errorsNote(l.errors),
    h('div', { class: 'explore-grid' },
      h('div', { class: 'stack-lg' },
        h('section', { class: 'card stack' },
          h('div', { class: 'row between' }, h('div', null, h('h2', l.name), h('p', { class: 'muted small' }, [l.type, l.country, l.disambiguation, l.life?.begin ? `founded ${l.life.begin.slice(0, 4)}` : ''].filter(Boolean).join(' · '))),
            extLink(h('span', { class: 'row' }, pbadge('musicbrainz'), 'MusicBrainz', icon('ext')), `https://musicbrainz.org/label/${l.mbid}`, { class: 'btn sm ghost' })),
          l.tags.length ? h('div', { class: 'chips' }, l.tags.map((t) => link(t, `/explore/genre?${qs({ name: t })}`, { class: 'chip' }))) : null,
          candidates(l.candidates, 'label')),
        h('section', { class: 'card' }, pane)),
      h('div', { class: 'stack-lg' },
        libraryCard(l.library, 'In your library'),
        h('section', { class: 'card stack' }, h('h3', 'Artists on the label'), l.artists.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '340px' } }, l.artists.map((a) => itemArtist(a.name, `${a.count} release${a.count > 1 ? 's' : ''}`))) : h('p', { class: 'muted small' }, 'None listed.')),
        h('section', { class: 'card stack' }, h('h3', 'Sub-labels and related labels'), subs.length ? h('div', { class: 'list' }, subs.map((s) => itemLabel(s.name, s.relation))) : h('p', { class: 'muted small' }, 'None listed.')),
        linksCard(l.name, 'label'),
        profileLinks(l.links))));
}

async function trackPage(body, query) {
  const artist = query.get('artist') || '';
  const title = query.get('title') || '';
  loading(body, 'the track');
  const t = await get(`/api/explore/track?${qs({ artist, title, mbid: query.get('mbid') })}`);
  pushTrail({ kind: 'track', label: `${artist ? `${artist} - ` : ''}${title || t.mb_title}` });
  const name = `${t.mb_artist || artist} – ${t.mb_title || title}`;
  const linkGroups = buildLinks(`${artist} ${title}`.trim(), { settings: state.settings });
  const save = () => saveTrackDialog({
    ...parseTrackLine(`${t.mb_artist || artist} - ${t.mb_title || title}`),
    label: t.labels?.[0]?.name || '', release: t.original_release?.title || '', year: (t.original_release?.date || '').slice(0, 4),
    artwork_url: '', source: t.found ? 'MusicBrainz' : 'Manual entry', source_url: t.mbid ? `https://musicbrainz.org/recording/${t.mbid}` : '',
    external_ids: t.mbid ? { musicbrainz: t.mbid } : {},
  }, { sources: t.mbid ? [{ platform: 'musicbrainz', url: `https://musicbrainz.org/recording/${t.mbid}`, external_id: t.mbid, kind: 'result', platformName: 'MusicBrainz' }] : [] });
  const people = [
    ...(t.artists || []).map((a) => ({ ...a, role: 'Artist' })),
    ...(t.remixers || []).map((a) => ({ ...a, role: 'Remixer' })),
    ...(t.producers || []).map((a) => ({ ...a, role: a.role })),
  ];
  const parsed = parseTrackLine(`${artist} - ${title}`);
  for (const f of parsed.featured) if (!people.some((p) => p.name === f)) people.push({ name: f, role: 'Featured' });
  if (parsed.remixer && !people.some((p) => p.name === parsed.remixer)) people.push({ name: parsed.remixer, role: 'Remixer (from title)' });
  clear(body,
    errorsNote(t.errors),
    !t.found ? notice('MusicBrainz has no matching recording. The links below still search every platform.', 'warn') : null,
    h('div', { class: 'explore-grid' },
      h('div', { class: 'stack-lg' },
        h('section', { class: 'card stack' },
          h('div', { class: 'row between' }, h('div', null, h('h2', name), t.isrcs?.length ? h('p', { class: 'small faint mono' }, `ISRC ${t.isrcs.slice(0, 3).join(', ')}`) : null),
            h('div', { class: 'row' }, t.mbid ? extLink(h('span', { class: 'row' }, pbadge('musicbrainz'), 'MusicBrainz', icon('ext')), `https://musicbrainz.org/recording/${t.mbid}`, { class: 'btn sm ghost' }) : null, btn('Save', save, { cls: 'sm primary', ico: 'plus' }))),
          t.tags?.length ? h('div', { class: 'chips' }, t.tags.map((g) => link(g, `/explore/genre?${qs({ name: g })}`, { class: 'chip' }))) : null,
          fixRecordingCandidates(candidates((t.candidates || []).map((c) => ({ id: c.external_id, name: `${c.artist} – ${c.title}`, disambiguation: c.release, country: c.year })), 'track'), t.candidates)),
        h('section', { class: 'card stack' }, h('h3', 'People'), people.length ? h('div', { class: 'list' }, people.map((p) => itemArtist(p.name, p.role))) : h('p', { class: 'muted small' }, 'No credits found.')),
        h('section', { class: 'card stack' }, h('h3', 'Releases'),
          t.original_release ? h('p', { class: 'small' }, 'Original release: ', h('strong', t.original_release.title), t.original_release.date ? ` (${t.original_release.date})` : '') : null,
          t.releases?.length ? h('div', { class: 'list scroll-list' }, t.releases.map((r) => h('div', { class: 'list-item' }, art(r.artwork_url, { size: 'sm' }), h('div', { class: 'grow' }, h('div', { class: 't1' }, r.title), h('div', { class: 'small muted' }, [r.type, r.date, r.country, r.labels.map((x) => x.name).join(', ')].filter(Boolean).join(' · '))), extLink(icon('ext'), r.url, { class: 'btn sm ghost icon', 'aria-label': `${r.title} on MusicBrainz` })))) : h('p', { class: 'muted small' }, 'No releases listed.'))),
      h('div', { class: 'stack-lg' },
        h('section', { class: 'card stack' }, h('h3', 'Record labels'), t.labels?.length ? h('div', { class: 'list' }, t.labels.map((l) => itemLabel(l.name, l.catalog ? `Cat. ${l.catalog}` : 'Other releases on this label →'))) : h('p', { class: 'muted small' }, 'No label found on the original releases.')),
        h('section', { class: 'card stack' }, h('h3', 'Related tracks'), t.similar_status === 'needs-key' ? needsKey('Last.fm', 'Related tracks') : t.similar?.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '340px' } }, t.similar.map((s) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, link(h('span', { class: 't1' }, s.title), `/explore/track?${qs({ artist: s.artist, title: s.title })}`), h('div', { class: 'small muted' }, s.artist)), h('span', { class: 'faint small' }, `${Math.round(s.match * 100)}%`)))) : h('p', { class: 'muted small' }, 'Last.fm returned no similar tracks.')),
        t.similar_artists?.length ? h('section', { class: 'card stack' }, h('h3', 'Similar artists'), h('div', { class: 'list' }, t.similar_artists.map((s) => itemArtist(s.name, `${Math.round(s.match * 100)}% match`)))) : null,
        h('section', { class: 'card stack' }, h('h3', 'Find on platforms'), h('div', { class: 'dest-list' }, linkGroups.flatMap((g) => g.links).filter((l, i, arr) => arr.findIndex((x) => x.platform === l.platform) === i).map((l) => extLink([pbadge(l.id), h('span', null, l.name), h('span', { class: 'ext' }, icon('ext'))], l.href, { class: 'dest' })))))));
}
function fixRecordingCandidates(el, cands) {
  // Candidate links for recordings go to the track explorer with the MusicBrainz id.
  el?.querySelectorAll('a').forEach((a, i) => { const c = cands[i]; if (c) a.href = `/explore/track?${qs({ artist: c.artist, title: c.title, mbid: c.external_id })}`; });
  return el;
}

// ---------------------------------------------------------------------------

async function genreIndex(body) {
  const draw = () => {
    const shortcuts = state.genres.filter((g) => g.shortcut);
    const name = input({ placeholder: 'Add a genre, e.g. Hardgroove Techno', 'aria-label': 'New genre name', maxlength: 60 });
    clear(body,
      h('div', { class: 'card stack' },
        h('div', { class: 'card-head' }, h('div', null, h('h2', 'Genre shortcuts'), h('p', null, 'Each opens discovery pages on Bandcamp, SoundCloud, Beatport, Discogs and more. Rename or remove any of them.'))),
        h('form', { class: 'row', onsubmit: async (e) => {
          e.preventDefault();
          if (!name.value.trim()) return name.focus();
          try { state.genres = await post('/api/genres', { name: name.value }); toast(`Added ${name.value.trim()}`); draw(); } catch (err) { toastError(err); }
        } }, h('div', { class: 'grow' }, name), btn('Add genre', null, { type: 'submit', ico: 'plus' })),
        shortcuts.length ? h('div', { class: 'genre-grid' }, shortcuts.map((g) => h('div', { class: 'genre-tile' },
          link(g.name, `/explore/genre?${qs({ name: g.name })}`),
          g.track_count ? h('span', { class: 'count' }, g.track_count) : null,
          btn('', () => renameGenre(g, draw), { cls: 'sm icon ghost', ico: 'edit', title: `Rename ${g.name}` }),
          btn('', () => removeGenre(g, draw), { cls: 'sm icon ghost', ico: 'x', title: `Remove ${g.name}` })))) : empty('No genre shortcuts', 'Add the genres you dig for.')));
  };
  draw();
}
function renameGenre(g, after) {
  const name = input({ value: g.name, maxlength: 60 });
  const d = dialog({ title: `Rename ${g.name}`, body: [field('Name', name, g.track_count ? `${g.track_count} saved track${g.track_count > 1 ? 's' : ''} will use the new name.` : null)], actions: [btn('Cancel', () => d.close(), { cls: 'ghost' }), btn('Rename', async () => {
    try { state.genres = await patch(`/api/genres/${g.id}`, { name: name.value }); toast('Genre renamed'); d.close(); after(); } catch (err) { toastError(err); }
  }, { cls: 'primary' })] });
}
async function removeGenre(g, after) {
  if (!await confirmDialog({ title: `Remove ${g.name}?`, text: g.track_count ? `The shortcut is removed. ${g.track_count} track${g.track_count > 1 ? 's' : ''} keep the genre.` : 'The shortcut is removed.', confirm: 'Remove' })) return;
  try { state.genres = await del(`/api/genres/${g.id}`); toast('Genre removed'); after(); } catch (err) { toastError(err); }
}

async function genrePage(body, name) {
  pushTrail({ kind: 'genre', label: name });
  const groups = buildLinks(name, { kind: 'genre', settings: state.settings });
  const linksEl = h('section', { class: 'card stack' }, h('h3', 'Discovery pages'), h('p', { class: 'faint small' }, 'Genre and tag pages on each platform. They open in a new tab.'),
    h('div', { class: 'dest-list' }, groups.flatMap((g) => g.links).filter((l, i, arr) => arr.findIndex((x) => x.platform === l.platform) === i).map((l) => extLink([pbadge(l.id), h('span', null, l.name), h('span', { class: 'ext' }, icon('ext'))], l.href, { class: 'dest' }))));
  const isShortcut = state.genres.some((g) => g.shortcut && g.name.toLowerCase() === name.toLowerCase());
  clear(body, h('div', { class: 'explore-grid' }, h('div', { class: 'stack-lg' }, h('div', { class: 'card' }, skeleton(4))), h('div', { class: 'stack-lg' }, linksEl)));
  const g = await get(`/api/explore/genre?${qs({ name })}`);
  const libList = trackCollection({ getTracks: () => g.library, title: name, emptyState: empty(`No ${name} tracks saved`, 'Tracks you save with this genre or tag appear here.') });
  clear(body,
    errorsNote(g.errors),
    h('div', { class: 'row', style: { 'margin-bottom': '16px' } },
      isShortcut ? null : btn(`Add ${name} to genre shortcuts`, async () => { try { state.genres = await post('/api/genres', { name }); toast('Added to shortcuts'); } catch (e) { toastError(e); } }, { cls: 'sm', ico: 'plus' }),
      link('All genres', '/explore/genre', { class: 'btn sm ghost' })),
    h('div', { class: 'explore-grid' },
      h('div', { class: 'stack-lg' },
        h('section', null, h('div', { class: 'section-title' }, h('h2', 'In your library')), libList.el),
        h('section', { class: 'card stack' }, h('h3', 'Top tracks on Last.fm'), g.lastfm_status === 'needs-key' ? needsKey('Last.fm', 'Top tracks for a tag') : g.lastfm_tracks?.length ? h('div', { class: 'list scroll-list' }, g.lastfm_tracks.map((t) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, link(h('span', { class: 't1' }, t.title), `/explore/track?${qs({ artist: t.artist, title: t.title })}`), h('div', { class: 'small muted' }, t.artist)), btn('', () => saveTrackDialog({ artist: t.artist, title: t.title, genre: name, source: 'Last.fm', source_url: t.url }, { sources: [{ platform: 'lastfm', url: t.url, kind: 'result', platformName: 'Last.fm' }] }), { cls: 'sm icon', ico: 'plus', title: 'Save' })))) : h('p', { class: 'muted small' }, 'Nothing tagged with this on Last.fm.')),
        h('section', { class: 'card stack' }, h('h3', 'Recent releases on Discogs'), g.discogs_status === 'needs-key' ? needsKey('Discogs', 'Browsing releases by style') : g.discogs_releases?.length ? h('div', { class: 'list scroll-list' }, g.discogs_releases.map((r) => h('div', { class: 'list-item' }, art(r.artwork_url, { size: 'sm' }), h('div', { class: 'grow' }, h('div', { class: 't1' }, r.title), h('div', { class: 'small muted' }, [r.artist, r.label, r.year, r.format].filter(Boolean).join(' · '))), extLink(icon('ext'), r.url, { class: 'btn sm ghost icon', 'aria-label': `${r.title} on Discogs` })))) : h('p', { class: 'muted small' }, `Discogs has no releases with the style “${name}”. Discogs uses its own style names.`))),
      h('div', { class: 'stack-lg' },
        linksEl,
        h('section', { class: 'card stack' }, h('h3', 'Artists tagged on MusicBrainz'), g.mb_artists?.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '320px' } }, g.mb_artists.map((a) => itemArtist(a.name, [a.country, a.disambiguation].filter(Boolean).join(' · ')))) : h('p', { class: 'muted small' }, 'None tagged.')),
        h('section', { class: 'card stack' }, h('h3', 'Releases tagged on MusicBrainz'), g.mb_releases?.length ? h('div', { class: 'list scroll-list', style: { 'max-height': '320px' } }, g.mb_releases.map((r) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('div', { class: 't1' }, r.title), h('div', { class: 'small muted' }, [r.artist, r.type, r.date].filter(Boolean).join(' · '))), extLink(icon('ext'), r.url, { class: 'btn sm ghost icon', 'aria-label': `${r.title} on MusicBrainz` })))) : h('p', { class: 'muted small' }, 'None tagged.')))));
}
