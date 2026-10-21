// Grid backdrop: a cursor spotlight, click ripples and data packets travelling along the grid lines.
const SIZE = 48, MAX_PACKETS = 7;
export function initBackground() {
  const canvas = document.querySelector('[data-background]');
  const ctx = canvas?.getContext('2d');
  if (!ctx) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const grid = document.createElement('canvas'), gctx = grid.getContext('2d');
  const mouse = { x: -1, y: -1 };
  let w = 0, h = 0, dpr = 1, cols = 0, rows = 0, ripples = [], packets = [], raf = 0, last = 0;

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2); w = innerWidth; h = innerHeight;
    cols = Math.ceil(w / SIZE); rows = Math.ceil(h / SIZE);
    for (const c of [canvas, grid]) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    gctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    gctx.strokeStyle = 'rgba(255,255,255,0.045)'; gctx.lineWidth = 0.5; gctx.beginPath();
    for (let c = 0; c <= cols; c++) { gctx.moveTo(c * SIZE + 0.25, 0); gctx.lineTo(c * SIZE + 0.25, h); }
    for (let r = 0; r <= rows; r++) { gctx.moveTo(0, r * SIZE + 0.25); gctx.lineTo(w, r * SIZE + 0.25); }
    gctx.stroke();
    // Node points at every fourth intersection.
    gctx.fillStyle = 'rgba(255,255,255,0.09)';
    for (let c = 0; c <= cols; c += 4) for (let r = 0; r <= rows; r += 4) gctx.fillRect(c * SIZE - 1, r * SIZE - 1, 2, 2);
    packets = [];
    schedule();
  }
  function spawn() {
    const horizontal = Math.random() < 0.55, dir = Math.random() < 0.5 ? 1 : -1;
    const lane = horizontal ? Math.floor(Math.random() * (rows + 1)) * SIZE : Math.floor(Math.random() * (cols + 1)) * SIZE;
    const span = horizontal ? w : h;
    packets.push({ horizontal, dir, lane, pos: dir > 0 ? -120 : span + 120, span, speed: 70 + Math.random() * 130,
      length: 50 + Math.random() * 110, hue: Math.random() < 0.7 ? '107,118,255' : '255,255,255', delay: Math.random() * 2.5 });
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(grid, 0, 0, w, h);
    if (mouse.x >= 0) {
      const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 280);
      glow.addColorStop(0, 'rgba(107,118,255,0.09)'); glow.addColorStop(1, 'rgba(107,118,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(mouse.x - 280, mouse.y - 280, 560, 560);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(Math.floor(mouse.x / SIZE) * SIZE, Math.floor(mouse.y / SIZE) * SIZE, SIZE, SIZE);
    }
    const animated = !reduced.matches && !document.hidden;
    if (animated) {
      while (packets.length < MAX_PACKETS) spawn();
      packets = packets.filter(p => {
        if (p.delay > 0) { p.delay -= dt; return true; }
        p.pos += p.dir * p.speed * dt;
        const head = p.pos, tail = p.pos - p.dir * p.length;
        const [x1, y1, x2, y2] = p.horizontal ? [tail, p.lane, head, p.lane] : [p.lane, tail, p.lane, head];
        const g = ctx.createLinearGradient(x1, y1, x2, y2);
        g.addColorStop(0, `rgba(${p.hue},0)`); g.addColorStop(1, `rgba(${p.hue},0.55)`);
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.fillStyle = `rgba(${p.hue},0.9)`; ctx.fillRect(x2 - 1, y2 - 1, 2, 2);
        return p.dir > 0 ? tail < p.span + 10 : tail > -10;
      });
    }
    ripples = ripples.filter(r => now - r.t < 1400);
    for (const ripple of ripples) {
      const elapsed = now - ripple.t, radius = elapsed * 0.011;
      const col = Math.floor(ripple.x / SIZE), row = Math.floor(ripple.y / SIZE);
      for (let dr = -14; dr <= 14; dr++) for (let dc = -14; dc <= 14; dc++) {
        const distance = Math.hypot(dr, dc);
        if (distance > radius || distance < radius - 2) continue;
        const alpha = Math.max(0, 0.28 - distance * 0.018) * (1 - elapsed / 1400);
        if (alpha <= 0 || row + dr < 0 || row + dr >= rows || col + dc < 0 || col + dc >= cols) continue;
        ctx.fillStyle = `rgba(150,158,255,${alpha})`;
        ctx.fillRect((col + dc) * SIZE, (row + dr) * SIZE, SIZE, SIZE);
      }
    }
    if (animated || ripples.length) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(frame); }
  const interactive = target => target instanceof Element && target.closest('a, button, input, textarea, [role="dialog"], .card');
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', e => { if (e.pointerType !== 'mouse') return; mouse.x = e.clientX; mouse.y = e.clientY; schedule(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -1; schedule(); });
  window.addEventListener('click', e => { if (interactive(e.target)) return; ripples.push({ x: e.clientX, y: e.clientY, t: performance.now() }); schedule(); });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  resize();
}
