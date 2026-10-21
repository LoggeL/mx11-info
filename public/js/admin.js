import { element, escape, icons, json, poll } from './dom.js';
import { animate, removeWithFade } from './animations.js';

export function initAdmin() {
  const trigger = document.querySelector('[data-admin-open]');
  if (!trigger) return;
  let modal, state = { authed: false, announcement: null }, type = 'info', banner, dismissed = false, bannerKey;
  function announcement(ann) {
    const key = ann ? `${ann.type}:${ann.message}` : '';
    if (key === bannerKey) return;
    bannerKey = key; if (banner) { banner.remove(); banner = null; }
    if (!ann || dismissed) return;
    const tone = ['info', 'warning', 'error'].includes(ann.type) ? ann.type : 'info';
    banner = element(`<div class="toast toast--${tone}" role="status"><span class="toast__icon">${icons[tone]}</span><p class="toast__text">${escape(ann.message)}</p><button class="toast__close" aria-label="Dismiss announcement">✕</button></div>`);
    document.querySelector('[data-toasts]').append(banner);
    void animate(banner, { opacity: 0, y: -20 }, { opacity: 1, y: 0 }, { duration: 0.4 });
    banner.querySelector('button').addEventListener('click', () => { dismissed = true; void removeWithFade(banner); });
  }
  poll('/api/admin', data => { state = data; announcement(data.announcement); });
  const refresh = async () => { state = await json('/api/admin'); announcement(state.announcement); };
  const error = message => { const el = modal?.querySelector('[data-error]'); if (el) { el.hidden = !message; el.textContent = message; } };
  const feedback = message => { const button = modal?.querySelector('[data-publish]'); if (button) { button.textContent = message; setTimeout(() => { if (button.isConnected) button.textContent = 'Publish'; }, 2000); } };
  const mutate = (method, body, path = '/api/admin') => json(path, { method, ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}) });
  const typeButtons = () => ['info', 'warning', 'error'].map(t => `<button type="button" data-type="${t}" class="type tone-${t}" aria-pressed="${t === type}">${t}</button>`).join('');
  function render() {
    if (!modal) return;
    const content = modal.querySelector('[data-admin-content]');
    content.innerHTML = !state.authed
      ? `<form data-login class="stack"><input class="input" type="password" name="password" placeholder="Password" aria-label="Password" autocomplete="current-password"><p data-error hidden class="err"></p><button class="button">Login</button></form>`
      : `<div class="stack">${state.announcement ? `<div class="notice tone-${escape(state.announcement.type)}"><small>Active announcement</small>${escape(state.announcement.message)}<br><button type="button" data-clear>clear →</button></div>` : ''}<p class="eyebrow">New announcement</p><textarea class="input" placeholder="Message..." aria-label="Message" rows="3" maxlength="2000"></textarea><div class="types">${typeButtons()}</div><button type="button" data-publish disabled class="button">Publish</button><button type="button" data-logout class="link-btn">logout</button><p data-error hidden class="err"></p></div>`;
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
    modal = element(`<div role="dialog" aria-modal="true" aria-label="Admin" class="modal"><div class="modal__box"><div class="modal__head"><h2>Admin</h2><button type="button" data-close aria-label="Close admin" class="icon-btn">✕</button></div><div data-admin-content></div></div></div>`);
    document.body.append(modal); render();
    void animate(modal, { opacity: 0 }, { opacity: 1 });
    void animate(modal.firstElementChild, { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1 }, { duration: 0.2 });
    modal.addEventListener('click', async e => {
      if (e.target === modal || e.target.closest('[data-close]')) { void close(); return; }
      const typeButton = e.target.closest('[data-type]');
      if (typeButton) {
        type = typeButton.dataset.type;
        for (const button of modal.querySelectorAll('[data-type]')) button.setAttribute('aria-pressed', String(button.dataset.type === type));
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
