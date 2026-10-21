import { motionStyle, valueAt, easing } from './animation-values.js';
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

export function animate(element, from, to, { duration = 0.3, delay = 0, ease, repeat } = {}) {
  if (reduced.matches) { Object.assign(element.style, motionStyle(to)); return Promise.resolve(); }
  const count = Math.max(1, ...Object.values(to).filter(Array.isArray).map(v => v.length));
  const frames = count > 1 ? Array.from({ length: count }, (_, i) => motionStyle(valueAt(to, i))) : [motionStyle(from), motionStyle(to)];
  const animation = element.animate(frames, { duration: duration * 1000, delay: delay * 1000, easing: easing(ease), fill: 'both', iterations: repeat === Infinity || repeat === null ? Infinity : 1 });
  // JSON encodes the original Infinity repeat as null.
  return animation.finished.then(() => {
    Object.assign(element.style, motionStyle(to)); animation.cancel();
  }).catch(() => {});
}
// Elements marked data-reveal fade in once they enter the viewport; --d staggers them.
export function reveal(root = document) {
  const items = [...root.querySelectorAll('[data-reveal]:not(.is-in)')];
  if (reduced.matches || !('IntersectionObserver' in window)) { items.forEach(el => el.classList.add('is-in')); return; }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const el = entry.target;
      el.classList.add('is-in'); observer.unobserve(el);
      // Hand the element back to its own hover transitions once it has arrived.
      setTimeout(() => el.removeAttribute('data-reveal'), 1400);
    }
  }, { rootMargin: '0px 0px -60px 0px' });
  items.forEach(el => observer.observe(el));
}
export async function removeWithFade(element) {
  if (!element || element.dataset.closing) return;
  element.dataset.closing = 'true';
  await animate(element, { opacity: 1 }, { opacity: 0 }, { duration: 0.2 });
  element.remove();
}
export async function expand(element, open) {
  const height = element.getBoundingClientRect().height;
  element.getAnimations().forEach(animation => animation.cancel());
  if (open) element.hidden = false;
  const target = open ? element.scrollHeight : 0;
  if (!reduced.matches) {
    try { await element.animate([{ height: `${height}px`, opacity: open ? 0 : 1 }, { height: `${target}px`, opacity: open ? 1 : 0 }], { duration: 400, easing: easing('easeInOut') }).finished; } catch { return; }
  }
  element.hidden = !open;
  element.style.height = '';
}
