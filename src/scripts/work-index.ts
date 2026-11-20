function enhanceWorkIndex(index: HTMLElement) {
  const categories = [...index.querySelectorAll<HTMLAnchorElement>('.categories a')];
  const groups = [...index.querySelectorAll<HTMLElement>('[data-group]')];
  const figure = index.querySelector<HTMLElement>('.work-preview')!;
  const frame = figure.querySelector<HTMLAnchorElement>('.preview-frame')!;
  const title = figure.querySelector<HTMLElement>('.preview-title')!;
  const caption = figure.querySelector<HTMLElement>('.preview-caption')!;
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  let activeGroup: HTMLElement | undefined;
  let indexWidth = index.clientWidth;
  let parkedHeading: HTMLElement | null = null;
  let previewEnabled = false;
  let requested: HTMLAnchorElement | undefined;
  let pointerSelection = false;
  let displayed: HTMLAnchorElement | undefined;
  let sequence = 0;
  let scrollFrame = 0;
  let wipe: Animation | undefined;

  async function showProject(link: HTMLAnchorElement, fromPointer = false) {
    if (!previewEnabled) return;
    pointerSelection = fromPointer;
    if (requested === link) return;
    requested = link;
    const ticket = ++sequence;
    const thumbnail = link.querySelector<HTMLImageElement>('.thumbnail')!;
    const image = new Image();
    image.alt = thumbnail.alt;
    image.src = link.dataset.preview!;

    let available = true;
    try {
      await image.decode();
    } catch {
      if (ticket !== sequence) return;
      image.src = thumbnail.src;
      try {
        await image.decode();
      } catch {
        available = false;
      }
    }

    // A slower image must never replace a newer choice or its caption.
    if (ticket !== sequence) return;
    wipe?.cancel();
    const previousImage = frame.querySelector(':scope > img');
    const previous = displayed;
    previous?.removeAttribute('data-previewed');
    displayed = link;
    link.setAttribute('data-previewed', '');
    frame.replaceChildren(...(available ? [image] : []));
    const projectName = link.querySelector('.work-title')!.textContent;
    title.textContent = projectName;
    frame.href = link.href;
    frame.tabIndex = 0;
    frame.setAttribute('aria-label', `Open ${projectName}`);
    caption.textContent = available ? link.dataset.caption! : `${link.dataset.caption}. Preview unavailable.`;

    if (available && previous && previousImage && pointerSelection && !reduced.matches && typeof frame.animate === 'function') {
      const sheet = document.createElement('div');
      sheet.className = 'previous-print';
      sheet.setAttribute('aria-hidden', 'true');
      sheet.append(previousImage);
      frame.append(sheet);
      const forward = previous.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING;
      const style = getComputedStyle(figure);
      wipe = sheet.animate([{ clipPath: 'inset(0)' }, { clipPath: forward ? 'inset(0 0 100% 0)' : 'inset(100% 0 0 0)' }], {
        duration: parseFloat(style.getPropertyValue('--duration-preview')),
        easing: style.getPropertyValue('--ease-settle').trim(),
      });
      wipe.onfinish = wipe.oncancel = () => sheet.remove();
    }
  }

  function showFirst(group: HTMLElement) {
    const first = group.querySelector<HTMLAnchorElement>('.work-link');
    if (first) void showProject(first);
  }

  function selectGroup(group: HTMLElement, fromAnchor = false) {
    if (activeGroup !== group) {
      activeGroup = group;
      for (const link of categories) {
        if (link.hash === `#${group.dataset.group}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
      if (!group.contains(requested ?? null) && !requested?.matches(':focus-visible')) showFirst(group);
    }
    if (fromAnchor) showFirst(group);
  }

  function readScroll() {
    scrollFrame = 0;
    const width = index.clientWidth;
    const resized = width !== indexWidth;
    if (resized) {
      indexWidth = width;
      syncLayout();
    }
    const heading = index.querySelector<HTMLElement>('.group-heading h2:target');
    const destination = heading?.closest<HTMLElement>('[data-group]');
    if (heading && destination) {
      // Keep a parked fragment aligned across resizes until the visitor scrolls away.
      const landingTop = parseFloat(getComputedStyle(heading).scrollMarginBlockStart);
      const offset = destination.getBoundingClientRect().top - landingTop;
      if (resized && parkedHeading === heading) window.scrollBy({ top: offset, behavior: 'instant' });
      else parkedHeading = Math.abs(offset) <= 2 ? heading : null;
      if (document.documentElement.hasAttribute('data-smooth-anchor')) {
        selectGroup(destination);
        return;
      }
    } else parkedHeading = null;
    const atBottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1;
    const edge = Math.min(innerHeight * 0.23, 145);
    const group = atBottom ? groups.at(-1) : groups.filter((item) => item.getBoundingClientRect().top <= edge).at(-1);
    selectGroup(group ?? groups[0]);
  }

  function scheduleScroll() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(readScroll);
  }

  function readAnchor() {
    const group = groups.find((item) => `#${item.dataset.group}` === location.hash);
    if (group) selectGroup(group, true);
    else readScroll();
  }

  function syncLayout() {
    const fits = getComputedStyle(index).getPropertyValue('--work-preview').trim() === '1';
    if (fits === previewEnabled) return;
    previewEnabled = fits;
    index.toggleAttribute('data-enhanced', fits);
    if (fits) {
      if (activeGroup) showFirst(activeGroup);
      else readAnchor();
    } else {
      ++sequence;
      requested = undefined;
      displayed?.removeAttribute('data-previewed');
      displayed = undefined;
      wipe?.cancel();
    }
  }

  function linkFrom(event: Event) {
    return event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('.work-link') : null;
  }

  function restoreSelection() {
    const path = history.state?.workPreview;
    if (!previewEnabled || typeof path !== 'string') return;
    const selected = [...index.querySelectorAll<HTMLAnchorElement>('.work-link')].find((row) => row.pathname === path);
    if (selected) void showProject(selected);
  }

  index.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('.work-link, .preview-frame[href]') : null;
    if (link) {
      try {
        history.replaceState({ ...history.state, workPreview: link.pathname }, '');
      } catch { /* Navigation remains native if browser history is restricted. */ }
    }
  });
  index.addEventListener('pointermove', (event) => {
    const link = linkFrom(event);
    if (link && event.pointerType !== 'touch') void showProject(link, true);
  });
  index.addEventListener('focusin', (event) => {
    pointerSelection = false;
    wipe?.cancel();
    const link = linkFrom(event);
    if (link) void showProject(link);
  });
  index.querySelector('.categories')!.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null;
    if (link?.hash === location.hash) readAnchor();
  });
  pointer.addEventListener('change', syncLayout);
  // Changing preview mode also changes the height of the observed list.
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => requestAnimationFrame(syncLayout)).observe(index);
  else window.addEventListener('resize', syncLayout);
  reduced.addEventListener('change', () => { if (reduced.matches) wipe?.cancel(); });
  window.addEventListener('pagehide', () => wipe?.cancel());
  window.addEventListener('scroll', scheduleScroll, { passive: true });
  window.addEventListener('scrollend', scheduleScroll);
  window.addEventListener('resize', scheduleScroll);
  window.addEventListener('hashchange', readAnchor);
  window.addEventListener('pageshow', () => requestAnimationFrame(() => {
    readScroll();
    restoreSelection();
  }));
  syncLayout();
  readAnchor();
  restoreSelection();
}

const workIndex = document.querySelector<HTMLElement>('[data-work-index]');
if (workIndex) enhanceWorkIndex(workIndex);
