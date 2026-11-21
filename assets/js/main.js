/* Small enhancements: live Steam numbers, the on-demand web demo, a photo/certificate viewer,
   certificate filters, nav highlighting, a round language switch that keeps your place,
   and a gentle scroll reveal. The page works without this script; these only add to it. */
(function () {
  var root = new URL('../../', document.currentScript.src); // site root, from assets/js/
  var lang = document.documentElement.lang || 'en';
  var locale = lang === 'th' ? 'th-TH' : 'en-US';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Steam Workshop numbers (data/steam.json is refreshed daily by a GitHub Action) ----
  // Each number counts up the first time it scrolls into view.
  function countUp(el, to) {
    if (reduce || !('IntersectionObserver' in window)) { el.textContent = to.toLocaleString(locale); return; }
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = null, dur = 1200;
      requestAnimationFrame(function tick(t) {
        if (start === null) start = t;
        var k = Math.min((t - start) / dur, 1), eased = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * eased).toLocaleString(locale);
        if (k < 1) requestAnimationFrame(tick);
      });
    });
    io.observe(el);
  }
  // "Last change: 3 hours ago" and "+N new subscribers this week". The file only changes when a
  // number changes, so this says "last change", not "live". Nothing is shown if the data is missing.
  function ago(iso) {
    var secs = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!(secs >= 0) || typeof Intl === 'undefined' || !Intl.RelativeTimeFormat) return '';
    var rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    if (secs < 3600) return rtf.format(-Math.max(1, Math.round(secs / 60)), 'minute');
    if (secs < 48 * 3600) return rtf.format(-Math.round(secs / 3600), 'hour');
    return rtf.format(-Math.round(secs / 86400), 'day');
  }
  function newSubscribers(data, history) {
    // lifetime_subscriptions only goes up, so this can't hide people who unsubscribed.
    // Compares against the newest point that is at least a week old. Until the history is that
    // old, it uses the earliest point and says "since <date>", so the label never overstates.
    if (!Array.isArray(history) || typeof data.lifetime_subscriptions !== 'number') return null;
    var weekAgo = Date.now() - 7 * 86400000, base = null, first = null;
    history.forEach(function (p) {
      if (typeof p.lifetime_subscriptions !== 'number' || isNaN(new Date(p.t).getTime())) return;
      if (!first) first = p;
      if (new Date(p.t).getTime() <= weekAgo) base = p;
    });
    var from = base || first;
    if (!from) return null;
    var n = data.lifetime_subscriptions - from.lifetime_subscriptions;
    return n > 0 ? { n: n, week: !!base, since: new Date(from.t) } : null;
  }
  function showMeta(data, history) {
    var parts = [], grew = newSubscribers(data, history), when = data.updated ? ago(data.updated) : '';
    if (grew) {
      var num = grew.n.toLocaleString(locale);
      var day = grew.since.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      if (lang === 'th') parts.push(grew.week ? 'สมาชิกใหม่ +' + num + ' ใน 7 วันที่ผ่านมา' : 'สมาชิกใหม่ +' + num + ' ตั้งแต่ ' + day);
      else parts.push('+' + num + ' new subscribers ' + (grew.week ? 'this week' : 'since ' + day));
    }
    if (when) parts.push((lang === 'th' ? 'เปลี่ยนล่าสุด ' : 'Last change: ') + when);
    // One line per fact (growth first, then last change) so the narrow hero card doesn't wrap them together.
    // The hero strip is a summary: data-steam-meta="brief" shows just the first line there.
    document.querySelectorAll('[data-steam-meta]').forEach(function (el) {
      el.textContent = '';
      (el.getAttribute('data-steam-meta') === 'brief' ? parts.slice(0, 1) : parts).forEach(function (text, i) {
        var line = document.createElement('span');
        line.textContent = text;
        if (grew && i === 0) line.className = 'steam-meta__trend';
        el.appendChild(line);
      });
    });
  }

  var fields = document.querySelectorAll('[data-steam]');
  if (fields.length) {
    fetch(new URL('data/steam.json', root), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        fields.forEach(function (el) {
          var v = data[el.getAttribute('data-steam')];
          if (typeof v === 'number') countUp(el, v);
        });
        showMeta(data, null);
        return fetch(new URL('data/steam-history.json', root), { cache: 'no-cache' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (history) { if (history) showMeta(data, history); })
          .catch(function () { /* the trend is optional */ });
      })
      .catch(function () { /* keep the fallback text */ });
  }

  // ---- Web demo: load the visualizer only when asked, so the page stays light ----
  document.querySelectorAll('[data-demo-start]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var stage = btn.closest('.demo-stage');
      var frame = document.createElement('iframe');
      frame.src = stage.getAttribute('data-src');
      frame.title = stage.getAttribute('data-title') || 'Web demo';
      frame.allow = 'autoplay; microphone; fullscreen';
      frame.setAttribute('allowfullscreen', '');
      stage.innerHTML = '';
      stage.appendChild(frame);
      frame.focus();
    });
  });

  // ---- Viewer for gallery photos and certificates, with previous / next ----
  var box = document.getElementById('lightbox');
  var items = [], index = 0;
  function show(i) {
    index = (i + items.length) % items.length;
    var it = items[index];
    box.querySelector('img').src = it.src;
    box.querySelector('img').alt = it.alt;
    box.querySelector('p').textContent = it.cap;
  }
  function openViewer(list, i) {
    items = list;
    box.classList.toggle('single', list.length < 2);
    show(i);
    if (!box.open) box.showModal();
  }
  if (box && typeof box.showModal === 'function') {
    var gallery = [].slice.call(document.querySelectorAll('.gallery a')).map(function (a) {
      var thumb = a.querySelector('img'), fig = a.closest('figure');
      var c = fig && fig.querySelector('figcaption span');
      return { el: a, src: a.href, alt: thumb ? thumb.alt : '', cap: c ? c.textContent : '' };
    });
    gallery.forEach(function (it, i) {
      it.el.addEventListener('click', function (e) { e.preventDefault(); openViewer(gallery, i); });
    });

    // Certificates (training list and competition cards). Filtered-out ones are skipped.
    var certList = function () {
      return [].slice.call(document.querySelectorAll('.training:not([hidden]) img, .award img')).map(function (im) {
        var card = im.closest('.training, .award'), t = card.querySelector('strong, h3');
        return { el: im, src: im.currentSrc || im.src, alt: im.alt, cap: t ? t.textContent : '' };
      });
    };
    document.querySelectorAll('.training img, .award img').forEach(function (im) {
      im.setAttribute('data-zoom', '');
      im.tabIndex = 0;
      im.setAttribute('role', 'button');
      var go = function () {
        var l = certList();
        openViewer(l, Math.max(0, l.map(function (x) { return x.el; }).indexOf(im)));
      };
      im.addEventListener('click', go);
      im.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
      });
    });

    box.querySelector('.lb-close').addEventListener('click', function () { box.close(); });
    box.querySelector('.lb-prev').addEventListener('click', function () { show(index - 1); });
    box.querySelector('.lb-next').addEventListener('click', function () { show(index + 1); });
    box.addEventListener('keydown', function (e) {
      if (items.length < 2) return;
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { box.querySelector('img').removeAttribute('src'); });
  }

  // ---- Filters for the certificate list (the buttons only exist when JS runs) ----
  var list = document.querySelector('.trainings');
  if (list) {
    var labels = lang === 'th'
      ? { ai: 'AI', iot: 'IoT', cyber: 'ไซเบอร์', networking: 'เครือข่าย', programming: 'เขียนโปรแกรม' }
      : { ai: 'AI', iot: 'IoT', cyber: 'Cybersecurity', networking: 'Networking', programming: 'Programming' };
    var present = {};
    list.querySelectorAll('.training').forEach(function (t) {
      (t.getAttribute('data-tags') || '').split(' ').forEach(function (k) { if (k) present[k] = true; });
    });
    var bar = document.createElement('div');
    bar.className = 'filters';
    bar.setAttribute('role', 'group');
    bar.setAttribute('aria-label', lang === 'th' ? 'กรองใบรับรอง' : 'Filter certificates');
    [['all', lang === 'th' ? 'ทั้งหมด' : 'All']].concat(
      Object.keys(labels).filter(function (k) { return present[k]; }).map(function (k) { return [k, labels[k]]; })
    ).forEach(function (pair) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter';
      b.textContent = pair[1];
      b.setAttribute('data-filter', pair[0]);
      b.setAttribute('aria-pressed', pair[0] === 'all' ? 'true' : 'false');
      bar.appendChild(b);
    });
    list.parentNode.insertBefore(bar, list);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.filter');
      if (!b) return;
      var k = b.getAttribute('data-filter');
      bar.querySelectorAll('.filter').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      list.querySelectorAll('.training').forEach(function (t) {
        var has = (t.getAttribute('data-tags') || '').split(' ').indexOf(k) !== -1;
        t.hidden = !(k === 'all' || has);
      });
    });
  }

  // ---- Nav: highlight the section you are in ----
  var current = '';
  var links = {};
  document.querySelectorAll('.nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        current = en.target.id;
        Object.keys(links).forEach(function (id) {
          if (id === current) links[id].setAttribute('aria-current', 'true');
          else links[id].removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    Object.keys(links).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) spy.observe(sec);
    });
  }

  // ---- Language switch: land on the same section in the other language ----
  var sw = document.querySelector('.lang a');
  if (sw) {
    var base = sw.getAttribute('href').split('#')[0];
    var sync = function () { sw.setAttribute('href', current && links[current] ? base + '#' + current : base); };
    ['pointerdown', 'focus', 'mouseenter', 'touchstart'].forEach(function (ev) {
      sw.addEventListener(ev, sync, { passive: true });
    });
  }

  // ---- Scroll reveal: only things below the fold start hidden, so nothing flashes ----
  if (!reduce && 'IntersectionObserver' in window) {
    var rv = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); rv.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.section-head, .card, .award, .training, .gallery figure').forEach(function (el) {
      if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('reveal'); rv.observe(el); }
    });
  }
})();
