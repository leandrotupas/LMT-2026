import { scrollToTarget, smoothScroller } from './smooth';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const reveals = new Set<Animation>();

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
  if (!link.hash) return;
  const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
  if (!target) return;
  // Same-page links glide with the wheel engine and always hand focus to their destination.
  event.preventDefault();
  const keyboard = !event.detail || root.dataset.input === 'keyboard';
  scrollToTarget(target, { immediate: keyboard || link.hash === '#main-content' || !smoothScroller() });
  if (location.hash !== link.hash) {
    const oldURL = location.href;
    history.pushState(null, '', link.hash);
    // pushState is silent; pages that follow the fragment (the Work index rail) listen for hashchange.
    window.dispatchEvent(new HashChangeEvent('hashchange', { oldURL, newURL: location.href }));
  }
}, { capture: true });

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
  cancelReveals();
}, { capture: true });
window.addEventListener('pointerdown', () => { root.dataset.input = 'pointer'; }, { capture: true, passive: true });
window.addEventListener('pagehide', cancelReveals);
reduced.addEventListener('change', () => { if (reduced.matches) cancelReveals(); });
