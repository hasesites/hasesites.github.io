(function () {
  'use strict';
  var S = window.SITE;
  var IMG = function (n) { return (window.IMG_MAP && window.IMG_MAP[n]) || ('img/' + n + '.webp'); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var num = function (n) { return Number(n).toLocaleString('ru-RU').replace(/ /g, ' '); };
  var fmt = function (v) {
    if (v == null) return null;
    if (typeof v === 'number') return num(v) + ' ₽';
    var t = esc(v).replace(/\d{4,}/g, num);
    return /₽|\/|Бесплат|По препарату/.test(v) ? t : t + ' ₽';
  };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без хранилища */ } },
  };
  var LV = {}; S.levels.forEach(function (l) { LV[l.id] = l; });
  var GEO = { myasnikova: [39.766416, 47.227669], suvorova: [39.72968, 47.225765] };
  var mapUrl = function (b) { return 'https://yandex.ru/maps/?text=' + encodeURIComponent(S.city + ', ' + b.address); };
  var waUrl = function (b) { return 'https://wa.me/' + b.whatsapp + '?text=' + encodeURIComponent('Здравствуйте! Хочу записаться в салон на ' + b.address + '.'); };
  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/></svg>',
    ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8" fill="currentColor"/></svg>',
  };

  // общие ссылки
  $$('[data-book]').forEach(function (a) { a.href = S.booking; });
  $$('[data-insta]').forEach(function (a) { a.href = S.instagram.url; });
  $$('[data-insta-handle]').forEach(function (el) { el.textContent = S.instagram.handle; });
  $('[data-owner]').textContent = S.owner;
  $('[data-year]').textContent = new Date().getFullYear();

  // ---------- прайс ----------
  var cur = store.get('a23-branch');
  if (!S.branches.some(function (b) { return b.id === cur; })) cur = S.branches[0].id;
  var tab = 'nails';
  var branch = function () { return S.branches.filter(function (b) { return b.id === cur; })[0]; };
  var seg = $('[data-seg]'), tabsEl = $('[data-tabs]'), body = $('[data-pricebody]');
  seg.innerHTML = S.branches.map(function (b) { return '<button type="button" role="tab" data-seg-id="' + b.id + '">' + esc(b.name) + '</button>'; }).join('') + '<span class="seg-pill" aria-hidden="true"></span>';

  function moveSeg() {
    var on = $('[data-seg-id="' + cur + '"]', seg), pill = $('.seg-pill', seg);
    $$('[data-seg-id]', seg).forEach(function (x) { x.setAttribute('aria-selected', x === on ? 'true' : 'false'); });
    if (on) { pill.style.left = on.offsetLeft + 'px'; pill.style.width = on.offsetWidth + 'px'; }
  }
  function renderTabs() {
    var b = branch();
    if (!b.groups.some(function (g) { return g.id === tab; })) tab = b.groups[0].id;
    tabsEl.innerHTML = b.groups.map(function (g) { return '<button type="button" role="tab" data-tab="' + g.id + '" aria-selected="' + (g.id === tab) + '">' + esc(g.title) + '</button>'; }).join('');
  }
  function renderGroup() {
    var b = branch(), g = b.groups.filter(function (x) { return x.id === tab; })[0], html;
    if (g.byLevel) {
      var lv = b.levels;
      html = '<table class="ptable"><thead><tr><th scope="col">Услуга</th>' +
        lv.map(function (id) { return '<th scope="col"><b>' + LV[id].short + '</b></th>'; }).join('') + '</tr></thead><tbody>' +
        g.items.map(function (it) {
          return '<tr><td>' + esc(it.name) + '</td>' + lv.map(function (id) {
            var v = fmt(it.p[id]);
            return '<td data-lv="' + LV[id].short + '">' + (v == null ? '<span class="na">—</span>' : v) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    } else {
      html = (g.note ? '<p class="gnote">' + esc(g.note) + '</p>' : '') + '<ul class="plist">' + g.items.map(function (it) {
        if (it.sub) return '<li class="sub">' + esc(it.sub) + '</li>';
        var v = fmt(it.price);
        return '<li><span class="nm">' + esc(it.name) + '</span>' + (v == null ? '<span class="pv ask">Цена при записи</span>' : '<span class="pv">' + v + '</span>') + '</li>';
      }).join('') + '</ul>';
    }
    body.innerHTML = '<div class="pr-panel">' + html + '</div>';
  }
  function setBranch(id, scroll) {
    cur = id; store.set('a23-branch', id);
    moveSeg(); renderTabs(); renderGroup();
    if (scroll) $('#price').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  seg.addEventListener('click', function (e) { var t = e.target.closest('[data-seg-id]'); if (t && t.getAttribute('data-seg-id') !== cur) setBranch(t.getAttribute('data-seg-id')); });
  tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (!t || t.getAttribute('data-tab') === tab) return;
    tab = t.getAttribute('data-tab');
    $$('[data-tab]', tabsEl).forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    renderGroup();
  });
  addEventListener('resize', moveSeg);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSeg);

  // ---------- категории ----------
  $('[data-directions]').innerHTML = S.directions.map(function (d) { return '<button type="button" data-dir="' + d.tab + '">' + esc(d.title) + '</button>'; }).join('');
  $('[data-directions]').addEventListener('click', function (e) {
    var t = e.target.closest('[data-dir]'); if (!t) return;
    var id = t.getAttribute('data-dir');
    var has = function (b) { return b.groups.some(function (g) { return g.id === id; }); };
    if (!has(branch())) { var nb = S.branches.filter(has)[0]; if (nb) cur = nb.id; }
    tab = id; setBranch(cur, true);
  });

  // ---------- уровни ----------
  $('[data-levels]').innerHTML = S.levels.map(function (l) {
    var short = l.text.split('. ')[0].replace(/\.$/, '') + '.';
    return '<article class="lv rv"><b>' + l.short + '</b><h3>' + esc(l.name) + '</h3><p>' + esc(short) + '</p></article>';
  }).join('');

  // ---------- работы ----------
  $('[data-gallery]').innerHTML = S.gallery.map(function (g) { return '<figure class="rv"><img src="' + IMG(g.img) + '" alt="' + esc(g.alt) + '" loading="lazy"></figure>'; }).join('');

  // ---------- косметика ----------
  if (S.products && S.products.length) {
    $('#products').hidden = false;
    $('[data-products]').innerHTML = S.products.map(function (g) {
      var key = String(g.photo).replace(/^img\//, '').replace(/\.webp$/, '');
      return '<article class="pd rv"><figure><img src="' + IMG(key) + '" alt="' + esc(g.alt || g.title) + '" loading="lazy"></figure><div class="pd-body"><h3>' + esc(g.title) + '</h3><ul>' +
        g.items.map(function (it) { return '<li><b>' + esc(it.name) + '</b><span>' + esc(it.text) + (it.vol ? ', ' + esc(it.vol) : '') + '</span></li>'; }).join('') + '</ul></div></article>';
    }).join('') ;
    $('[data-products]').insertAdjacentHTML('afterend', '<p class="pd-note">Наличие и цену подскажет администратор.</p>');
  }

  // ---------- отзывы ----------
  var r = S.rating;
  if (r) { var ra = $('[data-rating]'); ra.href = r.url; ra.innerHTML = '<b>' + esc(r.value) + '</b><i aria-hidden="true">★★★★★</i><span>' + esc(r.count) + ' на ' + esc(r.source) + '</span>'; }
  $('[data-reviews]').innerHTML = (S.reviews || []).map(function (v) {
    return '<article class="rcard rv"><header><span class="av">' + esc(v.name.charAt(0)) + '</span><div><b>' + esc(v.name) + '</b><small>' + esc(v.date ? v.date + ' · ' : '') + esc(r ? r.source : '') + '</small></div></header><p>' + esc(v.text) + '</p></article>';
  }).join('');

  // ---------- контакты ----------
  $('[data-contacts]').innerHTML = S.branches.map(function (b) {
    var g = GEO[b.id];
    var row = function (ic, label, val) { return '<div class="ct-row"><span class="ct-ic">' + ICON[ic] + '</span><div><small>' + label + '</small>' + val + '</div></div>'; };
    var rows = row('pin', 'Адрес', '<span>' + esc(S.city + ', ' + b.address) + '</span>') +
      (b.phone ? row('phone', 'Телефон', '<a href="tel:' + b.phone.replace(/[^\d+]/g, '') + '">' + esc(b.phone) + '</a>') : '') +
      row('clock', 'График работы', '<span>' + esc(b.hours) + '</span>') +
      (b.whatsapp ? row('wa', 'WhatsApp', '<a href="' + waUrl(b) + '" target="_blank" rel="noopener">Написать</a>') : '') +
      row('ig', 'Instagram', '<a href="' + S.instagram.url + '" target="_blank" rel="noopener">' + esc(S.instagram.handle) + '</a>');
    var map = g ? '<div class="ct-map"><iframe title="Карта: ' + esc(b.address) + '" loading="lazy" src="https://yandex.ru/map-widget/v1/?ll=' + g[0] + '%2C' + g[1] + '&z=16&pt=' + g[0] + '%2C' + g[1] + '%2Cpm2rdm"></iframe></div>' : '';
    return '<article class="ct rv"><div class="ct-body"><h3>Салон на ' + esc(b.name) + '</h3>' + rows +
      '<div class="ct-act"><a class="btn btn-dark" href="' + mapUrl(b) + '" target="_blank" rel="noopener">Построить маршрут</a><a class="btn btn-line" href="' + S.booking + '" target="_blank" rel="noopener">Записаться</a></div></div>' + map + '</article>';
  }).join('');
  $('[data-fbranches]').innerHTML = S.branches.map(function (b) { return '<span>' + esc(b.address) + '</span>'; }).join('') + '<span>Ежедневно 9:00–21:00</span>';

  setBranch(cur);

  // ---------- шапка, меню, кнопка записи ----------
  var hdr = $('#hdr'), fab = $('.fab'), burger = $('.burger'), mnav = $('#mnav');
  burger.addEventListener('click', function () { var o = burger.getAttribute('aria-expanded') === 'true'; burger.setAttribute('aria-expanded', String(!o)); mnav.hidden = o; });
  $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { burger.setAttribute('aria-expanded', 'false'); mnav.hidden = true; }); });
  var ticking = false;
  function onScroll() { var y = scrollY; hdr.classList.toggle('scrolled', y > 8); fab.classList.toggle('show', y > innerHeight * 0.7); ticking = false; }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- появление ----------
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -6% 0px' });
    rvs.forEach(function (el, k) { el.style.transitionDelay = (k % 4) * 0.06 + 's'; io.observe(el); });
    setTimeout(function () { rvs.forEach(function (el) { el.classList.add('in'); }); }, 4000);
  } else rvs.forEach(function (el) { el.classList.add('in'); });
})();
