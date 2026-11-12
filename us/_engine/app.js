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

    // ── Process: pinned on desktop; each step swaps photo with a quick wipe
    const proc = $('[data-process]');
    if (proc) {
      const steps = $$('[data-step]', proc), pics = $$('[data-pm]', proc), bar = $('[data-process-bar]');
      let cur = 0;
      const show = (i) => {
        if (i === cur) return;
        const dir = i > cur ? 1 : -1, prev = cur; cur = i;
        steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
        pics.forEach((p, k) => { p.style.zIndex = k === i ? 2 : k === prev ? 1 : 0; p.classList.toggle('is-on', k === i || k === prev); });
        if (reduced) { pics.forEach((p, k) => p.classList.toggle('is-on', k === i)); return; }
        gsap.fromTo(steps[i], { y: 22 * dir, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 });
        gsap.fromTo(pics[i], { clipPath: dir > 0 ? 'inset(100% 0% 0% 0%)' : 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power3.inOut', overwrite: true, onComplete: () => { if (cur === i) pics.forEach((p, k) => { if (k !== i) p.classList.remove('is-on'); }); } });
        gsap.fromTo($('img', pics[i]), { scale: 1.12 }, { scale: 1, duration: 0.9, overwrite: true });
      };
      ScrollTrigger.matchMedia({ '(min-width: 761px)': () => {
        const st = ScrollTrigger.create({ trigger: proc, start: 'top top', end: 'bottom bottom', onUpdate: (s) => {
          bar.style.transform = `scaleX(${s.progress})`;
          show(Math.min(steps.length - 1, Math.floor(s.progress * steps.length * 0.999)));
        } });
        return () => st.kill();
      } });
    }

    if (reduced) return;

    // ── Hero: one confident entrance, then a light parallax tied to scroll
    const heroImg = $('[data-hero-media] img');
    const heroWords = $$('.hero__title .w > span');
    gsap.timeline()
      .fromTo(heroWords, { yPercent: 105 }, { yPercent: 0, duration: 0.7, stagger: 0.05, ease: 'power4.out' }, 0.05)
      .fromTo(['.hero .label', '.hero__sub', '.hero__actions', '.hero__foot'], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05 }, 0.3)
      .fromTo('[data-hero-media]', { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'power3.inOut' }, 0.2)
      .fromTo(heroImg, { scale: 1.15 }, { scale: 1, duration: 1.0, ease: 'power3.out' }, 0.2);
    gsap.to(heroImg, { yPercent: 8, scale: 1.06, ease: 'none', scrollTrigger: { trigger: '[data-hero-media]', start: 'top 60%', end: 'bottom top', scrub: true } });

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

    // ── Feature: the frame opens to full bleed as you scroll through it
    const fm = $('[data-feature-media]');
    if (fm) {
      const mobile = !desktop.matches;
      const tl = gsap.timeline({ scrollTrigger: { trigger: '[data-feature]', start: 'top top', end: 'bottom bottom', scrub: true } });
      tl.fromTo(fm, { clipPath: mobile ? 'inset(24% 8% 30% 8%)' : 'inset(18% 24% 18% 24%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none', duration: 0.7 })
        .fromTo($('img', fm), { scale: 1.2 }, { scale: 1, ease: 'none', duration: 0.7 }, 0)
        .to('.feature__side', { opacity: 1, duration: 0.15 }, 0.62)
        .to({}, { duration: 0.23 });
    }

    // ── Work: horizontal on desktop, native swipe on mobile
    ScrollTrigger.matchMedia({ '(min-width: 761px)': () => {
      const tr = $('[data-track]'), n = $('[data-work-n]'), shots = $$('[data-shot]');
      const dist = () => Math.max(0, tr.scrollWidth - innerWidth);
      const tw = gsap.to(tr, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '[data-work]', pin: '.work__sticky', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true, onUpdate: (s) => { n.textContent = String(Math.min(shots.length, 1 + Math.round(s.progress * (shots.length - 1)))).padStart(2, '0'); } } });
      return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(tr, { x: 0 }); };
    } });

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
