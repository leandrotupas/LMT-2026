// Small DOM helpers. Text is always inserted as text, never as HTML.
import { MONOGRAM, PLATFORMS } from '/shared/platforms.js';

export function h(tag, attrs, ...children) {
  const el = tag === 'frag' ? document.createDocumentFragment() : document.createElement(tag);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = Array.isArray(v) ? v.filter(Boolean).join(' ') : v;
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) el.style.setProperty(p, val);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'value') el.value = v;
    else if (k in el && !['list', 'form', 'type', 'for'].includes(k) && typeof v !== 'string') el[k] = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  append(el, children);
  return el;
}
function append(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}
export function clear(el, ...children) { el.replaceChildren(); append(el, children); return el; }

// ---------- icons (inline SVG, stroke) ----------
const PATHS = {
  discover: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm10 17-4.35-4.35',
  tracklists: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  explore: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3.5 5.5-2 5-5 2 2-5 5-2Z',
  crates: 'M3 7l9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM16.5 4.5l3.8 1-3.9 14.5-3.8-1z',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z',
  plus: 'M12 5v14M5 12h14',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5 10 17 19 7',
  ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  edit: 'M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  disc: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z',
  match: 'M7 4v16M17 4v16M4 8h6M14 16h6M4 16h6M14 8h6',
  download: 'M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14',
  upload: 'M12 20V9m0 0-4.5 4.5M12 9l4.5 4.5M5 4h14',
  copy: 'M9 9h10v11H9zM5 15V4h10',
  menu: 'M4 7h16M4 12h16M4 17h16',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 8v5m0-8.5v.01',
  warn: 'M12 4 2.5 20h19L12 4Zm0 6v4m0 3v.01',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  rows: 'M4 6h16M4 12h16M4 18h16',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  back: 'M19 12H5m5-5-5 5 5 5',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  sort: 'M8 5v14m0 0-3-3m3 3 3-3M16 19V5m0 0-3 3m3-3 3 3',
  bolt: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  merge: 'M7 4v4a4 4 0 0 0 4 4h6m0 0-3-3m3 3-3 3M7 20v-8',
  folder: 'M3 6h6l2 2h10v11H3z',
};
export function icon(name, cls = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', PATHS[name] || PATHS.info);
  svg.append(p);
  return svg;
}

export function btn(label, onClick, { cls = '', ico, title, type = 'button', disabled, ...rest } = {}) {
  return h('button', { type, class: ['btn', cls], onclick: onClick, title, disabled, 'aria-label': rest['aria-label'] || (ico && !label ? title : null), ...rest }, ico ? icon(ico) : null, label);
}
export function link(label, href, attrs = {}) {
  return h('a', { href, 'data-link': true, ...attrs }, label);
}
export function extLink(label, href, attrs = {}) {
  if (!/^https?:\/\//i.test(String(href || ''))) return h('span', { class: attrs.class }, label); // never render script or data links
  return h('a', { href, target: '_blank', rel: 'noopener noreferrer', ...attrs }, label);
}

export function pbadge(platformId) {
  const p = PLATFORMS.find((x) => x.id === platformId || x.alias === platformId);
  return h('span', { class: 'pbadge', style: { '--pc': p?.color || '#888' }, 'aria-hidden': 'true' }, MONOGRAM[platformId] || '•');
}

/** Artwork with a neutral fallback. Never substitutes other artwork. */
export function art(url, { size = '', alt = '' } = {}) {
  const fallback = () => h('div', { class: ['art', size], role: alt ? 'img' : null, 'aria-label': alt ? `${alt} (no artwork)` : null }, icon('disc'));
  if (!url) return fallback();
  const img = h('img', { class: ['art', size], src: url, alt, loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' });
  img.addEventListener('error', () => img.replaceWith(fallback()), { once: true });
  return img;
}

export function empty(title, text, ...actions) {
  return h('div', { class: 'empty' }, icon('disc'), h('h3', title), text ? h('p', text) : null, actions.length ? h('div', { class: 'row' }, actions) : null);
}
export function notice(text, kind = '', ico = 'info') {
  return h('div', { class: ['notice', kind], role: kind === 'bad' ? 'alert' : null }, icon(ico), h('div', text));
}
export function spinner(label = 'Loading') {
  return h('span', { class: 'row muted small' }, h('span', { class: 'spinner', 'aria-hidden': 'true' }), label);
}
export function skeleton(n = 3) {
  return h('div', { 'aria-busy': 'true', 'aria-label': 'Loading' }, Array.from({ length: n }, () => h('div', { class: 'skeleton skel-row' })));
}

// ---------- toasts ----------
export function toast(message, { kind = 'good', action, timeout = 4200 } = {}) {
  const host = document.getElementById('toasts');
  const el = h('div', { class: ['toast', kind] }, h('span', message), action ? btn(action.label, () => { action.run(); el.remove(); }, { cls: 'sm' }) : null);
  host.append(el);
  setTimeout(() => el.remove(), action ? timeout + 3000 : timeout);
}
export function toastError(err) {
  toast(err?.message || String(err), { kind: 'bad', timeout: 6500 });
}

// ---------- dialogs ----------
export function dialog({ title, body, actions = [], wide = false, onClose }) {
  const dlg = h('dialog', { class: wide ? 'wide' : '', 'aria-labelledby': 'dlg-title' });
  const close = (v) => { dlg.close(v); };
  const foot = h('div', { class: 'dlg-foot' });
  dlg.append(h('form', { method: 'dialog', class: 'dlg', onsubmit: (e) => { e.preventDefault(); foot.querySelector('.primary')?.click(); } },
    h('div', { class: 'dlg-head' }, h('h2', { id: 'dlg-title' }, title), btn('', () => close(''), { cls: 'ghost icon sm', ico: 'x', title: 'Close' })),
    h('div', { class: 'dlg-body' }, body),
    foot));
  for (const a of actions) foot.append(a instanceof Node ? a : btn(a.label, () => a.run(close), { cls: a.cls || '', type: a.submit ? 'submit' : 'button' }));
  dlg.addEventListener('close', () => { onClose?.(dlg.returnValue); dlg.remove(); });
  document.body.append(dlg);
  dlg.showModal();
  const first = dlg.querySelector('.dlg-body input, .dlg-body select, .dlg-body textarea, .dlg-foot .primary');
  first?.focus();
  return { dlg, close };
}

export function confirmDialog({ title, text, confirm = 'Confirm', danger = true, typeToConfirm }) {
  return new Promise((resolve) => {
    let ok = false;
    const input = typeToConfirm ? h('input', { type: 'text', autocomplete: 'off', 'aria-label': `Type ${typeToConfirm} to confirm` }) : null;
    const go = btn(confirm, () => {
      if (input && input.value !== typeToConfirm) { input.focus(); input.setCustomValidity(`Type ${typeToConfirm}`); input.reportValidity(); return; }
      ok = true; d.close('ok');
    }, { cls: danger ? 'danger solid' : 'primary' });
    const d = dialog({
      title,
      body: h('div', { class: 'stack' }, typeof text === 'string' ? h('p', text) : text, input ? h('label', { class: 'field' }, h('span', `Type ${typeToConfirm} to confirm`), input) : null),
      actions: [btn('Cancel', () => d.close(''), { cls: 'ghost' }), go],
      onClose: () => resolve(ok),
    });
    if (!input) go.focus();
  });
}

// ---------- misc ----------
export function fmtDuration(ms) {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return hh ? `${hh}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}
export function fmtDate(iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, opts);
}
export function energyDots(n) {
  if (!n) return h('span', { class: 'faint' }, '—');
  return h('span', { class: 'energy', title: `Energy ${n} of 5`, 'aria-label': `Energy ${n} of 5` }, '●'.repeat(n), h('span', { class: 'off' }, '●'.repeat(5 - n)));
}
export function trackName(t) {
  return [t.artist, [t.title, t.version ? `(${t.version})` : ''].filter(Boolean).join(' ')].filter(Boolean).join(' – ');
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); }
  catch { toast('Copy failed. Your browser blocked clipboard access.', { kind: 'bad' }); }
}
export function debounce(fn, ms = 200) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
export function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', label), control, hint ? h('span', { class: 'field-hint' }, hint) : null);
}
export function input(attrs = {}) { return h('input', { type: 'text', ...attrs }); }
export function select(options, value, attrs = {}) {
  return h('select', attrs, options.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, l)));
}
