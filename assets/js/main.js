/* Small enhancements: live Steam numbers, the on-demand web demo, and a photo viewer.
   The page works without this script; these only add to it. */
(function () {
  var root = new URL('../../', document.currentScript.src); // site root, from assets/js/
  var lang = document.documentElement.lang || 'en';

  // ---- Steam Workshop numbers (data/steam.json is refreshed daily by a GitHub Action) ----
  var fields = document.querySelectorAll('[data-steam]');
  if (fields.length) {
    fetch(new URL('data/steam.json', root), { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        fields.forEach(function (el) {
          var v = data[el.getAttribute('data-steam')];
          if (typeof v === 'number') el.textContent = v.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US');
        });
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

  // ---- Photo viewer for the gallery ----
  var box = document.getElementById('lightbox');
  if (box && typeof box.showModal === 'function') {
    var img = box.querySelector('img'), cap = box.querySelector('p');
    document.querySelectorAll('.gallery a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var thumb = a.querySelector('img'), fig = a.closest('figure');
        img.src = a.href;
        img.alt = thumb ? thumb.alt : '';
        cap.textContent = fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption span').textContent : '';
        box.showModal();
      });
    });
    box.querySelector('button').addEventListener('click', function () { box.close(); });
    box.addEventListener('click', function (e) { if (e.target === box) box.close(); });
    box.addEventListener('close', function () { img.removeAttribute('src'); });
  }
})();
