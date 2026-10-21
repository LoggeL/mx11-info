export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const url = value => {
  try { const parsed = new URL(value, location.origin); return ['https:', 'http:'].includes(parsed.protocol) ? escape(parsed.href) : ''; } catch { return ''; }
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
