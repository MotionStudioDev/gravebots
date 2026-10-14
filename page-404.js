(function () {
  var root = document.documentElement;
  try { var t = localStorage.getItem('grave-theme'); if (t) root.setAttribute('data-theme', t); } catch (e) {}
  function setTheme(t) { root.setAttribute('data-theme', t); try { localStorage.setItem('grave-theme', t); } catch (e) {} }
  /* sag tik + F12 engeli */
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      try { if (location.pathname.indexOf('404.html') === -1) location.href = '404.html'; } catch (err) {}
      return;
    }
    var k = '';
    try { k = (e.key || '').toUpperCase(); } catch (err) {}
    var mod = e.ctrlKey || e.metaKey;
    if ((mod && e.shiftKey && ['I', 'J', 'C', 'K', 'E', 'S'].indexOf(k) > -1) ||
        (mod && !e.shiftKey && ['U', 'S', 'P'].indexOf(k) > -1)) e.preventDefault();
  });
  document.getElementById('themeToggle').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    if (document.startViewTransition) document.startViewTransition(function () { setTheme(next); });
    else setTheme(next);
  });
})();
