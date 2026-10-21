import { escape, poll } from './dom.js';

const LABEL = { 0: 'Down', 1: 'Operational', 2: 'Pending', 3: 'Maintenance' };
const TONE = { 0: 'bad', 1: 'ok', 2: 'warn', 3: 'info' };
const label = status => LABEL[status] ?? 'Unknown';

export function initHealth() {
  const root = document.querySelector('[data-health]');
  if (!root) return;
  const list = root.querySelector('[data-monitors]'), title = root.querySelector('[data-health-title]');
  const dot = root.querySelector('[data-health-dot]'), uptime = root.querySelector('[data-health-uptime]');
  let first = true;
  const show = (text, tone, state) => {
    title.textContent = text; dot.className = `dot dot--${tone}`;
    root.classList.toggle('is-idle', state === 'idle'); root.classList.toggle('is-warn', state === 'warn');
  };
  poll('/api/status-overview', ({ monitors = [] }) => {
    const healthy = monitors.length > 0 && monitors.every(m => m.status === 1);
    show(!monitors.length ? 'No monitors published' : healthy ? 'All systems operational' : 'Some services need attention',
      healthy ? 'ok' : 'warn', healthy ? 'ok' : 'warn');
    const known = monitors.map(m => m.uptime).filter(Number.isFinite);
    uptime.textContent = known.length ? `${(known.reduce((a, b) => a + b, 0) / known.length * 100).toFixed(2)}%` : '—';
    list.innerHTML = monitors.map(m => `<div class="monitor"><div class="monitor__name"><span class="dot dot--sm dot--${TONE[m.status] ?? 'wait'}" title="${label(m.status)}"></span><span>${escape(m.name)}</span></div><div class="monitor__bars${first ? ' is-new' : ''}" aria-hidden="true">${(m.history || []).map((s, i) => `<i class="hb${TONE[s] ? s : ''}" style="--i:${i}" title="${label(s)}"></i>`).join('')}</div><div class="monitor__meta"><span class="monitor__label">${label(m.status)}</span><span><b>${m.uptime === null ? '—' : (m.uptime * 100).toFixed(2) + '%'}</b> · 24h</span></div></div>`).join('');
    first = false;
  }, 60000, () => {
    show('Status temporarily unavailable', 'wait', 'idle');
    list.innerHTML = '<p class="health__note">Live data could not be loaded. Open the full status page for details.</p>';
  });
}
