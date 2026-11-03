/**
 * GradSetu — Curved Carousel with College Student Discussion Showcase
 * Cylindrical curve geometry, drag+momentum, continuous auto-scroll
 */

export class CurvedCarousel {
  constructor(canvasEl, options = {}) {
    this.canvas   = canvasEl;
    this.ctx      = canvasEl.getContext('2d');
    this.opts     = {
      scrollSpeed:   45,        // px/sec (logical units)
      friction:      0.05,      // velocity decay per frame (momentum)
      cardPitch:     210,       // spacing between card centres (logical)
      frameW:        1440,
      frameH:        1080,
      carouselY:     540,       // dynamically calculated in _resize
      numCards:      10,
      cornerRadius:  16,
      ...options
    };

    // Logical scroll offset (in logical px, loops)
    this.scrollOffset = 0;
    this.velocity = 0;         // px/sec momentum
    this.isDragging = false;
    this.lastPointerX = 0;
    this.lastPointerTime = 0;
    this.dragVelocityX = 0;

    // Scale factor: logical → canvas CSS px
    this.scale = 1;

    // College Student Discussion Images
    this.images = [];
    this.imagesLoaded = 0;

    // Animation clock (time-based)
    this.startTime = null;
    this.raf = null;

    this._init();
  }

  _init() {
    this._loadMedia();
    this._bindEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._startLoop();
  }

  _loadMedia() {
    const sources = [
      'images/student-discussion-1.jpg',
      'images/student-discussion-2.jpg',
      'images/student-discussion-3.jpg',
      'images/student-discussion-4.jpg'
    ];

    sources.forEach(src => {
      const img = new Image();
      img.onload = () => {
        this.imagesLoaded++;
      };
      img.src = src;
      this.images.push(img);
    });
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    // Scale: logical units → CSS px
    this.displayW = rect.width;
    this.displayH = rect.height;

    // Frame scale
    this.scale = rect.width / this.opts.frameW;

    // Keep carousel centered vertically in logical coordinates
    if (this.scale > 0) {
      this.opts.carouselY = (rect.height / this.scale) * 0.5;
    }
  }

  // ── Geometry ────────────────────────────────────────────────

  /**
   * Given a logical x position (relative to frame centre 720),
   * compute card dimensions for cylindrical curve.
   */
  _cardGeometry(centreX) {
    const cx = this.opts.frameW / 2; // 720
    const r = 706;                  // half-frame radius

    const t = centreX - cx;  // offset from centre
    const d = Math.abs(t) / r;
    const dClamped = Math.min(d, 1);

    // Card centre width (narrower at centre, wider at edges)
    const cardW = 180 + 44 * dClamped * dClamped;

    // Card centre y
    const cardCentreY = this.opts.carouselY - 14 * dClamped * dClamped;

    // Each edge has its own q (normalised distance of that edge from centre)
    const leftEdgeX = centreX - cardW / 2;
    const rightEdgeX = centreX + cardW / 2;

    const qLeft = Math.min(Math.abs(leftEdgeX - cx) / r, 1);
    const qRight = Math.min(Math.abs(rightEdgeX - cx) / r, 1);

    const leftH  = 290 + 85 * Math.pow(qLeft,  2.6);
    const rightH = 290 + 85 * Math.pow(qRight, 2.6);

    return { cardW, cardCentreY, leftH, rightH };
  }

  /**
   * Compute the x centres of all 10 cards using the pitch + outward push.
   * Returns array of logical x positions.
   */
  _cardCentres() {
    const cx     = this.opts.frameW / 2;
    const r      = 706;
    const pitch  = this.opts.cardPitch;
    const n      = this.opts.numCards;
    const loopW  = pitch * n;           // total loop width

    // Normalise scrollOffset into [0, loopW)
    const offset = ((this.scrollOffset % loopW) + loopW) % loopW;

    const centres = [];

    for (let i = 0; i < n; i++) {
      let rawX = i * pitch - offset;

      while (rawX > cx + loopW / 2) rawX -= loopW;
      while (rawX < cx - loopW / 2) rawX += loopW;

      // Outward push
      const t = rawX - cx;
      const pushedX = cx + t * (1 + 0.083 * Math.pow(t / r, 2));

      centres.push({ rawX, pushedX, tileIndex: i });
    }

    return centres;
  }

  // ── Draw ─────────────────────────────────────────────────────

  _drawCard(tileIndex, centreX) {
    const ctx = this.ctx;
    const opts = this.opts;
    const s = this.scale;

    const { cardW, cardCentreY, leftH, rightH } = this._cardGeometry(centreX);

    // Compute corners in logical units, then scale to display px
    const lx = (centreX - cardW / 2) * s;
    const rx = (centreX + cardW / 2) * s;
    const topL = (cardCentreY - leftH / 2) * s;
    const bottomL = (cardCentreY + leftH / 2) * s;
    const topR = (cardCentreY - rightH / 2) * s;
    const bottomR = (cardCentreY + rightH / 2) * s;

    const cr = opts.cornerRadius * s; // corner radius in display px

    const TL = { x: lx, y: topL };
    const TR = { x: rx, y: topR };
    const BR = { x: rx, y: bottomR };
    const BL = { x: lx, y: bottomL };

    const cardDisplayW = (rx - lx);
    const cardDisplayH = (Math.max(bottomL, bottomR) - Math.min(topL, topR));

    // --- Build clip path (rounded quad) ---
    ctx.save();
    ctx.beginPath();
    this._roundedQuad(ctx, TL, TR, BR, BL, cr);
    ctx.clip();

    // --- Background Fallback Gradient ---
    const fillGrad = ctx.createLinearGradient(lx, topL, rx, bottomR);
    fillGrad.addColorStop(0, '#FFFFFF');
    fillGrad.addColorStop(1, '#EAF2FF');
    ctx.fillStyle = fillGrad;
    ctx.fillRect(lx, Math.min(topL, topR), cardDisplayW, cardDisplayH);

    // --- College Student Discussion Photo ---
    const imgIndex = tileIndex % (this.images.length || 1);
    const img = this.images[imgIndex];

    if (img && img.complete && img.naturalWidth > 0) {
      const scaleX = cardDisplayW / img.naturalWidth;
      const scaleY = cardDisplayH / img.naturalHeight;
      const coverScale = Math.max(scaleX, scaleY);

      const destW = img.naturalWidth * coverScale;
      const destH = img.naturalHeight * coverScale;
      const destX = lx + (cardDisplayW - destW) / 2;
      const destY = Math.min(topL, topR) + (cardDisplayH - destH) / 2;

      ctx.drawImage(img, destX, destY, destW, destH);
    }

    // --- Gradient overlay (bottom fade for text/button contrast) ---
    const gradH = Math.min(cardDisplayH * 0.45, 120 * s);
    const overlayGrad = ctx.createLinearGradient(0, Math.max(bottomL, bottomR) - gradH, 0, Math.max(bottomL, bottomR));
    overlayGrad.addColorStop(0, 'rgba(16, 24, 40, 0)');
    overlayGrad.addColorStop(1, 'rgba(16, 24, 40, 0.72)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(lx, Math.max(bottomL, bottomR) - gradH, cardDisplayW, gradH);

    // --- Card Category Badge (Top Left) ---
    const CARD_TAGS = [
      'STUDENT INTEL',
      'CAMPUS DIALOGUE',
      'INNOVATION LAB',
      'PEER CIRCLE',
      'CROSS-CAMPUS',
      'HACKATHON HUBS',
      'UNFILTERED SIGNAL',
      'STUDENT MENTORS',
      'PROJECT HUDDLE',
      'STUDENT TALKS'
    ];
    const tag = CARD_TAGS[tileIndex % CARD_TAGS.length];

    ctx.save();
    const tagPadX = 8 * s;
    const tagH    = 20 * s;
    const tagY    = Math.min(topL, topR) + 12 * s;
    const tagX    = lx + 12 * s;
    ctx.font      = `700 ${10 * s}px Inter, sans-serif`;
    const textW   = ctx.measureText(tag).width;
    const tagW    = textW + tagPadX * 2;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    if (ctx.roundRect) {
      ctx.roundRect(tagX, tagY, tagW, tagH, 6 * s);
    } else {
      ctx.rect(tagX, tagY, tagW, tagH);
    }
    ctx.fill();

    ctx.fillStyle = '#1769FF';
    ctx.fillText(tag, tagX + tagPadX, tagY + 14 * s);
    ctx.restore();

    // --- Play icon (Bottom Left) ---
    ctx.save();
    const iconR = 14 * s;
    const iconX = lx + 14 * s + iconR;
    const iconY = Math.max(bottomL, bottomR) - 14 * s - iconR;

    ctx.beginPath();
    ctx.arc(iconX, iconY, iconR, 0, Math.PI * 2);
    ctx.fillStyle = '#1769FF';
    ctx.fill();

    // White Triangle Play Arrow
    ctx.beginPath();
    ctx.moveTo(iconX - 4 * s, iconY - 5 * s);
    ctx.lineTo(iconX + 6 * s, iconY);
    ctx.lineTo(iconX - 4 * s, iconY + 5 * s);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    // Label beside play button
    ctx.font = `600 ${11 * s}px Inter, sans-serif`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Campus Discussion', iconX + iconR + 8 * s, iconY + 4 * s);
    ctx.restore();

    // --- Card Outline Border ---
    ctx.restore();
    ctx.save();
    this._roundedQuad(ctx, TL, TR, BR, BL, cr);
    ctx.strokeStyle = 'rgba(23, 105, 255, 0.32)';
    ctx.lineWidth   = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw a rounded quadrilateral.
   */
  _roundedQuad(ctx, TL, TR, BR, BL, cr) {
    function edgeLen(A, B) {
      return Math.sqrt((B.x - A.x)**2 + (B.y - A.y)**2);
    }

    const r = Math.min(cr, edgeLen(TL, TR)/2, edgeLen(TL, BL)/2, edgeLen(TR, BR)/2, edgeLen(BL, BR)/2, 22);
    const t = r;

    const fTL_top   = t / (edgeLen(TL, TR) || 1);
    const fTL_left  = t / (edgeLen(TL, BL) || 1);
    const fTR_top   = t / (edgeLen(TR, TL) || 1);
    const fTR_right = t / (edgeLen(TR, BR) || 1);
    const fBR_right = t / (edgeLen(BR, TR) || 1);
    const fBR_bot   = t / (edgeLen(BR, BL) || 1);
    const fBL_bot   = t / (edgeLen(BL, BR) || 1);
    const fBL_left  = t / (edgeLen(BL, TL) || 1);

    function lerp(A, B, f) {
      return { x: A.x + (B.x - A.x) * f, y: A.y + (B.y - A.y) * f };
    }

    const p0 = lerp(TL, BL, fTL_left);
    const p1 = lerp(TL, TR, fTL_top);
    const p2 = lerp(TR, TL, fTR_top);
    const p3 = lerp(TR, BR, fTR_right);
    const p4 = lerp(BR, TR, fBR_right);
    const p5 = lerp(BR, BL, fBR_bot);
    const p6 = lerp(BL, BR, fBL_bot);
    const p7 = lerp(BL, TL, fBL_left);

    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(TL.x, TL.y, p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.quadraticCurveTo(TR.x, TR.y, p3.x, p3.y);
    ctx.lineTo(p4.x, p4.y);
    ctx.quadraticCurveTo(BR.x, BR.y, p5.x, p5.y);
    ctx.lineTo(p6.x, p6.y);
    ctx.quadraticCurveTo(BL.x, BL.y, p7.x, p7.y);
    ctx.closePath();
  }

  // ── Animation Loop ──────────────────────────────────────────

  _startLoop() {
    const tick = (now) => {
      if (!this.startTime) this.startTime = now;
      const dt = Math.min((now - (this._lastTime || now)) / 1000, 0.05); // cap at 50ms
      this._lastTime = now;

      this._update(dt);
      this._render();

      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  _update(dt) {
    if (this.isDragging) {
      // Offset updated directly in pointermove
    } else {
      // Momentum decay
      if (Math.abs(this.velocity) > 0.5) {
        this.scrollOffset += this.velocity * dt;
        this.velocity     *= Math.pow(this.opts.friction, dt);
      } else {
        this.velocity      = 0;
        this.scrollOffset += this.opts.scrollSpeed * dt;
      }
    }
  }

  _render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.displayW, this.displayH);

    const centres = this._cardCentres();

    // Sort back-to-front (cards furthest from cx drawn first)
    const cx = this.opts.frameW / 2;
    centres.sort((a, b) => Math.abs(b.pushedX - cx) - Math.abs(a.pushedX - cx));

    centres.forEach(({ pushedX, tileIndex }) => {
      this._drawCard(tileIndex, pushedX);
    });
  }

  // ── Drag & Touch Events ─────────────────────────────────────

  _bindEvents() {
    const c = this.canvas;

    c.addEventListener('pointerdown', (e) => {
      this.isDragging     = true;
      this.velocity       = 0;
      this.lastPointerX   = e.clientX;
      this.lastPointerTime= performance.now();
      this.dragVelocityX  = 0;
      c.setPointerCapture(e.pointerId);
      c.style.cursor      = 'grabbing';
    });

    c.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;

      const now = performance.now();
      const dx  = e.clientX - this.lastPointerX;
      const dt  = Math.max(now - this.lastPointerTime, 1);

      // Logical dx: CSS px / scale
      const logicalDx = dx / this.scale;
      this.scrollOffset -= logicalDx;

      this.dragVelocityX  = -(logicalDx / (dt / 1000));
      this.lastPointerX   = e.clientX;
      this.lastPointerTime= now;
    });

    const endDrag = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.velocity   = this.dragVelocityX * 0.8;
      c.style.cursor  = 'grab';
    };

    c.addEventListener('pointerup',     endDrag);
    c.addEventListener('pointercancel', endDrag);

    c.style.cursor = 'grab';
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', () => this._resize());
  }
}
