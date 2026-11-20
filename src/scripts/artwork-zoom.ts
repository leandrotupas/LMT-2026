export function enableArtworkZoom(
  image: HTMLImageElement,
  button: HTMLButtonElement,
  reduced: MediaQueryList,
  settleImage: () => void,
) {
  const pane = image.parentElement!;
  let motion: Animation | undefined;
  let drag: { id: number; x: number; y: number; left: number; top: number } | undefined;
  let dragged = false;

  function endDrag() {
    if (drag && image.hasPointerCapture(drag.id)) image.releasePointerCapture(drag.id);
    drag = undefined;
    pane.removeAttribute('data-dragging');
  }

  function stopMotion() {
    motion?.cancel();
    motion = undefined;
    pane.removeAttribute('data-fitting');
  }

  function toggle(animate: boolean, x?: number, y?: number) {
    if (button.disabled || image.hidden) return;
    const before = image.getBoundingClientRect();
    if (!before.width || !before.height) return;
    settleImage();
    stopMotion();
    const area = pane.getBoundingClientRect();
    const pointX = x ?? area.left + pane.clientWidth / 2;
    const pointY = y ?? area.top + pane.clientHeight / 2;
    const fractionX = Math.max(0, Math.min(1, (pointX - before.left) / before.width));
    const fractionY = Math.max(0, Math.min(1, (pointY - before.top) / before.height));
    const zoomed = pane.toggleAttribute('data-zoomed');
    pane.tabIndex = zoomed ? 0 : -1;
    button.setAttribute('aria-pressed', String(zoomed));
    if (zoomed) {
      const larger = image.getBoundingClientRect();
      pane.scrollBy({ left: larger.left + fractionX * larger.width - pointX,
        top: larger.top + fractionY * larger.height - pointY, behavior: 'instant' });
    } else {
      pane.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
    if (!animate || reduced.matches || typeof image.animate !== 'function') return;
    if (!zoomed) pane.setAttribute('data-fitting', '');
    const after = image.getBoundingClientRect();
    const offsetX = before.left + before.width / 2 - after.left - after.width / 2;
    const offsetY = before.top + before.height / 2 - after.top - after.height / 2;
    const transform = `translate(${offsetX}px, ${offsetY}px) scale(${before.width / after.width})`;
    const easing = getComputedStyle(button).getPropertyValue('--ease-settle').trim();
    motion = image.animate([{ transform }, { transform: 'none' }], { duration: 200, easing });
    motion.onfinish = () => pane.removeAttribute('data-fitting');
  }

  button.addEventListener('click', (event) => toggle(event.detail > 0));
  image.addEventListener('click', (event) => {
    if (!dragged && !event.button && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
      toggle(true, event.clientX, event.clientY);
    }
  });
  image.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    dragged = false;
    if (event.pointerType === 'touch' || !pane.hasAttribute('data-zoomed')) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: pane.scrollLeft, top: pane.scrollTop };
    image.setPointerCapture(event.pointerId);
  });
  image.addEventListener('pointermove', (event) => {
    if (drag?.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!dragged) {
      if (Math.hypot(dx, dy) < 4) return;
      stopMotion();
    }
    dragged = true;
    pane.setAttribute('data-dragging', '');
    pane.scrollTo({ left: drag.left - dx, top: drag.top - dy, behavior: 'instant' });
  });
  image.addEventListener('lostpointercapture', endDrag);
  image.addEventListener('pointerup', endDrag);
  image.addEventListener('pointercancel', endDrag);
  reduced.addEventListener('change', () => { if (reduced.matches) stopMotion(); });

  return {
    panWithKey(key: string) {
      if (!pane.hasAttribute('data-zoomed') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return false;
      stopMotion();
      const step = Math.max(44, Math.min(pane.clientWidth, pane.clientHeight) * 0.2);
      const left = key === 'ArrowLeft' ? -step : key === 'ArrowRight' ? step : 0;
      const top = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0;
      pane.scrollBy({ left, top, behavior: 'instant' });
      return true;
    },
    reset() {
      stopMotion();
      endDrag();
      dragged = false;
      pane.removeAttribute('data-zoomed');
      pane.tabIndex = -1;
      pane.scrollTo({ left: 0, top: 0, behavior: 'instant' });
      button.setAttribute('aria-pressed', 'false');
    },
  };
}
