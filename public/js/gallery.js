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
      lightbox = element('<div role="dialog" aria-modal="true" aria-label="Portfolio preview" class="fixed inset-0 z-[9999] flex items-center justify-center bg-black pointer-events-auto"></div>');
      lightbox.addEventListener('click', e => {
        if (e.target === lightbox || e.target.closest('[data-close]')) close();
        else if (e.target.closest('[data-prev]')) show(selected - 1);
        else if (e.target.closest('[data-next]')) show(selected + 1);
      });
      document.body.append(lightbox); document.body.style.overflow = 'hidden';
      void animate(lightbox, { opacity: 0 }, { opacity: 1 });
    }
    lightbox.innerHTML = `<button data-close aria-label="Close preview" class="absolute top-4 right-4 z-10 text-white/60 hover:text-white text-3xl transition-colors p-2">✕</button>${index > 0 ? '<button data-prev aria-label="Previous" class="absolute left-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4">‹</button>' : ''}${index < items.length - 1 ? '<button data-next aria-label="Next" class="absolute right-4 z-10 text-white/60 hover:text-white text-4xl transition-colors p-4">›</button>' : ''}${photos ? `<img data-preview src="${url(item.preview)}" class="max-w-[90vw] max-h-[90vh] object-contain select-none" alt="Preview">` : `<div class="w-[90vw] max-w-5xl aspect-video"><iframe title="${escape(item.title)}" src="https://www.youtube.com/embed/${encodeURIComponent(item.id)}?autoplay=1&amp;rel=0" class="w-full h-full rounded-lg" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`}<div class="absolute bottom-4 text-white/40 text-sm font-mono">${index + 1} / ${items.length}</div>`;
    if (photos) void animate(lightbox.querySelector('[data-preview]'), { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1 }, { duration: 0.2 });
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
  try {
    const data = await json(photos ? '/api/portfolio' : '/api/videos');
    items = photos ? (data.assets || []).filter(a => a.type === 'IMAGE') : data.videos || [];
  } catch { /* Keep the original empty-portfolio state when unconfigured. */ }
  gallery.className = photos ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  gallery.innerHTML = items.map((item, index) => {
    const animation = escape(JSON.stringify({ initial: { opacity: 0, scale: 0.9 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.3, delay: index * (photos ? 0.03 : 0.05) } }));
    return photos ? `<div data-item="${index}" data-motion="${animation}" role="button" tabindex="0" aria-label="${escape(item.filename)}" class="aspect-square rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all pointer-events-auto"><img src="${url(item.thumb)}" alt="${escape(item.filename)}" class="w-full h-full object-cover" loading="lazy"></div>` : `<div data-item="${index}" data-motion="${animation}" role="button" tabindex="0" aria-label="${escape(item.title)}" class="rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/20 transition-all pointer-events-auto border border-white/[0.08] bg-white/[0.03]"><div class="relative aspect-video"><img src="${url(item.thumbnail)}" alt="${escape(item.title)}" class="w-full h-full object-cover" loading="lazy"><div class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"><div class="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center"><div class="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-black border-b-[10px] border-b-transparent ml-1"></div></div></div></div><div class="p-3"><p class="text-white/80 text-sm font-medium truncate">${escape(item.title)}</p></div></div>`;
  }).join('');
  reveal(gallery);
  gallery.addEventListener('click', e => { const item = e.target.closest('[data-item]'); if (item) show(Number(item.dataset.item)); });
  gallery.addEventListener('keydown', e => { const item = e.target.closest('[data-item]'); if (item && ['Enter', ' '].includes(e.key)) { e.preventDefault(); show(Number(item.dataset.item)); } });
}
