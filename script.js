// ==========================================================================
// GRAVEBOT v3 — SITE INTERACTIONS
// ==========================================================================

document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Canlı veri durumu — Bot API'si (§13) bu değişkenleri doldurur.
  // API'ye ulaşılamazsa null kalır ve arayüzdeki örnek değerler korunur.
  let realPing = null;    // API'den gelen gerçek gecikme (ms)
  let liveLogs = false;   // konsol log akışı API'den mi geliyor?
  let shieldLive = false; // koruma olay akışı API'den mi geliyor?
  let shieldCount = null; // API'den gelen gerçek tehdit sayacı
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ------------------------------------------------------------------
  // 1. SCROLL: progress bar, sticky header, back-to-top
  // ------------------------------------------------------------------
  const scrollProgress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  const header = $('#siteHeader');
  let ticking = false;

  const onScroll = () => {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;

    if (scrollProgress) {
      scrollProgress.style.width = (docH > 0 ? (y / docH) * 100 : 0) + '%';
    }
    if (backToTop) backToTop.classList.toggle('is-visible', y > 520);
    if (header) header.classList.toggle('is-scrolled', y > 24);

    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });
  }

  // ------------------------------------------------------------------
  // 2. SMOOTH ANCHOR SCROLL (header offset)
  // ------------------------------------------------------------------
  const getOffset = () => (header ? header.offsetHeight : 74) + 18;

  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - getOffset();
      window.scrollTo({ top, behavior: reducedMotion ? 'auto' : 'smooth' });
      closeMobileMenu();
    });
  });

  // ------------------------------------------------------------------
  // 3. MOBILE MENU
  // ------------------------------------------------------------------
  const navToggle = $('#navToggle');
  const mobileMenu = $('#mobileMenu');

  function closeMobileMenu() {
    if (!navToggle || !mobileMenu) return;
    navToggle.classList.remove('is-open');
    mobileMenu.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.setAttribute('aria-label', 'Menüyü aç');
  }

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      const open = !mobileMenu.classList.contains('is-open');
      navToggle.classList.toggle('is-open', open);
      mobileMenu.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1160) closeMobileMenu();
  });

  // ------------------------------------------------------------------
  // 4. SPONSOR TOAST — girer, durur, tamamen ayrılır
  // ------------------------------------------------------------------
  const toast = $('#sponsorToast');
  if (toast) {
    setTimeout(() => {
      toast.classList.add('is-visible');
      setTimeout(() => {
        toast.classList.remove('is-visible');
        setTimeout(() => toast.remove(), 800);
      }, 5200);
    }, 1100);
  }

  // ------------------------------------------------------------------
  // 5. CANLI PING
  // ------------------------------------------------------------------
  const livePing = $('#livePing');
  if (livePing) {
    setInterval(() => {
      // Gerçek API verisi varsa onu göster, yoksa örnek dalgalanma
      const ping = realPing !== null ? realPing : Math.floor(Math.random() * 6) + 11;
      livePing.textContent = `${ping} ms`;
    }, 5000);
  }

  // ------------------------------------------------------------------
  // 6. CANLI LOG AKIŞI
  // ------------------------------------------------------------------
  const feedBody = $('#feedBody');
  if (feedBody && !reducedMotion) {
    const events = [
      ['c-sec', 'KORUMA', 'Anti-raid kalkanı aktif — 3 şüpheli giriş engellendi.'],
      ['c-aud', 'SES', '#müzik odasında 320kbps akış kararlı.'],
      ['c-ok', 'DURUM', 'Tüm shard\'lar senkronize, gecikme 12 ms.'],
      ['c-sys', 'SİSTEM', 'g!komut isteği 40 ms içinde yanıtlandı.'],
      ['c-sec', 'KORUMA', 'Reklam filtresi 2 davet bağlantısını sildi.'],
      ['c-ok', 'DURUM', 'Yedekleme tamamlandı — 70 sunucu güncellendi.'],
      ['c-aud', 'SES', 'Kuyruk temizlendi, 24/7 mod devrede.'],
      ['c-sys', 'SİSTEM', 'Günlük ödül dağıtımı 4.812 kullanıcıya işlendi.']
    ];

    const stamp = () => {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}]`;
    };

    let i = 0;
    setInterval(() => {
      if (liveLogs) return; // gerçek olay akışı API'den geliyorsa örneği durdur
      const [cls, tag, text] = events[i % events.length];
      const line = document.createElement('p');
      line.innerHTML = `<span class="t">${stamp()}</span> <b class="${cls}">${tag}</b> ${text}`;
      feedBody.appendChild(line);
      while (feedBody.children.length > 6) feedBody.removeChild(feedBody.firstElementChild);
      i++;
    }, 3200);
  }

  // ------------------------------------------------------------------
  // 7. SAYAÇLAR
  // ------------------------------------------------------------------
  const counters = $$('.counter');
  const statsArea = $('#stats');

  const formatValue = (value, target) => {
    if (target >= 1000000) return `${Math.round(value / 1000000)}M`;
    if (target >= 1000) return `${Math.round(value / 1000)}K`;
    return String(Math.round(value));
  };

  const runCounters = () => {
    counters.forEach(counter => {
      const target = Number(counter.dataset.target || 0);
      // Gizli sekmede requestAnimationFrame çalışmaz: doğrudan son değeri yaz.
      if (reducedMotion || document.hidden) {
        counter.textContent = formatValue(target, target);
        counter.dataset.done = '1';
        return;
      }

      const duration = 1900;
      const start = performance.now();

      const tick = now => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
        // Canlı veri animasyon sırasında hedefi değiştirmiş olabilir
        const t = Number(counter.dataset.target || target);
        counter.textContent = formatValue(t * eased, t);
        if (p < 1) requestAnimationFrame(tick);
        else counter.dataset.done = '1';
      };
      requestAnimationFrame(tick);
    });
  };

  if (statsArea && counters.length) {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      runCounters();
    };
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        start();
        io.disconnect();
      }
    }, { threshold: 0.35 });
    io.observe(statsArea);

    // GÜVENLİK AĞI: 3 saniye içinde sayaçlar henüz başlamadıysa
    // kendiliğinden başlar — sekme gizliyken / tam sayfa ekran görüntüsünde
    // sayılar 0 (veya boş) kalmasın. Scroll ile erken gelen kullanıcı
    // IntersectionObserver sayesinde animasyonu yine görür.
    window.setTimeout(() => {
      start();
      io.disconnect();
    }, 3000);
  }

  // ------------------------------------------------------------------
  // 8. KOMUT FİLTRELEME + KOPYALAMA
  // ------------------------------------------------------------------
  const tabBtns = $$('.tab-btn');
  const cmdCards = $$('.cmd-card');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-selected', 'true');

      const filter = btn.dataset.filter;
      cmdCards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.classList.toggle('is-hidden', !show);
      });
    });
  });

  const snackbar = $('#snackbar');
  let snackTimer;

  const showSnack = () => {
    if (!snackbar) return;
    snackbar.classList.add('is-visible');
    clearTimeout(snackTimer);
    snackTimer = setTimeout(() => snackbar.classList.remove('is-visible'), 2000);
  };

  const copyCommand = card => {
    const text = card.dataset.clipboard;
    if (!text) return;

    const done = () => {
      card.classList.add('is-copied');
      const icon = $('.cmd-copy i', card);
      if (icon) icon.className = 'fa-solid fa-check';
      showSnack();
      setTimeout(() => {
        card.classList.remove('is-copied');
        if (icon) icon.className = 'fa-regular fa-copy';
      }, 1900);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }

    function fallbackCopy() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (_) { /* yoksay */ }
      ta.remove();
    }
  };

  cmdCards.forEach(card => {
    card.addEventListener('click', () => copyCommand(card));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        copyCommand(card);
      }
    });
  });

  // ------------------------------------------------------------------
  // 9. DURUM KANALLI MÜZİK DEMOSU
  // ------------------------------------------------------------------
  const npTitle = $('#npTitle');
  if (npTitle && !reducedMotion) {
    const npArtist = $('#npArtist');
    const npSource = $('#npSource');
    const npTotal = $('#npTotal');
    const npElapsed = $('#npElapsed');
    const npFill = $('#npFill');

    const tracks = [
      { title: 'Gece Yolculuğu',  artist: 'Grave Audio', total: 185,
        source: { cls: 'chip-spotify',    icon: 'fa-brands fa-spotify',    label: 'Spotify' } },
      { title: 'Karanlıkta Işık', artist: 'Neon Duo',    total: 252,
        source: { cls: 'chip-youtube',    icon: 'fa-brands fa-youtube',    label: 'YouTube' } },
      { title: 'Yüksek Gerilim',  artist: 'Bassline TR', total: 178,
        source: { cls: 'chip-soundcloud', icon: 'fa-brands fa-soundcloud', label: 'SoundCloud' } }
    ];

    const DEMO_MS = 12000; // demo döngüsü (parça başına)
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    let index = 0;
    let cycleStart = performance.now();

    const applyTrack = () => {
      const t = tracks[index];
      npTitle.textContent = t.title;
      npArtist.textContent = t.artist;
      npTotal.textContent = fmt(t.total);
      if (npSource) {
        npSource.className = `np-chip ${t.source.cls}`;
        npSource.innerHTML = `<i class="${t.source.icon}" aria-hidden="true"></i> ${t.source.label}`;
      }
      if (npFill) {
        npFill.style.animation = 'none';
        void npFill.offsetWidth;
        npFill.style.animation = '';
      }
      cycleStart = performance.now();
    };

    applyTrack();

    setInterval(() => {
      const p = (performance.now() - cycleStart) / DEMO_MS;
      if (p >= 1) {
        index = (index + 1) % tracks.length;
        applyTrack();
        return;
      }
      if (npElapsed) npElapsed.textContent = fmt(Math.floor(p * tracks[index].total));
    }, 250);
  }

  // ------------------------------------------------------------------
  // 10. KORUMA PANELİ — CANLI SAYAÇ & OLAY AKIŞI
  // ------------------------------------------------------------------
  const protBlocked = $('#protBlocked');
  const shieldLog = $('#shieldLog');

  if (protBlocked && !reducedMotion) {
    const events = [
      ['badge-block', 'ENGELLENDİ', 'taze hesaptan toplu giriş'],
      ['badge-block', 'ENGELLENDİ', '#genel kanalına davet linki'],
      ['badge-ok',    'TEMİZ',      'tehdit yok, kalkan kararlı'],
      ['badge-block', 'ENGELLENDİ', '#sohbet kanalında mesaj floodu'],
      ['badge-block', 'ENGELLENDİ', 'rol silme denemesi geri alındı'],
      ['badge-block', 'ENGELLENDİ', 'emoji spam (34 mesaj)']
    ];

    let value = parseInt((protBlocked.textContent || '0').replace(/\D/g, ''), 10) || 0;
    let i = 0;

    const stamp = () => {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `[${p(d.getHours())}:${p(d.getMinutes())}]`;
    };

    const tickShield = () => {
      // Canlı API değeri varsa onu göster; yoksa örneğe devam et
      if (shieldCount !== null) value = shieldCount;
      else value += Math.floor(Math.random() * 4) + 1;
      protBlocked.textContent = value.toLocaleString('tr-TR');

      if (shieldLog && !shieldLive) {
        const [cls, label, text] = events[i % events.length];
        const line = document.createElement('p');
        line.innerHTML = `<span class="t">${stamp()}</span><span class="p-log-badge ${cls}">${label}</span> ${text}`;
        shieldLog.appendChild(line);
        while (shieldLog.children.length > 3) shieldLog.removeChild(shieldLog.firstElementChild);
      }
      i++;
    };
    tickShield();
    setInterval(tickShield, 4200);
  }

  // ------------------------------------------------------------------
  // 11. REVEAL ON SCROLL
  // ------------------------------------------------------------------
  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-visible'));
    } else {
      const io = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

      revealEls.forEach(el => io.observe(el));

      // GÜVENLİK AĞI: 3 saniye içinde scroll ile açılmamış bölümler
      // kendiliğinden açılır (tam sayfa ekran görüntüsü / yazdırma / arama).
      window.setTimeout(() => {
        revealEls.forEach(el => el.classList.add('is-visible'));
        io.disconnect();
      }, 3000);
    }
  }

  // ------------------------------------------------------------------
  // 12. YIL
  // ------------------------------------------------------------------
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ------------------------------------------------------------------
  // 13. CANLI VERİ — BOT API'sİNDEN GERÇEK SAYILAR
  // ------------------------------------------------------------------
  // Bot API adresini buraya ekle (ör. 'https://api.alan-adin.com').
  // Site ve bot aynı sunucudaysa boş bırak; /api/* aynı origin'den çekilir.
  // Bot tarafı için: bot-stats-api.js + CANLI-VERI.md
  const LIVE_API = [''];

  const joinUrl = (base, path) => `${String(base).replace(/\/+$/, '')}${path}`;

  const fetchJson = async urls => {
    for (const url of urls) {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.ok !== false) return data;
      } catch (_) { /* sıradaki aday denenir */ }
    }
    return null;
  };

  const statsSource = $('#statsSource');
  const setSource = (state, text) => {
    if (!statsSource) return;
    statsSource.classList.remove('is-live', 'is-offline');
    if (state) statsSource.classList.add(state);
    statsSource.innerHTML = `<span class="src-dot"></span>${text}`;
  };

  // Güvenlik: API'den gelen metinler kaçıştan geçirilir
  const esc = value => String(value).replace(/[&<>"]/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]
  ));

  const renderStats = data => {
    $$('[data-stat]').forEach(node => {
      const key = node.dataset.stat;
      const num = Number(data[key]);
      if (!Number.isFinite(num)) return;

      if (node.classList.contains('counter')) {
        node.dataset.target = String(num); // sayaç animasyonu yeni hedefi kullanır
        if (node.dataset.done === '1') node.textContent = formatValue(num, num);
        return;
      }
      if (key === 'pingMs') { node.textContent = `${num} ms`; return; }
      if (key === 'uptimePercent') { node.textContent = `%${num}`; return; }
      node.textContent = `${num.toLocaleString('tr-TR')}${node.dataset.suffix || ''}`;
    });

    if (Number.isFinite(Number(data.pingMs))) realPing = Number(data.pingMs);
    if (Number.isFinite(Number(data.threatsBlocked))) shieldCount = Number(data.threatsBlocked);
    if (livePing && realPing !== null) livePing.textContent = `${realPing} ms`;
    if (protBlocked && shieldCount !== null) {
      protBlocked.textContent = shieldCount.toLocaleString('tr-TR');
    }
  };

  const loadLogs = async (scope, apply) => {
    const data = await fetchJson(
      LIVE_API.map(base => joinUrl(base, `/api/logs?scope=${scope}&limit=${scope === 'shield' ? 3 : 6}`))
    );
    if (data && Array.isArray(data.events) && data.events.length) apply(data.events);
  };

  const LEVELS = ['sys', 'sec', 'aud', 'ok'];
  const applyConsoleLogs = events => {
    if (!feedBody) return;
    liveLogs = true;
    feedBody.innerHTML = events.map(e => {
      const level = LEVELS.includes(e.level) ? e.level : 'sys';
      return `<p><span class="t">[${esc(e.time)}]</span> <b class="c-${level}">${esc(e.tag)}</b> ${esc(e.text)}</p>`;
    }).join('');
  };

  const applyShieldLogs = events => {
    if (!shieldLog) return;
    shieldLive = true;
    shieldLog.innerHTML = events.map(e => {
      const ok = e.label === 'TEMİZ';
      return `<p><span class="t">[${esc(e.time)}]</span>` +
             `<span class="p-log-badge ${ok ? 'badge-ok' : 'badge-block'}">${ok ? 'TEMİZ' : 'ENGELLENDİ'}</span> ` +
             `${esc(e.text)}</p>`;
    }).join('');
  };

  const refreshStats = async () => {
    const data = await fetchJson(LIVE_API.map(base => joinUrl(base, '/api/stats')));
    if (!data) {
      setSource('is-offline', 'GraveBOT API\'ye ulaşılamadı — örnek veriler gösteriliyor');
      return;
    }
    renderStats(data);
    const when = Number(data.updatedAt) ? new Date(Number(data.updatedAt)) : new Date();
    const time = when.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    setSource('is-live', `Canlı veri · GraveBOT API · son güncelleme ${time}`);
  };

  setSource(null, 'GraveBOT API\'ye bağlanılıyor…');
  refreshStats();
  loadLogs('console', applyConsoleLogs);
  loadLogs('shield', applyShieldLogs);

  // 30 sn'de bir sayaçlar, 60 sn'de bir olay akışı tazelenir
  setInterval(refreshStats, 30000);
  setInterval(() => {
    loadLogs('console', applyConsoleLogs);
    loadLogs('shield', applyShieldLogs);
  }, 60000);

});
