/**
 * GradSetu — White & Electric Blue Confetti Celebration
 */

export function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.style.display = 'block';

  // Electric Blue & Modern Palette
  const COLORS = [
    '#1769FF', '#0B57D0', '#2563EB',
    '#38BDF8', '#60A5FA', '#93C5FD',
    '#12B76A', '#34D399', '#EAF2FF',
    '#FFFFFF'
  ];

  const SHAPES = ['rect', 'circle', 'star'];

  const particles = [];
  const N = 180;

  for (let i = 0; i < N; i++) {
    particles.push({
      x:     Math.random() * canvas.width,
      y:     -20 - Math.random() * 200,
      vx:    (Math.random() - 0.5) * 4,
      vy:    2.5 + Math.random() * 4,
      rot:   Math.random() * 360,
      rotV:  (Math.random() - 0.5) * 8,
      w:     6 + Math.random() * 10,
      h:     6 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      alpha: 1,
      decay: 0.003 + Math.random() * 0.005,
    });
  }

  let alive = true;
  let startTime = performance.now();
  const DURATION = 4000; // ms

  function drawStar(ctx, cx, cy, r, spikes, color) {
    const outerR = r;
    const innerR = r * 0.45;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerR;
      let y = cy + Math.sin(rot) * outerR;
      ctx.lineTo(x, y);
      rot += step;
      x = cx + Math.cos(rot) * innerR;
      y = cy + Math.sin(rot) * innerR;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function render(now) {
    if (!alive) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;

    particles.forEach(p => {
      p.x    += p.vx;
      p.y    += p.vy;
      p.rot  += p.rotV;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > canvas.height + 40) return;
      activeCount++;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, 0, 0, p.w / 2, 5, p.color);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      ctx.restore();
    });

    if (now - startTime > DURATION || activeCount === 0) {
      alive = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.display = 'none';
      return;
    }

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
