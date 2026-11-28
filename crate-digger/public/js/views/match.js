import { h, clear, btn, link, art, notice, empty, energyDots, trackName, select } from '../ui.js';
import { get } from '../api.js';
import { state, ensureTracks } from '../state.js';
import { matchTracks, harmonic, formatKey, CAMELOT_CODES, parseCode } from '/shared/camelot.js';
import { bpmCell, keyPill } from '../tracktable.js';

const TIER_LABEL = { strong: 'Strong', partial: 'Partial', weak: 'Weak' };

export async function render(root, { params, query }) {
  await ensureTracks();
  const id = Number(params[0]);
  const ref = state.tracks.find((t) => t.id === id) || await get(`/api/tracks/${id}`);
  let tol = Number(query.get('tol')) || state.settings.bpmTolerance || 6;
  let show = new Set(['strong', 'partial']);
  let scope = '';

  const results = h('div');
  const wheelBox = h('div');
  const tolOut = h('output', { class: 'num' }, `${tol}%`);
  const tolInput = h('input', { type: 'range', min: 1, max: 15, step: 0.5, value: tol, 'aria-label': 'BPM tolerance', oninput: (e) => { tol = Number(e.target.value); tolOut.textContent = `${tol}%`; draw(); } });
  const scopeSel = select([['', 'Whole library'], ...state.crates.map((c) => [c.id, c.name])], '', { 'aria-label': 'Match within', onchange: (e) => { scope = e.target.value; draw(); } });
  const tierBtns = ['strong', 'partial', 'weak'].map((t) => h('button', { type: 'button', class: ['chip', show.has(t) ? 'on' : ''], 'aria-pressed': String(show.has(t)), onclick: (e) => {
    if (show.has(t)) show.delete(t); else show.add(t);
    e.currentTarget.classList.toggle('on', show.has(t));
    e.currentTarget.setAttribute('aria-pressed', String(show.has(t)));
    draw();
  } }, TIER_LABEL[t]));

  const missing = !ref.bpm && !ref.camelot;
  root.append(
    h('div', { class: 'page-head' }, h('div', null, h('p', { class: 'eyebrow' }, link('Track', `/track/${ref.id}`), ' · Match'), h('h1', 'Compatible tracks'),
      h('p', 'Harmonic matches use the Camelot wheel. Tempo matches allow for your BPM tolerance and show half- and double-time relationships separately.'))),
    h('div', { class: 'match-layout' },
      h('aside', { class: 'stack' },
        h('div', { class: 'card stack' },
          h('div', { class: 'row' }, art(ref.artwork_url, { size: 'md' }), h('div', { class: 'grow' }, link(h('strong', trackName(ref)), `/track/${ref.id}`),
            h('div', { class: 'row small', style: { 'margin-top': '6px' } }, bpmCell(ref), keyPill(ref), energyDots(ref.energy)))),
          missing ? notice(['This track has no BPM or key yet. ', link('Add them', `/track/${ref.id}`), ' to find matches.'], 'warn') : null,
          !ref.bpm && ref.camelot ? notice('No BPM: matching on key only.', '') : null,
          ref.bpm && !ref.camelot ? notice('No key: matching on tempo only.', '') : null),
        h('div', { class: 'card stack' }, h('h3', 'Camelot wheel'), wheelBox,
          h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: 'var(--primary)' } }), 'This track'), h('span', null, h('i', { style: { background: 'color-mix(in srgb, var(--good) 55%, var(--surface-2))' } }), 'Strong'), h('span', null, h('i', { style: { background: 'color-mix(in srgb, var(--warn) 45%, var(--surface-2))' } }), 'Partial'))),
        h('div', { class: 'card stack' },
          h('label', { class: 'field' }, h('span', 'BPM tolerance ', tolOut), tolInput),
          h('label', { class: 'field' }, h('span', 'Match within'), scopeSel),
          h('div', { class: 'row' }, h('span', { class: 'small muted' }, 'Show:'), tierBtns))),
      results));

  function draw() {
    clear(wheelBox, wheel(ref.camelot));
    const pool = state.tracks.filter((t) => t.id !== ref.id && (!scope || t.crates.some((c) => String(c.id) === String(scope))));
    const scored = pool.map((t) => ({ t, m: matchTracks(ref, t, tol) })).filter((x) => x.m);
    const noData = pool.length - scored.length;
    const shown = scored.filter((x) => show.has(x.m.overall)).sort((a, b) => b.m.score - a.m.score);
    const counts = Object.fromEntries(['strong', 'partial', 'weak'].map((k) => [k, scored.filter((x) => x.m.overall === k).length]));
    if (missing) return clear(results, h('div', { class: 'card' }, empty('Nothing to match on', 'Add a BPM or key to this track first.', link('Edit track', `/track/${ref.id}`, { class: 'btn primary' }))));
    clear(results,
      h('p', { class: 'muted small', style: { 'margin-bottom': '10px' } }, `${counts.strong} strong · ${counts.partial} partial · ${counts.weak} weak`, noData ? ` · ${noData} track${noData > 1 ? 's' : ''} without BPM or key not compared` : ''),
      shown.length ? h('div', { class: 'table-wrap' }, h('table', { class: 'tracks' },
        h('thead', null, h('tr', null, h('th', null, 'Match'), h('th', null, 'Track'), h('th', null, 'BPM'), h('th', null, 'Δ Tempo'), h('th', null, 'Key'), h('th', null, 'Harmonic'), h('th', { class: 'hide-sm' }, 'Energy'))),
        h('tbody', null, shown.map(({ t, m }) => h('tr', { class: `match-${m.overall}` },
          h('td', null, h('span', { class: ['chip', m.overall === 'strong' ? 'good' : m.overall === 'partial' ? 'warn' : 'bad'] }, TIER_LABEL[m.overall])),
          h('td', { class: 't-title' }, link(t.title + (t.version ? ` (${t.version})` : ''), `/track/${t.id}`), h('div', { class: 'sub' }, t.artist),
            h('div', { class: 'why' }, [m.harmonic?.why, m.tempo?.why].filter(Boolean).join(' '))),
          h('td', null, bpmCell(t)),
          h('td', { class: 'nowrap' }, m.tempo ? h('span', null, h('span', { class: 'num' }, `${m.tempo.pct > 0 ? '+' : ''}${m.tempo.pct}%`), m.tempo.factor !== 1 ? h('span', { class: 'chip warn', style: { 'margin-left': '6px' } }, m.tempo.relation) : null) : h('span', { class: 'faint' }, '—')),
          h('td', null, keyPill(t)),
          h('td', { class: 'small' }, m.harmonic ? m.harmonic.label : h('span', { class: 'faint' }, 'No key')),
          h('td', { class: 'hide-sm' }, energyDots(t.energy))))))) : h('div', { class: 'card' }, empty('No matches at this setting', scored.length ? 'Show weaker matches or widen the BPM tolerance.' : 'Add BPM and key to more tracks to compare them.')));
  }
  draw();
}

/** SVG Camelot wheel: outer ring B (major), inner ring A (minor). */
function wheel(refCode) {
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text) e.textContent = text; return e; };
  const svg = el('svg', { viewBox: '0 0 220 220', class: 'wheel', role: 'img', 'aria-label': refCode ? `Camelot wheel with ${refCode} and compatible keys highlighted` : 'Camelot wheel' });
  const cx = 110; const cy = 110;
  const arc = (r1, r2, a0, a1) => {
    const p = (r, a) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    const [x1, y1] = p(r2, a0); const [x2, y2] = p(r2, a1); const [x3, y3] = p(r1, a1); const [x4, y4] = p(r1, a0);
    return `M${x1} ${y1}A${r2} ${r2} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r1} ${r1} 0 0 0 ${x4} ${y4}Z`;
  };
  for (const code of CAMELOT_CODES) {
    const { n, letter } = parseCode(code);
    const a0 = ((n - 1) / 12) * 2 * Math.PI - Math.PI / 12;
    const a1 = a0 + (2 * Math.PI) / 12;
    const [r1, r2] = letter === 'B' ? [72, 106] : [38, 72];
    const rel = refCode ? (code === refCode ? 'ref' : harmonic(refCode, code)?.tier) : '';
    const g = el('g', {});
    g.append(el('path', { d: arc(r1, r2, a0, a1), class: `seg ${rel === 'weak' ? '' : rel || ''}` }));
    const mid = (a0 + a1) / 2; const r = (r1 + r2) / 2;
    g.append(el('text', { x: cx + r * Math.sin(mid), y: cy - r * Math.cos(mid) + 3, 'text-anchor': 'middle', class: rel === 'ref' ? 'ref' : '' }, code));
    const title = el('title', {}, `${code} · ${formatKey(code, 'musical')}${rel && rel !== 'ref' ? ` · ${rel}` : ''}`);
    g.append(title);
    svg.append(g);
  }
  svg.append(el('circle', { cx, cy, r: 36, fill: 'var(--surface)' }));
  svg.append(el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', class: 'center' }, refCode || '—'));
  return svg;
}
