import { element, escape, json, poll } from './dom.js';
import { animate, removeWithFade } from './animations.js';

const typeColors = { info: 'text-blue-400 border-blue-500/40', warning: 'text-yellow-400 border-yellow-500/40', error: 'text-red-400 border-red-500/40' };
const inputClass = 'w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-4 py-2.5 text-white text-sm font-mono outline-none focus:border-white/20 transition-colors';
const buttonClass = 'w-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] rounded-lg py-2.5 text-white text-sm font-mono transition-colors';
export function initAdmin() {
  const trigger = document.querySelector('[data-admin-open]');
  if (!trigger) return;
  let modal, state = { authed: false, announcement: null }, type = 'info', banner, dismissed = false, bannerKey;
  function announcement(ann) {
    const key = ann ? `${ann.type}:${ann.message}` : '';
    if (key === bannerKey) return;
    bannerKey = key; if (banner) { banner.remove(); banner = null; }
    if (!ann || dismissed) return;
    const colors = { info: ['blue', 'ℹ️'], warning: ['yellow', '⚠️'], error: ['red', '🚨'] };
    const [color, icon] = colors[ann.type] || colors.info;
    banner = element(`<div class="fixed top-0 left-0 right-0 z-50 pointer-events-none"><div class="mx-4 sm:mx-auto max-w-2xl mt-4 rounded-xl border px-5 py-3 flex items-center gap-4 backdrop-blur-md shadow-lg pointer-events-auto border-${color}-500/40 bg-${color}-500/10"><span class="text-lg flex-shrink-0">${icon}</span><p class="text-sm flex-1 text-${color}-300">${escape(ann.message)}</p><button aria-label="Dismiss announcement" class="text-white/30 hover:text-white/60 text-lg leading-none flex-shrink-0 transition-colors">✕</button></div></div>`);
    document.querySelector('main').prepend(banner);
    void animate(banner, { opacity: 0, y: -20 }, { opacity: 1, y: 0 }, { duration: 0.4 });
    banner.querySelector('button').addEventListener('click', () => { dismissed = true; void removeWithFade(banner); });
  }
  poll('/api/admin', data => { state = data; announcement(data.announcement); });
  const refresh = async () => { state = await json('/api/admin'); announcement(state.announcement); };
  const error = message => { const el = modal?.querySelector('[data-error]'); if (el) { el.hidden = !message; el.textContent = message; } };
  const feedback = message => { const button = modal?.querySelector('[data-publish]'); if (button) { button.textContent = message; setTimeout(() => { if (button.isConnected) button.textContent = 'Publish'; }, 2000); } };
  const mutate = (method, body, path = '/api/admin') => json(path, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  function render() {
    if (!modal) return;
    const content = modal.querySelector('[data-admin-content]');
    content.innerHTML = !state.authed ? `<form data-login class="space-y-3"><input type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password" class="${inputClass}"><p data-error hidden class="text-red-400 text-xs font-mono"></p><button class="${buttonClass}">Login</button></form>` : `<div class="space-y-4">${state.announcement ? `<div class="rounded-lg border p-3 ${typeColors[state.announcement.type]}"><p class="text-xs font-mono mb-1 opacity-60">Active announcement</p><p class="text-sm">${escape(state.announcement.message)}</p><button data-clear class="mt-2 text-xs font-mono opacity-40 hover:opacity-80 transition-opacity">clear →</button></div>` : ''}<div class="space-y-2"><p class="text-white/40 text-xs font-mono uppercase tracking-wider">New announcement</p><textarea placeholder="Message..." aria-label="Message" rows="3" maxlength="2000" class="${inputClass} resize-none"></textarea><div class="flex gap-2">${['info', 'warning', 'error'].map(t => `<button data-type="${t}" class="flex-1 py-2 rounded-lg border text-xs font-mono transition-colors ${t === type ? typeColors[t] + ' bg-white/[0.05]' : 'border-white/[0.08] text-white/30 hover:text-white/50'}">${t}</button>`).join('')}</div><button data-publish disabled class="${buttonClass} disabled:opacity-30">Publish</button></div><button data-logout class="w-full text-white/20 hover:text-white/40 text-xs font-mono transition-colors py-1">logout</button><p data-error hidden class="text-red-400 text-xs font-mono"></p></div>`;
    content.querySelector('[data-login]')?.addEventListener('submit', async e => {
      e.preventDefault(); error('');
      const password = content.querySelector('input');
      try { await mutate('POST', { action: 'login', password: password.value }); password.value = ''; await refresh(); render(); }
      catch (failure) { error(failure.message); }
    });
    content.querySelector('textarea')?.addEventListener('input', e => { content.querySelector('[data-publish]').disabled = !e.target.value.trim(); });
  }
  async function close() {
    const previous = modal; modal = null;
    await removeWithFade(previous); trigger.focus();
  }
  trigger.addEventListener('click', async () => {
    if (modal) return;
    modal = element(`<div role="dialog" aria-modal="true" aria-label="Admin" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"><div class="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0f0f0f] p-6 shadow-2xl"><div class="flex items-center justify-between mb-5"><h2 class="text-white font-semibold text-base">Admin</h2><button data-close aria-label="Close admin" class="text-white/30 hover:text-white/60 transition-colors">✕</button></div><div data-admin-content></div></div></div>`);
    // Mount in the footer to preserve its inherited alignment.
    trigger.after(modal); render();
    void animate(modal, { opacity: 0 }, { opacity: 1 });
    void animate(modal.firstElementChild, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1 }, { duration: 0.2 });
    modal.addEventListener('click', async e => {
      if (e.target === modal || e.target.closest('[data-close]')) { void close(); return; }
      const typeButton = e.target.closest('[data-type]');
      if (typeButton) {
        type = typeButton.dataset.type;
        for (const button of modal.querySelectorAll('[data-type]')) button.className = `flex-1 py-2 rounded-lg border text-xs font-mono transition-colors ${button.dataset.type === type ? typeColors[type] + ' bg-white/[0.05]' : 'border-white/[0.08] text-white/30 hover:text-white/50'}`;
      }
      try {
        if (e.target.closest('[data-publish]')) {
          const button = e.target.closest('[data-publish]'), textarea = modal.querySelector('textarea');
          button.disabled = true; button.textContent = 'Saving...';
          try { await mutate('POST', { action: 'announcement', message: textarea.value, type }); await refresh(); render(); feedback('✓ saved'); }
          catch { button.disabled = !textarea.value.trim(); feedback('Save failed'); }
        } else if (e.target.closest('[data-clear]')) { await mutate('DELETE'); await refresh(); render(); feedback('✓ cleared'); }
        else if (e.target.closest('[data-logout]')) { await mutate('DELETE', null, '/api/admin?action=logout'); state.authed = false; render(); }
      } catch (failure) { error(failure.message); }
    });
    try { await refresh(); render(); modal?.querySelector('input, textarea')?.focus(); }
    catch { error('Admin service unavailable'); }
  });
  document.addEventListener('keydown', e => {
    if (!modal) return;
    if (e.key === 'Escape') { void close(); return; }
    if (e.key === 'Tab') {
      const items = [...modal.querySelectorAll('button:not(:disabled), input, textarea')].filter(el => !el.hidden);
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  });
}
