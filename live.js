/* GraveBOT — canlı aktivite akışı
   Hero'daki üç kartın içeriğini periyodik olarak yeniler: seviye atlayan
   kullanıcı, çalan şarkı ve çekiliş kazananı her turda değişir.

   Şablonlar index.html'deki gizli [data-i18n="lvlF"/"givF"] öğelerinden
   okunur. applyLang() o öğelerin içeriğini dil değişince güncellediği için
   metinler her zaman doğru dilde kalır — script.js'e dokunulmaz.
*/
(function () {
  'use strict';

  var NAMES = ['Zeynep', 'Kaan', 'Elif', 'Mert', 'Ayşe', 'Deniz', 'Bora', 'Selin',
    'Emre', 'Yiğit', 'Duru', 'Ceren', 'Arda', 'Melis', 'Kaya', 'Ada',
    'Tolga', 'Pelin', 'Barış', 'Sena', 'Umut', 'Damla'];
  var SONGS = [
    { c: 'cover-1.png', t: 'Cem Adrian — Kül' },
    { c: 'cover-2.png', t: 'LanetKel — Saçı Pembe' },
    { c: 'cover-3.png', t: 'Dedublüman — Günü gelir' }
  ];
  var SURE = 7000;   // yenilenme aralığı (ms)

  var row = document.getElementById('actRow');
  if (!row) return;

  var kapak = document.getElementById('actCover');
  var hedef = {
    lvlF: row.querySelector('[data-fill="lvlF"]'),
    song: row.querySelector('[data-fill="song"]'),
    givF: row.querySelector('[data-fill="givF"]')
  };
  var sablon = {};
  var sonAd = -1, sonSarki = -1, sonKazanan = -1, sonLv = -1;
  var sessiz = false;
  try {
    sessiz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}

  function sablonlariOku() {
    var degisti = false;
    var dugumler = row.querySelectorAll('[data-i18n="lvlF"],[data-i18n="givF"]');
    for (var i = 0; i < dugumler.length; i++) {
      var k = dugumler[i].getAttribute('data-i18n');
      var v = dugumler[i].textContent;
      if (v && sablon[k] !== v) { sablon[k] = v; degisti = true; }
    }
    if (degisti) ciz(false);
  }

  // bir öncekiyle aynı olmayan rastgele indeks
  function farkli(son, n) {
    if (n <= 1) return 0;
    var v, deneme = 0;
    do { v = (Math.random() * n) | 0; } while (v === son && ++deneme < 8);
    return v;
  }

  function parca(s, ad, lv, n) {
    return String(s).split('{name}').join(ad)
      .split('{lv}').join(String(lv))
      .split('{n}').join(String(n));
  }

  function belirt(el) {
    if (sessiz) return;
    el.classList.remove('act-fade');
    void el.offsetWidth;           // yeniden akış: animasyonu başa sar
    el.classList.add('act-fade');
  }

  function ciz(animasyonlu) {
    if (!sablon.lvlF || !sablon.givF) return;

    var adIdx = farkli(sonAd, NAMES.length); sonAd = adIdx;
    var lv = 8 + ((Math.random() * 64) | 0);
    if (lv === sonLv) lv = (lv % 70) + 8;
    sonLv = lv;

    var kazanan = 2 + ((Math.random() * 12) | 0);
    if (kazanan === sonKazanan) kazanan = (kazanan % 14) + 2;
    sonKazanan = kazanan;

    hedef.lvlF.textContent = parca(sablon.lvlF, NAMES[adIdx], lv, kazanan);
    hedef.givF.textContent = parca(sablon.givF, NAMES[adIdx], lv, kazanan);

    // şarkı sırayla döner, üçü de görünür
    sonSarki = (sonSarki + 1) % SONGS.length;
    hedef.song.textContent = SONGS[sonSarki].t;
    if (kapak && kapak.getAttribute('src') !== SONGS[sonSarki].c) {
      kapak.src = SONGS[sonSarki].c;
    }

    if (animasyonlu) {
      belirt(row.querySelector('.act-lvl'));
      belirt(hedef.song.closest('.act'));
      belirt(row.querySelector('.act-give'));
    }
  }

  // dil değişince şablonlar yenilenir
  if (window.MutationObserver) {
    new MutationObserver(sablonlariOku).observe(row, {
      childList: true, subtree: true, characterData: true
    });
  }

  sablonlariOku();

  setInterval(function () {
    if (document.hidden) return;            // arka planda boşuna çalışma
    if (!row.offsetParent) return;          // mobilde gizli
    ciz(true);
  }, SURE);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) ciz(false);       // dönüldüğünde tazele
  });
})();