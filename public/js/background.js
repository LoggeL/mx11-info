export function initBackground() {
  const canvas = document.querySelector('[data-background]');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const size = 48, mouse = { x: -1, y: -1 };
  let ripples = [], raf = 0;
  function draw() {
    raf = 0;
    const w = canvas.width, h = canvas.height, cols = Math.ceil(w / size), rows = Math.ceil(h / size), now = performance.now();
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 0.5; ctx.beginPath();
    for (let c = 0; c <= cols; c++) { ctx.moveTo(c * size, 0); ctx.lineTo(c * size, h); }
    for (let r = 0; r <= rows; r++) { ctx.moveTo(0, r * size); ctx.lineTo(w, r * size); }
    ctx.stroke();
    if (mouse.x >= 0 && mouse.y >= 0) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(Math.floor(mouse.x / size) * size, Math.floor(mouse.y / size) * size, size, size); }
    ripples = ripples.filter(r => now - r.t < 1200);
    for (const ripple of ripples) {
      const elapsed = now - ripple.t, radius = elapsed * 0.012;
      const col = Math.floor(ripple.x / size), row = Math.floor(ripple.y / size);
      for (let dr = -12; dr <= 12; dr++) for (let dc = -12; dc <= 12; dc++) {
        const distance = Math.sqrt(dr * dr + dc * dc);
        if (distance > radius || distance < radius - 2) continue;
        const alpha = Math.max(0, 0.25 - distance * 0.02) * (1 - elapsed / 1200);
        if (alpha <= 0 || row + dr < 0 || row + dr >= rows || col + dc < 0 || col + dc >= cols) continue;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`; ctx.fillRect((col + dc) * size, (row + dr) * size, size, size);
      }
    }
    if (ripples.length) raf = requestAnimationFrame(draw);
  }
  const schedule = () => { if (!raf) raf = requestAnimationFrame(draw); };
  const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; schedule(); };
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; schedule(); });
  canvas.addEventListener('mouseleave', () => { mouse.x = mouse.y = -1; schedule(); });
  canvas.addEventListener('click', e => { ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); schedule(); });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  resize();
}
