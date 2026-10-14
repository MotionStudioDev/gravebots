/* 404 hayalet yakalama oyunu — harici dosya (CSP uyumlu) */
(function () {
  var arena = document.getElementById('gArena'), ghost = document.getElementById('ghost'),
      startBtn = document.getElementById('gStart'), overlay = document.getElementById('gOverlay'),
      msg = document.getElementById('gMsg'), scoreEl = document.getElementById('gScore'),
      timeEl = document.getElementById('gTime'), bestEl = document.getElementById('gBest'),
      fill = document.getElementById('gTimeFill');
  if (!arena || !ghost || !startBtn) return;
  var score = 0, left = 0, timer = 0, spawner = 0, best = 0, playing = false, DUR = 30;
  try { best = parseInt(localStorage.getItem('grave-ghost-best'), 10) || 0; } catch (e) {}
  bestEl.textContent = best;
  function place() {
    var w = arena.clientWidth - 60, h = arena.clientHeight - 70;
    ghost.style.left = (4 + Math.random() * Math.max(w, 10)) + 'px';
    ghost.style.top = (4 + Math.random() * Math.max(h, 10)) + 'px';
  }
  function tick() {
    left -= 0.25;
    if (left <= 0) { end(); return; }
    timeEl.textContent = Math.ceil(left);
    fill.style.transform = 'scaleX(' + (left / DUR) + ')';
  }
  function loop() {
    if (!playing) return;
    place();
    spawner = setTimeout(loop, Math.max(550, 950 - score * 15));
  }
  function start() {
    score = 0; left = DUR; playing = true;
    scoreEl.textContent = '0'; timeEl.textContent = String(DUR);
    fill.style.transform = 'scaleX(1)';
    overlay.hidden = true; ghost.hidden = false;
    place();
    clearInterval(timer); clearTimeout(spawner);
    timer = setInterval(tick, 250);
    loop();
  }
  function end() {
    playing = false;
    clearInterval(timer); clearTimeout(spawner);
    ghost.hidden = true;
    var rec = false;
    if (score > best) {
      best = score; rec = true;
      try { localStorage.setItem('grave-ghost-best', String(best)); } catch (e) {}
      bestEl.textContent = best;
    }
    msg.textContent = 'Skor: ' + score + (rec ? ' — Yeni rekor!' : '');
    startBtn.textContent = 'Tekrar Oyna';
    overlay.hidden = false;
  }
  ghost.addEventListener('pointerdown', function (e) {
    if (!playing) return;
    e.preventDefault();
    score++; scoreEl.textContent = score;
    ghost.classList.remove('caught');
    void ghost.offsetWidth;
    ghost.classList.add('caught');
    clearTimeout(spawner);
    place();
    spawner = setTimeout(loop, Math.max(550, 950 - score * 15));
  });
  startBtn.addEventListener('click', start);
})();
