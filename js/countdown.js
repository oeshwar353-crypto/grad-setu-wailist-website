/**
 * GradSetu — Countdown Timer
 * Target: November 20, 2026 at 12:00:00 PM IST (UTC+5:30)
 */

// Target timestamp: 2026-11-20T06:30:00.000Z  (12:00 IST = 06:30 UTC)
export const TARGET_MS = Date.UTC(2026, 10, 20, 6, 30, 0); // month is 0-indexed → 10 = November

export class Countdown {
  /**
   * @param {Object} opts
   * @param {HTMLElement} opts.days
   * @param {HTMLElement} opts.hours
   * @param {HTMLElement} opts.mins
   * @param {HTMLElement} opts.secs
   * @param {HTMLElement[]} [opts.passBlocks] - Optional mini-countdown blocks in the pass card
   * @param {HTMLElement} [opts.container] - Optional countdown wrapper
   */
  constructor(opts) {
    this.els       = { days: opts.days, hours: opts.hours, mins: opts.mins, secs: opts.secs };
    this.pass      = opts.passBlocks || [];
    this.container = opts.container || document.querySelector('.countdown-wrapper');
    this._prevVals = {};
    this._tick();
    this._interval = setInterval(() => this._tick(), 1000);
  }

  _tick() {
    const now  = Date.now();
    const diff = Math.max(0, TARGET_MS - now);

    if (diff === 0) {
      // Launch state reached
      if (this.container && !this.container.classList.contains('launched')) {
        this.container.classList.add('launched');
        const label = this.container.querySelector('.countdown-label');
        if (label) label.textContent = '🚀 GRADSETU SOFT LAUNCH IS NOW LIVE';
      }
    }

    const totalSecs = Math.floor(diff / 1000);
    const d = Math.floor(totalSecs / 86400);
    const h = Math.floor((totalSecs % 86400) / 3600);
    const m = Math.floor((totalSecs % 3600)  / 60);
    const s = totalSecs % 60;

    const vals = {
      days:  String(d).padStart(3, '0'),
      hours: String(h).padStart(2, '0'),
      mins:  String(m).padStart(2, '0'),
      secs:  String(s).padStart(2, '0'),
    };

    for (const [key, el] of Object.entries(this.els)) {
      if (!el) continue;
      if (vals[key] !== this._prevVals[key]) {
        el.textContent = vals[key];
        el.classList.remove('tick');
        void el.offsetWidth; // reflow
        el.classList.add('tick');
      }
    }

    // Update pass card mini-countdown
    this.pass.forEach(({ el, unit }) => {
      if (!el) return;
      el.textContent = vals[unit];
    });

    this._prevVals = { ...vals };

    if (diff === 0) {
      clearInterval(this._interval);
    }
  }

  destroy() {
    clearInterval(this._interval);
  }
}
