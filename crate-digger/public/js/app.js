import { h, clear, icon, link, toastError } from './ui.js';
import { get, setUnauthorizedHandler } from './api.js';
import { state, bootstrap, subscribe } from './state.js';
import { addToCrate } from './actions.js';
import { navigate, setRouter } from './router.js';

const VIEWS = {
  discover: () => import('./views/discover.js'),
  tracklists: () => import('./views/tracklists.js'),
  explore: () => import('./views/explore.js'),
  crates: () => import('./views/crates.js'),
  library: () => import('./views/library.js'),
  track: () => import('./views/track.js'),
  match: () => import('./views/match.js'),
  settings: () => import('./views/settings.js'),
};
const NAV = [
  ['discover', 'Discover'],
  ['tracklists', 'Tracklists'],
  ['explore', 'Explore'],
  ['crates', 'My Crates'],
  ['library', 'Library'],
];

const root = document.getElementById('app');
let main;
let sidebar;
let cleanup = null;
let renderToken = 0;


document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  const url = new URL(a.href);
  if (url.origin !== location.origin) return;
  e.preventDefault();
  closeMenu();
  navigate(url.pathname + url.search + url.hash);
});
addEventListener('popstate', () => route());
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) && !document.querySelector('dialog[open]')) {
    e.preventDefault();
    document.getElementById('top-q')?.focus();
  }
});

function brand() {
  return h('a', { class: 'brand', href: '/discover', 'data-link': true, 'aria-label': 'y2r Crate Digger home' },
    h('img', { class: 'brand-mark', src: '/favicon.svg', alt: '' }),
    h('span', { class: 'brand-name' }, 'y2r', h('small', 'Crate Digger')));
}

function renderSidebar() {
  const section = location.pathname.split('/')[1] || 'discover';
  const current = section === 'track' || section === 'match' ? 'library' : section;
  const crates = h('div', { class: 'side-section', 'aria-label': 'Crates' },
    h('div', { class: 'side-label' }, h('span', 'Crates'), link('All', '/crates')),
    state.crates.length ? state.crates.slice(0, 40).map((c) => {
      const a = h('a', { class: 'side-crate', href: `/crates/${c.id}`, 'data-link': true, 'aria-current': location.pathname === `/crates/${c.id}` ? 'page' : null, style: { '--accent': c.accent } },
        h('span', { class: 'dot', 'aria-hidden': 'true' }), h('span', { class: 'grow' }, c.name), h('span', { class: 'count' }, c.track_count));
      // Drop target for dragged track rows.
      a.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('application/x-cd-tracks')) { e.preventDefault(); a.classList.add('drop-hover'); } });
      a.addEventListener('dragleave', () => a.classList.remove('drop-hover'));
      a.addEventListener('drop', (e) => {
        a.classList.remove('drop-hover');
        const ids = JSON.parse(e.dataTransfer.getData('application/x-cd-tracks') || '[]');
        if (ids.length) { e.preventDefault(); addToCrate(c, ids).catch(toastError); }
      });
      return a;
    }) : h('p', { class: 'drag-hint' }, 'No crates yet.'),
    state.crates.length ? h('p', { class: 'drag-hint' }, 'Drag tracks here to add them.') : null);
  clear(sidebar,
    brand(),
    h('nav', { class: 'nav', 'aria-label': 'Main' }, NAV.map(([id, label]) => h('a', { href: `/${id}`, 'data-link': true, 'aria-current': current === id ? 'page' : null }, icon(id), label))),
    crates,
    h('div', { class: 'side-foot' },
      h('nav', { class: 'nav', 'aria-label': 'Account' }, h('a', { href: '/settings', 'data-link': true, 'aria-current': current === 'settings' ? 'page' : null }, icon('settings'), 'Settings')),
      h('p', { class: 'drag-hint' }, `Signed in as ${state.user?.username}`)));
}

function closeMenu() {
  sidebar?.classList.remove('open');
  document.querySelector('.scrim')?.remove();
}

function topbar() {
  const q = h('input', { id: 'top-q', type: 'search', placeholder: 'Search a track, artist or paste a link', autocomplete: 'off', 'aria-label': 'Quick search' });
  const form = h('form', { class: 'topsearch', role: 'search', onsubmit: (e) => { e.preventDefault(); if (q.value.trim()) { navigate(`/discover?q=${encodeURIComponent(q.value.trim())}`); q.value = ''; q.blur(); } } },
    icon('search'), q);
  const menu = h('button', { class: 'btn icon ghost menu-btn', type: 'button', 'aria-label': 'Open menu', onclick: () => {
    sidebar.classList.add('open');
    document.body.append(h('div', { class: 'scrim', onclick: closeMenu }));
    sidebar.querySelector('a')?.focus();
  } }, icon('menu'));
  return h('header', { class: 'topbar' }, menu, form, h('span', { class: 'kbd', title: 'Press / to search' }, '/'));
}

function shell() {
  sidebar = h('aside', { class: 'sidebar', id: 'sidebar' });
  main = h('main', { id: 'main', class: 'content', tabindex: '-1' });
  clear(root, h('div', { class: 'shell' }, sidebar, h('div', { class: 'main' }, topbar(), main)));
  renderSidebar();
  subscribe((what) => { if (['crates', 'all'].includes(what)) renderSidebar(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
}

async function route() {
  if (!state.user) return;
  const parts = location.pathname.split('/').filter(Boolean);
  if (!parts.length) return navigate('/discover', { replace: true });
  const name = parts[0];
  if (!VIEWS[name]) return navigate('/discover', { replace: true });
  const token = ++renderToken;
  try { cleanup?.(); } catch { /* ignore */ }
  cleanup = null;
  renderSidebar();
  const mod = await VIEWS[name]();
  if (token !== renderToken) return;
  const container = h('div', { class: 'view-enter' });
  clear(main, container);
  scrollTo({ top: 0 });
  try {
    cleanup = await mod.render(container, { params: parts.slice(1), query: new URLSearchParams(location.search) });
  } catch (err) {
    console.error(err);
    clear(container, h('div', { class: 'card' }, h('h2', 'This page could not load'), h('p', { class: 'muted' }, err.message || String(err)), link('Back to Discover', '/discover', { class: 'btn' })));
  }
  const heading = container.querySelector('h1');
  document.title = heading ? `${heading.textContent} · y2r Crate Digger` : 'y2r Crate Digger';
  if (document.activeElement === document.body || !main.contains(document.activeElement)) main.focus({ preventScroll: true });
}

setRouter(() => route());

async function start() {
  setUnauthorizedHandler(() => { if (state.user) { state.user = null; showAuth(); } });
  try {
    const s = await get('/api/session');
    if (!s.user) return showAuth(s.has_users);
    await bootstrap();
    shell();
    route();
  } catch (err) {
    clear(root, h('div', { class: 'auth' }, h('div', { class: 'card' }, h('h1', 'Cannot start'), h('p', { class: 'muted' }, err.message))));
  }
}

async function showAuth(hasUsers = true) {
  const { renderAuth } = await import('./views/auth.js');
  renderAuth(root, hasUsers, async () => { await bootstrap(); shell(); route(); });
}

start();
