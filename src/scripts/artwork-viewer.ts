import { enableArtworkZoom } from './artwork-zoom';

function enhanceViewer(dialog: HTMLDialogElement) {
  const artworks = [...document.querySelectorAll<HTMLAnchorElement>('main a[data-artwork]')];
  if (!artworks.length || typeof dialog.showModal !== 'function') return;

  const image = dialog.querySelector<HTMLImageElement>('[data-viewer-image]')!;
  const caption = dialog.querySelector<HTMLElement>('[data-viewer-caption]')!;
  const position = dialog.querySelector<HTMLElement>('[data-viewer-position]')!;
  const announcement = dialog.querySelector<HTMLElement>('[data-viewer-announcement]')!;
  const original = dialog.querySelector<HTMLAnchorElement>('[data-viewer-original]')!;
  const closeButton = dialog.querySelector<HTMLButtonElement>('[data-viewer-close]')!;
  const zoomButton = dialog.querySelector<HTMLButtonElement>('[data-viewer-zoom]')!;
  const previous = dialog.querySelector<HTMLButtonElement>('[data-viewer-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-viewer-next]')!;
  const error = dialog.querySelector<HTMLElement>('[data-viewer-error]')!;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let opener: HTMLAnchorElement | undefined;
  let pictureMotion: Animation | undefined;
  let paperMotion: Animation | undefined;
  let closing: Animation | undefined;
  let version = 0;
  let pending: HTMLImageElement | undefined;
  let easing = 'ease-out';
  const canAnimate = typeof image.animate === 'function';
  const zoom = enableArtworkZoom(image, zoomButton, reduced, () => pictureMotion?.cancel());

  function thumbnailTransform(thumbnail: DOMRect) {
    const full = image.getBoundingClientRect();
    if (!full.width || !thumbnail.width || thumbnail.bottom <= 0 || thumbnail.top >= innerHeight) return;
    const x = thumbnail.x + thumbnail.width / 2 - full.x - full.width / 2;
    const y = thumbnail.y + thumbnail.height / 2 - full.y - full.height / 2;
    return `translate(${x}px, ${y}px) scale(${thumbnail.width / full.width})`;
  }

  function show(index: number, direction: number, animate: boolean, origin?: DOMRect) {
    zoom.reset();
    zoomButton.disabled = false;
    current = (index + artworks.length) % artworks.length;
    const art = artworks[current];
    const thumb = art.querySelector<HTMLImageElement>('img')!;
    const ticket = ++version;
    pending?.removeAttribute('src');
    const count = `${current + 1} of ${artworks.length}`;
    original.href = art.href;
    image.alt = art.dataset.alt ?? '';
    image.hidden = false;
    error.hidden = true;
    caption.textContent = art.dataset.caption!;
    position.textContent = count;
    announcement.textContent = `Artwork ${count}.`;
    pictureMotion?.cancel();
    const width = Number(thumb.getAttribute('width'));
    const height = Number(thumb.getAttribute('height'));
    image.style.setProperty('--source-width', `${width}px`);
    image.style.setProperty('--source-ratio', String(width / height));
    image.src = thumb.currentSrc || thumb.src;
    if (animate && canAnimate && !reduced.matches) {
      const start = origin ? thumbnailTransform(origin) : `translateX(${direction * 18}px)`;
      if (start) pictureMotion = image.animate([{ transform: start, opacity: origin ? 1 : 0.75 }, { transform: 'none', opacity: 1 }],
        { duration: origin ? 340 : 200, easing });
      if (origin) paperMotion = dialog.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 160, easing });
    }
    // The already-displayed print can move immediately while its full-size source decodes.
    const full = new Image();
    pending = full;
    full.src = art.href;
    full.decode().then(() => {
      if (ticket !== version || !dialog.open) return;
      pending = undefined;
      image.src = full.src;
    }, () => {
      if (ticket !== version || !dialog.open) return;
      pending = undefined;
      image.hidden = !thumb.complete || !thumb.naturalWidth;
      if (image.hidden) {
        zoom.reset();
        zoomButton.disabled = true;
      }
      error.textContent = image.hidden ? 'The artwork couldn’t be loaded.' : 'Full size is unavailable. Showing the preview.';
      error.hidden = false;
    });
  }

  for (const [index, link] of artworks.entries()) {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', (event) => {
      if (event.defaultPrevented || event.button || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      event.preventDefault();
      opener = link;
      const origin = link.querySelector('img')!.getBoundingClientRect();
      dialog.showModal();
      easing = getComputedStyle(dialog).getPropertyValue('--ease-settle').trim() || 'ease-out';
      closeButton.focus({ preventScroll: true });
      show(index, 0, event.detail > 0, origin);
    });
  }
  dialog.querySelector<HTMLElement>('.viewer-pager')!.hidden = artworks.length === 1;
  previous.addEventListener('click', (event) => { if (!closing) show(current - 1, -1, event.detail > 0); });
  next.addEventListener('click', (event) => { if (!closing) show(current + 1, 1, event.detail > 0); });
  dialog.addEventListener('keydown', (event) => {
    pictureMotion?.cancel();
    paperMotion?.cancel();
    if (closing || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (zoom.panWithKey(event.key)) {
      event.preventDefault();
      return;
    }
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (step && artworks.length > 1) {
      event.preventDefault();
      show(current + step, step, false);
    }
  });
  closeButton.addEventListener('click', (event) => {
    if (closing) return;
    if (!event.detail || document.documentElement.dataset.input === 'keyboard' || reduced.matches || !canAnimate) { dialog.close(); return; }
    pictureMotion?.cancel();
    paperMotion?.cancel();
    const fitted = zoomButton.getAttribute('aria-pressed') === 'false';
    const thumb = fitted && opener === artworks[current] && !image.hidden ? opener?.querySelector('img') : null;
    const end = thumb && thumbnailTransform(thumb.getBoundingClientRect());
    if (end) pictureMotion = image.animate([{ transform: 'none' }, { transform: end }], { duration: 210, easing, fill: 'both' });
    closing = dialog.animate([{ opacity: 1 }, { opacity: 0 }], { duration: end ? 210 : 120, easing: 'linear' });
    closing.onfinish = () => { if (dialog.open) dialog.close(); };
  });
  dialog.addEventListener('close', () => {
    zoom.reset();
    closing?.cancel();
    closing = undefined;
    pictureMotion?.cancel();
    paperMotion?.cancel();
    ++version;
    pending?.removeAttribute('src');
    pending = undefined;
    image.removeAttribute('src');
    if (opener) {
      opener.focus({ preventScroll: true });
      const bounds = opener.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= document.documentElement.clientHeight) {
        opener.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'nearest' });
      }
    }
  });
  reduced.addEventListener('change', () => {
    if (!reduced.matches) return;
    pictureMotion?.cancel();
    paperMotion?.cancel();
    if (closing && dialog.open) dialog.close();
  });
  window.addEventListener('resize', () => { if (!closing) pictureMotion?.cancel(); });
}

const viewer = document.querySelector<HTMLDialogElement>('.art-viewer');
if (viewer) enhanceViewer(viewer);
