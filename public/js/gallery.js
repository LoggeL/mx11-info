import { element, escape, url, json } from './dom.js';
import { animate, removeWithFade, reveal } from './animations.js';

export async function initGallery(kind) {
  const gallery = document.querySelector('[data-gallery]');
  if (!gallery) return;
  const photos = kind === 'photos';
  let items = [], selected = null, lightbox, priorFocus;
  function close() {
    const current = lightbox; lightbox = null; selected = null;
    document.body.style.overflow = '';
    void removeWithFade(current); priorFocus?.focus();
  }
  function show(index) {
    if (index < 0 || index >= items.length) return;
    selected = index;
    const item = items[index];
    if (!lightbox) {
      priorFocus = document.activeElement;
      lightbox = element('<div role="dialog" aria-modal="true" aria-label="Portfolio preview" class="lightbox"></div>');
      lightbox.addEventListener('click', e => {
        if (e.target === lightbox || e.target.closest('[data-close]')) close();
        else if (e.target.closest('[data-prev]')) show(selected - 1);
        else if (e.target.closest('[data-next]')) show(selected + 1);
      });
      document.body.append(lightbox); document.body.style.overflow = 'hidden';
      void animate(lightbox, { opacity: 0 }, { opacity: 1 });
    }
    lightbox.innerHTML = `<button data-close aria-label="Close preview" class="lightbox__btn lightbox__close">✕</button>${index > 0 ? '<button data-prev aria-label="Previous" class="lightbox__btn lightbox__prev">‹</button>' : ''}${index < items.length - 1 ? '<button data-next aria-label="Next" class="lightbox__btn lightbox__next">›</button>' : ''}${photos ? `<img data-preview src="${url(item.preview)}" alt="${escape(item.filename)}">` : `<div class="lightbox__video"><iframe title="${escape(item.title)}" src="https://www.youtube.com/embed/${encodeURIComponent(item.id)}?autoplay=1&amp;rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`}<div class="lightbox__count">${String(index + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}</div>`;
    if (photos) void animate(lightbox.querySelector('[data-preview]'), { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1 }, { duration: 0.25 });
    lightbox.querySelector('[data-close]').focus();
  }
  document.addEventListener('keydown', e => {
    if (selected === null) return;
    if (['Escape', 'ArrowRight', 'ArrowLeft'].includes(e.key)) e.preventDefault();
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(selected + 1);
    else if (e.key === 'ArrowLeft') show(selected - 1);
    else if (e.key === 'Tab') {
      const buttons = [...lightbox.querySelectorAll('button, iframe')], first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let failed = false;
  try {
    const data = await json(photos ? '/api/portfolio' : '/api/videos');
    items = photos ? (data.assets || []).filter(a => a.type === 'IMAGE') : data.videos || [];
  } catch { failed = true; }
  const count = document.querySelector('[data-count]');
  if (count) count.textContent = `${items.length} ${photos ? 'frames' : 'clips'}`;
  gallery.innerHTML = !items.length
    ? `<p class="gallery__state">${failed ? 'Portfolio is offline right now — check back soon.' : 'Nothing here yet.'}</p>`
    : items.map((item, index) => {
      const delay = `--d:${Math.min(index, 24) * (photos ? 30 : 50)}ms`;
      return photos
        ? `<div data-item="${index}" data-reveal style="${delay}" role="button" tabindex="0" aria-label="${escape(item.filename)}" class="shot"><img src="${url(item.thumb)}" alt="${escape(item.filename)}" loading="lazy"></div>`
        : `<div data-item="${index}" data-reveal style="${delay}" role="button" tabindex="0" aria-label="${escape(item.title)}" class="card clip"><div class="clip__thumb"><img src="${url(item.thumbnail)}" alt="" loading="lazy"><div class="clip__play"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg></span></div></div><p class="clip__title">${escape(item.title)}</p></div>`;
    }).join('');
  reveal(gallery);
  gallery.addEventListener('click', e => { const item = e.target.closest('[data-item]'); if (item) show(Number(item.dataset.item)); });
  gallery.addEventListener('keydown', e => { const item = e.target.closest('[data-item]'); if (item && ['Enter', ' '].includes(e.key)) { e.preventDefault(); show(Number(item.dataset.item)); } });
}
