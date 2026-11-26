// One scroll engine for the whole site. Lenis smooths wheel input only: touch keeps the
// browser's own momentum (syncTouch stays off), and reduced motion turns Lenis off entirely.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let lenis: Lenis | null = null;

function start() {
  if (lenis || reduced.matches) return;
  lenis = new Lenis({
    lerp: 0.11,
    allowNestedScroll: true,
    // The artwork viewer and its zoom pane scroll on their own.
    prevent: (node) => Boolean(node.closest?.('dialog, [data-lenis-prevent]')),
  });
  lenis.on('scroll', ScrollTrigger.update);
}

function stop() {
  lenis?.destroy();
  lenis = null;
}

gsap.ticker.add((time) => lenis?.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
reduced.addEventListener('change', () => (reduced.matches ? stop() : start()));
start();

export function smoothScroller() {
  return lenis;
}

/** Scroll to an in-page target, then move keyboard focus there so the next Tab continues from it. */
export function scrollToTarget(target: HTMLElement, { immediate = false } = {}) {
  const land = () => {
    if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  if (!lenis) {
    target.scrollIntoView({ block: 'start' });
    land();
    return;
  }
  if (immediate) {
    // Lenis already honours the page's scroll-padding-top (the header clearance).
    lenis.scrollTo(target, { immediate: true, force: true });
    land();
  } else {
    lenis.scrollTo(target, { duration: 1.1, onComplete: land });
  }
}

/** The site's one easing curve, cubic-bezier(0.22, 1, 0.36, 1), for GSAP tweens. */
export function easeOut(t: number) {
  if (t <= 0 || t >= 1) return t;
  const [x1, y1, x2, y2] = [0.22, 1, 0.36, 1];
  const bez = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0, hi = 1, s = t;
  for (let i = 0; i < 24; i++) { s = (lo + hi) / 2; if (bez(x1, x2, s) < t) lo = s; else hi = s; }
  return bez(y1, y2, s);
}

export { gsap, ScrollTrigger };
