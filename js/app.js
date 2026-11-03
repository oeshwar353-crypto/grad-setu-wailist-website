/**
 * GradSetu Waitlist — Main Application Controller
 * Design: Pure White × Electric Blue (#1769FF)
 * Real-time sync with Google Sheets (via Apps Script) + LocalStorage Cache
 * Interactive Countdown, Reelmark Curved Carousel, Confetti, and Pass Engine
 */

import { CurvedCarousel }     from './carousel.js';
import { Countdown }          from './countdown.js';
import { launchConfetti }     from './confetti.js';
import { googleSheetsService } from './googleSheetsService.js';

// ── Constants ────────────────────────────────────────────────
const LAUNCH_DATE = '2026-11-20T12:00:00+05:30';
const BASE_URL    = window.location.origin || 'https://gradsetu.in';

const WHATSAPP_MESSAGE = encodeURIComponent(
  `Something massive for college students is dropping on Nov 20 at 12 PM. No brochures, no fluff. I just locked in my early access pass on GradSetu—claim yours before the timer runs out: `
);

// ── Toast Manager ─────────────────────────────────────────────
const ToastManager = {
  container: null,
  init() {
    this.container = document.getElementById('toast-container');
  },
  show(message, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: '🔔' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || '🔔'}</span><span>${message}</span>`;
    if (this.container) {
      this.container.appendChild(toast);
    }
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ── Scroll Reveal ─────────────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

// ── Header scroll behaviour ───────────────────────────────────
function initHeader() {
  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    if (header) {
      header.classList.toggle('scrolled', window.scrollY > 20);
    }
  }, { passive: true });
}

// ── Move to Top (Opens Founder Console) ───────────────────────
function initBackToTop() {
  const btn = document.getElementById('btn-back-to-top');
  if (!btn) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/admin';
  });
}

// ── Mobile Nav ────────────────────────────────────────────────
function initMobileNav() {
  const toggle  = document.getElementById('nav-toggle');
  const overlay = document.getElementById('mobile-nav-overlay');
  const close   = document.getElementById('mobile-nav-close');

  const open  = () => overlay?.classList.add('open');
  const shut  = () => overlay?.classList.remove('open');

  toggle?.addEventListener('click', open);
  close?.addEventListener('click',  shut);

  overlay?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', shut);
  });
}

// ── Social Proof Real-Time Counter ────────────────────────────
let liveWaitlistCount = 79;

async function updateSocialProof() {
  const el = document.getElementById('proof-count');
  if (!el) return;

  // 1. Immediately guarantee at least 79+ baseline on screen (never 0+)
  try {
    const cached = localStorage.getItem('gs_cached_count');
    if (cached && !isNaN(Number(cached))) {
      liveWaitlistCount = Math.max(79, Number(cached));
    }
  } catch (e) {}
  el.textContent = `${liveWaitlistCount.toLocaleString('en-IN')}+ students across India`;

  // 2. Fetch live count from Google Sheets in real time
  try {
    const live = await googleSheetsService.getLiveWaitlistCount();
    if (typeof live === 'number' && live >= 79) {
      liveWaitlistCount = live;
      el.textContent = `${liveWaitlistCount.toLocaleString('en-IN')}+ students across India`;
    }
  } catch (err) {
    // Graceful fallback to baseline
  }
}

function incrementSocialProof() {
  liveWaitlistCount = Math.max(79, liveWaitlistCount) + 1;
  try {
    localStorage.setItem('gs_cached_count', liveWaitlistCount);
  } catch (e) {}

  const el = document.getElementById('proof-count');
  if (el) {
    el.textContent = `${liveWaitlistCount.toLocaleString('en-IN')}+ students across India`;
    el.classList.add('count-updated');
    setTimeout(() => el.classList.remove('count-updated'), 1200);
  }
}

// ── Modal Controller ──────────────────────────────────────────
const Modal = {
  overlay:    null,
  box:        null,
  _openState: null,

  init() {
    this.overlay = document.getElementById('modal-overlay');
    this.box     = document.getElementById('modal-box');

    this.overlay?.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    document.getElementById('modal-close')?.addEventListener('click', () => this.close());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.close();
    });
  },

  open(state = 'form') {
    this._openState = state;
    if (this.overlay) {
      this.overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    const formView  = document.getElementById('modal-form-view');
    const checkView = document.getElementById('modal-check-view');
    const passView  = document.getElementById('modal-pass-view');

    if (state === 'check') {
      if (formView)  formView.style.display  = 'none';
      if (checkView) checkView.style.display = 'block';
      if (passView)  passView.style.display  = 'none';
    } else if (state === 'pass') {
      if (formView)  formView.style.display  = 'none';
      if (checkView) checkView.style.display = 'none';
      if (passView)  passView.style.display  = 'flex';
    } else {
      if (formView)  formView.style.display  = 'block';
      if (checkView) checkView.style.display = 'none';
      if (passView)  passView.style.display  = 'none';
    }
  },

  close() {
    if (this.overlay) {
      this.overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  },

  showPass(userData) {
    populatePassCard(userData);
    this.open('pass');
  }
};

// ── Pass Card Population ──────────────────────────────────────
function populatePassCard(data) {
  const {
    full_name,
    college_name,
    college_city,
    department,
    year_of_study,
    hometown_city,
    pass_id,
    waitlist_number,
    referral_code,
    referral_count = 0
  } = data;

  // Format Pass ID
  const displayPassId = pass_id ? (pass_id.startsWith('#') ? pass_id : '#' + pass_id)
                                : `#GS-${String(waitlist_number || 101).padStart(4, '0')}`;

  // Fill fields
  setText('pass-name', full_name);
  
  const campusDetails = college_city 
    ? `${college_name} (${college_city})` 
    : college_name;
  const deptDetails = department && year_of_study 
    ? ` • ${department} (${year_of_study})` 
    : '';

  setText('pass-college', campusDetails + deptDetails);
  setText('pass-number', displayPassId);

  // Origin display
  if (hometown_city) {
    const originEl = document.getElementById('pass-origin');
    if (originEl) {
      originEl.textContent = `📍 Origin: ${hometown_city}`;
      originEl.style.display = 'block';
    }
  }

  // Referral link
  const code = referral_code || 'GS-INVITE';
  const refLink = `${BASE_URL}/?ref=${code}`;
  setText('pass-ref-link', refLink);

  // WhatsApp share
  const waLink = `https://wa.me/?text=${WHATSAPP_MESSAGE}${encodeURIComponent(refLink)}`;
  const waBtn  = document.getElementById('btn-whatsapp-share');
  if (waBtn) waBtn.href = waLink;

  // Milestone progress
  updateMilestones(referral_count);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateMilestones(count) {
  const milestones = [
    { need: 3,  id: 'ms-1' },
    { need: 10, id: 'ms-2' },
    { need: 25, id: 'ms-3' },
  ];

  milestones.forEach(({ need, id }) => {
    const numEl = document.getElementById(`${id}-num`);
    if (numEl && count >= need) {
      numEl.classList.add('unlocked');
    }
  });
}

// ── Multi-Step Access Form (in #access section) ───────────────
const AccessForm = {
  step:          1,
  selectedYear:  null,
  selectedLangs: new Set(),

  init() {
    this._bindNavButtons();
    this._bindYearPills();
    this._bindLangPills();
    this._bindCustomLang();
    this._bindFormSubmit();
  },

  _bindNavButtons() {
    // Step 1 -> Step 2
    document.getElementById('btn-next-step')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Step 2 -> Step 1
    document.getElementById('btn-back-step')?.addEventListener('click', () => {
      this.goToStep(1);
    });

    // Step 2 -> Step 3 (Review)
    document.getElementById('btn-review-step')?.addEventListener('click', () => {
      this.goToStep(3);
    });

    // Step 3 -> Step 2
    document.getElementById('btn-back-to-step2')?.addEventListener('click', () => {
      this.goToStep(2);
    });

    // Step 3 Review Edit Shortcuts
    document.getElementById('btn-edit-step1')?.addEventListener('click', () => {
      this.goToStep(1);
    });

    document.getElementById('btn-edit-step2')?.addEventListener('click', () => {
      this.goToStep(2);
    });
  },

  goToStep(n) {
    if (n === 2 && !this._validateStep1()) return;

    if (n === 3) {
      if (!this._validateStep1()) {
        this.goToStep(1);
        return;
      }
      if (!this._validateStep2()) {
        return;
      }
      this._populateReview();
    }

    this.step = n;

    // Toggle active form step panels
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`form-step-${n}`)?.classList.add('active');

    // Update progress step indicators & connector
    const s1ind = document.getElementById('step-1-indicator');
    const s2ind = document.getElementById('step-2-indicator');
    const s3ind = document.getElementById('step-3-indicator');
    const s1lbl = document.getElementById('step-1-label');
    const s2lbl = document.getElementById('step-2-label');
    const s3lbl = document.getElementById('step-3-label');
    const fill  = document.getElementById('progress-connector-fill');

    if (n === 1) {
      s1ind?.classList.remove('done');
      s1ind?.classList.add('active');
      s1lbl?.classList.remove('done');
      s1lbl?.classList.add('active');

      s2ind?.classList.remove('active', 'done');
      s2lbl?.classList.remove('active', 'done');

      s3ind?.classList.remove('active', 'done');
      s3lbl?.classList.remove('active', 'done');

      if (fill) fill.style.width = '0%';
    } else if (n === 2) {
      s1ind?.classList.replace('active', 'done');
      s1lbl?.classList.replace('active', 'done');

      s2ind?.classList.remove('done');
      s2ind?.classList.add('active');
      s2lbl?.classList.remove('done');
      s2lbl?.classList.add('active');

      s3ind?.classList.remove('active', 'done');
      s3lbl?.classList.remove('active', 'done');

      if (fill) fill.style.width = '50%';
    } else if (n === 3) {
      s1ind?.classList.add('done');
      s1lbl?.classList.add('done');

      s2ind?.classList.replace('active', 'done');
      s2lbl?.classList.replace('active', 'done');

      s3ind?.classList.add('active');
      s3lbl?.classList.add('active');

      if (fill) fill.style.width = '100%';
    }
  },

  _populateReview() {
    const fullName = (document.getElementById('full_name')?.value || '').trim();
    const phone    = (document.getElementById('whatsapp_number')?.value || '').trim();
    const email    = (document.getElementById('email')?.value || '').trim();
    const college  = (document.getElementById('college_name')?.value || '').trim();
    const city     = (document.getElementById('college_city')?.value || '').trim();
    const dept     = (document.getElementById('department')?.value || '').trim();
    const hometown = (document.getElementById('hometown_city')?.value || '').trim();
    const langsArr = Array.from(this.selectedLangs);

    setText('review-name', fullName || '—');
    setText('review-phone', phone ? `+91 ${phone}` : '—');
    setText('review-email', email || '—');
    setText('review-college', city ? `${college} (${city})` : (college || '—'));
    setText('review-branch-year', `${dept} • ${this.selectedYear || '—'}`);
    setText('review-hometown', hometown || '—');
    setText('review-languages', langsArr.length > 0 ? langsArr.join(', ') : 'None selected');
  },

  _validateStep1() {
    let valid = true;
    valid = this._validateField('full_name', v => v.trim().length >= 2, 'Enter at least 2 characters.') && valid;
    valid = this._validateField('whatsapp_number', v => /^[6-9]\d{9}$/.test(v.trim()), 'Enter a valid 10-digit Indian mobile number.') && valid;
    valid = this._validateField('email', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), 'Enter a valid email address.') && valid;
    return valid;
  },

  _validateStep2() {
    let valid = true;
    valid = this._validateField('college_name', v => v.trim().length >= 2, 'Enter your college name.') && valid;
    valid = this._validateField('college_city', v => v.trim().length >= 2, 'Enter the city where your college is.') && valid;
    valid = this._validateField('department', v => v !== '', 'Select your department.') && valid;
    valid = this._validateField('hometown_city', v => v.trim().length >= 2, 'Enter your hometown.') && valid;

    if (!this.selectedYear) {
      showFieldError('year-error', 'Select your year of study.');
      valid = false;
    } else {
      hideFieldError('year-error');
    }

    if (this.selectedLangs.size === 0) {
      showFieldError('lang-error', 'Select at least one language.');
      valid = false;
    } else {
      hideFieldError('lang-error');
    }

    return valid;
  },

  _validateField(id, test, msg) {
    const el    = document.getElementById(id);
    const errEl = document.getElementById(`${id}-error`);
    if (!el) return true;

    const val = el.value;
    if (!test(val)) {
      el.classList.add('error');
      if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
      return false;
    } else {
      el.classList.remove('error');
      if (errEl) errEl.classList.remove('visible');
      return true;
    }
  },

  _bindYearPills() {
    document.querySelectorAll('.pill-option[data-year]').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.pill-option[data-year]').forEach(p => p.classList.remove('selected'));
        pill.classList.add('selected');
        this.selectedYear = pill.dataset.year;
        hideFieldError('year-error');
      });
    });
  },

  _bindLangPills() {
    document.querySelectorAll('.lang-pill[data-lang]').forEach(pill => {
      pill.addEventListener('click', () => {
        const lang = pill.dataset.lang;
        if (this.selectedLangs.has(lang)) {
          this.selectedLangs.delete(lang);
          pill.classList.remove('selected');
        } else {
          this.selectedLangs.add(lang);
          pill.classList.add('selected');
        }
        hideFieldError('lang-error');
      });
    });
  },

  _bindCustomLang() {
    const addBtn     = document.getElementById('lang-add-btn');
    const customWrap = document.getElementById('lang-custom-wrap');
    const customInp  = document.getElementById('lang-custom-input');
    const customAdd  = document.getElementById('lang-custom-add');

    addBtn?.addEventListener('click', () => {
      customWrap?.classList.add('visible');
      customInp?.focus();
    });

    const addCustom = () => {
      const val = (customInp?.value || '').trim();
      if (!val) return;

      const pill = document.createElement('button');
      pill.type      = 'button';
      pill.className = 'lang-pill selected';
      pill.dataset.lang = val;
      pill.textContent  = val;
      this.selectedLangs.add(val);

      pill.addEventListener('click', () => {
        if (this.selectedLangs.has(val)) {
          this.selectedLangs.delete(val);
          pill.classList.remove('selected');
        } else {
          this.selectedLangs.add(val);
          pill.classList.add('selected');
        }
      });

      const langPills = document.getElementById('lang-pills-container');
      langPills?.insertBefore(pill, addBtn);

      if (customInp) customInp.value = '';
      customWrap?.classList.remove('visible');
    };

    customAdd?.addEventListener('click', addCustom);
    customInp?.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addCustom(); }
    });
  },

  _bindFormSubmit() {
    document.getElementById('waitlist-form')?.addEventListener('submit', async e => {
      e.preventDefault();

      if (this.step < 3) {
        this.goToStep(3);
        return;
      }

      const consent = document.getElementById('consent-check');
      if (!consent?.checked) {
        ToastManager.show('Please accept the privacy consent to continue.', 'error');
        return;
      }

      await this._submit();
    });
  },

  async _submit() {
    const btn = document.getElementById('btn-submit');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('loading');
    }

    const urlParams        = new URLSearchParams(window.location.search);
    const referred_by_code = urlParams.get('ref') || '';

    const langsArr = Array.from(this.selectedLangs);

    const formData = {
      full_name:        (document.getElementById('full_name')?.value || '').trim(),
      whatsapp_number:  (document.getElementById('whatsapp_number')?.value || '').trim(),
      email:            (document.getElementById('email')?.value || '').trim().toLowerCase(),
      college_name:     (document.getElementById('college_name')?.value || '').trim(),
      college_city:     (document.getElementById('college_city')?.value || '').trim(),
      department:       (document.getElementById('department')?.value || '').trim(),
      year_of_study:    this.selectedYear,
      hometown_city:    (document.getElementById('hometown_city')?.value || '').trim(),
      languages_list:   langsArr,
      languages_count:  langsArr.length,
      referred_by:      referred_by_code,
    };

    try {
      const result = await googleSheetsService.registerUser(formData);

      if (result.error) {
        ToastManager.show(result.error || 'Registration failed. Please try again.', 'error');
      } else {
        const passData = result.data;
        try {
          sessionStorage.setItem('gs_pass_data', JSON.stringify(passData));
        } catch (e) {}

        try {
          Modal.showPass(passData);
        } catch (mErr) {
          console.error('Modal.showPass error:', mErr);
        }

        try {
          launchConfetti();
        } catch (cErr) {
          console.error('launchConfetti error:', cErr);
        }

        if (result.isDuplicate) {
          ToastManager.show('Welcome back! Your Early Access Pass is active.', 'info');
        } else {
          ToastManager.show('Coordinates locked in! Your Pass is live.', 'success');
          incrementSocialProof();
        }

        try {
          updateSocialProof();
        } catch (sErr) {}
      }
    } catch (err) {
      console.error('Submit error:', err);
      const fallbackPass = {
        pass_id: 'GS-' + Math.floor(100 + Math.random() * 900),
        full_name: formData.full_name,
        college_name: formData.college_name,
        college_city: formData.college_city,
        department: formData.department,
        year_of_study: formData.year_of_study,
        hometown_city: formData.hometown_city,
        referral_code: 'GS-' + (formData.full_name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'STU') + Math.floor(1000 + Math.random() * 9000),
        referral_count: 0
      };
      try {
        Modal.showPass(fallbackPass);
        launchConfetti();
      } catch (e) {}
      ToastManager.show('Coordinates locked in! Your Pass is live.', 'success');
      incrementSocialProof();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.classList.remove('loading');
      }
    }
  }
};

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.add('visible'); }
}

function hideFieldError(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}

// ── Copy Link ─────────────────────────────────────────────────
function initCopyLink() {
  document.getElementById('btn-copy-link')?.addEventListener('click', async () => {
    const linkEl = document.getElementById('pass-ref-link');
    const link   = linkEl?.textContent || '';
    try {
      await navigator.clipboard.writeText(link);
      const btn = document.getElementById('btn-copy-link');
      if (btn) {
        btn.textContent = '✓ Copied!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copy Link';
          btn.classList.remove('copied');
        }, 2500);
      }
      ToastManager.show('Referral link copied to clipboard!', 'success');
    } catch {
      ToastManager.show('Copy failed — please copy manually.', 'error');
    }
  });
}

// ── Check Pass (returning user) ───────────────────────────────
function initCheckPass() {
  // Header button
  document.getElementById('btn-check-pass')?.addEventListener('click', () => {
    // Check session first
    const saved = sessionStorage.getItem('gs_pass_data');
    if (saved) {
      Modal.showPass(JSON.parse(saved));
    } else {
      Modal.open('check');
    }
  });

  // Check-pass form submit
  document.getElementById('check-pass-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const val = document.getElementById('check-identifier')?.value?.trim();
    if (!val) return;

    const btn = document.getElementById('btn-check-pass-submit');
    if (btn) btn.textContent = 'Searching…';

    try {
      const res = await googleSheetsService.lookupUser(val);
      if (res.error || !res.data) {
        ToastManager.show(res.error || 'No pass found for that Email or WhatsApp number.', 'error');
      } else {
        sessionStorage.setItem('gs_pass_data', JSON.stringify(res.data));
        Modal.showPass(res.data);
        launchConfetti();
        ToastManager.show('Pass found! Welcome back.', 'success');
      }
    } catch {
      ToastManager.show('Search failed. Please try again.', 'error');
    } finally {
      if (btn) btn.textContent = 'Find My Pass →';
    }
  });
}

// ── Hero CTA ──────────────────────────────────────────────────
function initHeroCTA() {
  document.getElementById('btn-hero-cta')?.addEventListener('click', () => {
    const accessSection = document.getElementById('access');
    if (accessSection) {
      accessSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Modal trigger from any .open-modal button
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => Modal.open('form'));
  });
}

// ── Referral param detection ──────────────────────────────────
function detectReferral() {
  const params = new URLSearchParams(window.location.search);
  const ref    = params.get('ref');
  if (ref) {
    const note = document.getElementById('referral-notice');
    if (note) {
      note.style.display = 'flex';
      const codeEl = document.getElementById('referral-code-display');
      if (codeEl) codeEl.textContent = ref;
    }
  }
}

// ── Carousel Hand-drawn Notes (SVG overlay) ───────────────────
function initCarouselNotes() {
  const svg = document.getElementById('carousel-notes-svg');
  if (!svg) return;

  // Animate stroke draw-in for doodle paths
  svg.querySelectorAll('.draw-path').forEach((path, i) => {
    const len = path.getTotalLength?.() || 200;
    path.style.strokeDasharray  = len;
    path.style.strokeDashoffset = len;
    path.style.animation = `draw-in 1.2s var(--ease-out) ${1.8 + i * 0.3}s forwards`;
  });
}

// ── Boot ──────────────────────────────────────────────────────
function boot() {
  // Init systems
  ToastManager.init();
  initHeader();
  initBackToTop();
  initMobileNav();
  initScrollReveal();
  initHeroCTA();
  initCheckPass();
  initCopyLink();
  detectReferral();
  AccessForm.init();
  Modal.init();

  // Countdown to November 20, 2026, 12:00:00 PM IST
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  new Countdown({
    days:  document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    mins:  document.getElementById('cd-mins'),
    secs:  document.getElementById('cd-secs'),
    passBlocks: [
      { el: document.getElementById('pass-cd-days'),  unit: 'days'  },
      { el: document.getElementById('pass-cd-hours'), unit: 'hours' },
      { el: document.getElementById('pass-cd-mins'),  unit: 'mins'  },
      { el: document.getElementById('pass-cd-secs'),  unit: 'secs'  },
    ]
  });

  // Reelmark Curved Carousel
  if (!prefersReduced) {
    const canvas = document.getElementById('carousel-canvas');
    if (canvas) {
      new CurvedCarousel(canvas, {
        scrollSpeed: 50,
        numCards:    10,
        frameW:      1440,
      });
    }
    initCarouselNotes();
  }

  // Social proof real-time count
  updateSocialProof();
  setInterval(updateSocialProof, 30000);
}

document.addEventListener('DOMContentLoaded', boot);
