import { element } from './dom.js';
import { animate } from './animations.js';

import { maintenanceState, formatTime } from './maintenance-time.js';

export function initMaintenance() {
  const network = document.querySelector('[data-service="tailscale2"]')?.parentElement;
  if (!network) return;
  const row = element('<div class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 flex items-center justify-between gap-3"></div>');
  network.append(row);
  let previous, banner;
  function refresh() {
    const { state, ms } = maintenanceState(), active = state === 'active', warning = state === 'warning';
    row.innerHTML = `<div class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-red-400 animate-pulse' : warning ? 'bg-yellow-400 animate-pulse' : 'bg-white/20'}"></div><span class="text-white/40 text-xs font-mono">${active ? 'Maintenance active' : warning ? 'Maintenance soon' : 'Next maintenance'}</span></div><span class="text-xs font-mono font-semibold tabular-nums ${active ? 'text-red-400' : warning ? 'text-yellow-400' : 'text-white/30'}">${active ? 'ends in ' : ''}${formatTime(ms)}</span>`;
    if (state !== previous) {
      previous = state; banner?.remove(); banner = null;
      if (active || warning) {
        const color = active ? 'red' : 'yellow';
        banner = element(`<div class="fixed top-0 left-0 right-0 z-50 pointer-events-none"><div class="mx-4 sm:mx-auto max-w-xl mt-4 rounded-xl border px-5 py-3 flex items-center justify-between gap-4 backdrop-blur-md shadow-lg border-${color}-500/40 bg-${color}-500/10"><div class="flex items-center gap-3"><span class="text-lg">${active ? '🔧' : '⚠️'}</span><div><p class="text-sm font-semibold text-${color}-300">${active ? 'Maintenance active' : 'Maintenance starting soon'}</p><p class="text-white/40 text-xs">${active ? 'NAS is offline — services unavailable' : 'NAS goes offline at 06:30 for daily backup'}</p></div></div><span data-countdown class="text-sm font-mono font-bold tabular-nums flex-shrink-0 text-${color}-300"></span></div></div>`);
        document.querySelector('main').prepend(banner);
        void animate(banner, { opacity: 0, y: -20 }, { opacity: 1, y: 0 }, { duration: 0.4 });
      }
    }
    if (banner) banner.querySelector('[data-countdown]').textContent = `${active ? '~' : ''}${formatTime(ms, true)}`;
  }
  refresh(); const timer = setInterval(refresh, 1000);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
}
