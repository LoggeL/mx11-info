import { element, escape, url, poll } from './dom.js';
import { expand } from './animations.js';

function sparkline(points) {
  if (points.length < 2) return '';
  const max = Math.max(...points, 1), step = 50 / (points.length - 1);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${i * step},${20 - p / max * 14 - 3}`).join(' ');
  return `<div data-sparkline class="absolute bottom-2 right-3 opacity-60"><svg viewBox="0 0 50 20" preserveAspectRatio="none" class="w-12 h-5"><defs><linearGradient id="msFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity="0.3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0"/></linearGradient></defs><path d="${d} L50,20 L0,20 Z" fill="url(#msFill)"/><path d="${d}" fill="none" stroke="#34d399" stroke-width="1" vector-effect="non-scaling-stroke" opacity="0.5"/></svg></div>`;
}
export function initServices() {
  poll('/api/status', snapshot => {
    for (const card of document.querySelectorAll('[data-service]')) {
      const status = snapshot[card.dataset.service];
      if (!status) continue;
      const online = !!status.online;
      card.classList.toggle('border-red-500/30', !online); card.classList.toggle('hover:border-red-500/50', !online);
      card.classList.toggle('border-white/[0.08]', online); card.classList.toggle('hover:border-white/[0.15]', online);
      const row = card.children[1], content = row.children[0], indicator = row.children[1];
      indicator.replaceChildren(element(`<div class="relative"><div class="w-2.5 h-2.5 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400'}"></div>${online ? '<div class="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-30"></div>' : ''}</div>`));
      content.querySelector('[data-players]')?.remove();
      if (online && status.players) content.children[1].after(element(`<p data-players class="text-emerald-400/70 text-xs mt-1 font-mono">${escape(status.players.current)}/${escape(status.players.max)} players</p>`));
      const labelRow = content.lastElementChild;
      labelRow.querySelector('[data-ping]')?.remove();
      if (online && status.ping !== null) labelRow.append(element(`<p data-ping class="text-white/30 text-xs font-mono flex-shrink-0">${escape(status.ping)}ms</p>`));
      card.querySelector('[data-sparkline]')?.remove();
      if (online && status.history?.length > 1) card.append(element(sparkline(status.history.filter(Number.isFinite))));
    }
  });
  for (const card of document.querySelectorAll('[data-panel]')) initPanel(card);
}
const text = (value, classes = 'text-white/30 text-xs font-mono') => `<span class="${classes}">${escape(value)}</span>`;
const address = s => s.address ? `<span data-copy="${escape(s.address)}" class="text-white/30 text-xs font-mono cursor-pointer hover:text-white/60 transition-colors">${escape(s.address)}</span>` : '';
const link = s => s.panelUrl ? `<a href="${url(s.panelUrl)}" target="_blank" rel="noopener noreferrer" class="text-white/20 hover:text-white/60 transition-colors text-xs" title="Open in panel">↗</a>` : '';
function serverRow(s, crafty) {
  const active = s.running ?? s.status === 'running', suspended = s.status === 'suspended';
  const dot = `<div class="w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-emerald-400' : crafty ? 'bg-red-400/60' : suspended ? 'bg-yellow-400/60' : 'bg-white/20'}"></div>`;
  const name = text(s.name, 'text-white/80 text-sm font-medium truncate');
  const state = text(active ? 'online' : suspended ? 'suspended' : s.status === 'unknown' ? 'unknown' : 'offline', `text-xs font-mono ${active ? 'text-emerald-400/60' : suspended ? 'text-yellow-400/40' : 'text-red-400/40'}`);
  const cpu = () => text(`CPU ${Number(s.cpu || 0).toFixed(1)}%`);
  if (crafty) return `<div class="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3 flex items-center justify-between gap-3"><div class="min-w-0"><div class="flex items-center gap-2">${dot}${name}${s.version ? text(s.version, 'text-white/20 text-xs font-mono flex-shrink-0') : ''}</div><div class="flex flex-wrap gap-3 mt-1 ml-3.5">${address(s)}${active ? text(`${s.players}/${s.maxPlayers} players`) + cpu() + text(`RAM ${s.ram}`) : ''}</div></div><div class="flex items-center gap-2 flex-shrink-0">${state}${link(s)}</div></div>`;
  return `<div class="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3"><div class="flex items-center justify-between gap-3"><div class="flex items-center gap-2 min-w-0">${dot}${name}</div><div class="flex items-center gap-2 flex-shrink-0">${state}${link(s)}</div></div><div class="flex flex-wrap gap-3 mt-1.5 ml-3.5">${text(s.node, 'text-white/20 text-xs font-mono')}${address(s)}${s.maxPlayers != null ? text(`max ${s.maxPlayers} players`) : ''}${s.map ? text(s.map, 'text-white/20 text-xs font-mono capitalize') : ''}${active && s.cpu != null ? cpu() : ''}${active && s.ram ? text(`RAM ${s.ram}`) : ''}${!active && s.memoryLimit != null ? text(`${s.memoryLimit >= 1024 ? (s.memoryLimit / 1024).toFixed(0) + 'GB' : s.memoryLimit + 'MB'} RAM limit`, 'text-white/20 text-xs font-mono') : ''}</div></div>`;
}
function initPanel(card) {
  let open = false, stop, data;
  const hint = card.querySelector('p:last-child'), arrow = card.querySelector('.text-sm:last-child');
  const details = element('<div class="overflow-hidden" hidden><div class="px-5 pb-5"></div></div>');
  card.append(details);
  const content = details.firstElementChild;
  const render = loading => {
    const servers = data?.[card.dataset.panel] || [];
    content.innerHTML = loading ? '<div class="text-white/20 text-sm text-center py-4 font-mono">Loading...</div>' : !servers.length ? '<div class="text-white/20 text-sm text-center py-4 font-mono">No servers found</div>' : `<div class="space-y-2">${servers.map(s => serverRow(s, card.dataset.panel === 'crafty')).join('')}</div>`;
  };
  card.addEventListener('click', async e => {
    const copy = e.target.closest('[data-copy]');
    if (copy) {
      try { await navigator.clipboard.writeText(copy.dataset.copy); const original = copy.textContent; copy.textContent = '✓ copied'; setTimeout(() => { if (copy.isConnected) copy.textContent = original; }, 2000); } catch { /* Clipboard unavailable. */ }
      return;
    }
    if (e.target.closest('a')) return;
    open = !open;
    hint.textContent = open ? 'click to close' : 'click to view servers';
    arrow.style.transition = 'transform 0.3s'; arrow.style.transform = open ? 'rotate(180deg)' : 'none';
    card.querySelector('[data-server-count]')?.remove();
    if (open) {
      render(!data);
      stop = poll('/api/panel-status', snapshot => { data = snapshot; if (open) render(false); }, 30000, () => { if (open) render(false); });
    } else {
      stop?.();
      if (data) arrow.before(element(`<span data-server-count class="text-white/30 text-xs font-mono">${data[card.dataset.panel].length} server${data[card.dataset.panel].length !== 1 ? 's' : ''}</span>`));
    }
    void expand(details, open);
  });
}
