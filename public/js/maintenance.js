import { element, icons } from './dom.js';
import { animate } from './animations.js';
import { maintenanceState, formatTime, berlinSeconds } from './maintenance-time.js';

export function initMaintenance() {
  const card = document.querySelector('[data-maintenance]');
  if (!card) return;
  const title = card.querySelector('[data-maint-title]'), clock = card.querySelector('[data-maint-clock]');
  const dot = card.querySelector('[data-maint-dot]'), now = card.querySelector('[data-maint-now]');
  const heroClock = document.querySelector('[data-clock]');
  let previous, banner;
  function refresh() {
    const date = new Date(), { state, ms } = maintenanceState(date), active = state === 'active', warning = state === 'warning';
    const seconds = berlinSeconds(date);
    if (heroClock) heroClock.textContent = [seconds / 3600, seconds % 3600 / 60, seconds % 60].map(v => String(Math.floor(v)).padStart(2, '0')).join(':');
    card.classList.toggle('is-active', active); card.classList.toggle('is-warn', warning);
    title.textContent = active ? 'Maintenance active' : warning ? 'Maintenance soon' : 'Next maintenance';
    dot.className = `dot dot--sm ${active ? 'dot--bad dot--wait' : warning ? 'dot--warn dot--wait' : ''}`;
    clock.textContent = `${active ? 'ends in ' : 'T−'}${formatTime(ms)}`;
    now.style.left = `${seconds / 864}%`;
    if (state !== previous) {
      previous = state; banner?.remove(); banner = null;
      if (active || warning) {
        banner = element(`<div class="toast toast--${active ? 'error' : 'warning'}" role="status"><span class="toast__icon">${active ? icons.wrench : icons.warning}</span><p class="toast__text">${active ? 'Maintenance active' : 'Maintenance starting soon'}<small>${active ? 'NAS is offline — services unavailable' : 'NAS goes offline at 06:30 for daily backup'}</small></p><span class="toast__aside" data-countdown></span></div>`);
        document.querySelector('[data-toasts]').prepend(banner);
        void animate(banner, { opacity: 0, y: -20 }, { opacity: 1, y: 0 }, { duration: 0.4 });
      }
    }
    if (banner) banner.querySelector('[data-countdown]').textContent = `${active ? '~' : ''}${formatTime(ms, true)}`;
  }
  refresh(); const timer = setInterval(refresh, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
