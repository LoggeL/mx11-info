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
export function reveal(root = document) {
  for (const element of root.querySelectorAll('[data-motion]')) {
    const { initial = {}, animate: target = {}, viewport, transition, hover } = JSON.parse(element.dataset.motion);
    element.removeAttribute('data-motion');
    const start = () => animate(element, initial, target, transition);
    if (reduced.matches) Object.assign(element.style, motionStyle(target));
    else {
      Object.assign(element.style, motionStyle(initial));
      if (viewport) {
        const observer = new IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void start(); }
        }, { rootMargin: viewport.margin || '0px' });
        observer.observe(element);
      } else void start();
    }
    if (hover) {
      let animation;
      const move = values => {
        if (reduced.matches) return;
        const current = getComputedStyle(element);
        const from = { transform: current.transform, opacity: current.opacity };
        animation?.cancel();
        animation = element.animate([from, motionStyle({ ...target, ...values })], { duration: (transition?.duration ?? 0.3) * 1000, easing: easing(transition?.ease), fill: 'forwards' });
      };
      element.addEventListener('mouseenter', () => move(hover));
      element.addEventListener('mouseleave', () => move(target));
    }
  }
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
