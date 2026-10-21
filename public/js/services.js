import { element, escape, url, poll } from './dom.js';
import { expand } from './animations.js';

const HTTP = ['jellyfin.mx11.org', 'immich.mx11.org', 'paperless.mx11.org', 'crafty.mx11.org'];
const NODES = ['datacenter', 'tailscale', 'tailscale2'];
const ms = ping => ping === 0 ? '<1ms' : `${ping}ms`;
const setDot = (dot, tone) => { if (dot) dot.className = `dot${dot.classList.contains('dot--sm') ? ' dot--sm' : ''} dot--${tone}`; };

function sparkline(svg, points) {
  const values = (points || []).filter(Number.isFinite);
  const max = Math.max(...values, 0);
  if (values.length < 2 || max === 0) { svg.replaceChildren(); return; }
  const step = 56 / (values.length - 1);
  const d = values.map((p, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(17 - p / max * 13).toFixed(1)}`).join(' ');
  svg.innerHTML = `<defs><linearGradient id="sf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34d399" stop-opacity=".3"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient></defs><path d="${d} L56,18 L0,18 Z" fill="url(#sf)"/><path d="${d}" fill="none" stroke="#34d399" stroke-width="1" vector-effect="non-scaling-stroke" opacity=".7"/>`;
}

function applyStatus(snapshot) {
  for (const card of document.querySelectorAll('[data-service]')) {
    const status = snapshot[card.dataset.service];
    if (!status) continue;
    const online = !!status.online;
    card.classList.toggle('is-down', !online);
    setDot(card.querySelector('[data-dot]'), online ? 'ok' : 'bad');
    const state = card.querySelector('[data-state]');
    if (state) state.textContent = online ? 'online' : 'offline';
    const ping = card.querySelector('[data-ping]');
    if (ping) ping.textContent = online && status.ping !== null ? ms(status.ping) : '';
    const spark = card.querySelector('[data-spark]');
    if (spark) sparkline(spark, online ? status.history : []);
    card.querySelector('[data-players]')?.remove();
    if (online && status.players) card.querySelector('.svc__desc')?.after(element(`<p data-players class="svc__players">${escape(status.players.current)}/${escape(status.players.max)} players</p>`));
  }
  for (const link of document.querySelectorAll('[data-link]')) {
    const status = snapshot[link.dataset.link];
    if (!status) continue;
    link.classList.toggle('is-down', !status.online);
    link.querySelector('[data-link-label]').textContent = status.online && status.ping !== null ? ms(status.ping) : 'no route';
  }
  const count = keys => [keys.filter(k => snapshot[k]?.online).length, keys.filter(k => snapshot[k]).length];
  const [up, total] = count(HTTP), [nodesUp, nodes] = count(NODES);
  if (!total) return;
  setDot(document.querySelector('[data-uplink-dot]'), up === total && nodesUp === nodes ? 'ok' : 'warn');
  document.querySelector('[data-uplink-services]').innerHTML = `<b>${up}/${total}</b> services online`;
  document.querySelector('[data-uplink-nodes]').innerHTML = `<b>${nodesUp}/${nodes}</b> nodes`;
}

export function initServices() {
  poll('/api/status', applyStatus);
  for (const card of document.querySelectorAll('[data-panel]')) initPanel(card);
}

const span = (value, cls = '') => `<span${cls ? ` class="${cls}"` : ''}>${escape(value)}</span>`;
const address = s => s.address ? `<span class="copy" role="button" tabindex="0" title="Copy address" data-copy="${escape(s.address)}">${escape(s.address)}</span>` : '';
const link = s => s.panelUrl ? `<a class="server__link" href="${url(s.panelUrl)}" target="_blank" rel="noopener noreferrer" title="Open in panel" aria-label="Open ${escape(s.name)} in panel">↗</a>` : '';
const memory = mb => mb >= 1024 ? `${(mb / 1024).toFixed(0)}GB` : `${mb}MB`;
function serverRow(s, crafty) {
  const active = s.running ?? s.status === 'running', suspended = s.status === 'suspended';
  const tone = active ? 'up' : suspended ? 'paused' : 'down';
  const label = active ? 'online' : suspended ? 'suspended' : s.status === 'unknown' ? 'unknown' : 'offline';
  const cpu = `CPU ${Number(s.cpu || 0).toFixed(1)}%`;
  const meta = crafty
    ? [address(s), active ? span(`${s.players}/${s.maxPlayers} players`) + span(cpu) + span(`RAM ${s.ram}`) : '']
    : [span(s.node, 'dim'), address(s), s.maxPlayers != null ? span(`max ${s.maxPlayers} players`) : '', s.map ? span(s.map, 'dim') : '',
      active && s.cpu != null ? span(cpu) : '', active && s.ram ? span(`RAM ${s.ram}`) : '',
      !active && s.memoryLimit != null ? span(`${memory(s.memoryLimit)} RAM limit`, 'dim') : ''];
  return `<div class="server is-${tone}"><div class="server__main"><div class="server__name">${span(s.name)}${crafty && s.version ? span(s.version, 'tag') : ''}</div><div class="server__meta">${meta.join('')}</div></div><div class="server__side"><span class="server__state ${tone}">${label}</span>${link(s)}</div></div>`;
}

function initPanel(card) {
  const head = card.querySelector('.panel__head'), details = card.querySelector('[data-details]'), list = card.querySelector('[data-list]');
  const hint = card.querySelector('[data-hint]'), count = card.querySelector('[data-count]');
  let open = false, stop, data;
  const render = () => {
    const servers = data?.[card.dataset.panel] || [];
    list.innerHTML = !data ? '<div class="panel__empty">connecting…</div>'
      : !servers.length ? '<div class="panel__empty">No servers found</div>'
        : servers.map(s => serverRow(s, card.dataset.panel === 'crafty')).join('');
    if (data) count.textContent = `${servers.length} server${servers.length === 1 ? '' : 's'}`;
  };
  head.addEventListener('click', () => {
    open = !open;
    card.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    hint.textContent = open ? 'hide servers' : 'view servers';
    if (open) {
      render();
      stop = poll('/api/panel-status', snapshot => { data = snapshot; if (open) render(); }, 30000, () => { data ??= {}; if (open) render(); });
    } else stop?.();
    void expand(details, open);
  });
  details.addEventListener('click', async e => {
    const copy = e.target.closest('[data-copy]');
    if (!copy) return;
    try {
      await navigator.clipboard.writeText(copy.dataset.copy);
      const original = copy.textContent; copy.textContent = '✓ copied';
      setTimeout(() => { if (copy.isConnected) copy.textContent = original; }, 2000);
    } catch { /* Clipboard unavailable. */ }
  });
  details.addEventListener('keydown', e => { if (['Enter', ' '].includes(e.key) && e.target.closest('[data-copy]')) { e.preventDefault(); e.target.click(); } });
}
