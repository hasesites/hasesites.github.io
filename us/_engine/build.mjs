#!/usr/bin/env node
// Builds one static demo site per client: us/clients/<slug>.json  ->  us/<slug>/index.html
// Usage:  node us/_engine/build.mjs            (all clients)
//         node us/_engine/build.mjs lester-auto-detail
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ENGINE = path.dirname(fileURLToPath(import.meta.url));
const US = path.dirname(ENGINE);
const SITE_URL = 'https://hasesites.github.io/us/';
const VERSION = Date.now().toString(36);

const defaults = JSON.parse(fs.readFileSync(path.join(ENGINE, 'defaults.json'), 'utf8'));
const photos = JSON.parse(fs.readFileSync(path.join(ENGINE, 'img', '_photos.json'), 'utf8'));

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  if (!isObj(a) || !isObj(b)) return b === undefined ? a : b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = merge(a[k], b[k]);
  return out;
}
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function build(slug) {
  const raw = JSON.parse(fs.readFileSync(path.join(US, 'clients', slug + '.json'), 'utf8'));
  const c = merge(defaults, raw);
  c.slug = slug;
  const fill = (s) => String(s ?? '').replace(/\{(\w+)\}/g, (_, k) => c[k] ?? '');
  const E = '../_engine/';
  const t = c.theme;

  // Image helper: engine library name ("polisher") or a client file ("img/shop.webp").
  const img = (name, alt, sizes = '100vw', cls = '', eager = false) => {
    const attrs = `alt="${esc(alt)}"${cls ? ` class="${cls}"` : ''} ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"`;
    if (name.includes('/') || name.includes('.')) return `<img src="${esc(name)}" ${attrs}>`;
    const m = photos[name] || { w: 1800, h: 1200 };
    const h = Math.round(900 * m.h / m.w);
    return `<img src="${E}img/${name}-900.webp" srcset="${E}img/${name}-900.webp 900w, ${E}img/${name}-1800.webp 1800w" sizes="${sizes}" width="900" height="${h}" ${attrs}>`;
  };
  const words = (s) => esc(s).split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join(' ');
  const title2 = (arr, tag = 'h2', cls = '') => `<${tag} class="split ${cls}"><span class="l">${words(fill(arr[0]))}</span><span class="l it">${words(fill(arr[1] || ''))}</span></${tag}>`;

  const phoneHref = c.phone ? 'tel:+1' + c.phone.replace(/\D/g, '').replace(/^1/, '') : '';
  const location = [c.address, `${c.city}, ${c.state}`].filter(Boolean);
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([c.name, c.address || `${c.city}, ${c.state}`].join(' '));
  const seoTitle = fill(c.seo.title), seoDesc = fill(c.seo.description);
  const pageUrl = SITE_URL + slug + '/';
  const ld = {
    '@context': 'https://schema.org', '@type': 'AutoWash', name: c.name, url: pageUrl,
    address: { '@type': 'PostalAddress', streetAddress: c.address || undefined, addressLocality: c.city, addressRegion: c.state, addressCountry: 'US' },
    telephone: c.phone || undefined,
    openingHours: c.hoursSchema || undefined,
    areaServed: `${c.city}, ${c.state}`,
    priceRange: '$$',
  };

  const ratingHtml = c.rating ? `<div class="rating"><span class="stars" aria-hidden="true">★★★★★</span><b>${esc(c.rating.value)}</b><span>${esc(c.rating.count)} · ${esc(c.rating.source)}</span></div>` : '';

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(seoTitle)}</title>
<meta name="description" content="${esc(seoDesc)}">
${c.preview ? '<meta name="robots" content="noindex, nofollow">' : `<link rel="canonical" href="${pageUrl}">`}
<meta name="theme-color" content="${t.bg}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(seoTitle)}">
<meta property="og:description" content="${esc(seoDesc)}">
<meta property="og:image" content="${pageUrl}${E}img/${c.hero.image}-1800.webp">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' rx='14' fill='${t.bg}'/><text x='32' y='43' font-family='Georgia,serif' font-size='34' font-style='italic' text-anchor='middle' fill='${t.accent}'>${esc(c.short[0])}</text></svg>`)}">
<link rel="preload" href="${E}fonts/intertight.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${E}fonts/iserif-italic.woff2" as="font" type="font/woff2" crossorigin>
<link rel="modulepreload" href="${E}vendor/three.module.min.js">
<link rel="stylesheet" href="${E}app.css?v=${VERSION}">
<style>:root{--bg:${t.bg};--accent:${t.accent};--paint:${t.paint}}</style>
<script type="importmap">{"imports":{"three":"${E}vendor/three.module.min.js","three/addons/":"${E}vendor/jsm/"}}</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body class="is-loading">
<a class="skip" href="#main">Skip to content</a>

<div class="loader" aria-hidden="true">
  <div class="loader__name">${esc(c.name)}</div>
  <div class="loader__num"><span data-count>0</span>%</div>
  <div class="loader__bar"><i></i></div>
</div>

<header class="nav" data-nav>
  <a class="nav__brand" href="#top" aria-label="${esc(c.name)} — home">${esc(c.short)}<em>.</em></a>
  <nav class="nav__links" aria-label="Main">
    <a href="#services">Services</a><a href="#pricing">Pricing</a><a href="#work">Work</a><a href="#faq">FAQ</a>
  </nav>
  <div class="nav__cta">
    ${phoneHref ? `<a class="nav__phone" href="${phoneHref}">${esc(c.phone)}</a>` : ''}
    <a class="btn btn--small" href="#quote" data-magnetic><span>Get a quote</span></a>
  </div>
  <button class="nav__burger" aria-label="Open menu" aria-expanded="false" data-burger><i></i><i></i></button>
</header>
<div class="menu" data-menu>
  <a href="#services">Services</a><a href="#pricing">Pricing</a><a href="#work">Work</a><a href="#faq">FAQ</a><a href="#quote">Get a quote</a>
  ${phoneHref ? `<a class="menu__phone" href="${phoneHref}">${esc(c.phone)}</a>` : ''}
</div>

<main id="main">
<!-- ACT I: 3D stage -->
<section class="stage" id="top" data-stage>
  <div class="stage__sticky">
    <canvas class="stage__canvas" data-canvas aria-hidden="true"></canvas>
    <div class="stage__fallback" aria-hidden="true">${img(c.hero.image, '', '100vw', '', true)}</div>
    <div class="stage__shade"></div>

    <div class="hero" data-hero>
      <p class="eyebrow"><span class="dot"></span>${esc(fill(c.hero.eyebrow))}</p>
      ${title2(c.hero.title, 'h1', 'hero__title')}
      <p class="hero__sub">${esc(fill(c.hero.sub))}</p>
      <div class="hero__actions">
        <a class="btn" href="#quote" data-magnetic><span>Book a detail</span></a>
        ${phoneHref ? `<a class="btn btn--ghost" href="${phoneHref}" data-magnetic><span>Call ${esc(c.phone)}</span></a>` : `<a class="btn btn--ghost" href="#pricing" data-magnetic><span>See packages</span></a>`}
      </div>
      ${ratingHtml}
    </div>
    <div class="hero__meta">
      <span>${esc(c.city)}, ${esc(c.state)}</span>
      <span class="scrollcue"><i></i>Scroll</span>
    </div>

    <div class="acts" data-acts>
      <p class="acts__kicker">${esc(c.story.kicker)}</p>
      ${c.story.acts.map((a, i) => `<article class="act" data-act="${i}"><span class="act__n">${esc(a.n)}</span><h3 class="act__t">${esc(a.t)}</h3><p class="act__d">${esc(a.d)}</p></article>`).join('')}
      <div class="acts__rail"><i data-rail></i></div>
    </div>
  </div>
</section>

<div class="marquee" aria-hidden="true" data-marquee>
  <div class="marquee__track">${[...c.marquee, ...c.marquee].map((m) => `<span>${esc(m)}</span><em>✦</em>`).join('')}</div>
</div>

<!-- Services -->
<section class="services" id="services">
  <div class="wrap">
    <div class="sec-head">
      <p class="label">Services</p>
      ${title2(['What we do,', 'and how we do it.'])}
      <p class="sec-head__text reveal">${esc(c.servicesIntro)}</p>
    </div>
    <ol class="svc" data-svc>
      ${c.services.map((s, i) => `<li class="svc__row" data-img="${esc(s.img)}">
        <span class="svc__n">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="svc__name">${esc(s.name)}</h3>
        <p class="svc__desc">${esc(s.desc)}</p>
        <span class="svc__tag">${esc(s.tag || '')}</span>
        <div class="svc__media">${img(s.img, s.name, '(max-width: 760px) 92vw, 420px')}</div>
      </li>`).join('')}
    </ol>
  </div>
  <div class="svc-float" data-float aria-hidden="true">${c.services.map((s) => `<div class="svc-float__img" data-for="${esc(s.img)}">${img(s.img, '', '420px')}</div>`).join('')}</div>
</section>

<!-- Feature: ceramic -->
<section class="feature" data-feature>
  <div class="feature__sticky">
    <div class="feature__media" data-feature-media>${img(c.feature.image, 'Water beading on a coated paint surface', '100vw')}</div>
    <div class="feature__copy">
      <p class="label">${esc(c.feature.kicker)}</p>
      ${title2(c.feature.title, 'h2', 'feature__title')}
      <p class="feature__text">${esc(c.feature.text)}</p>
      <ul class="feature__points">${c.feature.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>
  </div>
</section>

<!-- Pricing -->
<section class="pricing" id="pricing">
  <div class="wrap">
    <div class="sec-head sec-head--row">
      <div><p class="label">Packages</p>${title2(c.pricing.title)}</div>
      <div class="sizes" role="tablist" aria-label="Vehicle size" data-sizes>
        ${c.pricing.sizes.map((s, i) => `<button role="tab" aria-selected="${i === 0}" data-size="${i}">${esc(s)}</button>`).join('')}<i data-size-pill></i>
      </div>
    </div>
    <div class="pkgs">
      ${c.pricing.packages.map((p) => `<article class="pkg${p.featured ? ' pkg--hot' : ''}" data-tilt>
        <div class="pkg__glow"></div>
        <header><h3>${esc(p.name)}</h3>${p.featured ? '<span class="pkg__badge">Most booked</span>' : ''}</header>
        <p class="pkg__price"><small>from</small> $<span data-prices="${p.price.join(',')}">${p.price[0].toLocaleString('en-US')}</span></p>
        <p class="pkg__time">${esc(p.time)}</p>
        <ul>${p.items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <a class="btn ${p.featured ? '' : 'btn--ghost'} btn--block" href="#quote" data-pkg="${esc(p.name)}"><span>Choose ${esc(p.name)}</span></a>
      </article>`).join('')}
    </div>
    <p class="note">${esc(c.pricing.note)}</p>
  </div>
</section>

<!-- Gallery -->
<section class="work" id="work" data-work>
  <div class="work__sticky">
    <div class="work__head"><p class="label">Recent work</p>${title2(['Details', 'up close.'])}</div>
    <div class="work__track" data-track>
      ${c.gallery.map((g, i) => `<figure class="shot shot--${i % 3}" data-shot><div class="shot__in">${img(g.img, g.cap, '(max-width: 760px) 78vw, 34vw')}</div><figcaption><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.cap)}</figcaption></figure>`).join('')}
    </div>
    <div class="work__progress"><i data-work-bar></i></div>
  </div>
</section>

<!-- Why -->
<section class="why">
  <div class="wrap why__grid">
    <div class="why__head">
      <p class="label">Why ${esc(c.short)}</p>
      ${title2(c.why.title)}
      ${c.why.lead ? `<p class="why__lead reveal">${esc(fill(c.why.lead))}</p>` : ''}
    </div>
    <ol class="why__list">
      ${c.why.items.map((w, i) => `<li class="reveal"><span>${String(i + 1).padStart(2, '0')}</span><h3>${esc(w.t)}</h3><p>${esc(w.d)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<!-- Reviews -->
<section class="reviews">
  <div class="wrap">
    <p class="label">${esc(c.reviews.title)}</p>
    <blockquote class="bigquote" data-lit><p>${esc(c.reviews.items[0].text).split(' ').map((w) => `<span>${w}</span>`).join(' ')}</p>
      <footer>${esc(c.reviews.items[0].name)}${c.reviews.items[0].meta ? ` · ${esc(c.reviews.items[0].meta)}` : ''}</footer></blockquote>
    <div class="quotes">
      ${c.reviews.items.slice(1).map((r) => `<figure class="quote reveal"><blockquote>“${esc(r.text)}”</blockquote><figcaption><b>${esc(r.name)}</b>${r.meta ? `<span>${esc(r.meta)}</span>` : ''}</figcaption></figure>`).join('')}
    </div>
    ${c.reviews.note ? `<p class="note">${esc(c.reviews.note)}</p>` : ''}
  </div>
</section>

<!-- FAQ -->
<section class="faq" id="faq">
  <div class="wrap faq__grid">
    <div><p class="label">FAQ</p>${title2(['Good', 'questions.'])}</div>
    <div class="faq__list">
      ${c.faq.map((f) => `<details class="qa"><summary><span>${esc(f.q)}</span><i aria-hidden="true"></i></summary><div class="qa__a"><p>${esc(f.a)}</p></div></details>`).join('')}
    </div>
  </div>
</section>

<!-- Contact -->
<section class="contact" id="quote">
  <div class="wrap contact__grid">
    <div class="contact__info">
      <p class="label">Book / Quote</p>
      ${title2(c.contact.title)}
      <p class="contact__text reveal">${esc(fill(c.contact.text))}</p>
      <dl class="facts reveal">
        ${phoneHref ? `<div><dt>Call or text</dt><dd><a href="${phoneHref}">${esc(c.phone)}</a></dd></div>` : ''}
        ${c.email ? `<div><dt>Email</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd></div>` : ''}
        <div><dt>Location</dt><dd><a href="${mapsUrl}" target="_blank" rel="noopener">${location.map(esc).join('<br>')}</a></dd></div>
        ${c.hours.length ? `<div><dt>Hours</dt><dd>${c.hours.map(esc).join('<br>')}</dd></div>` : ''}
      </dl>
    </div>
    <form class="form reveal" data-form novalidate>
      <fieldset><legend>What do you need?</legend>
        <div class="chips">${c.contact.services.map((s, i) => `<label class="chip"><input type="checkbox" name="service" value="${esc(s)}"${i === 0 ? '' : ''}><span>${esc(s)}</span></label>`).join('')}</div>
      </fieldset>
      <div class="fields">
        <label class="field"><input name="name" required autocomplete="name" placeholder=" "><span>Your name</span></label>
        <label class="field"><input name="phone" required type="tel" autocomplete="tel" placeholder=" "><span>Phone</span></label>
        <label class="field field--wide"><input name="car" placeholder=" "><span>Year, make & model</span></label>
        <label class="field field--wide"><textarea name="msg" rows="3" placeholder=" "></textarea><span>Anything we should know?</span></label>
      </div>
      <button class="btn btn--block" type="submit" data-magnetic><span>Request my quote</span></button>
      <p class="form__ok" role="status" hidden>Thanks! This is a preview site, so nothing was sent — on the live site this request goes straight to ${esc(c.short)}'s phone and inbox.</p>
    </form>
  </div>
</section>
</main>

<footer class="foot">
  <div class="wrap">
    <div class="foot__big" aria-hidden="true" data-foot>${esc(c.short).split('').map((ch) => `<span>${ch === ' ' ? '&nbsp;' : ch}</span>`).join('')}</div>
    <div class="foot__row">
      <span>© ${new Date().getFullYear()} ${esc(c.name)} · ${esc(c.city)}, ${esc(c.state)}</span>
      ${c.social.facebook ? `<a href="${esc(c.social.facebook)}" target="_blank" rel="noopener">Facebook</a>` : ''}
      ${c.social.instagram ? `<a href="${esc(c.social.instagram)}" target="_blank" rel="noopener">Instagram</a>` : ''}
      <a href="#top">Back to top ↑</a>
    </div>
    <p class="credits">Photography: Unsplash. 3D model: “Car Concept”, Khronos Group glTF Sample Assets (CC BY 4.0), based on a CC0 model by Unity Fan.</p>
  </div>
</footer>

${c.preview ? `<aside class="ribbon" data-ribbon><span>Concept preview for <b>${esc(c.name)}</b></span><button aria-label="Hide" data-ribbon-close>×</button></aside>` : ''}
<div class="cursor" aria-hidden="true"><i></i><span></span></div>
<div class="grain" aria-hidden="true"></div>

<script>window.SITE=${JSON.stringify({ paint: t.paint, accent: t.accent, bg: t.bg, base: E })}</script>
<script src="${E}vendor/gsap.min.js" defer></script>
<script src="${E}vendor/ScrollTrigger.min.js" defer></script>
<script src="${E}vendor/lenis.min.js" defer></script>
<script type="module" src="${E}app.js?v=${VERSION}"></script>
</body>
</html>
`;
  const out = path.join(US, slug);
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), html);
  console.log('built', slug, '→', pageUrl);
}

const only = process.argv[2];
const slugs = fs.readdirSync(path.join(US, 'clients')).filter((f) => f.endsWith('.json') && !f.startsWith('_')).map((f) => f.replace(/\.json$/, ''));
for (const s of slugs) if (!only || s === only) build(s);
