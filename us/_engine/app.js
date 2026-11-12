// Detail Studio engine · v2 — motion: short, decisive, only where it explains something.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = matchMedia('(min-width: 761px)');

  function start() {
    const { gsap, ScrollTrigger } = window;
    if (!gsap || !ScrollTrigger) { document.documentElement.classList.add('no-motion'); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (reduced) document.documentElement.classList.add('no-motion');
    gsap.defaults({ ease: 'power3.out', duration: 0.6 });

    // ── Scroll: Lenis with a short, direct lerp (no floaty glide)
    let lenis = null;
    if (!reduced && window.Lenis && finePointer) {
      lenis = new Lenis({ lerp: 0.2, wheelMultiplier: 1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      window.__lenis = lenis;
    }
    const goTo = (el) => {
      if (lenis) lenis.scrollTo(el, { offset: 0, duration: 0.9, easing: (t) => 1 - Math.pow(1 - t, 3) });
      else (el === 0 ? window.scrollTo({ top: 0, behavior: 'smooth' }) : el.scrollIntoView({ behavior: 'smooth' }));
    };

    // ── Menu
    const burger = $('[data-burger]'), menu = $('[data-menu]');
    const setMenu = (open) => {
      menu.classList.toggle('is-open', open); burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open && !reduced) gsap.fromTo($$('nav a', menu), { y: 24, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.035, duration: 0.45 });
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));

    $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href'); if (id.length < 2) return;
      const el = $(id); if (!el) return;
      e.preventDefault(); if (menu.classList.contains('is-open')) setMenu(false);
      goTo(id === '#top' ? 0 : el);
      const pkg = a.dataset.pkg; if (pkg) { const m = $('[name="msg"]'); if (m && !m.value) m.value = `Interested in the ${pkg} package.`; }
    }));

    // ── Nav: solid after the fold starts, hides on the way down
    const nav = $('[data-nav]'), ribbon = $('[data-ribbon]');
    let lastY = 0;
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (st) => {
      const y = st.scroll();
      nav.classList.toggle('is-solid', y > 40);
      if (y > lastY + 2 && y > innerHeight * 0.8) nav.classList.add('is-hidden');
      if (y < lastY - 2) nav.classList.remove('is-hidden');
      if (ribbon) ribbon.classList.toggle('is-away', y > 200 && y < ScrollTrigger.maxScroll(window) - innerHeight * 1.2);
      lastY = y;
    } });
    const rb = $('[data-ribbon-close]'); rb && rb.addEventListener('click', () => ribbon.classList.add('is-gone'));

    // ── Pricing: vehicle size toggle (works with reduced motion too)
    const pill = $('[data-size-pill]'), sizeBtns = $$('[data-size]');
    const movePill = (b) => { if (!b || !pill) return; pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
    if (pill) { movePill(sizeBtns[0]); addEventListener('resize', () => movePill($('[data-size][aria-selected="true"]'))); document.fonts && document.fonts.ready.then(() => movePill($('[data-size][aria-selected="true"]'))); }
    sizeBtns.forEach((b) => b.addEventListener('click', () => {
      sizeBtns.forEach((x) => x.setAttribute('aria-selected', String(x === b))); movePill(b);
      const i = +b.dataset.size;
      $$('[data-prices]').forEach((el) => {
        const to = +el.dataset.prices.split(',')[i], o = { v: +el.textContent.replace(/\D/g, '') };
        gsap.to(o, { v: to, duration: reduced ? 0 : 0.35, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v).toLocaleString('en-US'); } });
      });
    }));

    // ── FAQ with measured height
    $$('.qa').forEach((d) => {
      const sum = $('summary', d), body = $('.qa__a', d);
      sum.addEventListener('click', (e) => {
        e.preventDefault();
        if (d.open) gsap.to(body, { height: 0, duration: reduced ? 0 : 0.3, ease: 'power2.inOut', onComplete: () => { d.open = false; body.style.height = ''; ScrollTrigger.refresh(); } });
        else { d.open = true; gsap.fromTo(body, { height: 0 }, { height: body.scrollHeight, duration: reduced ? 0 : 0.35, ease: 'power2.out', onComplete: () => { body.style.height = ''; ScrollTrigger.refresh(); } }); }
      });
    });

    if (reduced) return;

    document.documentElement.classList.add('js-motion');
    // ── Hero: the car is revealed by a sweeping inspection light, then the light follows the cursor
    const heroMedia = $('[data-hero-media]'), lit = $('.lit', heroMedia), heroImg = $('img', heroMedia);
    const heroWords = $$('.hero__title .w > span');
    const L = { x: -30, y: 45, r: 26 };
    const paint = () => { lit.style.setProperty('--lx', L.x + '%'); lit.style.setProperty('--ly', L.y + '%'); lit.style.setProperty('--lr', L.r + 'vw'); };
    paint();
    gsap.timeline()
      .fromTo(heroWords, { yPercent: 105 }, { yPercent: 0, duration: 0.7, stagger: 0.05, ease: 'power4.out' }, 0.05)
      .fromTo(['.hero .label', '.hero__sub', '.hero__actions', '.hero__foot'], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 }, 0.3)
      .fromTo(heroMedia, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.inOut' }, 0.15)
      .fromTo(heroImg, { scale: 1.08 }, { scale: 1, duration: 1.2, ease: 'power3.out' }, 0.15)
      .to(L, { x: 120, duration: 1.6, ease: 'power2.inOut', onUpdate: paint }, 0.55)
      .to(L, { x: 55, y: 50, r: finePointer ? 24 : 40, duration: 0.9, ease: 'power3.out', onUpdate: paint });
    if (finePointer) {
      const lx = gsap.quickTo(L, 'x', { duration: 0.45, ease: 'power3', onUpdate: paint }), ly = gsap.quickTo(L, 'y', { duration: 0.45, ease: 'power3', onUpdate: paint });
      heroMedia.addEventListener('pointermove', (e) => { const r = heroMedia.getBoundingClientRect(); lx(((e.clientX - r.left) / r.width) * 100); ly(((e.clientY - r.top) / r.height) * 100); });
    } else {
      gsap.to(L, { x: 20, ease: 'none', onUpdate: paint, scrollTrigger: { trigger: heroMedia, start: 'top 60%', end: 'bottom top', scrub: true } });
    }

    // ── Gallery: frames wipe in, and the same inspection light appears under the cursor
    gsap.set('[data-shot]', { clipPath: 'inset(0% 100% 0% 0%)' });
    ScrollTrigger.batch('[data-shot]', { start: 'top 88%', once: true, onEnter: (els) => gsap.to(els, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'power3.inOut', stagger: 0.08 }) });
    if (finePointer) $$('[data-shot]').forEach((s) => s.addEventListener('pointermove', (e) => { const r = s.getBoundingClientRect(), l = $('.lit', s); l.style.setProperty('--lx', ((e.clientX - r.left) / r.width) * 100 + '%'); l.style.setProperty('--ly', ((e.clientY - r.top) / r.height) * 100 + '%'); }));

    // ── Process: an accent rail draws across, lighting each step as it passes
    const stepEls = $$('[data-steps] li'), rail = $('[data-rail]');
    if (rail && stepEls.length) ScrollTrigger.create({ trigger: '[data-steps]', start: 'top 80%', end: 'bottom 45%', scrub: 0.3, onUpdate: (st) => {
      rail.style.transform = `scaleX(${st.progress})`;
      stepEls.forEach((li, i) => li.classList.toggle('is-lit', st.progress >= i / stepEls.length + 0.02 || desktop.matches === false));
    } });

    // ── Pricing rises over the dark page like a panel sliding in
    gsap.fromTo('.pricing', { clipPath: 'inset(0% 3% 0% 3% round 40px 40px 0px 0px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', ease: 'none', scrollTrigger: { trigger: '.pricing', start: 'top bottom', end: 'top 30%', scrub: true } });

    // ── Headings and blocks
    $$('.split').forEach((h) => {
      if (h.closest('.hero')) return;
      const w = $$('.w > span', h);
      gsap.set(w, { yPercent: 105 });
      ScrollTrigger.create({ trigger: h, start: 'top 90%', once: true, onEnter: () => gsap.to(w, { yPercent: 0, duration: 0.7, stagger: 0.04, ease: 'power4.out' }) });
    });
    ScrollTrigger.batch('.reveal', { start: 'top 92%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.06 }) });
    gsap.set('.svc__row', { opacity: 0, y: 24 });
    ScrollTrigger.batch('.svc__row', { start: 'top 94%', once: true, onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, stagger: 0.05 }) });
    gsap.set('.pkg', { opacity: 0, y: 30 });
    ScrollTrigger.batch('.pkg', { start: 'top 92%', once: true, onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, stagger: 0.07 }) });

    // ── Footer wordmark
    gsap.from('[data-foot]', { yPercent: 40, opacity: 0, duration: 0.8, ease: 'power4.out', scrollTrigger: { trigger: '[data-foot]', start: 'top 98%', once: true } });

    addEventListener('load', () => ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  }

  // Form works with or without GSAP.
  function form() {
    const f = $('[data-form]'); if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      $$('[required]', f).forEach((i) => { const bad = !i.value.trim(); i.closest('.field').classList.toggle('is-bad', bad); if (bad) ok = false; });
      if (!ok) { const bad = $('.is-bad input', f); bad && bad.focus(); return; }
      $('.form__ok', f).hidden = false;
      $('button[type="submit"] span', f).textContent = 'Request received';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { form(); start(); });
  else { form(); start(); }
})();
