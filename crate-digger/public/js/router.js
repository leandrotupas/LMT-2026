let handler = () => {};
export function setRouter(fn) { handler = fn; }
export function navigate(path, { replace = false } = {}) {
  if (path !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  handler();
}
/** Update the query string without re-rendering the view. */
export function setQuery(params, { replace = true } = {}) {
  const u = new URL(location.href);
  for (const [k, v] of Object.entries(params)) { if (v == null || v === '') u.searchParams.delete(k); else u.searchParams.set(k, v); }
  history[replace ? 'replaceState' : 'pushState']({}, '', u.pathname + u.search);
}
