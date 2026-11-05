(function () {
  'use strict';
  var S = window.SITE;
  var IMG = window.IMG_BASE || 'img/';
  var root = document.documentElement;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');
  if (!reduce) root.classList.add('motion');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); };
  var fmt = function (v) {
    if (v == null) return null;
    if (typeof v === 'number') return v.toLocaleString('ru-RU').replace(/ /g, ' ') + '<span class="rub">₽</span>';
    var t = esc(v).replace(/\d{4,}/g, function (n) { return Number(n).toLocaleString('ru-RU').replace(/\u00a0/g, ' '); });
    if (/^\d|^от|–/.test(v) && !/₽|\/|\+|Бесплат/.test(v)) return t + '<span class="rub">₽</span>';
    return t;
    return esc(v);
  };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* без хранилища */ } },
  };
  var LV = {}; S.levels.forEach(function (l) { LV[l.id] = l; });
  var mapUrl = function (b) { return 'https://yandex.ru/maps/?text=' + encodeURIComponent(S.city + ', ' + b.address); };
  var waUrl = function (b) { return 'https://wa.me/' + b.whatsapp + '?text=' + encodeURIComponent('Здравствуйте! Хочу записаться в салон на ' + b.address + '.'); };
  var numOf = function (b) { if (b.num) return b.num; var m = b.address.match(/(\d+)/); return m ? m[1] : ''; };

  // общие ссылки
  $$('[data-book]').forEach(function (a) { a.href = S.booking; });
  $$('[data-insta]').forEach(function (a) { a.href = S.instagram.url; });
  $$('[data-insta-handle]').forEach(function (el) { el.textContent = S.instagram.handle; });
  $$('[data-city]').forEach(function (el) { el.textContent = S.city; });
  $('[data-owner]').textContent = S.owner;
  $('[data-year]').textContent = new Date().getFullYear();

  // лампочки как на вывеске
  var bulbs = $('.bulbs');
  if (bulbs) for (var i = 0; i < 14; i++) { var b = document.createElement('i'); b.style.animationDelay = (i * 0.16) + 's'; bulbs.appendChild(b); }

  // бегущая строка
  var words = ['Маникюр', 'Педикюр', 'Брови', 'Ресницы', 'Косметология', 'Волосы', 'Макияж', 'Шугаринг', 'Лазер', 'Массаж'];
  var mq = $('[data-marquee]'), half = words.concat(words).map(function (w) { return '<span>' + w + '</span>'; }).join('');
  mq.innerHTML = half + half;

  // ---------- состояние: выбранный салон ----------
  var cur = store.get('a23-branch');
  if (!S.branches.some(function (b) { return b.id === cur; })) cur = S.branches[0].id;
  var tab = 'nails';
  var branch = function () { return S.branches.filter(function (b) { return b.id === cur; })[0]; };

  // ---------- салоны ----------
  var brWrap = $('[data-branches]');
  brWrap.innerHTML = S.branches.map(function (b) {
    var n = numOf(b), digits = n.split('');
    var numHtml = digits.map(function (d, k) { return k === digits.length - 1 && digits.length > 1 ? '<i>' + d + '</i>' : d; }).join('');
    var acts = '<button class="btn btn-dark" type="button" data-pick="' + b.id + '"><span>Цены этого салона</span></button>' +
      '<a class="btn btn-line" href="' + mapUrl(b) + '" target="_blank" rel="noopener"><span>Маршрут</span></a>' +
      (b.whatsapp ? '<a class="btn btn-line" href="' + waUrl(b) + '" target="_blank" rel="noopener"><span>WhatsApp</span></a>' : '');
    return '<article class="br rv" data-br="' + b.id + '">' +
      '<span class="br-chosen">Выбран</span>' +
      '<div class="br-num" aria-hidden="true">' + numHtml + '</div>' +
      '<h3 class="br-street">' + esc(b.address) + '</h3>' +
      '<p class="br-meta">' + esc(b.hours) + (b.phone ? ' · <b>' + esc(b.phone) + '</b>' : '') + '</p>' +
      '<span class="br-tag">' + esc(b.note) + '</span>' +
      '<div class="br-act">' + acts + '</div></article>';
  }).join('');

  // ---------- прайс ----------
  var seg = $('[data-seg]');
  seg.innerHTML = S.branches.map(function (b) { return '<button type="button" role="tab" data-seg-id="' + b.id + '">' + esc(b.name) + '</button>'; }).join('') + '<span class="seg-pill" aria-hidden="true"></span>';
  var tabsEl = $('[data-tabs]'), body = $('[data-pricebody]');

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
    var b = branch(), g = b.groups.filter(function (x) { return x.id === tab; })[0];
    var html;
    if (g.byLevel) {
      var lv = b.levels;
      html = '<table class="ptable" style="--cols:' + lv.length + '"><thead><tr><th scope="col">Услуга</th>' +
        lv.map(function (id) { return '<th scope="col" data-col="' + id + '"><span class="lvchip" title="' + esc(LV[id].text) + '"><b>' + LV[id].short + '</b><small>' + esc(LV[id].name.replace('Мастер стандартной квалификации', 'Стандарт')) + '</small></span></th>'; }).join('') +
        '</tr></thead><tbody>' +
        g.items.map(function (it) {
          return '<tr><td>' + esc(it.name) + '</td>' + lv.map(function (id) {
            var v = fmt(it.p[id]);
            return '<td data-col="' + id + '" data-lv="' + LV[id].short + '">' + (v == null ? '<span class="na" title="Мастера этого уровня не выполняют услугу">—</span>' : v) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
    } else {
      html = (g.note ? '<p class="pr-gnote">' + esc(g.note) + '</p>' : '') + '<ul class="plist">' + g.items.map(function (it, k) {
        if (it.sub) return '<li class="sub" style="animation-delay:' + (Math.min(k, 14) * 0.035) + 's">' + esc(it.sub) + '</li>';
        var v = fmt(it.price);
        return '<li style="animation-delay:' + (Math.min(k, 14) * 0.035) + 's"><span class="nm">' + esc(it.name) + '</span><span class="lead-dots"></span>' +
          (v == null ? '<span class="pv ask">Цена при записи</span>' : '<span class="pv">' + v + '</span>') + '</li>';
      }).join('') + '</ul>';
    }
    body.innerHTML = '<div class="pr-panel">' + html + '</div>';
    // подсветка колонки уровня
    $$('th[data-col]', body).forEach(function (th) {
      var id = th.getAttribute('data-col');
      var on = function (v) { $$('[data-col="' + id + '"]', body).forEach(function (c) { c.classList.toggle('hl', v); }); };
      th.addEventListener('mouseenter', function () { on(true); });
      th.addEventListener('mouseleave', function () { on(false); });
    });
  }

  function setBranch(id, opts) {
    cur = id; store.set('a23-branch', id);
    $('[data-price-branch]').textContent = branch().name;
    $$('[data-br]').forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-br') === id); });
    moveSeg(); renderTabs(); renderGroup();
    if (opts && opts.scroll) $('#price').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }

  seg.addEventListener('click', function (e) { var t = e.target.closest('[data-seg-id]'); if (t && t.getAttribute('data-seg-id') !== cur) setBranch(t.getAttribute('data-seg-id')); });
  tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-tab]'); if (!t || t.getAttribute('data-tab') === tab) return;
    tab = t.getAttribute('data-tab');
    $$('[data-tab]', tabsEl).forEach(function (x) { x.setAttribute('aria-selected', x === t ? 'true' : 'false'); });
    t.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    renderGroup();
  });
  brWrap.addEventListener('click', function (e) { var t = e.target.closest('[data-pick]'); if (t) setBranch(t.getAttribute('data-pick'), { scroll: true }); });
  addEventListener('resize', moveSeg);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveSeg);

  // ---------- уровни ----------
  $('[data-levels]').innerHTML = S.levels.map(function (l, k) {
    return '<article class="lv rv"><span class="lv-step">' + (k + 1) + ' / ' + S.levels.length + '</span><div class="lv-code">' + l.short + '</div><h3>' + esc(l.name) + '</h3><p>' + esc(l.text) + '</p></article>';
  }).join('');

  // ---------- акции и товары (если заполнены) ----------
  if (S.promos && S.promos.length) {
    $('#promos').hidden = false;
    $('[data-promos]').innerHTML = S.promos.map(function (p) { return '<article class="pm">' + (p.until ? '<small>' + esc(p.until) + '</small>' : '') + '<h3>' + esc(p.title) + '</h3>' + (p.text ? '<p>' + esc(p.text) + '</p>' : '') + '</article>'; }).join('');
  }
  if (S.products && S.products.length) {
    $('#products').hidden = false;
    $('[data-products]').innerHTML = S.products.map(function (g) {
      return '<article class="pd rv"><figure class="pd-ph"><img src="' + (window.IMG_MAP && window.IMG_MAP[g.photo] ? window.IMG_MAP[g.photo] : esc(g.photo)) + '" alt="' + esc(g.alt || g.title) + '" loading="lazy"></figure>' +
        '<div class="pd-body"><h3>' + esc(g.title) + '</h3><ul>' + g.items.map(function (it) {
          return '<li><div><b>' + esc(it.name) + '</b>' + (it.vol ? '<small>' + esc(it.vol) + '</small>' : '') + '</div>' + (it.text ? '<p>' + esc(it.text) + '</p>' : '') +
            '<span class="pd-pr">' + (it.price == null ? 'Цену уточняйте в салоне' : fmt(it.price)) + '</span></li>';
        }).join('') + '</ul></div></article>';
    }).join('');
  }

  // ---------- галерея ----------
  var gl = $('[data-gallery]');
  gl.innerHTML = S.gallery.map(function (g) { return '<figure class="gl-item"><img src="' + (window.IMG_MAP ? window.IMG_MAP[g.img] : IMG + g.img + '.webp') + '" alt="' + esc(g.alt) + '" loading="lazy" draggable="false"></figure>'; }).join('');
  $$('[data-gl]').forEach(function (btn) {
    btn.addEventListener('click', function () { var it = $('.gl-item', gl); var step = it ? it.offsetWidth + 20 : 320; gl.scrollBy({ left: step * Number(btn.getAttribute('data-gl')), behavior: reduce ? 'auto' : 'smooth' }); });
  });
  (function drag() { // перетаскивание мышью
    var down = false, x0 = 0, s0 = 0, moved = false;
    gl.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = gl.scrollLeft; gl.classList.add('drag'); });
    addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - x0; if (Math.abs(dx) > 3) moved = true; gl.scrollLeft = s0 - dx; });
    addEventListener('pointerup', function () { if (!down) return; down = false; gl.classList.remove('drag'); });
    gl.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  })();

  // ---------- запись и контакты ----------
  $('[data-bkalt]').innerHTML = S.branches.map(function (b) {
    var parts = [];
    if (b.whatsapp) parts.push('<a href="' + waUrl(b) + '" target="_blank" rel="noopener">WhatsApp</a>');
    if (b.telegram) parts.push('<a href="' + esc(b.telegram) + '" target="_blank" rel="noopener">Telegram</a>');
    if (b.max) parts.push('<a href="' + esc(b.max) + '" target="_blank" rel="noopener">MAX</a>');
    if (b.phone) parts.push('<span>' + esc(b.phone) + '</span>');
    return parts.length ? '<span>' + esc(b.address) + ': ' + parts.join(' · ') + '</span>' : '';
  }).join('');

  $('[data-contacts]').innerHTML = S.branches.map(function (b) {
    var rows = '<dt>Адрес</dt><dd>' + esc(S.city + ', ' + b.address) + '</dd><dt>Часы</dt><dd>' + esc(b.hours) + '</dd>' +
      (b.phone ? '<dt>Телефон</dt><dd><a href="tel:' + b.phone.replace(/[^\d+]/g, '') + '">' + esc(b.phone) + '</a></dd>' : '');
    return '<article class="ct rv"><a class="ct-map" href="' + mapUrl(b) + '" target="_blank" rel="noopener" aria-label="Открыть ' + esc(b.address) + ' на карте"><span>Открыть в Яндекс Картах ↗</span></a>' +
      '<h3>' + esc(b.address) + '</h3><dl>' + rows + '</dl><div class="ct-act">' +
      '<a class="btn btn-dark" href="' + S.booking + '" target="_blank" rel="noopener"><span>Записаться</span></a>' +
      '<a class="btn btn-line" href="' + mapUrl(b) + '" target="_blank" rel="noopener"><span>Маршрут</span></a>' +
      (b.whatsapp ? '<a class="btn btn-line" href="' + waUrl(b) + '" target="_blank" rel="noopener"><span>WhatsApp</span></a>' : '') +
      '</div></article>';
  }).join('');
  $('[data-fbranches]').innerHTML = S.branches.map(function (b) { return '<span>' + esc(b.address) + '</span>'; }).join('') + '<span>Ежедневно 9:00–21:00</span>';

  setBranch(cur);

  // ---------- шапка, меню, кнопка записи ----------
  var hdr = $('#hdr'), fab = $('.fab'), heroEl = $('.hero');
  var burger = $('.burger'), mnav = $('#mnav');
  burger.addEventListener('click', function () { var o = burger.getAttribute('aria-expanded') === 'true'; burger.setAttribute('aria-expanded', String(!o)); mnav.hidden = o; });
  $$('a', mnav).forEach(function (a) { a.addEventListener('click', function () { burger.setAttribute('aria-expanded', 'false'); mnav.hidden = true; }); });

  // ---------- появление при прокрутке ----------
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    var vh = innerHeight;
    rvs.forEach(function (el) { if (el.getBoundingClientRect().top > vh * 0.92) el.classList.add('pre'); });
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('pre'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rvs.forEach(function (el, k) { el.style.transitionDelay = ((k % 4) * 0.08) + 's'; io.observe(el); });
    setTimeout(function () { rvs.forEach(function (el) { el.classList.remove('pre'); }); }, 4000); // страховка
  }

  // ---------- параллакс героя и прочее на скролле ----------
  var arch = $('.arch-main img'), rnd = $('.round'), seal = $('.seal');
  var ticking = false;
  function onScroll() {
    var y = scrollY;
    hdr.classList.toggle('scrolled', y > 10);
    fab.classList.toggle('show', y > heroEl.offsetHeight * 0.7);
    if (!reduce && y < innerHeight * 1.2) {
      if (arch) arch.style.translate = '0 ' + (y * 0.08) + 'px';
      if (rnd) rnd.style.translate = '0 ' + (-y * 0.12) + 'px';
      if (seal) seal.style.translate = '0 ' + (y * 0.05) + 'px';
    }
    ticking = false;
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------- магнитные кнопки ----------
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('.mag').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) { var r = btn.getBoundingClientRect(); btn.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.18) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.28) + 'px)'; });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });
  }
})();
