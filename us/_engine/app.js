// Detail Studio engine — motion system
const S = window.SITE || {};
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const range = (p, a, b) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t); };
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isMobile = matchMedia('(max-width: 760px)').matches || !finePointer;

function waitFor(cond, ms = 8000) {
  return new Promise((res) => { const t0 = performance.now(); (function tick() { if (cond() || performance.now() - t0 > ms) res(); else requestAnimationFrame(tick); })(); });
}

(async function main() {
  await waitFor(() => window.gsap && window.ScrollTrigger && window.Lenis);
  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);
  if (reduced) document.documentElement.classList.add('no-motion');

  // ── Smooth scroll
  let lenis = null;
  if (!reduced && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, syncTouch: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    window.__lenis = lenis;
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -10, duration: 1.6 });
    else (typeof target === 'number' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : target.scrollIntoView({ behavior: 'smooth' }));
  };
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = $(id); if (!el) return;
    e.preventDefault(); closeMenu();
    scrollTo(id === '#top' ? 0 : el);
    const pkg = a.dataset.pkg; if (pkg) { const m = $('[name="msg"]'); if (m && !m.value) { m.value = `Interested in the ${pkg} package.`; } }
  }));

  // ── Loader + 3D stage
  const counter = $('[data-count]'), bar = $('.loader__bar i');
  let shown = 0;
  const setLoad = (v) => { shown = Math.max(shown, v); counter.textContent = Math.round(shown * 100); bar.style.transform = `scaleX(${shown})`; };
  const canvas = $('[data-canvas]');
  let stage = null;
  const canWebGL = (() => { try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch { return false; } })();
  const lowEnd = (navigator.deviceMemory && navigator.deviceMemory < 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
  const want3D = canWebGL && !reduced && !(isMobile && lowEnd) && !/no3d/.test(location.search);
  const t0 = performance.now();
  let fake = 0; const fakeTimer = setInterval(() => { fake = Math.min(0.9, fake + 0.04); setLoad(want3D ? fake * 0.5 : fake); }, 60);
  if (want3D) {
    try {
      const { createStage } = await import('./scene.js');
      stage = await createStage({ canvas, base: S.base, paint: S.paint, accent: S.accent, bg: S.bg, mobile: isMobile, onProgress: (v) => setLoad(0.15 + v * 0.8) });
      document.body.classList.add('has-3d');
    } catch (err) { console.warn('3D disabled:', err && err.message); stage = null; }
  }
  if (!stage) document.body.classList.add('no-3d');
  await new Promise((r) => setTimeout(r, Math.max(0, 900 - (performance.now() - t0))));
  clearInterval(fakeTimer); setLoad(1);
  await new Promise((r) => setTimeout(r, 250));
  document.body.classList.add('is-ready'); document.body.classList.remove('is-loading');
  if (lenis) lenis.start();

  // ── Hero intro
  const heroWords = $$('.hero .w > span');
  gsap.set(heroWords, { yPercent: 115 });
  gsap.set(['.hero .eyebrow', '.hero__sub', '.hero__actions', '.rating', '.hero__meta'], { autoAlpha: 0, y: 24 });
  gsap.timeline({ delay: 0.35 })
    .to(heroWords, { yPercent: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07 })
    .to(['.hero .eyebrow', '.hero__sub', '.hero__actions', '.rating', '.hero__meta'], { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, 0.35);

  // ── Stage scroll story
  const hero = $('[data-hero]'), acts = $('[data-acts]'), actEls = $$('[data-act]'), rail = $('[data-rail]'), meta = $('.hero__meta'), shade = $('.stage__shade');
  const W = [[0.15, 0.27], [0.27, 0.47], [0.47, 0.67], [0.67, 0.9]];
  function storyUpdate(p) {
    const out = range(p, 0.03, 0.13);
    hero.style.opacity = 1 - out;
    hero.style.transform = `translate3d(0, ${-out * 80}px, 0)`;
    hero.style.pointerEvents = out > 0.5 ? 'none' : '';
    meta.style.opacity = 1 - range(p, 0.01, 0.06);
    const aIn = range(p, 0.14, 0.2) * (1 - range(p, 0.9, 0.96));
    acts.style.opacity = aIn;
    actEls.forEach((el, i) => {
      const [a, b] = W[i]; const span = b - a;
      const vis = range(p, a - 0.02, a + span * 0.18) * (1 - range(p, b - span * 0.18, b + 0.02));
      el.style.opacity = vis;
      el.style.transform = `translate3d(0, ${(1 - vis) * (p < a + span / 2 ? 40 : -40)}px, 0)`;
      el.style.filter = vis < 0.99 ? `blur(${(1 - vis) * 8}px)` : '';
    });
    rail.style.transform = `scaleY(${range(p, 0.15, 0.9)})`;
    shade.style.opacity = 1 - 0.6 * range(p, 0.1, 0.2) + 0.6 * range(p, 0.9, 1);
    if (stage) stage.setProgress(p);
  }
  ScrollTrigger.create({ trigger: '[data-stage]', start: 'top top', end: 'bottom bottom', onUpdate: (st) => storyUpdate(st.progress) });
  storyUpdate(0);
  if (stage) {
    stage.start();
    new IntersectionObserver(([e]) => (e.isIntersecting ? stage.start() : stage.stop()), { rootMargin: '100px' }).observe($('[data-stage]'));
    document.addEventListener('visibilitychange', () => (document.hidden ? stage.stop() : stage.start()));
    addEventListener('resize', () => stage.resize());
    if (finePointer) addEventListener('pointermove', (e) => stage.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1), { passive: true });
  }

  // ── Nav behaviour
  const nav = $('[data-nav]');
  let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => {
    const y = st.scroll();
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > lastY && y > innerHeight * 0.6 && !menu.classList.contains('is-open'));
    lastY = y;
  } });
  const burger = $('[data-burger]'), menu = $('[data-menu]');
  function closeMenu() { menu.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); lenis && lenis.start(); }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open');
    menu.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open));
    if (open) { lenis && lenis.stop(); gsap.fromTo($$('a', menu), { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: 0.9, ease: 'expo.out', delay: 0.15 }); }
    else lenis && lenis.start();
  });

  // ── Split headings + reveals
  $$('.split').forEach((h) => {
    if (h.closest('.hero')) return;
    const w = $$('.w > span', h);
    gsap.set(w, { yPercent: 115 });
    ScrollTrigger.create({ trigger: h, start: 'top 88%', once: true, onEnter: () => gsap.to(w, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06 }) });
  });
  $$('.reveal').forEach((el) => {
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(el, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out' }) });
  });

  // ── Marquee (reacts to scroll velocity)
  const track = $('.marquee__track');
  const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: 'none', repeat: -1 });
  let skew = gsap.quickTo(track, 'skewX', { duration: 0.6, ease: 'power3' });
  if (lenis) lenis.on('scroll', ({ velocity }) => {
    const v = clamp(velocity / 40, -1, 1);
    gsap.to(loop, { timeScale: (v < 0 ? -1 : 1) * (1 + Math.abs(v) * 4), duration: 0.3, overwrite: true });
    skew(-v * 6);
  });

  // ── Services: floating image follows the cursor
  const float = $('[data-float]');
  if (finePointer && float) {
    const fx = gsap.quickTo(float, 'x', { duration: 0.7, ease: 'power3' });
    const fy = gsap.quickTo(float, 'y', { duration: 0.7, ease: 'power3' });
    const fr = gsap.quickTo(float, 'rotation', { duration: 0.9, ease: 'power3' });
    let px = 0;
    addEventListener('pointermove', (e) => { fx(e.clientX - 170 + 40); fy(e.clientY - 210); fr(clamp((e.clientX - px) * 0.25, -8, 8)); px = e.clientX; }, { passive: true });
    const imgs = $$('[data-for]', float);
    $$('.svc__row').forEach((row) => {
      row.addEventListener('pointerenter', () => {
        imgs.forEach((im) => im.classList.toggle('is-on', im.dataset.for === row.dataset.img));
        gsap.to(float, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
      });
    });
    $('[data-svc]').addEventListener('pointerleave', () => { gsap.to(float, { autoAlpha: 0, scale: 0.6, duration: 0.5, ease: 'expo.out' }); imgs.forEach((i) => i.classList.remove('is-on')); });
  }
  gsap.utils.toArray('.svc__row').forEach((row) => gsap.from(row, { opacity: 0, y: 50, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 92%', once: true } }));

  // ── Feature: mask opens into a full-bleed image
  const fm = $('[data-feature-media]');
  if (fm) {
    const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-feature]', start: 'top top', end: 'bottom bottom', scrub: true } });
    tl.fromTo(fm, { clipPath: 'inset(22% 30% 22% 30% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 })
      .fromTo($('img', fm), { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1.3 }, 0)
      .to($$('.feature__copy > *:not(.label):not(.feature__title)'), { opacity: 1, y: 0, stagger: 0.08, duration: 0.4 }, 0.75);
    gsap.to('.feature__sticky', { scale: 0.92, opacity: 0.35, ease: 'none', scrollTrigger: { trigger: '.pricing', start: 'top bottom', end: 'top 20%', scrub: true } });
  }

  // ── Pricing: size toggle with counting numbers, tilt + spotlight cards
  const pill = $('[data-size-pill]'), sizeBtns = $$('[data-size]');
  const movePill = (btn) => { pill.style.width = btn.offsetWidth + 'px'; pill.style.transform = `translateX(${btn.offsetLeft - 5}px)`; };
  if (pill && sizeBtns[0]) { movePill(sizeBtns[0]); addEventListener('resize', () => movePill($('[data-size][aria-selected="true"]'))); }
  sizeBtns.forEach((b) => b.addEventListener('click', () => {
    sizeBtns.forEach((x) => x.setAttribute('aria-selected', String(x === b))); movePill(b);
    const i = +b.dataset.size;
    $$('[data-prices]').forEach((el) => {
      const to = +el.dataset.prices.split(',')[i]; const o = { v: +el.textContent.replace(/\D/g, '') };
      gsap.to(o, { v: to, duration: 0.9, ease: 'expo.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); } });
    });
  }));
  if (finePointer) $$('[data-tilt]').forEach((card) => {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', x * 100 + '%'); card.style.setProperty('--my', y * 100 + '%');
      rx((0.5 - y) * 7); ry((x - 0.5) * 9);
    });
    card.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
  gsap.from('.pkg', { y: 80, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.pkgs', start: 'top 85%', once: true } });

  // ── Gallery: pinned horizontal scroll with inner parallax (desktop)
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const tr = $('[data-track]'), shots = $$('[data-shot] img');
    const dist = () => Math.max(0, tr.scrollWidth - innerWidth);
    const tween = gsap.to(tr, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '[data-work]', pin: '.work__sticky', start: 'top top', end: () => '+=' + dist(), scrub: 1, invalidateOnRefresh: true, anticipatePin: 1, onUpdate: (st) => { $('[data-work-bar]').style.transform = `scaleX(${st.progress})`; } } });
    shots.forEach((im) => gsap.fromTo(im, { xPercent: -8 }, { xPercent: 8, ease: 'none', scrollTrigger: { trigger: im.closest('.shot'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } }));
    $$('[data-shot]').forEach((s) => gsap.from(s.querySelector('.shot__in'), { clipPath: 'inset(100% 0% 0% 0% round 18px)', duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: s, containerAnimation: tween, start: 'left 95%', once: true } }));
  });

  // ── Reviews: words light up as you read
  const lit = $$('[data-lit] p span');
  if (lit.length) ScrollTrigger.create({ trigger: '[data-lit]', start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: (st) => {
    const n = st.progress * lit.length * 1.1;
    lit.forEach((s, i) => { s.style.opacity = clamp(0.14 + (n - i) * 0.5, 0.14, 1); });
  } });

  // ── FAQ accordion with animated height
  $$('.qa').forEach((d) => {
    const sum = $('summary', d), body = $('.qa__a', d);
    sum.addEventListener('click', (e) => {
      e.preventDefault();
      if (d.open) gsap.to(body, { height: 0, duration: 0.6, ease: 'expo.out', onComplete: () => { d.open = false; body.style.height = ''; } });
      else { d.open = true; gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: 0.8, ease: 'expo.out', onComplete: () => { body.style.height = ''; ScrollTrigger.refresh(); } }); }
    });
  });

  // ── Form (preview: validates, never sends)
  const form = $('[data-form]');
  form && form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach((i) => { const bad = !i.value.trim(); i.closest('.field').classList.toggle('is-bad', bad); if (bad) ok = false; });
    if (!ok) { gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, .3)' }); return; }
    const okEl = $('.form__ok', form); okEl.hidden = false;
    gsap.from(okEl, { opacity: 0, y: 12, duration: 0.8, ease: 'expo.out' });
    $('button[type="submit"] span', form).textContent = 'Request received';
  });

  // ── Footer letters
  gsap.from('[data-foot] span', { yPercent: 100, opacity: 0, duration: 1.4, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '[data-foot]', start: 'top 95%', once: true } });

  // ── Magnetic buttons + cursor
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach((b) => {
      const x = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' }), y = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.25); y((e.clientY - r.top - r.height / 2) * 0.35); });
      b.addEventListener('pointerleave', () => { x(0); y(0); });
    });
    const cur = $('.cursor'), label = $('span', cur);
    const cx = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    addEventListener('pointermove', (e) => { cx(e.clientX); cy(e.clientY); }, { passive: true });
    const setLabel = (t) => { cur.classList.toggle('is-label', !!t); if (t) label.textContent = t; };
    $$('[data-shot]').forEach((s) => { s.addEventListener('pointerenter', () => setLabel('Detail')); s.addEventListener('pointerleave', () => setLabel('')); });
    $$('a, button, summary, label').forEach((el) => { el.addEventListener('pointerenter', () => gsap.to('.cursor i', { scale: 2.6, duration: 0.3 })); el.addEventListener('pointerleave', () => gsap.to('.cursor i', { scale: 1, duration: 0.3 })); });
  }

  // ── Ribbon
  const rb = $('[data-ribbon-close]');
  rb && rb.addEventListener('click', () => $('[data-ribbon]').classList.add('is-gone'));

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
