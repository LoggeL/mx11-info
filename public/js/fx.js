import { json, url } from './dom.js';

// Pointer spotlight for every card: the CSS reads --mx/--my.
export function initSpotlight() {
  document.addEventListener('pointermove', e => {
    const card = e.target instanceof Element && e.target.closest('.card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    card.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, { passive: true });
}

// Chromatic copies of the logo for the glitch slices.
export function initGlitch() {
  const svg = document.querySelector('.hero__logo > svg');
  for (const layer of document.querySelectorAll('[data-glitch]')) {
    const copy = svg.cloneNode(true);
    copy.removeAttribute('role'); copy.removeAttribute('aria-label'); copy.setAttribute('aria-hidden', 'true');
    layer.append(copy);
  }
}

// Portfolio cards preview real frames once they come close to the viewport.
export function initFolio() {
  const cards = document.querySelectorAll('[data-folio]');
  if (!cards.length) return;
  const load = async card => {
    const media = card.querySelector('[data-folio-media]');
    try {
      if (card.dataset.folio === 'photos') {
        const { assets = [] } = await json('/api/portfolio');
        media.innerHTML = assets.filter(a => a.type === 'IMAGE').slice(0, 3).map(a => `<img src="${url(a.thumb)}" alt="" loading="lazy">`).join('');
      } else {
        const { videos = [] } = await json('/api/videos');
        if (videos[0]?.thumbnail) media.innerHTML = `<img src="${url(videos[0].thumbnail)}" alt="" loading="lazy">`;
      }
    } catch { /* The card works without a preview when the portfolio is not configured. */ }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) { observer.unobserve(entry.target); void load(entry.target); }
  }, { rootMargin: '300px' });
  cards.forEach(card => observer.observe(card));

  const video = document.querySelector('[data-folio="videos"]'), code = video?.querySelector('[data-timecode]');
  if (!code) return;
  let timer, start;
  const pad = n => String(n).padStart(2, '0');
  const tick = () => {
    const frames = Math.floor((performance.now() - start) / 40);
    code.textContent = `${pad(Math.floor(frames / 90000))}:${pad(Math.floor(frames / 1500) % 60)}:${pad(Math.floor(frames / 25) % 60)}:${pad(frames % 25)}`;
  };
  video.addEventListener('pointerenter', () => { start = performance.now(); clearInterval(timer); timer = setInterval(tick, 40); });
  video.addEventListener('pointerleave', () => { clearInterval(timer); code.textContent = '00:00:00:00'; });
}
