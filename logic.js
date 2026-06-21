// ===== LENIS SMOOTH SCROLL ===== (must be first in logic.js)

const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1,
  touchMultiplier: 1.5,
  infinite: false,
});

// Tell ScrollTrigger to recalculate on every Lenis scroll tick
lenis.on('scroll', ScrollTrigger.update);

// Tell GSAP's internal ticker to drive Lenis (keeps both perfectly synced)
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// ══════════════════════════════════════════
// PRELOADER
// ══════════════════════════════════════════
(function initPreloader() {
  const preloader = document.getElementById('preloader');
  const fillEl    = document.getElementById('plFill');
  const pctEl     = document.getElementById('plPercent');

  if (!preloader || !fillEl || !pctEl) return;

  const MIN_DURATION = 1200;
  const MAX_DURATION = 2800;
  const startTime = performance.now();

  let realProgress = 0;
  let shownProgress = 0;
  let pageLoaded = false;
  let fontsReady = false;
  let finished = false;

  function updateRealProgress() {
    let p = 0;
    if (document.readyState === 'interactive' || document.readyState === 'complete') p += 40;
    if (fontsReady) p += 20;
    if (pageLoaded) p += 40;
    realProgress = Math.min(p, 100);
  }

  document.fonts?.ready.then(() => { fontsReady = true; updateRealProgress(); });
  window.addEventListener('load', () => { pageLoaded = true; updateRealProgress(); });
  updateRealProgress();

  function tick(now) {
    const elapsed = now - startTime;
    updateRealProgress();

    const timeFloor = Math.min(100, (elapsed / MAX_DURATION) * 100);
    const target = Math.max(realProgress, finished ? 100 : 0);
    const blendedTarget = finished ? 100 : Math.min(target, Math.max(timeFloor, realProgress * (elapsed / MIN_DURATION)));

    shownProgress += (Math.min(blendedTarget, 100) - shownProgress) * 0.09;
    if (blendedTarget >= 99.5 && shownProgress > 98.5) shownProgress = 100;

    const displayPct = Math.round(shownProgress);
    pctEl.textContent = displayPct + '%';
    fillEl.style.clipPath = `inset(${100 - shownProgress}% 0 0 0)`;

    const shouldFinish = pageLoaded && fontsReady && elapsed >= MIN_DURATION;
    if (shouldFinish) finished = true;

    if (shownProgress >= 100) {
      completePreloader();
      return;
    }

    if (elapsed >= MAX_DURATION) {
      shownProgress = 100;
      pctEl.textContent = '100%';
      fillEl.style.clipPath = 'inset(0% 0 0 0)';
      completePreloader();
      return;
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  let completing = false;
  function completePreloader() {
    if (completing) return;
    completing = true;

    setTimeout(() => {
      preloader.classList.add('preloader-hide');
      window.dispatchEvent(new CustomEvent('preloaderComplete'));
      setTimeout(() => {
        preloader.classList.add('preloader-removed');
      }, 650);
    }, 250);
  }
})();

// ══════════════════════════════════════════
// Carno Portfolio — Navbar v3.0
// 1. GSAP NAVBAR ENTRY ANIMATION
// Curtain → Logo → Links (RIGHT side stagger)
// NOTE: No CTA step anymore
// ══════════════════════════════════════════
function initNavbarEntry() {
  gsap.timeline({ delay: 0.2 })
    .to('.navbar', {
      clipPath: 'inset(0 0 0% 0)',
      duration: 0.7,
      ease: 'power3.inOut'
    })
    .to('.nav-logo', {
      x: 0, opacity: 1,
      duration: 0.6,
      ease: 'power2.out'
    }, '-=0.3')
    .to('.nav-link', {
      y: 0, opacity: 1, rotateX: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: 'back.out(1.7)'
    }, '-=0.3');
}
window.addEventListener('preloaderComplete', initNavbarEntry);


// ══════════════════════════════════════════
// 2. LOGO DOT — Gravity Bounce on mouseleave
// ══════════════════════════════════════════
const navLogo = document.getElementById('navLogo');
const navDot  = document.getElementById('navDot');

if (navLogo && navDot) {
navLogo.addEventListener('mouseenter', () => {
  navDot.classList.remove('dropping');
  navDot.style.transform = 'translateY(-6px)';
  navDot.style.transition = 'transform 0.2s ease-out';
  navDot.style.animation  = 'none';
});

navLogo.addEventListener('mouseleave', () => {
  navDot.style.transform  = '';
  navDot.style.transition = '';
  navDot.style.animation  = '';
  navDot.classList.remove('dropping');
  // Force reflow to restart animation
  void navDot.offsetWidth;
  navDot.classList.add('dropping');
  // Remove class after animation ends
  setTimeout(() => {
    navDot.classList.remove('dropping');
    navDot.style.animation = '';
  }, 650);
});
}


// ══════════════════════════════════════════
// 3. ADAPTIVE BACKGROUND — IntersectionObserver
// ══════════════════════════════════════════
const navbar = document.getElementById('navbar');
const sectionStates = {
  'hero':     'hero-state',
  'about':    'about-state',
  'projects': 'projects-state',
  'skills':   'skills-state',
  'achievements': 'achievements-state',
  'contact':  'contact-state'
};
const allStates = Object.values(sectionStates);

function setNavbarState(id) {
  if (!navbar) return;
  allStates.forEach(c => navbar.classList.remove(c));
  if (sectionStates[id]) navbar.classList.add(sectionStates[id]);

  // Sync active link in navbar
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
  });
  // Sync active link in top menu
  document.querySelectorAll('.top-menu-link').forEach(l => {
    l.classList.toggle('active', l.getAttribute('href') === `#${id}`);
  });
}

// Scroll-spy: find the last section whose top is above the trigger line.
// Reliable for any section height (the old IO + threshold 0.4 missed tall
// sections like `about` because 40% of a 4000px block never fits the viewport).
function updateNavbarState() {
  const sections = document.querySelectorAll('section[data-section]');
  if (!sections.length) return;
  const triggerY = window.scrollY + 100; // navbar offset (64px + breathing room)
  let activeId = sections[0].dataset.section;
  for (const s of sections) {
    if (s.offsetTop <= triggerY) activeId = s.dataset.section;
  }
  setNavbarState(activeId);
}

let scrollRaf = null;
window.addEventListener('scroll', () => {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    updateNavbarState();
    scrollRaf = null;
  });
}, { passive: true });
// Throttled resize handler — avoids excessive navbar state recalculation
let resizeTimer = null;
window.addEventListener('resize', () => {
  if (resizeTimer) return;
  resizeTimer = setTimeout(() => {
    updateNavbarState();
    resizeTimer = null;
  }, 150);
}, { passive: true });

// Initial sync after layout settles
requestAnimationFrame(updateNavbarState);
setTimeout(updateNavbarState, 50);


// ══════════════════════════════════════════
// 4. TOP DROPDOWN MENU — Open / Close
// ══════════════════════════════════════════
const hamburgerBtn  = document.getElementById('hamburgerBtn');
const topMenu       = document.getElementById('topMenu');
const topOverlay    = document.getElementById('topMenuOverlay');
const topMenuLinks  = document.querySelectorAll('.top-menu-link');
let menuOpen = false;

function openTopMenu() {
  if (!topMenu || !topOverlay || !hamburgerBtn) return;
  menuOpen = true;
  topMenu.classList.add('open');
  topOverlay.classList.add('open');
  hamburgerBtn.classList.add('open');
  document.body.style.overflow = 'hidden';
  lenis.stop();

  // GSAP: Links drop in from above — staggered
  // overwrite + killTweensOf prevents conflict on rapid toggle
  gsap.killTweensOf(topMenuLinks);
  gsap.fromTo(topMenuLinks,
    { y: -30, opacity: 0, rotateX: -60 },
    {
      y: 0,
      opacity: 1,
      rotateX: 0,
      duration: 0.5,
      stagger: {
        each: 0.07,
        from: 'start'
      },
      ease: 'back.out(2)',
      delay: 0.25,
      overwrite: true
    }
  );
}

function closeTopMenu() {
  if (!topMenu || !topOverlay || !hamburgerBtn) return;
  menuOpen = false;

  // GSAP: Links fly back up before panel closes
  gsap.killTweensOf(topMenuLinks);
  gsap.to(topMenuLinks, {
    y: -20,
    opacity: 0,
    duration: 0.2,
    stagger: 0.04,
    ease: 'power2.in',
    overwrite: true,
    onComplete: () => {
      topMenu.classList.remove('open');
      topOverlay.classList.remove('open');
      hamburgerBtn.classList.remove('open');
      document.body.style.overflow = '';
      lenis.start();
      // Reset for next open
      gsap.set(topMenuLinks, { y: -30, opacity: 0, rotateX: -60 });
    }
  });
}

if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    menuOpen ? closeTopMenu() : openTopMenu();
  });
}
if (topOverlay) {
  topOverlay.addEventListener('click', closeTopMenu);
}
topMenuLinks.forEach(l => l.addEventListener('click', closeTopMenu));


// ══════════════════════════════════════════
// 5. SMOOTH SCROLL (via Lenis)
// ══════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    e.preventDefault();
    const t = document.querySelector(a.getAttribute('href'));
    if (t) {
      lenis.scrollTo(t, {
        offset: -64,
        duration: 1.3,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      });
    }
  });
});

/* ══════════════════════════════════════════
   Carno Portfolio — Hero Section v3.0
   IIFE-wrapped so hero code can't leak globals
   or collide with navbar's non-strict code above.
   ══════════════════════════════════════════ */
(function () {
'use strict';

const TIER = (() => {
  const cores  = navigator.hardwareConcurrency || 4;
  const mobile = window.innerWidth < 768;
  const low    = cores <= 2 || mobile;
  const mid    = cores <= 4;
  return {
    P_COUNT:   low ? 30 : mid ? 120 : 176,
    P_CONNECT: low ? 60 : 100,
    P_REPEL:   low ? 100 : 130,
    FPS:       low ? 30 : 60,
    mobile,
  };
})();
const FRAME_MS = 1000 / TIER.FPS;

const CODE_CHARS = [
  '+', '-', '*', '/', '%', '=', '!', '<', '>', '&', '|', '^', '~',
  '(', ')', '[', ']', '{', '}',
  ';', ':', ',', '.', '?', "'", '"',
  '=>', '!=', '===', '<=', '>=', '++', '--', '**', '&&', '||', '?:',
  '->', '::', '?.', '</>', '/*', '*/', '//', '==',
  'fn', 'if', 'let', 'var', 'const', 'new', 'def', 'for', 'do', 'try',
  '0', '1', '01', '10', '101', '0x',
];

const cvs = document.getElementById('particleCanvas');
const ctx = cvs.getContext('2d', { alpha: false });
let CW, CH;

function resizeCvs() {
  CW = cvs.width  = window.innerWidth;
  CH = cvs.height = window.innerHeight;
}
resizeCvs();
window.addEventListener('resize', resizeCvs, { passive: true });

function randomEdgePos(max) {
  const r = Math.random();
  if (r < 0.5) return Math.random() * max * 0.3;
  return max - Math.random() * max * 0.3;
}

const N  = TIER.P_COUNT;
const px  = new Float32Array(N);
const py  = new Float32Array(N);
const pvx = new Float32Array(N);
const pvy = new Float32Array(N);
const pr  = new Float32Array(N);
const pa  = new Float32Array(N);
const ptype = new Uint8Array(N);
const pci = new Uint8Array(N);
const ptx  = new Float32Array(N);
const pty  = new Float32Array(N);
const pst  = new Float32Array(N);
const pttr = new Uint8Array(N);

const MIN_DIST_SQ = 50 * 50;
for (let i = 0; i < N; i++) {
  let x, y, ok = false, tries = 0;
  while (!ok && tries < 100) {
    x = randomEdgePos(window.innerWidth);
    y = randomEdgePos(window.innerHeight);
    ok = true;
    for (let j = 0; j < i; j++) {
      const dx = x - px[j], dy = y - py[j];
      if (dx*dx + dy*dy < MIN_DIST_SQ) { ok = false; break; }
    }
    tries++;
  }
  px[i] = x; py[i] = y;

  pvx[i] = (Math.random() - .5) * 1.2;
  pvy[i] = (Math.random() - .5) * 1.2;

  const r = Math.random();
  if (r < 0.30) {
    ptype[i] = 0;
    pr[i] = 0.4 + Math.random() * 0.5;
  } else if (r < 0.55) {
    ptype[i] = 1;
    pr[i] = 1.6 + Math.random() * 1.2;
  } else if (r < 0.85) {
    ptype[i] = 2;
    pr[i] = 9 + Math.random() * 2;
  } else {
    ptype[i] = 3;
    pr[i] = 14 + Math.random() * 6;
  }
  pa[i]  = 0.35 + Math.random() * 0.4;
  pci[i] = Math.floor(Math.random() * CODE_CHARS.length);
  ptx[i]  = randomEdgePos(window.innerWidth);
  pty[i]  = randomEdgePos(window.innerHeight);
  pst[i]  = 0.05 + Math.random() * 0.10;
  pttr[i] = 40 + Math.floor(Math.random() * 80);
}

let mX = CW / 2, mY = CH / 2;
document.addEventListener('mousemove', e => {
  mX = e.clientX; mY = e.clientY;
}, { passive: true });

const REP_R  = TIER.P_REPEL;
const REP_F  = 5.5;
const FRIC   = 0.97;
const CON_D  = TIER.P_CONNECT;
const CON_D2 = CON_D * CON_D;

function tickParticles() {
  for (let i = 0; i < N; i++) {
    const dx   = mX - px[i];
    const dy   = mY - py[i];
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < REP_R && dist > 0) {
      const f = (1 - dist / REP_R) * REP_F;
      pvx[i] -= (dx / dist) * f;
      pvy[i] -= (dy / dist) * f;
    }

    pttr[i]--;
    if (pttr[i] === 0) {
      ptx[i]  = randomEdgePos(window.innerWidth);
      pty[i]  = randomEdgePos(window.innerHeight);
      pttr[i] = 40 + Math.floor(Math.random() * 80);
    }
    const tdx = ptx[i] - px[i];
    const tdy = pty[i] - py[i];
    const td2 = tdx*tdx + tdy*tdy;
    if (td2 > 25) {
      const td = Math.sqrt(td2);
      pvx[i] += (tdx / td) * pst[i];
      pvy[i] += (tdy / td) * pst[i];
    }

    pvx[i] *= FRIC; pvy[i] *= FRIC;
    pvx[i] += (Math.random() - .5) * 0.03;
    pvy[i] += (Math.random() - .5) * 0.03;

    px[i] += pvx[i]; py[i] += pvy[i];

    if (px[i] < 0) px[i] = CW; if (px[i] > CW) px[i] = 0;
    if (py[i] < 0) py[i] = CH; if (py[i] > CH) py[i] = 0;
  }
}

function drawParticles() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, CW, CH);

  ctx.lineWidth = 0.5;
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = px[i]-px[j], dy = py[i]-py[j];
      const d2 = dx*dx + dy*dy;
      if (d2 < CON_D2) {
        const d = Math.sqrt(d2);
        ctx.beginPath();
        ctx.moveTo(px[i], py[i]);
        ctx.lineTo(px[j], py[j]);
        ctx.strokeStyle = `rgba(252,163,17,${(1-d/CON_D)*0.1})`;
        ctx.stroke();
      }
    }
  }

  for (let i = 0; i < N; i++) {
    if (ptype[i] === 0) {
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i], 0, Math.PI*2);
      ctx.fillStyle = `rgba(252,163,17,${pa[i] * 0.7})`;
      ctx.fill();
    } else if (ptype[i] === 1) {
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i] * 2.2, 0, Math.PI*2);
      ctx.fillStyle = `rgba(252,163,17,${pa[i] * 0.22})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px[i], py[i], pr[i], 0, Math.PI*2);
      ctx.fillStyle = `rgba(252,163,17,${pa[i]})`;
      ctx.fill();
    } else if (ptype[i] === 2) {
      ctx.font = `${pr[i]}px JetBrains Mono`;
      ctx.fillStyle = `rgba(20,33,61,${Math.min(1, pa[i] * 2.0)})`;
      ctx.fillText(CODE_CHARS[pci[i]], px[i], py[i]);
    } else {
      ctx.font = `${pr[i]}px JetBrains Mono`;
      ctx.fillStyle = `rgba(255,180,60,${pa[i]})`;
      ctx.fillText(CODE_CHARS[pci[i]], px[i], py[i]);
    }
  }
}

let rafId, lastT = 0, heroVisible = true;

function mainLoop(ts) {
  rafId = requestAnimationFrame(mainLoop);
  if (!heroVisible) return;
  if (ts - lastT < FRAME_MS) return;
  lastT = ts;
  tickParticles();
  drawParticles();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) cancelAnimationFrame(rafId);
  else { lastT = 0; requestAnimationFrame(mainLoop); }
});

function initML10() {
  const wrapper = document.querySelector('.ml10 .letters');
  wrapper.innerHTML = wrapper.textContent
    .replace(/\S/g, "<span class='letter'>$&</span>");
}

function animateCarno(onComplete) {
  initML10();
  requestAnimationFrame(() => {
    gsap.fromTo('#carnoName',
      { opacity: 0 },
      { opacity: 1, duration: 1.2, ease: 'power2.out' }
    );
    gsap.from('.ml10 .letter', {
      y: 80,
      opacity: 0,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.12,
      onComplete: onComplete,
    });
  });
}

function startRoleLoop() {
  anime({
    targets:  '.i-am-inline',
    opacity:  [0, 1],
    translateY: [12, 0],
    duration: 900,
    easing:   'easeOutExpo',
  });

  if (window.Typed) {
    new Typed('#typedRole', {
      strings: ['A Web Developer', 'Representing Bangladesh', 'A Vibe Coder', 'From Bangladesh'],
      typeSpeed: 70,
      backSpeed: 35,
      backDelay: 1100,
      startDelay: 200,
      smartBackspace: true,
      loop: true,
      cursorChar: '|',
    });
  }
}

function runArrival() {
  animateCarno(() => {
    document.getElementById('carnoName').classList.add('glitching');
  });

  setTimeout(startRoleLoop, 1000);
  setTimeout(initNavMagnetic, 800);

  setTimeout(() => {
    const row  = document.getElementById('ctaRow');
    const mags = row.querySelectorAll('.mag-wrap');

    row.style.opacity = '1';

    mags.forEach((m, i) => {
      m.style.opacity   = '0';
      m.style.transform = 'translateY(16px) scale(0.88)';
      setTimeout(() => {
        m.style.transition =
          'opacity 500ms ease, transform 600ms cubic-bezier(0.34,1.56,0.64,1)';
        m.style.opacity   = '1';
        m.style.transform = 'translateY(0) scale(1)';
      }, i * 140);
    });
  }, 900);

  setTimeout(() => {
    const hint = document.getElementById('scrollHint');
    hint.style.transition = 'opacity 750ms ease';
    hint.style.opacity    = '0.6';
  }, 1600);
}

function initBlobButtons() {
  document.querySelectorAll('.cta-btn').forEach(btn => {
    const blob = btn.querySelector('.blob');

    btn.addEventListener('mouseenter', function(e) {
      const rect = this.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      blob.style.top  = relY + 'px';
      blob.style.left = relX + 'px';
    });

    btn.addEventListener('mouseleave', function(e) {
      const rect = this.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      blob.style.top  = relY + 'px';
      blob.style.left = relX + 'px';
    });
  });
}

function initMagnetic() {
  document.querySelectorAll('.mag-inner').forEach(wrap => {
    let tx=0, ty=0, cx=0, cy=0;
    let hovering=false, rafMag;

    function magLoop() {
      cx += (tx-cx) * .12;
      cy += (ty-cy) * .12;
      wrap.style.transform = `translate(${cx}px,${cy}px)`;
      if (Math.abs(tx-cx)>.05 || Math.abs(ty-cy)>.05 || hovering)
        rafMag = requestAnimationFrame(magLoop);
    }

    wrap.addEventListener('mousemove', e => {
      hovering = true;
      const r = wrap.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width/2)  * 0.3;
      ty = (e.clientY - r.top  - r.height/2) * 0.3;
      cancelAnimationFrame(rafMag);
      magLoop();
    }, { passive: true });

    wrap.addEventListener('mouseleave', () => {
      hovering = false;
      tx = 0; ty = 0;
      magLoop();
    });
  });
}

function initNavMagnetic() {
  document.querySelectorAll('#navLinks li').forEach(li => {
    let tx=0, ty=0, cx=0, cy=0, hovering=false, raf;
    function loop() {
      cx += (tx-cx) * 0.12;
      cy += (ty-cy) * 0.12;
      li.style.transform = `translate(${cx}px,${cy}px)`;
      if (Math.abs(tx-cx) > 0.05 || Math.abs(ty-cy) > 0.05 || hovering)
        raf = requestAnimationFrame(loop);
    }
    li.addEventListener('mousemove', e => {
      hovering = true;
      const r = li.getBoundingClientRect();
      tx = (e.clientX - r.left - r.width/2) * 0.25;
      ty = (e.clientY - r.top - r.height/2) * 0.25;
      cancelAnimationFrame(raf);
      loop();
    }, { passive: true });
    li.addEventListener('mouseleave', () => {
      hovering = false; tx = 0; ty = 0; loop();
    });
  });
}

function setInitialStates() {
  document.getElementById('carnoName').style.opacity = '0';
  const row = document.getElementById('ctaRow');
  row.style.opacity = '0';
  document.querySelectorAll('.mag-wrap').forEach(m => {
    m.style.opacity   = '0';
    m.style.transform = 'translateY(16px) scale(0.88)';
  });
  const iAm = document.querySelector('.i-am-inline');
  if (iAm) { iAm.style.opacity='0'; iAm.style.transform='translateY(12px)'; }
  document.getElementById('scrollHint').style.opacity = '0';
}

if (document.getElementById('particleCanvas')) {
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    if (heroVisible) { lastT = 0; if (!rafId) rafId = requestAnimationFrame(mainLoop); }
    else { cancelAnimationFrame(rafId); rafId = null; }
  }, { threshold: 0.05 }).observe(document.getElementById('hero'));

  function initHeroSection() {
    setInitialStates();
    requestAnimationFrame(mainLoop);
    setTimeout(() => {
      runArrival();
      initBlobButtons();
      initMagnetic();
    }, 1200);
  }
  window.addEventListener('preloaderComplete', initHeroSection);
}

})();


/* ══════════════════════════════════════════
   Carno Portfolio — About Section v1.0
   Story Scroll — transferred from about.html
   ══════════════════════════════════════════ */
gsap.registerPlugin(ScrollTrigger);
gsap.config({ nullTargetWarn: false });

function scrollReveal(selector, options = {}) {
  const defaults = {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0 },
    duration: 0.6,
    ease: 'power2.out',
    stagger: 0,
    start: 'top 85%'
  };
  const config = { ...defaults, ...options };

  gsap.utils.toArray(selector).forEach((el, i) => {
    gsap.fromTo(el,
      config.from,
      {
        ...config.to,
        duration: config.duration,
        ease: config.ease,
        delay: i * config.stagger,
        scrollTrigger: {
          trigger: el,
          start: config.start,
          toggleActions: 'play none none reverse',
          fastScrollEnd: true
        }
      }
    );
  });
}

const headerLine = document.getElementById('headerLine');
if (headerLine) {
  gsap.fromTo(headerLine,
    { width: '0%' },
    {
      width: '100%',
      duration: 1.2,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: '.about-header',
        start: 'top 80%',
        toggleActions: 'play none none reverse',
        fastScrollEnd: true
      }
    }
  );
}

gsap.fromTo('.reveal-inner',
  { y: '110%' },
  {
    y: 0,
    duration: 0.9,
    ease: 'expo.out',
    stagger: 0.15,
    scrollTrigger: {
      trigger: '.about-header',
      start: 'top 80%',
      toggleActions: 'play none none reverse',
      fastScrollEnd: true
    }
  }
);

document.querySelectorAll('.ch-line').forEach(line => {
  gsap.fromTo(line,
    { height: '0%' },
    {
      height: '100%',
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: line.closest('.chapter'),
        start: 'top 75%',
        toggleActions: 'play none none reverse',
        fastScrollEnd: true
      }
    }
  );
});

['finalLine'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const endWidth = id === 'finalLine' ? '80%' : '100%';
  const dur = id === 'finalLine' ? 1 : 0.8;
  gsap.fromTo(el,
    { width: '0%' },
    {
      width: endWidth,
      duration: dur,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
        fastScrollEnd: true
      }
    }
  );
});

function initLetterDropIn() {
  const targets = document.querySelectorAll('.ch-title, .ch-number, .header-comment');
  targets.forEach(el => {
    const text = el.textContent;
    el.innerHTML = '';

    const words = text.split(' ');
    const allChars = [];

    words.forEach((word, wordIdx) => {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'ch-word';
      for (let i = 0; i < word.length; i++) {
        const charSpan = document.createElement('span');
        charSpan.className = 'ch-char';
        charSpan.textContent = word[i];
        wordSpan.appendChild(charSpan);
        allChars.push(charSpan);
      }
      el.appendChild(wordSpan);
      if (wordIdx < words.length - 1) {
        el.appendChild(document.createTextNode(' '));
      }
    });

    gsap.fromTo(allChars,
      { y: -30, rotation: 12, opacity: 0 },
      {
        y: 0,
        rotation: 0,
        opacity: 1,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.018,
        scrollTrigger: {
          trigger: el,
          start: 'top 90%',
          toggleActions: 'play none none reverse',
          fastScrollEnd: true
        }
      }
    );
  });
}
initLetterDropIn();

function initWordReveal() {
  document.querySelectorAll('.word-reveal').forEach(block => {
    const text = block.textContent.trim();
    const words = text.split(/\s+/);
    block.innerHTML = words
      .map(w => `<span class="word">${w}</span>`)
      .join(' ');

    const wordSpans = block.querySelectorAll('.word');

    gsap.fromTo(wordSpans,
      { opacity: 0, y: 12 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.04,
        scrollTrigger: {
          trigger: block,
          start: 'top 85%',
          toggleActions: 'play none none reverse',
          fastScrollEnd: true
        }
      }
    );
  });
}
initWordReveal();

function initGlitchReveal() {
  const el = document.getElementById('medilinkName');
  if (!el) return;

  const target   = 'MediLink AI';
  const chars    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
  let   resolved = Array(target.length).fill(null);
  let   started  = false;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !started) {
        started = true;
        observer.unobserve(el);

        let phase1Count = 0;
        const phase1 = setInterval(() => {
          el.textContent = Array.from({ length: target.length }, (_, i) =>
            resolved[i] !== null
              ? target[i]
              : target[i] === ' '
                ? ' '
                : chars[Math.floor(Math.random() * chars.length)]
          ).join('');
          if (++phase1Count > 8) clearInterval(phase1);
        }, 50);

        setTimeout(() => {
          let idx = 0;
          const phase2 = setInterval(() => {
            if (target[idx] === ' ') resolved[idx] = true;
            else resolved[idx] = true;
            idx++;

            el.textContent = Array.from({ length: target.length }, (_, i) =>
              resolved[i] !== null
                ? target[i]
                : chars[Math.floor(Math.random() * chars.length)]
            ).join('');

            if (idx >= target.length) clearInterval(phase2);
          }, 60);
        }, 400);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(el);
}
initGlitchReveal();

function initCounters() {
  document.querySelectorAll('.stat-num').forEach(el => {
    const target = parseInt(el.dataset.target, 10);

    gsap.fromTo(el,
      { innerText: 0 },
      {
        innerText: target,
        duration: 1.5,
        ease: 'power2.out',
        snap: { innerText: 1 },
        scrollTrigger: {
          trigger: el,
          start: 'top 80%',
          toggleActions: 'play none none reverse',
          fastScrollEnd: true
        }
      }
    );
  });
}
initCounters();

scrollReveal('.feature-item', { from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 }, stagger: 0.1 });
scrollReveal('.intl-badge', { from: { opacity: 0, scale: 0.8 }, to: { opacity: 1, scale: 1 }, ease: 'back.out(1.5)' });
scrollReveal('.interest-block:nth-of-type(1)', { from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 } });
scrollReveal('.interest-block:nth-of-type(2)');
scrollReveal('.interest-block:nth-of-type(3)', { from: { opacity: 0, x: 30 }, to: { opacity: 1, x: 0 } });
scrollReveal('.stat-item', { stagger: 0.1 });
scrollReveal('.final-motto');

// ══════════════════════════════════════════
// Skills Section — transferred from skill.html
// ══════════════════════════════════════════

// 1. Skill Data Configuration
const SKILL_CATEGORIES = [
  {
    id: "languages",
    title: "Languages",
    skills: [
      { name: "HTML", tag: "ADV" },
      { name: "CSS", tag: "ADV" },
      { name: "JavaScript", tag: "ADV" },
      { name: "C", tag: "INT" },
      { name: "SQL", tag: "INT" }
    ]
  },
  {
    id: "frameworks",
    title: "Frameworks & Libraries",
    skills: [
      { name: "React", tag: "INT" },
      { name: "Next.js", tag: "INT" },
      { name: "Tailwind CSS", tag: "ADV" },
      { name: "Vanilla JS", tag: "INT" }
    ]
  },
  {
    id: "tools",
    title: "Tools & Workflow",
    skills: [
      { name: "VS Code", tag: "PRO" },
      { name: "OpenCode", tag: "PRO" },
      { name: "Git", tag: "PRO" },
      { name: "GitHub", tag: "PRO" },
      { name: "Windsurf", tag: "REG" },
      { name: "Cursor", tag: "PRO" },
      { name: "Claude Code", tag: "PRO" }
    ]
  }
];

const TAG_COLORS = {
  ADV: { bg: "rgba(255, 107, 0, 0.08)", border: "rgba(255, 107, 0, 0.25)", text: "#ff6b00", label: "ADV" },
  INT: { bg: "rgba(255, 255, 255, 0.04)", border: "rgba(255, 255, 255, 0.1)", text: "#ccd6f6", label: "INT" },
  PRO: { bg: "rgba(255, 140, 58, 0.08)", border: "rgba(255, 140, 58, 0.2)", text: "#ff8c3a", label: "PRO" },
  REG: { bg: "rgba(255, 255, 255, 0.02)", border: "rgba(255, 255, 255, 0.06)", text: "#8892b0", label: "REG" }
};

let totalSkillsCount = 0;
let advancedSkillsCount = 0;
let dailyToolsCount = 0;

SKILL_CATEGORIES.forEach(cat => {
  totalSkillsCount += cat.skills.length;
  cat.skills.forEach(skill => {
    if (skill.tag === "ADV") advancedSkillsCount++;
    if (skill.tag === "PRO") dailyToolsCount++;
  });
});

// 2. DOM Rendering
const accordionContainer = document.getElementById("accordionContainer");
if (accordionContainer) {
  SKILL_CATEGORIES.forEach((category, index) => {
    const formattedIndex = String(index + 1).padStart(2, '0');
    const block = document.createElement("div");
    block.className = "sk-block";
    block.dataset.id = category.id;
    block.innerHTML = `
      <div class="sk-block-header" onclick="toggleAccordion('${category.id}')">
        <div class="sk-header-info">
          <span class="sk-number">${formattedIndex}.</span>
          <h3 class="sk-title">${category.title}</h3>
          <span class="sk-count">${category.skills.length} skills</span>
        </div>
        <div class="sk-header-visual">
          <div class="sk-decorative-line"></div>
          <button class="sk-arrow-btn" aria-label="Toggle section">
            <i class="ri-arrow-down-s-line"></i>
          </button>
        </div>
      </div>
      <div class="sk-block-body">
        <div class="sk-body-content">
          <div class="sk-pills-container">
            ${category.skills.map(skill => {
              const tagClass = `tag-${skill.tag.toLowerCase()}`;
              const config = TAG_COLORS[skill.tag] || TAG_COLORS.REG;
              return `
                <div class="sk-pill ${tagClass}">
                  <span class="sk-pill-name">${skill.name}</span>
                  <span class="sk-tag">${config.label}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
    accordionContainer.appendChild(block);
  });
}

// 3. Accordion Animation Control (GSAP)
let activeBlockId = null;

function toggleAccordion(id) {
  const targetBlock = document.querySelector(`.sk-block[data-id="${id}"]`);
  if (!targetBlock) return;

  const body = targetBlock.querySelector(".sk-block-body");
  const pills = targetBlock.querySelectorAll(".sk-pill");

  if (activeBlockId === id) {
    closeBlock(targetBlock, body, pills);
    activeBlockId = null;
    return;
  }

  if (activeBlockId) {
    const activeBlock = document.querySelector(`.sk-block[data-id="${activeBlockId}"]`);
    const activeBody = activeBlock.querySelector(".sk-block-body");
    const activePills = activeBlock.querySelectorAll(".sk-pill");
    closeBlock(activeBlock, activeBody, activePills);
  }

  openBlock(targetBlock, body, pills);
  activeBlockId = id;
}

function openBlock(block, body, pills) {
  block.classList.add("is-open");
  gsap.to(body, {
    height: "auto",
    duration: 0.5,
    ease: "power3.out",
    onStart: () => {
      gsap.set(pills, { opacity: 0, y: 15 });
    },
    onComplete: () => {
      gsap.to(pills, {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.04,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
  });
}

function closeBlock(block, body, pills) {
  block.classList.remove("is-open");
  gsap.to(pills, {
    opacity: 0,
    y: 10,
    duration: 0.25,
    stagger: 0.02,
    ease: "power2.in",
    overwrite: "auto",
    onComplete: () => {
      gsap.to(body, {
        height: 0,
        duration: 0.4,
        ease: "power3.inOut"
      });
    }
  });
}

function closeAllAccordionsInstantly() {
  const blocks = document.querySelectorAll(".sk-block");
  blocks.forEach(block => {
    block.classList.remove("is-open");
    const body = block.querySelector(".sk-block-body");
    const pills = block.querySelectorAll(".sk-pill");
    gsap.set(body, { height: 0 });
    gsap.set(pills, { opacity: 0, y: 15 });
  });
  activeBlockId = null;
}

function resetCounters() {
  document.getElementById("statTotal").textContent = "0";
  document.getElementById("statAdv").textContent = "0";
  document.getElementById("statDaily").textContent = "0";
}

// 4. ScrollTrigger Timeline
if (document.getElementById('skills')) {
  const sectionTimeline = gsap.timeline({
    scrollTrigger: {
      trigger: "#skills",
      start: "top 75%",
      end: "bottom 15%",
      toggleActions: "play reverse play reverse",
      onLeave: () => {
        closeAllAccordionsInstantly();
        resetCounters();
      },
      onLeaveBack: () => {
        closeAllAccordionsInstantly();
        resetCounters();
      }
    },
    onComplete: () => {
      const firstCat = SKILL_CATEGORIES[0];
      if (firstCat && activeBlockId !== firstCat.id) {
        toggleAccordion(firstCat.id);
      }
    },
    onReverseComplete: () => {
      closeAllAccordionsInstantly();
      resetCounters();
    }
  });

  sectionTimeline
    .to(".skills-eyebrow", {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power3.out"
    })
    .to(".skills-title", {
      y: "0%",
      duration: 0.8,
      ease: "power4.out"
    }, "-=0.4")
    .to(".skills-header-line", {
      scaleX: 1,
      duration: 0.7,
      ease: "power3.inOut"
    }, "-=0.5")
    .to(".skills-subtitle", {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: "power3.out"
    }, "-=0.4")
    .from(".sk-block", {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.15,
      ease: "power3.out"
    }, "-=0.3")
    .to(".sk-decorative-line", {
      scaleX: 1,
      duration: 0.6,
      ease: "power2.out"
    }, "-=0.2")
    .to("#skillsStatsBar", {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power3.out",
      onStart: () => {
        animateCounter("statTotal", totalSkillsCount);
        animateCounter("statAdv", advancedSkillsCount);
        animateCounter("statDaily", dailyToolsCount);
      }
    }, "-=0.2");
}

function animateCounter(id, targetValue) {
  const obj = { val: 0 };
  const element = document.getElementById(id);
  if (!element) return;

  gsap.to(obj, {
    val: targetValue,
    duration: 1.8,
    ease: "power3.out",
    onUpdate: function () {
      element.textContent = Math.floor(obj.val);
    }
  });
}

// 5. Ambient Background Particles (Canvas)
const skillsCanvas = document.getElementById("skillsBg");
if (skillsCanvas) {
  const sctx = skillsCanvas.getContext("2d");

  let particles = [];
  let animationId = null;
  let isVisible = true;
  let deviceIsLowPower = false;

  function resizeCanvas() {
    const parent = skillsCanvas.parentElement;
    skillsCanvas.width = parent.clientWidth;
    skillsCanvas.height = parent.clientHeight;
    initParticles();
  }

  class Particle {
    constructor(w, h) {
      this.reset(w, h);
      this.y = Math.random() * h;
    }
    reset(w, h) {
      this.x = Math.random() * w;
      this.y = h + Math.random() * 20;
      this.vx = (Math.random() - 0.5) * 0.15;
      this.vy = -(Math.random() * 0.35 + 0.15);
      this.size = Math.random() * 1.8 + 0.6;
      this.opacity = Math.random() * 0.45 + 0.15;
      this.fadeSpeed = Math.random() * 0.002 + 0.001;
      this.isOrange = Math.random() > 0.7;
    }
    update(w, h) {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) this.x = w;
      if (this.x > w) this.x = 0;
      if (this.y < -10) {
        this.reset(w, h);
      }
    }
    draw() {
      sctx.beginPath();
      sctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      if (this.isOrange) {
        sctx.fillStyle = `rgba(255, 107, 0, ${this.opacity})`;
      } else {
        sctx.fillStyle = `rgba(204, 214, 246, ${this.opacity * 0.7})`;
      }
      sctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    const w = skillsCanvas.width;
    const h = skillsCanvas.height;
    let maxParticles = 60;
    if (window.innerWidth < 768) {
      maxParticles = 25;
    }
    if (deviceIsLowPower) {
      maxParticles = 15;
    }
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle(w, h));
    }
  }

  function particleLoop() {
    if (!isVisible || !skillsVisible) return;
    const w = skillsCanvas.width;
    const h = skillsCanvas.height;
    sctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.update(w, h);
      p.draw();
    });
    animationId = requestAnimationFrame(particleLoop);
  }

  window.addEventListener("resize", () => {
    clearTimeout(window.resizeDebounce);
    window.resizeDebounce = setTimeout(resizeCanvas, 150);
  });

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motionQuery.matches) {
    deviceIsLowPower = true;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      isVisible = false;
      cancelAnimationFrame(animationId);
    } else {
      isVisible = true;
      particleLoop();
    }
  });

  resizeCanvas();

  let skillsVisible = true;
  new IntersectionObserver(([entry]) => {
    skillsVisible = entry.isIntersecting;
    if (skillsVisible && !document.hidden) {
      if (!animationId) particleLoop();
    } else {
      isVisible = false;
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  }, { threshold: 0.05 }).observe(skillsCanvas.parentElement);

  particleLoop();
}

// ══════════════════════════════════════════
// Carno Portfolio — Projects Section v2.0
// transferred from projects.html
// ══════════════════════════════════════════

// ── Project Data ──────────────────────────────────────────
const PROJECTS = [
  {
    id: "jannat",
    number: "01",
    name: "The Jannat Bake House",
    tagline: "E-Commerce Bakery — Sylhet, Bangladesh",
    description:
      "A fully functional bakery e-commerce website where customers from Sylhet can browse and order any baking item or custom cake via WhatsApp. Clean product listings, order flow, and mobile-friendly design.",
    tags: ["HTML", "CSS", "JavaScript"],
    badge: null,
    github: "https://mashababy14-cmyk.github.io/Thejannat-bakehouse/",
    live: "https://mashababy14-cmyk.github.io/Thejannat-bakehouse/",
    year: "2025",
    image: "jannat-preview.png",
    featured: false,
  },
  {
    id: "medilink-v1",
    number: "02",
    name: "MediLink AI v1",
    tagline: "Healthcare Platform — BYSIS National Silver Medal",
    description:
      "A healthcare e-commerce and doctor-finder platform. Users can search for doctors, place emergency calls, and order medicine from pharmacies anywhere. Won Silver Medal at BYSIS National Round.",
    tags: ["HTML", "CSS", "JavaScript"],
    badge: "🥈 BYSIS National — Silver Medal",
    github: "https://src-67.github.io/MEDILINK.AI-26/",
    live: "https://src-67.github.io/MEDILINK.AI-26/",
    year: "2025",
    image: "medilink-v1-preview.png",
    featured: false,
  },
  {
    id: "medilink-v2",
    number: "03",
    name: "MediLink AI v2",
    tagline: "Representing Bangladesh — International Stage 🇧🇩",
    description:
      "The next evolution of MediLink. Users register and the platform customizes itself to their profile. Features a personal AI for home treatment, online doctor consultations via video call, and pharmacy medicine ordering.",
    tags: ["HTML", "CSS", "Vanilla JS"],
    badge: "🇧🇩 Representing Bangladesh Internationally",
    github: "https://src-67.github.io/MEDILINK.AI-/",
    live: "https://src-67.github.io/MEDILINK.AI-/",
    year: "2025",
    image: "medilink-v2-preview.png",
    featured: true,
  },
];

// ── Build Card HTML ───────────────────────────────────────
function buildPanelHTML(proj) {
  const imgEl = proj.image
    ? `<img src="${proj.image}" alt="${proj.name}" class="panel-img" loading="lazy">`
    : `<div class="panel-img-placeholder"><span>${proj.name}</span></div>`;

  const badgeEl = proj.badge
    ? `<div class="panel-badge">${proj.badge}</div>`
    : "";

  return `
    <div class="panel-bg"></div>
    <div class="panel-spotlight"></div>
    <div class="panel-inner">
      <div class="panel-right">
        <div class="panel-preview">
          ${imgEl}
          <div class="panel-preview-overlay"></div>
        </div>
      </div>
      <div class="panel-left">
        <div class="panel-meta">
          <span class="panel-number">${proj.number}</span>
          <span class="panel-year">${proj.year}</span>
        </div>
        ${badgeEl}
        <h3 class="panel-name">${proj.name}</h3>
        <p class="panel-tagline">${proj.tagline}</p>
        <p class="panel-desc">${proj.description}</p>
        <div class="panel-tags">
          ${proj.tags.map((t) => `<span class="panel-tag">${t}</span>`).join("")}
        </div>
        <div class="panel-links">
          <a href="${proj.github}" target="_blank" rel="noopener" class="panel-btn btn-github">
            <span class="btn-blob"></span>
            <span class="btn-content"><i class="ri-github-fill"></i><span>GitHub</span></span>
          </a>
          <a href="${proj.live}" target="_blank" rel="noopener" class="panel-btn btn-live">
            <span class="btn-blob"></span>
            <span class="btn-content"><i class="ri-external-link-line"></i><span>Live →</span></span>
          </a>
        </div>
      </div>
    </div>
  `;
}

function buildPanels() {
  const stack = document.getElementById("projStack");
  const dots = document.getElementById("stackDots");

  PROJECTS.forEach((proj, i) => {
    const panel = document.createElement("div");
    panel.className = "proj-panel";
    panel.dataset.index = i;
    panel.dataset.featured = proj.featured ? "true" : "false";
    panel.style.zIndex = 10 + i * 10;
    panel.innerHTML = buildPanelHTML(proj);
    stack.appendChild(panel);

    const dot = document.createElement("div");
    dot.className = "stack-dot" + (i === 0 ? " active" : "");
    dot.dataset.dot = i;
    dots.appendChild(dot);
  });
}
buildPanels();

// ── Stacking Animation ────────────────────────────────────
let stackSTs = [];

function initStackAnimation() {
  const panels = document.querySelectorAll(".proj-panel");
  const dots = document.querySelectorAll(".stack-dot");

  panels.forEach((panel, i) => {
    if (i < panels.length - 1) {
      const nextPanel = panels[i + 1];

      const st = ScrollTrigger.create({
        trigger: nextPanel,
        start: "top bottom",
        end: "top top",
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress;
          gsap.set(panel, {
            scale: 1 - p * 0.08,
            opacity: 1 - p * 0.6,
            y: -p * 20,
          });
        },
      });
      stackSTs.push(st);
    }

    const activeST = ScrollTrigger.create({
      trigger: panel,
      start: "top center",
      end: "bottom center",
      onEnter: () => setActivePanel(i),
      onEnterBack: () => setActivePanel(i),
    });
    stackSTs.push(activeST);
  });

  function setActivePanel(index) {
    panels.forEach((p, i) => p.classList.toggle("active", i === index));
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }

  panels[0]?.classList.add("active");
}
initStackAnimation();

// ── Spotlight ─────────────────────────────────────────────
function initSpotlight() {
  document.querySelectorAll(".proj-panel").forEach((panel) => {
    function updateSpotlight(clientX, clientY) {
      const r = panel.getBoundingClientRect();
      const sx = ((clientX - r.left) / r.width) * 100;
      const sy = ((clientY - r.top) / r.height) * 100;
      panel.style.setProperty("--sx", sx + "%");
      panel.style.setProperty("--sy", sy + "%");
    }

    panel.addEventListener(
      "mousemove",
      (e) => {
        updateSpotlight(e.clientX, e.clientY);
      },
      { passive: true },
    );

    panel.addEventListener(
      "touchmove",
      (e) => {
        const t = e.touches[0];
        if (t) updateSpotlight(t.clientX, t.clientY);
      },
      { passive: true },
    );
  });
}
initSpotlight();

// ── Section Header Reveal ─────────────────────────────────
ScrollTrigger.create({
  trigger: "#projects",
  start: "top 70%",
  once: true,
  onEnter: () => {
    setTimeout(
      () =>
        document.querySelector(".proj-eyebrow").classList.add("visible"),
      0,
    );
    setTimeout(
      () => document.getElementById("projTitle").classList.add("visible"),
      150,
    );
    setTimeout(
      () =>
        document.getElementById("projHeaderLine").classList.add("drawn"),
      350,
    );
    setTimeout(
      () =>
        document.querySelector(".proj-subtitle").classList.add("visible"),
      550,
    );
  },
});

// ── Animated Background ───────────────────────────────────
const bgCanvas = document.getElementById("projBgCanvas");
const bgCtx = bgCanvas.getContext("2d", { alpha: true });

const isLowEnd =
  (navigator.hardwareConcurrency || 4) <= 2 || window.innerWidth < 600;
const BG_FPS = isLowEnd ? 30 : 60;
const BG_FRAME_MS = 1000 / BG_FPS;
const BG_N = isLowEnd ? 30 : 50;

let BW, BH;
function resizeBgCanvas() {
  const rect = document
    .getElementById("projects")
    .getBoundingClientRect();
  BW = bgCanvas.width = bgCanvas.offsetWidth || window.innerWidth;
  BH = bgCanvas.height = bgCanvas.offsetHeight || rect.height;
}
resizeBgCanvas();
window.addEventListener("resize", resizeBgCanvas, { passive: true });

const bx = new Float32Array(BG_N);
const by = new Float32Array(BG_N);
const bvx = new Float32Array(BG_N);
const bvy = new Float32Array(BG_N);
const br = new Float32Array(BG_N);
const ba = new Float32Array(BG_N);
const bph = new Float32Array(BG_N);

for (let i = 0; i < BG_N; i++) {
  bx[i] = Math.random() * BW;
  by[i] = Math.random() * BH;
  bvx[i] = (Math.random() - 0.5) * 0.25;
  bvy[i] = (Math.random() - 0.5) * 0.25;
  br[i] = Math.random() * 1.6 + 0.5;
  ba[i] = Math.random() * 0.18 + 0.04;
  bph[i] = Math.random() * Math.PI * 2;
}

let bgLastT = 0;
let bgRafId = null;
let bgVisible = true;

function drawBg(ts) {
  bgRafId = requestAnimationFrame(drawBg);
  if (!bgVisible) return;
  if (ts - bgLastT < BG_FRAME_MS) return;
  bgLastT = ts;

  bgCtx.clearRect(0, 0, BW, BH);

  for (let i = 0; i < BG_N; i++) {
    bx[i] += bvx[i];
    by[i] += bvy[i];
    bph[i] += 0.02;

    if (bx[i] < -10) bx[i] = BW + 10;
    if (bx[i] > BW + 10) bx[i] = -10;
    if (by[i] < -10) by[i] = BH + 10;
    if (by[i] > BH + 10) by[i] = -10;

    const pulse = (Math.sin(bph[i]) + 1) * 0.5;
    const size = br[i] * (0.7 + pulse * 0.5);
    const alpha = ba[i] * (0.6 + pulse * 0.4);

    bgCtx.beginPath();
    bgCtx.arc(bx[i], by[i], size, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(252,163,17,${alpha})`;
    bgCtx.fill();
  }
}
bgRafId = requestAnimationFrame(drawBg);

document.addEventListener("visibilitychange", () => {
  bgVisible = !document.hidden;
});

new IntersectionObserver(
  ([entry]) => {
    bgVisible = entry.isIntersecting && !document.hidden;
  },
  { threshold: 0.05 },
).observe(document.getElementById("projects"));

// ── Blob Button Interaction ───────────────────────────────
function initProjectBlobButtons() {
  document
    .querySelectorAll(".panel-btn, .proj-cta-btn")
    .forEach((btn) => {
      const blob = btn.querySelector(".btn-blob");
      if (!blob) return;

      function positionBlob(e) {
        const r = btn.getBoundingClientRect();
        const x =
          (e.clientX ?? e.touches?.[0]?.clientX ?? r.width / 2) - r.left;
        const y =
          (e.clientY ?? e.touches?.[0]?.clientY ?? r.height / 2) - r.top;
        blob.style.left = x + "px";
        blob.style.top = y + "px";
      }

      btn.addEventListener("mouseenter", positionBlob);
      btn.addEventListener("mouseleave", positionBlob);
    });
}
initProjectBlobButtons();

// ── Font Ready ────────────────────────────────────────────
document.fonts.ready.then(() => {
  ScrollTrigger.refresh();
});

/* ══════════════════════════════════════════
   Carno Portfolio — Achievement Section
   transferred from in.html
   ══════════════════════════════════════════ */

const MILESTONES = [
  {
    id: "bysis",
    date: "May 2026",
    icon: "\uD83E\uDD48",
    status: "ACHIEVED",
    title: "BYSIS National Round",
    subtitle: "Silver Medal",
    fullName: "Bangladesh Young Scientists and Innovators Society",
    project: "MediLink AI v1",
    note: null,
    link: "https://src-67.github.io/MEDILINK.AI-26/",
  },
  {
    id: "biicc",
    date: "June 2026",
    icon: "\uD83C\uDF0D",
    status: "IN PROGRESS",
    title: "BIICC 2026",
    subtitle: "Representing Bangladesh",
    fullName:
      "Borneo International Innovation, Invention & Creativity Competition",
    project: "MediLink AI v2",
    note: "Results: July 10, 2026",
    link: "https://src-67.github.io/MEDILINK.AI-/",
  },
  {
    id: "future",
    date: "Future",
    icon: "\u26A1",
    status: "LOADING",
    title: "Next milestone loading...",
    subtitle: null,
    fullName: null,
    project: null,
    note: null,
    link: null,
  },
];

function buildTimeline() {
  const timeline = document.getElementById("timeline");

  MILESTONES.forEach((m) => {
    const el = document.createElement("div");
    el.className = "milestone";
    el.dataset.id = m.id;
    el.dataset.status = m.status;

    let badgeHTML = "";
    if (m.status === "ACHIEVED") {
      badgeHTML =
        '<span class="status-badge status-done">' + m.status + "</span>";
    } else if (m.status === "IN PROGRESS") {
      badgeHTML =
        '<span class="status-badge status-prog"><span class="badge-dot"></span>' +
        m.status +
        "</span>";
    } else {
      badgeHTML =
        '<span class="status-badge status-load">' + m.status + "</span>";
    }

    let cardBody = "";
    if (m.status === "LOADING") {
      cardBody = `
    <div class="card-top">
      <span class="card-icon">${m.icon}</span>
      ${badgeHTML}
    </div>
    <h3 class="card-title">${m.title}</h3>
    <div class="loading-bar-track"><div class="loading-bar-fill"></div></div>
    <div class="loading-dots" style="margin-top:12px;">
      <span></span><span></span><span></span>
    </div>
  `;
    } else {
      cardBody = `
    <div class="card-top">
      <span class="card-icon">${m.icon}</span>
      ${badgeHTML}
    </div>
    <h3 class="card-title">${m.title}</h3>
    <p class="card-subtitle">${m.subtitle}</p>
    <p class="card-fullname">${m.fullName}</p>
    <div class="card-meta">
      <span class="card-project">${m.project}</span>
      <span class="card-date">${m.date}</span>
      ${m.note ? '<span class="card-note">' + m.note + "</span>" : ""}
    </div>
    ${m.link ? '<a href="' + m.link + '" target="_blank" class="card-link"><span class="link-blob"></span><span class="link-content">View Project \u2192</span></a>' : ""}
  `;
    }

    el.innerHTML = `
  <div class="milestone-dot" id="dot-${m.id}"></div>
  <div class="milestone-date">${m.date}</div>
  <div class="milestone-card" id="card-${m.id}">
    ${cardBody}
  </div>
`;

    timeline.appendChild(el);
  });
}
buildTimeline();

function initAchievementAnimation() {
  ScrollTrigger.create({
    trigger: "#achievements",
    start: "top 70%",
    once: true,
    onEnter: () => {
      setTimeout(
        () =>
          document.querySelector(".ach-eyebrow").classList.add("visible"),
        0,
      );
      setTimeout(
        () =>
          document.getElementById("achTitle").classList.add("visible"),
        150,
      );
      setTimeout(
        () =>
          document.getElementById("achHeaderLine").classList.add("drawn"),
        350,
      );
      setTimeout(
        () =>
          document
            .querySelector(".ach-subtitle")
            .classList.add("visible"),
        550,
      );
    },
  });

  gsap.to("#timelineLineFill", {
    height: "100%",
    ease: "none",
    scrollTrigger: {
      trigger: "#timeline",
      start: "top 60%",
      end: "bottom 80%",
      scrub: 0.5,
    },
  });

  document.querySelectorAll(".milestone").forEach((milestone) => {
    const dot = milestone.querySelector(".milestone-dot");
    const card = milestone.querySelector(".milestone-card");

    ScrollTrigger.create({
      trigger: milestone,
      start: "top 75%",
      once: true,
      onEnter: () => {
        gsap.to(dot, {
          scale: 1,
          duration: 0.5,
          ease: "back.out(1.8)",
        });
        setTimeout(() => card.classList.add("visible"), 150);
      },
    });
  });
}
initAchievementAnimation();

if (typeof VanillaTilt !== 'undefined') {
  document.querySelectorAll('.milestone-card').forEach(card => {
    VanillaTilt.init(card, {
      max: 8,
      speed: 400,
      glare: true,
      'max-glare': 0.25,
      scale: 1.02,
      easing: 'cubic-bezier(.16,1,.3,1)',
    });
    card.classList.add('tilt-active');
  });
}

/* ══════════════════════════════════════════
   Carno Portfolio — Contact Section
   transferred from in.html
   ══════════════════════════════════════════ */

function initContactAnimation() {
  ScrollTrigger.create({
    trigger: "#contact",
    start: "top 70%",
    once: true,
    onEnter: () => {
      document.querySelectorAll(".hl-line").forEach((line, i) => {
        setTimeout(() => line.classList.add("visible"), i * 120);
      });

      setTimeout(() => {
        document.querySelector(".contact-info").classList.add("visible");
      }, 500);

      document.querySelectorAll(".soc-link").forEach((link, i) => {
        setTimeout(() => link.classList.add("visible"), 600 + i * 100);
      });

      document.querySelectorAll(".form-group").forEach((group, i) => {
        setTimeout(() => group.classList.add("visible"), 800 + i * 120);
      });

      setTimeout(() => {
        const sub = document.querySelector(".contact-form .form-submit");
        if (sub) sub.classList.add("visible");
      }, 800 + document.querySelectorAll(".form-group").length * 120 + 120);

      gsap.to("#dividerFill", {
        height: "100%",
        duration: 1.2,
        ease: "power2.out",
        delay: 0.4,
      });
    },
  });
}
initContactAnimation();

function initBlobs() {
  document
    .querySelectorAll(".soc-link, .card-link, .form-submit")
    .forEach((btn) => {
      const blob = btn.querySelector(
        ".soc-blob, .link-blob, .submit-blob",
      );
      if (!blob) return;

      btn.addEventListener("mouseenter", (e) => {
        const r = btn.getBoundingClientRect();
        blob.style.left = e.clientX - r.left + "px";
        blob.style.top = e.clientY - r.top + "px";
      });
      btn.addEventListener("mouseleave", (e) => {
        const r = btn.getBoundingClientRect();
        blob.style.left = e.clientX - r.left + "px";
        blob.style.top = e.clientY - r.top + "px";
      });
    });
}
initBlobs();

const contactForm = document.getElementById("contact-form");
const submitBtn = document.getElementById("formSubmit");
const submitContent = document.getElementById("submitContent");
const statusMessage = document.getElementById("status-message");

if (contactForm) {
  const originalHTML = submitContent.innerHTML;

  contactForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = this.querySelector('[name="name"]').value.trim();
    const email = this.querySelector('[name="email"]').value.trim();
    const message = this.querySelector('[name="message"]').value.trim();

    const subject = `Portfolio Contact — ${name}`;
    const body = `${message}%0A%0A—%0AReply to: ${email}`;
    const mailto = `mailto:carno478@gmail.com?subject=${encodeURIComponent(subject)}&body=${body}`;

    submitBtn.classList.add("success");
    submitContent.innerHTML = "<span>✓ Opening mail...</span>";
    statusMessage.style.color = "#28c840";
    statusMessage.textContent = "Opening your email client...";

    window.location.href = mailto;

    setTimeout(() => {
      submitBtn.classList.remove("success");
      submitContent.innerHTML = originalHTML;
      statusMessage.textContent = "";
      contactForm.reset();
    }, 3000);
  });
}

/* ══════════════════════════════════════════
   Carno Portfolio — Footer Section
   Signature Scroll Reveal — transferred from footer.html
   ══════════════════════════════════════════ */

(function () {
  const fillText = document.querySelector('.signature-text.fill');
  const signatureWrapper = document.querySelector('.signature-wrapper');
  const footer = document.querySelector('.footer');

  if (!fillText || !signatureWrapper || !footer) return;

  let footerRafId = null;
  let footerVisible = false;

  function updateSignature() {
    if (!footerVisible) { footerRafId = null; return; }
    const rect = footer.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const startPoint = windowHeight;
    const endPoint = 0;
    let progress = (startPoint - rect.top) / (startPoint - endPoint);
    progress = Math.max(0, Math.min(1, progress));
    const clipTop = 100 - (progress * 100);
    fillText.style.clipPath = `inset(${clipTop}% 0 0 0)`;
    const scale = 0.9 + (progress * 0.1);
    signatureWrapper.style.transform = `scale(${scale})`;
    footerRafId = requestAnimationFrame(updateSignature);
  }

  new IntersectionObserver(([entry]) => {
    footerVisible = entry.isIntersecting;
    if (footerVisible && !footerRafId) { footerRafId = requestAnimationFrame(updateSignature); }
    else if (!footerVisible && footerRafId) { cancelAnimationFrame(footerRafId); footerRafId = null; }
  }, { threshold: 0 }).observe(footer);
})();
