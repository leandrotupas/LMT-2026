const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const wheelPointer = matchMedia('(any-pointer: fine)');
const reveals = new Set<Animation>();
let anchorTimer = 0;
let wheelTarget: number | undefined;
let lastWheel = 0;
let wheelDirection = 0;

function clearScrollState() {
  clearTimeout(anchorTimer);
  root.removeAttribute('data-smooth-anchor');
  wheelTarget = undefined;
}

function interruptScroll() {
  if (wheelTarget === undefined && !root.hasAttribute('data-smooth-anchor')) return;
  clearScrollState();
  window.scrollTo({ top: scrollY, behavior: 'instant' });
}

document.addEventListener('click', (event) => {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || link.origin !== location.origin || event.defaultPrevented || event.button ||
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (link.pathname !== location.pathname || link.search !== location.search) {
    if (link.pathname.endsWith('/') && !link.target && !link.hasAttribute('download')) {
      try {
        const input = !event.detail || root.dataset.input === 'keyboard' ? 'keyboard' : 'pointer';
        sessionStorage.setItem('yancy:next-navigation', JSON.stringify({ url: link.href, input, time: Date.now() }));
      } catch { /* Navigation is independent of storage. */ }
    }
    return;
  }
  if (!link.hash || link.hash === '#main-content' || !event.detail || root.dataset.input === 'keyboard' || reduced.matches) return;
  root.setAttribute('data-smooth-anchor', '');
  clearTimeout(anchorTimer);
  anchorTimer = window.setTimeout(clearScrollState, 1800);
}, { capture: true });

// A notched mouse sends line/page deltas or larger, regularly sized pixel deltas.
// Precision input already has its own acceleration and momentum.
function scrollWheel(event: WheelEvent) {
  if (event.defaultPrevented || !event.cancelable) return;
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.deltaX || !event.deltaY) {
    interruptScroll();
    return;
  }
  root.dataset.input = 'pointer';
  const magnitude = Math.abs(event.deltaY);
  const stepped = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || magnitude % 100 === 0 || magnitude % 120 === 0;
  if (!stepped) { interruptScroll(); return; }
  const target = event.target;
  if (!(target instanceof Element) || target.closest('dialog, input, textarea, select, [contenteditable="true"]')) return;
  for (let node: Element | null = target; node && node !== document.body && node !== root; node = node.parentElement) {
    if (node.scrollHeight > node.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) return;
  }
  const now = performance.now();
  const direction = Math.sign(event.deltaY);
  const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? innerHeight : 1;
  const base = now - lastWheel < 220 && direction === wheelDirection ? (wheelTarget ?? scrollY) : scrollY;
  const limit = Math.max(0, root.scrollHeight - root.clientHeight);
  const destination = Math.min(limit, Math.max(0, base + event.deltaY * unit));
  if (Math.abs(destination - scrollY) < 1) { interruptScroll(); return; }
  event.preventDefault();
  clearTimeout(anchorTimer);
  root.removeAttribute('data-smooth-anchor');
  wheelTarget = destination;
  wheelDirection = direction;
  lastWheel = now;
  window.scrollTo({ top: destination, behavior: 'smooth' });
}

function syncWheel() {
  window.removeEventListener('wheel', scrollWheel);
  if (!reduced.matches && wheelPointer.matches) window.addEventListener('wheel', scrollWheel, { passive: false });
}

function cancelReveals() {
  for (const animation of reveals) animation.cancel();
  reveals.clear();
}

function track(animation: Animation) {
  reveals.add(animation);
  animation.onfinish = animation.oncancel = () => { reveals.delete(animation); };
}

if (!('onpagereveal' in window) && root.dataset.input === 'pointer' && !reduced.matches && typeof Element.prototype.animate === 'function') {
  const main = document.querySelector('main');
  if (main) track(main.animate([{ opacity: 0.76 }, { opacity: 1 }], { id: 'page-arrival', duration: 220, easing: 'ease-out' }));
}

if ('IntersectionObserver' in window && typeof Element.prototype.animate === 'function') {
  const targets = document.querySelectorAll<HTMLElement>(
    '.chapter h2, .group-heading, .section-heading, .destination-heading, .case-page .chapter figure, ' +
    '.folio .summary, [data-reveal], .contact, .case-footer'
  );
  const observer = new IntersectionObserver((entries) => {
    const easing = getComputedStyle(root).getPropertyValue('--ease-settle').trim() || 'ease-out';
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      observer.unobserve(element);
      if (reduced.matches || root.dataset.input === 'keyboard' || element.contains(document.activeElement)) continue;
      const art = element.matches('figure, .application');
      // Browsers restore a Work fragment against its heading's on-screen position.
      const entrance = element.matches('.group-heading') ? 'none' : `translateY(${art ? 14 : 7}px)`;
      const animation = element.animate([
        { opacity: art ? 0.72 : 0.84, transform: entrance },
        { opacity: 1, transform: 'none' },
      ], { duration: art ? 370 : 240, easing });
      track(animation);
    }
  }, { threshold: 0 });
  targets.forEach((element) => observer.observe(element));
}

window.addEventListener('keydown', (event) => {
  if (['Alt', 'Control', 'Meta', 'Shift'].includes(event.key)) return;
  root.dataset.input = 'keyboard';
  interruptScroll();
  cancelReveals();
}, { capture: true });
window.addEventListener('pointerdown', () => {
  root.dataset.input = 'pointer';
  interruptScroll();
}, { capture: true, passive: true });
window.addEventListener('scrollend', (event) => {
  if (event.target === document || event.target === window) clearScrollState();
});
window.addEventListener('pagehide', () => { clearScrollState(); cancelReveals(); });
reduced.addEventListener('change', () => {
  if (reduced.matches) { interruptScroll(); cancelReveals(); }
  syncWheel();
});
wheelPointer.addEventListener('change', syncWheel);
syncWheel();
