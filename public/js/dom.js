export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const url = value => {
  try { const parsed = new URL(value, location.origin); return ['https:', 'http:'].includes(parsed.protocol) ? escape(parsed.href) : ''; } catch { return ''; }
};
const svg = paths => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
export const icons = {
  info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  warning: svg('<path d="M12 3.5 21.5 20h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>'),
  error: svg('<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16h.01"/>'),
  wrench: svg('<path d="M14.5 6.5a4 4 0 0 0 5 5L21 13l-8 8-3-3 1.5-1.5a4 4 0 0 0-5-5L5 13l-2-2 6.5-6.5 2 2"/>'),
};
export function element(html) {
  const template = document.createElement('template'); template.innerHTML = html.trim(); return template.content.firstElementChild;
}
export async function json(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Service unavailable');
  return data;
}
// Each poll finishes before the next begins. Page navigation cancels pending requests.
export function poll(path, onData, interval = 30000, onError = () => {}) {
  const controller = new AbortController();
  let timer;
  const run = async () => {
    try { onData(await json(path, { signal: controller.signal })); } catch (error) { if (!controller.signal.aborted) onError(error); }
    if (!controller.signal.aborted) timer = setTimeout(run, interval);
  };
  void run();
  const stop = () => { controller.abort(); clearTimeout(timer); window.removeEventListener('pagehide', stop); };
  window.addEventListener('pagehide', stop, { once: true });
  return stop;
}
