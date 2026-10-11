// Loader — sayfa yüklenince kapat (en az 900ms göster)
const loader = document.getElementById('loader');
const t0 = performance.now();
function hideLoader() {
  if (!loader.isConnected) return;
  const wait = Math.max(0, 1700 - (performance.now() - t0));
  setTimeout(() => {
    loader.classList.add('done');
    setTimeout(() => loader.remove(), 600);
  }, wait);
}
if (document.readyState === 'complete') hideLoader();
else { addEventListener('load', hideLoader); setTimeout(hideLoader, 3500); }

// Sayfa giriş animasyonlarını başlat
requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add('loaded')));

// Tema (karanlık mod)
const root = document.documentElement;
function setTheme(t) {
  root.setAttribute('data-theme', t);
  try { localStorage.setItem('grave-theme', t); } catch (e) {}
}
let saved = null;
try { saved = localStorage.getItem('grave-theme'); } catch (e) {}
setTheme(saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  if (document.startViewTransition) {
    document.startViewTransition(() => setTheme(next));
  } else {
    document.body.classList.add('theme-anim');
    setTheme(next);
    setTimeout(() => document.body.classList.remove('theme-anim'), 550);
  }
});

// Mobil menü
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('mobile');
  document.querySelector('.nav-actions').classList.toggle('mobile');
});

// Komut filtre + arama
const tabs = document.querySelectorAll('#cmdTabs button');
const rows = document.querySelectorAll('.cmd-row');
const search = document.getElementById('cmdSearch');
const empty = document.getElementById('cmdEmpty');
let cat = 'all';
function filter() {
  const q = search.value.toLocaleLowerCase('tr');
  let n = 0;
  rows.forEach(r => {
    const ok = (cat === 'all' || r.dataset.cat === cat) && r.textContent.toLocaleLowerCase('tr').includes(q);
    r.style.display = ok ? 'flex' : 'none';
    if (ok) n++;
  });
  empty.hidden = n !== 0;
}
tabs.forEach(b => b.addEventListener('click', () => {
  tabs.forEach(x => x.classList.remove('active'));
  b.classList.add('active'); cat = b.dataset.cat; filter();
}));
search.addEventListener('input', filter);

// FAQ
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('button'), ans = item.querySelector('.faq-a');
  btn.addEventListener('click', () => {
    const open = item.classList.contains('open');
    document.querySelectorAll('.faq-item').forEach(i => {
      i.classList.remove('open');
      i.querySelector('.faq-a').style.maxHeight = null;
      i.querySelector('.faq-a').classList.remove('open');
    });
    if (!open) { item.classList.add('open'); ans.classList.add('open'); ans.style.maxHeight = ans.scrollHeight + 'px'; }
  });
});

// Canlı sunucu sayısı (Vercel functions → top.gg; olmazsa sabit sayı kalır)
async function refreshLiveServers() {
  try {
    const r = await fetch('/api/stats', { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.servers == null) return;
    document.querySelectorAll('.statband-inner > div:first-child b').forEach(b => {
      b.dataset.count = j.servers;
      if (b.dataset.done) b.textContent = fmtNum(j.servers);
    });
    const vs = document.querySelector('.vt-nums div:first-child b');
    if (vs) vs.textContent = j.servers.toLocaleString('tr-TR');
  } catch (e) {}
}
function fmtNum(n) { return (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n.toLocaleString('tr-TR')) + '+'; }
refreshLiveServers();
setInterval(refreshLiveServers, 30 * 1000);

// Sayaç (not: sunucu sayısı Vercel functions üzerinden canlı gelir, bkz. api/stats.js)
function count(el) {
  const t = +el.dataset.count, t0 = performance.now(), dur = 1400;
  (function tick(now) {
    const p = Math.min((now - t0) / dur, 1);
    const v = Math.floor(t * (1 - Math.pow(1 - p, 3)));
    el.textContent = (v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v.toLocaleString('tr-TR')) + '+';
    if (p < 1) requestAnimationFrame(tick);
    else el.dataset.done = '1';
  })(t0);
}
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { count(e.target); io.unobserve(e.target); }
}), { threshold: .5 });
document.querySelectorAll('[data-count]').forEach(el => io.observe(el));

// Smooth scroll + menü kapat
document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const t = document.querySelector(a.getAttribute('href'));
  if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  document.getElementById('navLinks').classList.remove('mobile');
  document.querySelector('.nav-actions').classList.remove('mobile');
}));

// Nav gölgesi
const nav = document.querySelector('.nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });

// Scroll reveal
const ro = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) {
    e.target.classList.add('in');
    setTimeout(() => e.target.style.transitionDelay = '', 750);
    ro.unobserve(e.target);
  }
}), { threshold: .12 });
document.querySelectorAll('.feat,.review,.step,.show-row,.cmd-table,.cta,.statband-inner,.faq-banner,.vote-card').forEach(el => {
  el.classList.add('reveal'); ro.observe(el);
});
document.querySelectorAll('#faq .faq-item').forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = (i * 0.08) + 's';
  ro.observe(el);
});

// Komuta tıkla-kopyala + toast
const toast = document.createElement('div');
toast.className = 'toast';
document.body.appendChild(toast);
let toastT;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => toast.classList.remove('show'), 1600);
}
document.querySelectorAll('.cmd-row').forEach(row => row.addEventListener('click', (e) => {
  const cmd = row.querySelector('code').textContent.trim();
  burst(e.clientX, e.clientY);
  (navigator.clipboard ? navigator.clipboard.writeText(cmd) : Promise.reject()).then(
    () => showToast(cmd + ' ' + (I18N[curLang].toast || 'kopyalandı')),
    () => showToast(cmd)
  );
}));

// ---------- DİL ----------
const I18N = {
tr: { title:"GraveBOT — Sunucunu Büyütmenin En Eğlenceli Yolu", topbar:"Sponsor: ", topbarLink:"ayhost.net", navFeat:"Özellikler", navShow:"Neler Yapıyor?", navCmd:"Komutlar", navVote:"Oy Ver", navFaq:"S.S.S", voteKick:"OY VER", voteH:"Botu seviyor musun?", voteP:"top.gg'de oy ver, GraveBOT'u listelerde yükselt.", voteBtn:"top.gg'de Oy Ver", voteNote:"Her 12 saatte bir oy verebilirsin", voteLive:"CANLI", voteS1:"sunucu", voteS2:"oy", navSup:"Destek", navAdd:"Discord'a Ekle", pill:"112+ sunucunun favori botu", hA:"Sunucunu büyütmenin", hHl:"en eğlenceli", hB:"yolu.", sub:"Moderasyon, müzik, seviye ve ekonomi — hepsi tek botta. Kurulum 30 saniye, kullanımı çocuk oyuncağı.", heroAdd:"Discord'a Ekle — Ücretsiz", heroWhat:"Neler Yapıyor?", proof:"2.300+ sunucu sahibinin puanıyla", onl:"çevrimiçi", lvlT:"Seviye atladın!", lvlP:"Zeynep 15. seviyeye ulaştı", nowT:"Şimdi çalıyor", nowP:"Gece LoFi — 03:42 • 14 dinleyici", givT:"Çekiliş bitti!", givP:"3 kazanan belirlendi, tebrikler", moreSrv:"+12.400 sunucu daha", tick1:"Moderasyon", tick2:"Müzik", tick3:"Seviye", tick4:"Ekonomi", tick5:"Kayıt", tick6:"Çekiliş", tick7:"24/7", tick8:"Otomasyon", fKick:"ÖZELLİKLER", fH:"Tek bot,", fHl:"sınırsız eğlence.", fSub:"Her sunucunun ihtiyacı olan her şey kutudan çıkıyor.", f1h:"Moderasyon", f1p:"Spam, küfür ve raid koruması. Uyarı, susturma ve yasaklama tek tıkla.", f2h:"Müzik", f2p:"YouTube + Spotify, sıra ve 24/7 modu. Partin hiç bitmesin.", f3h:"Seviye & XP", f3p:"Mesajlaştıkça seviye atla, ödüller kazan, liderlik tablosuna çık.", f4h:"Ekonomi", f4p:"Günlük ödül, çalışma, market. Sunucu paranı yönet.", f5h:"Kayıt", f5p:"Butonlu kayıt formu, otomatik rol. Yetkililer rahat nefes alsın.", f6h:"Çekiliş", f6p:"Bir komutla çekiliş başlat, kazananlar otomatik seçilsin.", fLink:"Komutları gör →", shKick:"NELER YAPIYOR?", shH:"Sunucunu otopilota al.", s1t:"MODERASYON", s1h:"Trolleri sen uyanmadan yakala.", s1p:"Otomatik koruma spam, reklam ve küfürü anında siler. Sen sadece keyfine bak.", s1a:"Otomatik spam ve link engelleme", s1b:"Uyarı → susturma → yasak merdiveni", s1c:"Her işlem log kanalına kaydolur", m1:"<b>Silindi:</b> 12 spam mesaj — @spamcı susturuldu (10 dk)", m2:"<b>Uyarı:</b> @yeni-üye — reklam linki (1/3)", m3:"<b>Temiz:</b> son 24 saatte 96 tehdit engellendi", s2t:"MÜZİK", s2h:"Parti modu: hep açık.", s2p:"YouTube ve Spotify'dan kesintisiz müzik. Sıra, döngü ve 24/7 modu dahil.", s2a:"Yüksek kalite ses, sıfır gecikme", s2b:"g!sıra ile kuyruğu yönet", s2c:"Oy vererek şarkı atlatma", s3t:"EKONOMİ", s3h:"Üyeler her gün geri gelsin.", s3p:"Günlük ödül, çalışma ve market ile sunucun yaşayan bir ekonomiye dönüşsün.", s3a:"g!günlük ile her gün coin", s3b:"Mağazadan rol ve avantaj satın al", s3c:"Haftalık liderlik tablosu", ecoT:"Haftalık Liderlik", you:"Sen", cKick:"KOMUTLAR", cHA:"Hepsi", cHB:"başlıyor.", searchPh:"Komut ara... (örn: ban)", tAll:"Tümü", tMod:"Moderasyon", tMus:"Müzik", tEco:"Ekonomi", tGen:"Genel", c_ban:"Kullanıcıyı yasakla", c_ban_p:"Sebep ve süre belirterek uzaklaştırır.", c_kick:"Kullanıcıyı at", c_kick_p:"Sunucudan çıkarır, tekrar katılabilir.", c_mute:"Sustur", c_mute_p:"Süreli susturma uygular, loga kaydeder.", c_temizle:"Mesaj sil", c_temizle_p:"1–100 mesajı tek seferde siler.", c_kurulum:"Hızlı kurulum", c_kurulum_p:"Her şeyi 30 saniyede kurar.", c_oynat:"Şarkı çal", c_oynat_p:"İsim veya link ile çalar.", c_sira:"Kuyruk", c_sira_p:"Sıradaki şarkıları listeler.", c_bakiye:"Bakiye", c_bakiye_p:"Cüzdan ve sıralamanı gösterir.", c_gunluk:"Günlük ödül", c_gunluk_p:"Her 24 saatte bir coin.", c_cekilis:"Çekiliş başlat", c_cekilis_p:"Süre ve ödül belirlersin.", c_yardim:"Yardım", c_yardim_p:"Tüm komutları listeler.", cmdEmpty:"Aramanla eşleşen komut bulunamadı.", st1:"sunucu", st2:"kullanıcı", st3:"Komut", st4:"% uptime", suKick:"KURULUM", suH:"30 saniyede hazır.", s1h_:"Davet et", s1p_:"Butona bas, sunucunu seç, onayla.", s2h_:"g!kurulum yaz", s2p_:"Her şey otomatik ayarlansın.", s3h_:"Eğlenmene bak", s3p_:"Bot çalışsın, sen topluluğunla ilgilen.", suBtn:"Hemen Başla — Ücretsiz", rvKick:"SUNUCULAR ANLATIYOR", rvH:"Binlerce mutlu topluluk.", rv1:"\"Üç botu silip GraveBOT'a geçtik. Seviye sistemi üyeleri bağımlı etti.\"", rv1m:"8.200 üye", rv2:"\"g!kurulum yazdım, yarım dakikada her şey hazırdı. İnanılmaz kolay.\"", rv2m:"15.000 üye", rv3:"\"Müzik için geldik, ekonomi ve çekilişlerle kaldık. Herkese öneririm.\"", rv3m:"5.600 üye", fqKick:"S.S.S", fqH:"Aklında kalanlar.", fqSub:"Cevabını bulamadın mı?", fqBtn:"Destek'e Sor", q1:"Ücretsiz mi?", a1:"Evet, tüm temel özellikler ücretsiz ve sınırsız sunucuda kullanılabilir.", q2:"Nasıl eklerim?", a2:"\"Discord'a Ekle\" butonuna tıkla, sunucunu seç ve onayla. Sonra kanala <code>g!kurulum</code> yaz.", q3:"Hangi yetkiler gerekli?", a3:"İlk kurulumda Yönetici yetkisi önerilir, sonra kısıtlayabilirsin.", q4:"Türkçe mi?", a4:"Evet, komutlar ve destek tamamen Türkçe.", ctaH:"Partiye katılmaya hazır mısın?", ctaP:"112+ sunucu zaten GraveBOT kullanıyor. 30 saniyede sen de başla.", ctaBtn:"GraveBOT'u Ekle — Ücretsiz", ctaSm:"Kredi kartı gerekmez", ftRights:"© 2026 GraveBOT — Discord Inc. ile bağlantısı yoktur.", ftInv:"Davet Et", ftSup:"Destek Sunucusu", ftVote:"Oy Ver", ftPr:"Gizlilik", ftTe:"DMCA", ftKvkk:"KVKK", toast:"kopyalandı", lt1:"İpucu: g!kurulum her şeyi 30 saniyede kurar", lt2:"İpucu: komuta tıklayınca kopyalanır", lt3:"112+ sunucu GraveBOT kullanıyor", metaDesc:"GraveBOT: moderasyon, müzik, ekonomi ve kayıt. Ücretsiz, 30 saniyede kurulum." },
en: { title:"GraveBOT — The Most Fun Way to Grow Your Server", topbar:"Sponsor: ", topbarLink:"ayhost.net", navFeat:"Features", navShow:"What can it do?", navCmd:"Commands", navVote:"Vote", navFaq:"FAQ", voteKick:"VOTE", voteH:"Love the bot?", voteP:"Vote on top.gg and push GraveBOT up the lists.", voteBtn:"Vote on top.gg", voteNote:"You can vote every 12 hours", voteLive:"LIVE", voteS1:"servers", voteS2:"votes", navSup:"Support", navAdd:"Add to Discord", pill:"Favorite bot of 112+ servers", hA:"The most", hHl:"fun", hB:"way to grow your server.", sub:"Moderation, music, levels and economy — all in one bot. 30-second setup, child's play to use.", heroAdd:"Add to Discord — Free", heroWhat:"What can it do?", proof:"rated by 2,300+ server owners", onl:"online", lvlT:"Level up!", lvlP:"Zeynep reached level 15", nowT:"Now playing", nowP:"Night LoFi — 03:42 • 14 listeners", givT:"Giveaway over!", givP:"3 winners picked, congrats", moreSrv:"+12,400 more servers", tick1:"Moderation", tick2:"Music", tick3:"Levels", tick4:"Economy", tick5:"Registration", tick6:"Giveaways", tick7:"24/7", tick8:"Automation", fKick:"FEATURES", fH:"One bot,", fHl:"endless fun.", fSub:"Everything every server needs, out of the box.", f1h:"Moderation", f1p:"Spam, profanity and raid protection. Warn, mute and ban in one click.", f2h:"Music", f2p:"YouTube + Spotify, queue and 24/7 mode. Never let the party stop.", f3h:"Levels & XP", f3p:"Level up as you chat, earn rewards, climb the leaderboard.", f4h:"Economy", f4p:"Daily rewards, work, shop. Manage your server's money.", f5h:"Registration", f5p:"Button registration form, auto roles. Let your staff breathe.", f6h:"Giveaways", f6p:"Start a giveaway with one command, winners picked automatically.", fLink:"See commands →", shKick:"WHAT DOES IT DO?", shH:"Put your server on autopilot.", s1t:"MODERATION", s1h:"Catch trolls before you wake up.", s1p:"Auto protection deletes spam, ads and profanity instantly. You just enjoy.", s1a:"Automatic spam and link blocking", s1b:"Warn → mute → ban ladder", s1c:"Every action logged to a log channel", m1:"<b>Deleted:</b> 12 spam messages — @spammer muted (10 min)", m2:"<b>Warning:</b> @new-member — ad link (1/3)", m3:"<b>Clean:</b> 96 threats blocked in the last 24 hours", s2t:"MUSIC", s2h:"Party mode: always on.", s2p:"Non-stop music from YouTube and Spotify. Queue, loop and 24/7 mode included.", s2a:"High-quality sound, zero lag", s2b:"Manage the queue with g!sıra", s2c:"Skip songs by voting", s3t:"ECONOMY", s3h:"Bring members back every day.", s3p:"Turn your server into a living economy with daily rewards, work and a shop.", s3a:"Daily coins with g!günlük", s3b:"Buy roles and perks from the shop", s3c:"Weekly leaderboard", ecoT:"Weekly Leaderboard", you:"You", cKick:"COMMANDS", cHA:"Everything starts", cHB:"with g!", searchPh:"Search commands... (e.g. ban)", tAll:"All", tMod:"Moderation", tMus:"Music", tEco:"Economy", tGen:"General", c_ban:"Ban user", c_ban_p:"Removes from the server with reason and duration.", c_kick:"Kick user", c_kick_p:"Kicks from the server, can rejoin.", c_mute:"Mute", c_mute_p:"Applies timed mute, logs it.", c_temizle:"Clear messages", c_temizle_p:"Deletes 1–100 messages at once.", c_kurulum:"Quick setup", c_kurulum_p:"Sets everything up in 30 seconds.", c_oynat:"Play song", c_oynat_p:"Plays from name or link.", c_sira:"Queue", c_sira_p:"Lists upcoming songs.", c_bakiye:"Balance", c_bakiye_p:"Shows your wallet and rank.", c_gunluk:"Daily reward", c_gunluk_p:"Coins every 24 hours.", c_cekilis:"Start giveaway", c_cekilis_p:"You set duration and prize.", c_yardim:"Help", c_yardim_p:"Lists all commands.", cmdEmpty:"No commands match your search.", st1:"servers", st2:"users", st3:"commands", st4:"% uptime", suKick:"SETUP", suH:"Ready in 30 seconds.", s1h_:"Invite", s1p_:"Hit the button, pick your server, approve.", s2h_:"Type g!kurulum", s2p_:"Everything configures itself.", s3h_:"Enjoy", s3p_:"The bot works, you hang out with your community.", suBtn:"Get Started — Free", rvKick:"SERVERS TALK", rvH:"Thousands of happy communities.", rv1:"\"We deleted three bots and switched to GraveBOT. The level system got members hooked.\"", rv1m:"8,200 members", rv2:"\"I typed g!kurulum and everything was ready in half a minute. Unbelievably easy.\"", rv2m:"15,000 members", rv3:"\"Came for the music, stayed for the economy and giveaways. Recommend to everyone.\"", rv3m:"5,600 members", fqKick:"F.A.Q", fqH:"What's on your mind.", fqSub:"Can't find your answer?", fqBtn:"Ask Support", q1:"Is it free?", a1:"Yes, all core features are free on unlimited servers.", q2:"How do I add it?", a2:"Click “Add to Discord”, pick your server and approve. Then type <code>g!kurulum</code> in a channel.", q3:"Which permissions are needed?", a3:"Admin permission is recommended for first setup, you can restrict later.", q4:"Is there English support?", a4:"Yes, the website and support are fully available in English.", ctaH:"Ready to join the party?", ctaP:"112+ servers already use GraveBOT. Start in 30 seconds.", ctaBtn:"Add GraveBOT — Free", ctaSm:"No credit card needed", ftRights:"© 2026 GraveBOT — Not affiliated with Discord Inc.", ftInv:"Invite", ftSup:"Support", ftVote:"Vote", ftPr:"Privacy", ftTe:"DMCA", ftKvkk:"KVKK", toast:"copied", lt1:"Tip: g!kurulum sets everything up in 30 seconds", lt2:"Tip: click a command to copy it", lt3:"112+ servers use GraveBOT", metaDesc:"GraveBOT: moderation, music, economy and registration. Free, 30-second setup." },
ar: { title:"GraveBOT — الطريقة الأكثر متعة لتنمية خادمك", topbar:"برعاية: ", topbarLink:"ayhost.net", navFeat:"المميزات", navShow:"ماذا يفعل؟", navCmd:"الأوامر", navVote:"صوّت", navFaq:"الأسئلة الشائعة", voteKick:"صوّت", voteH:"هل يعجبك البوت؟", voteP:"صوّت على top.gg وارفع GraveBOT في القوائم.", voteBtn:"صوّت على top.gg", voteNote:"يمكنك التصويت كل 12 ساعة", voteLive:"مباشر", voteS1:"خادم", voteS2:"صوت", navSup:"الدعم", navAdd:"أضف إلى ديسكورد", pill:"البوت المفضل لأكثر من 112 خادم", hA:"الطريقة", hHl:"الأكثر متعة", hB:"لتنمية خادمك.", sub:"الإشراف والموسيقى والمستويات والاقتصاد — كلها في بوت واحد. إعداد في 30 ثانية واستخدام سهل للغاية.", heroAdd:"أضف إلى ديسكورد — مجانًا", heroWhat:"ماذا يفعل؟", proof:"بتقييم أكثر من 2,300 مالك خادم", onl:"متصل", lvlT:"مستوى جديد!", lvlP:"وصلت زينب إلى المستوى 15", nowT:"يُشغَّل الآن", nowP:"LoFi الليل — 03:42 • 14 مستمعًا", givT:"انتهت المسابقة!", givP:"تم اختيار 3 فائزين، مبروك", moreSrv:"+ أكثر من 12,400 خادم آخر", tick1:"الإشراف", tick2:"الموسيقى", tick3:"المستويات", tick4:"الاقتصاد", tick5:"التسجيل", tick6:"المسابقات", tick7:"24/7", tick8:"أتمتة", fKick:"المميزات", fH:"بوت واحد،", fHl:"متعة لا نهائية.", fSub:"كل ما يحتاجه أي خادم، جاهز من الصندوق.", f1h:"الإشراف", f1p:"حماية من السبام والشتائم والمداهمات. تحذير وكتم وحظر بنقرة واحدة.", f2h:"الموسيقى", f2p:"يوتيوب + سبوتيفاي وقائمة انتظار ووضع 24/7. لا تتوقف الحفلة أبدًا.", f3h:"المستويات وXP", f3p:"ارتقِ بالمستوى كلما تحدثت واكسب المكافآت وتصدّر الترتيب.", f4h:"الاقتصاد", f4p:"مكافآت يومية وعمل ومتجر. أدر أموال خادمك.", f5h:"التسجيل", f5p:"نموذج تسجيل بالأزرار ورتب تلقائية. دع المشرفين يرتاحون.", f6h:"المسابقات", f6p:"ابدأ مسابقة بأمر واحد وسيتم اختيار الفائزين تلقائيًا.", fLink:"عرض الأوامر ←", shKick:"ماذا يفعل؟", shH:"ضع خادمك على الطيار الآلي.", s1t:"الإشراف", s1h:"اصطد المخرّبين قبل أن تستيقظ.", s1p:"الحماية التلقائية تحذف السبام والإعلانات والشتائم فورًا. استمتع فقط.", s1a:"حظر تلقائي للسبام والروابط", s1b:"تحذير ← كتم ← حظر", s1c:"كل إجراء يُسجَّل في قناة السجل", m1:"<b>تم الحذف:</b> 12 رسالة سبام — تم كتم @spammer (10 دقائق)", m2:"<b>تحذير:</b> @new-member — رابط إعلاني (1/3)", m3:"<b>نظيف:</b> تم حظر 96 تهديدًا في آخر 24 ساعة", s2t:"الموسيقى", s2h:"وضع الحفلة: يعمل دائمًا.", s2p:"موسيقى متواصلة من يوتيوب وسبوتيفاي. قائمة انتظار وتكرار ووضع 24/7.", s2a:"صوت عالي الجودة بدون تأخير", s2b:"أدر القائمة مع g!sıra", s2c:"تخطَّ الأغاني بالتصويت", s3t:"الاقتصاد", s3h:"أعد الأعضاء كل يوم.", s3p:"حوّل خادمك إلى اقتصاد حي بالمكافآت اليومية والعمل والمتجر.", s3a:"عملات يومية مع g!günlük", s3b:"اشترِ الرتب والمزايا من المتجر", s3c:"ترتيب أسبوعي", ecoT:"الترتيب الأسبوعي", you:"أنت", cKick:"الأوامر", cHA:"كل شيء يبدأ", cHB:"مع g!", searchPh:"ابحث عن أمر... (مثال: ban)", tAll:"الكل", tMod:"الإشراف", tMus:"الموسيقى", tEco:"الاقتصاد", tGen:"عام", c_ban:"حظر مستخدم", c_ban_p:"يطرده من الخادم مع السبب والمدة.", c_kick:"طرد مستخدم", c_kick_p:"يخرجه من الخادم ويمكنه العودة.", c_mute:"كتم", c_mute_p:"كتم مؤقت ويُسجَّل في السجل.", c_temizle:"مسح الرسائل", c_temizle_p:"يمسح 1–100 رسالة دفعة واحدة.", c_kurulum:"إعداد سريع", c_kurulum_p:"يجهّز كل شيء في 30 ثانية.", c_oynat:"تشغيل أغنية", c_oynat_p:"يشغّل بالاسم أو الرابط.", c_sira:"قائمة الانتظار", c_sira_p:"يعرض الأغاني القادمة.", c_bakiye:"الرصيد", c_bakiye_p:"يعرض محفظتك وترتيبك.", c_gunluk:"مكافأة يومية", c_gunluk_p:"عملات كل 24 ساعة.", c_cekilis:"بدء مسابقة", c_cekilis_p:"أنت تحدد المدة والجائزة.", c_yardim:"مساعدة", c_yardim_p:"يعرض كل الأوامر.", cmdEmpty:"لا توجد أوامر مطابقة لبحثك.", st1:"خادم", st2:"مستخدم", st3:"أمر", st4:"% وقت التشغيل", suKick:"الإعداد", suH:"جاهز في 30 ثانية.", s1h_:"ادعُ", s1p_:"اضغط الزر واختر خادمك ووافق.", s2h_:"اكتب g!kurulum", s2p_:"كل شيء يُضبط تلقائيًا.", s3h_:"استمتع", s3p_:"البوت يعمل وأنت مع مجتمعك.", suBtn:"ابدأ الآن — مجانًا", rvKick:"الخوادم تتحدث", rvH:"آلاف المجتمعات السعيدة.", rv1:"«حذفنا ثلاثة بوتات وانتقلنا إلى GraveBOT. نظام المستويات أدمنه الأعضاء.»", rv1m:"8,200 عضو", rv2:"«كتبت g!kurulum وكان كل شيء جاهزًا في نصف دقيقة. سهولة لا تصدق.»", rv2m:"15,000 عضو", rv3:"«جئنا للموسيقى وبقينا للاقتصاد والمسابقات. أنصح به الجميع.»", rv3m:"5,600 عضو", fqKick:"الأسئلة الشائعة", fqH:"ما يدور في ذهنك.", fqSub:"لم تجد إجابتك؟", fqBtn:"اسأل الدعم", q1:"هل هو مجاني؟", a1:"نعم، كل الميزات الأساسية مجانية على عدد غير محدود من الخوادم.", q2:"كيف أضيفه؟", a2:"اضغط «أضف إلى ديسكورد» واختر خادمك ووافق. ثم اكتب <code>g!kurulum</code> في قناة.", q3:"ما الصلاحيات المطلوبة؟", a3:"يُنصح بصلاحية الإدارة عند الإعداد الأول، ويمكنك تقييدها لاحقًا.", q4:"هل يدعم العربية؟", a4:"نعم، الموقع والدعم متوفران بالكامل بالعربية.", ctaH:"مستعد للانضمام إلى الحفلة؟", ctaP:"أكثر من 112 خادم يستخدم GraveBOT. ابدأ في 30 ثانية.", ctaBtn:"أضف GraveBOT — مجانًا", ctaSm:"لا حاجة لبطاقة ائتمان", ftRights:"© 2026 GraveBOT — غير تابع لـ Discord Inc.", ftInv:"دعوة", ftSup:"الدعم", ftVote:"صوّت", ftPr:"الخصوصية", ftTe:"DMCA", ftKvkk:"KVKK", toast:"تم النسخ", lt1:"تلميح: g!kurulum يجهّز كل شيء في 30 ثانية", lt2:"تلميح: انقر على أمر لنسخه", lt3:"أكثر من 112 خادم يستخدم GraveBOT", metaDesc:"GraveBOT: إشراف وموسيقى واقتصاد وتسجيل. مجاني وإعداد في 30 ثانية." },
ru: { title:"GraveBOT — Самый весёлый способ развивать сервер", topbar:"Спонсор: ", topbarLink:"ayhost.net", navFeat:"Функции", navShow:"Что он умеет?", navCmd:"Команды", navVote:"Голосовать", navFaq:"FAQ", voteKick:"ГОЛОС", voteH:"Нравится бот?", voteP:"Голосуй на top.gg и подними GraveBOT в топах.", voteBtn:"Голосовать на top.gg", voteNote:"Голосовать можно каждые 12 часов", voteLive:"ОНЛАЙН", voteS1:"серверов", voteS2:"голосов", navSup:"Поддержка", navAdd:"Добавить в Discord", pill:"Любимый бот 112+ серверов", hA:"Самый", hHl:"весёлый", hB:"способ развивать сервер.", sub:"Модерация, музыка, уровни и экономика — всё в одном боте. Настройка за 30 секунд, проще простого.", heroAdd:"Добавить в Discord — бесплатно", heroWhat:"Что он умеет?", proof:"по оценкам 2 300+ владельцев серверов", onl:"в сети", lvlT:"Новый уровень!", lvlP:"Зейнеп достигла 15 уровня", nowT:"Сейчас играет", nowP:"Ночной LoFi — 03:42 • 14 слушателей", givT:"Розыгрыш завершён!", givP:"Выбрано 3 победителя, поздравляем", moreSrv:"+ ещё 12 400 серверов", tick1:"Модерация", tick2:"Музыка", tick3:"Уровни", tick4:"Экономика", tick5:"Регистрация", tick6:"Розыгрыши", tick7:"24/7", tick8:"Автоматизация", fKick:"ФУНКЦИИ", fH:"Один бот —", fHl:"бесконечное веселье.", fSub:"Всё, что нужно любому серверу, из коробки.", f1h:"Модерация", f1p:"Защита от спама, мата и рейдов. Варн, мут и бан в один клик.", f2h:"Музыка", f2p:"YouTube + Spotify, очередь и режим 24/7. Вечеринка не заканчивается.", f3h:"Уровни и XP", f3p:"Качайся за общение, получай награды, выходи в топ.", f4h:"Экономика", f4p:"Ежедневные награды, работа, магазин. Управляй деньгами сервера.", f5h:"Регистрация", f5p:"Кнопочная регистрация, автороли. Модераторы отдыхают.", f6h:"Розыгрыши", f6p:"Запусти розыгрыш одной командой, победители выберутся сами.", fLink:"Смотреть команды →", shKick:"ЧТО ОН УМЕЕТ?", shH:"Переведи сервер на автопилот.", s1t:"МОДЕРАЦИЯ", s1h:"Лови троллей, пока ты спишь.", s1p:"Автозащита мгновенно удаляет спам, рекламу и мат. Просто наслаждайся.", s1a:"Автоблок спама и ссылок", s1b:"Варн → мут → бан", s1c:"Всё пишется в лог-канал", m1:"<b>Удалено:</b> 12 спам-сообщений — @spammer в муте (10 мин)", m2:"<b>Предупреждение:</b> @new-member — рекламная ссылка (1/3)", m3:"<b>Чисто:</b> 96 угроз заблокировано за 24 часа", s2t:"МУЗЫКА", s2h:"Вечеринка всегда включена.", s2p:"Музыка нон-стоп с YouTube и Spotify. Очередь, повтор и 24/7.", s2a:"Качественный звук без задержек", s2b:"Управляй очередью через g!sıra", s2c:"Пропуск треков голосованием", s3t:"ЭКОНОМИКА", s3h:"Возвращай участников каждый день.", s3p:"Преврати сервер в живую экономику: награды, работа, магазин.", s3a:"Монеты каждый день через g!günlük", s3b:"Покупай роли и привилегии", s3c:"Еженедельный топ", ecoT:"Топ недели", you:"Ты", cKick:"КОМАНДЫ", cHA:"Всё начинается", cHB:"с g!", searchPh:"Найти команду... (напр. ban)", tAll:"Все", tMod:"Модерация", tMus:"Музыка", tEco:"Экономика", tGen:"Общее", c_ban:"Бан пользователя", c_ban_p:"Удаляет с сервера с причиной и сроком.", c_kick:"Кик пользователя", c_kick_p:"Выгоняет с сервера, можно вернуться.", c_mute:"Мут", c_mute_p:"Временный мут, пишется в лог.", c_temizle:"Очистка сообщений", c_temizle_p:"Удаляет 1–100 сообщений разом.", c_kurulum:"Быстрая настройка", c_kurulum_p:"Настраивает всё за 30 секунд.", c_oynat:"Включить трек", c_oynat_p:"Играет по названию или ссылке.", c_sira:"Очередь", c_sira_p:"Показывает следующие треки.", c_bakiye:"Баланс", c_bakiye_p:"Показывает кошелёк и ранг.", c_gunluk:"Ежедневная награда", c_gunluk_p:"Монеты каждые 24 часа.", c_cekilis:"Запустить розыгрыш", c_cekilis_p:"Ты задаёшь время и приз.", c_yardim:"Помощь", c_yardim_p:"Показывает все команды.", cmdEmpty:"Ничего не найдено.", st1:"серверов", st2:"пользователей", st3:"команд", st4:"% аптайм", suKick:"УСТАНОВКА", suH:"Готово за 30 секунд.", s1h_:"Пригласи", s1p_:"Жми кнопку, выбирай сервер, подтверждай.", s2h_:"Напиши g!kurulum", s2p_:"Всё настроится само.", s3h_:"Развлекайся", s3p_:"Бот работает, ты общаешься.", suBtn:"Начать — бесплатно", rvKick:"СЕРВЕРА ГОВОРЯТ", rvH:"Тысячи довольных сообществ.", rv1:"«Удалили трёх ботов и перешли на GraveBOT. Уровни затянули участников.»", rv1m:"8 200 участников", rv2:"«Написал g!kurulum — и всё готово за полминуты. Нереально просто.»", rv2m:"15 000 участников", rv3:"«Пришли за музыкой, остались ради экономики и розыгрышей. Всем советую.»", rv3m:"5 600 участников", fqKick:"F.A.Q", fqH:"Остались вопросы.", fqSub:"Не нашёл ответ?", fqBtn:"Спросить поддержку", q1:"Это бесплатно?", a1:"Да, все основные функции бесплатны на любом числе серверов.", q2:"Как добавить?", a2:"Нажми «Добавить в Discord», выбери сервер и подтверди. Потом напиши <code>g!kurulum</code> в канал.", q3:"Какие права нужны?", a3:"Для установки советуем права администратора, потом можно ограничить.", q4:"Есть поддержка русского?", a4:"Да, сайт и поддержка полностью на русском.", ctaH:"Готов присоединиться к вечеринке?", ctaP:"112+ серверов уже с GraveBOT. Начни за 30 секунд.", ctaBtn:"Добавить GraveBOT — бесплатно", ctaSm:"Карта не нужна", ftRights:"© 2026 GraveBOT — не связан с Discord Inc.", ftInv:"Пригласить", ftSup:"Поддержка", ftVote:"Голосовать", ftPr:"Конфиденциальность", ftTe:"DMCA", ftKvkk:"KVKK", toast:"скопировано", lt1:"Совет: g!kurulum настроит всё за 30 секунд", lt2:"Совет: нажми на команду, чтобы скопировать", lt3:"112+ серверов используют GraveBOT", metaDesc:"GraveBOT: модерация, музыка, экономика и регистрация. Бесплатно, установка за 30 секунд." },
de: { title:"GraveBOT — Der lustigste Weg, deinen Server zu vergrößern", topbar:"Sponsor: ", topbarLink:"ayhost.net", navFeat:"Funktionen", navShow:"Was kann er?", navCmd:"Befehle", navVote:"Abstimmen", navFaq:"FAQ", voteKick:"VOTE", voteH:"Magst du den Bot?", voteP:"Stimme auf top.gg ab und bring GraveBOT nach oben.", voteBtn:"Auf top.gg abstimmen", voteNote:"Alle 12 Stunden abstimmen", voteLive:"LIVE", voteS1:"Server", voteS2:"Stimmen", navSup:"Support", navAdd:"Zu Discord hinzufügen", pill:"Lieblingsbot von 112+ Servern", hA:"Der", hHl:"lustigste", hB:"Weg, deinen Server zu vergrößern.", sub:"Moderation, Musik, Level und Wirtschaft — alles in einem Bot. Setup in 30 Sekunden, kinderleicht.", heroAdd:"Zu Discord hinzufügen — kostenlos", heroWhat:"Was kann er?", proof:"von 2.300+ Serverbesitzern bewertet", onl:"online", lvlT:"Level aufgestiegen!", lvlP:"Zeynep hat Level 15 erreicht", nowT:"Läuft gerade", nowP:"Nacht-LoFi — 03:42 • 14 Zuhörer", givT:"Gewinnspiel beendet!", givP:"3 Gewinner gezogen, Glückwunsch", moreSrv:"+ 12.400 weitere Server", tick1:"Moderation", tick2:"Musik", tick3:"Level", tick4:"Wirtschaft", tick5:"Registrierung", tick6:"Gewinnspiele", tick7:"24/7", tick8:"Automatisierung", fKick:"FUNKTIONEN", fH:"Ein Bot,", fHl:"endloser Spaß.", fSub:"Alles, was jeder Server braucht — ab Werk.", f1h:"Moderation", f1p:"Spam-, Fluch- und Raid-Schutz. Warn, Mute und Ban mit einem Klick.", f2h:"Musik", f2p:"YouTube + Spotify, Warteschlange und 24/7-Modus. Die Party endet nie.", f3h:"Level & XP", f3p:"Steige durch Chatten auf, verdiene Belohnungen, erklimme die Tabelle.", f4h:"Wirtschaft", f4p:"Tägliche Belohnungen, Arbeit, Shop. Verwalte das Servergeld.", f5h:"Registrierung", f5p:"Button-Registrierung, Autorollen. Atme als Mod auf.", f6h:"Gewinnspiele", f6p:"Starte ein Gewinnspiel mit einem Befehl, Gewinner automatisch.", fLink:"Befehle ansehen →", shKick:"WAS KANN ER?", shH:"Stell deinen Server auf Autopilot.", s1t:"MODERATION", s1h:"Fange Trolle, bevor du aufwachst.", s1p:"Der Autoschutz löscht Spam, Werbung und Flüche sofort. Lehn dich zurück.", s1a:"Automatische Spam- und Linkblockade", s1b:"Warn → Mute → Ban", s1c:"Alles landet im Log-Kanal", m1:"<b>Gelöscht:</b> 12 Spam-Nachrichten — @spammer gemutet (10 Min.)", m2:"<b>Warnung:</b> @new-member — Werbelink (1/3)", m3:"<b>Sauber:</b> 96 Bedrohungen in 24 Stunden blockiert", s2t:"MUSIK", s2h:"Partymodus: immer an.", s2p:"Nonstop-Musik von YouTube und Spotify. Queue, Loop und 24/7 inklusive.", s2a:"Top Soundqualität, null Latenz", s2b:"Queue mit g!sıra verwalten", s2c:"Songs per Voting skippen", s3t:"WIRTSCHAFT", s3h:"Hol Mitglieder jeden Tag zurück.", s3p:"Verwandle deinen Server in eine lebendige Wirtschaft mit Rewards, Arbeit und Shop.", s3a:"Tägliche Coins mit g!günlük", s3b:"Rollen und Perks im Shop kaufen", s3c:"Wöchentliche Bestenliste", ecoT:"Wochen-Bestenliste", you:"Du", cKick:"BEFEHLE", cHA:"Alles beginnt", cHB:"mit g!", searchPh:"Befehl suchen... (z. B. ban)", tAll:"Alle", tMod:"Moderation", tMus:"Musik", tEco:"Wirtschaft", tGen:"Allgemein", c_ban:"Nutzer bannen", c_ban_p:"Entfernt mit Grund und Dauer vom Server.", c_kick:"Nutzer kicken", c_kick_p:"Wirft vom Server, kann zurückkehren.", c_mute:"Muten", c_mute_p:"Zeitlich stumm, wird geloggt.", c_temizle:"Nachrichten löschen", c_temizle_p:"Löscht 1–100 Nachrichten auf einmal.", c_kurulum:"Schnell-Setup", c_kurulum_p:"Richtet alles in 30 Sekunden ein.", c_oynat:"Song abspielen", c_oynat_p:"Spielt per Name oder Link.", c_sira:"Warteschlange", c_sira_p:"Listet kommende Songs.", c_bakiye:"Kontostand", c_bakiye_p:"Zeigt Wallet und Rang.", c_gunluk:"Tagesbelohnung", c_gunluk_p:"Coins alle 24 Stunden.", c_cekilis:"Gewinnspiel starten", c_cekilis_p:"Du legst Dauer und Preis fest.", c_yardim:"Hilfe", c_yardim_p:"Listet alle Befehle.", cmdEmpty:"Keine Treffer für deine Suche.", st1:"Server", st2:"Nutzer", st3:"Befehle", st4:"% Uptime", suKick:"SETUP", suH:"In 30 Sekunden bereit.", s1h_:"Einladen", s1p_:"Button klicken, Server wählen, bestätigen.", s2h_:"g!kurulum schreiben", s2p_:"Alles richtet sich automatisch ein.", s3h_:"Spaß haben", s3p_:"Der Bot arbeitet, du chillst mit der Community.", suBtn:"Jetzt starten — kostenlos", rvKick:"SERVER ERZÄHLEN", rvH:"Tausende glückliche Communities.", rv1:"„Drei Bots gelöscht und zu GraveBOT gewechselt. Das Levelsystem macht süchtig.“", rv1m:"8.200 Mitglieder", rv2:"„g!kurulum getippt, in einer halben Minute war alles fertig. Unfassbar einfach.“", rv2m:"15.000 Mitglieder", rv3:"„Wegen der Musik gekommen, wegen Wirtschaft und Gewinnspielen geblieben. Empfehlung an alle.“", rv3m:"5.600 Mitglieder", fqKick:"F.A.Q", fqH:"Offene Fragen.", fqSub:"Keine Antwort gefunden?", fqBtn:"Support fragen", q1:"Ist es kostenlos?", a1:"Ja, alle Kernfunktionen sind kostenlos auf beliebig vielen Servern.", q2:"Wie füge ich ihn hinzu?", a2:"Klicke „Zu Discord hinzufügen“, wähle deinen Server und bestätige. Dann <code>g!kurulum</code> in einen Kanal schreiben.", q3:"Welche Rechte nötig?", a3:"Fürs Setup Adminrechte empfohlen, später einschränkbar.", q4:"Gibt es deutschen Support?", a4:"Ja, Website und Support sind komplett auf Deutsch.", ctaH:"Bereit für die Party?", ctaP:"112+ Server nutzen GraveBOT schon. Starte in 30 Sekunden.", ctaBtn:"GraveBOT hinzufügen — kostenlos", ctaSm:"Keine Kreditkarte nötig", ftRights:"© 2026 GraveBOT — Nicht mit Discord Inc. verbunden.", ftInv:"Einladen", ftSup:"Support", ftVote:"Abstimmen", ftPr:"Datenschutz", ftTe:"DMCA", ftKvkk:"KVKK", toast:"kopiert", lt1:"Tipp: g!kurulum richtet alles in 30 Sekunden ein", lt2:"Tipp: Befehl anklicken zum Kopieren", lt3:"112+ Server nutzen GraveBOT", metaDesc:"GraveBOT: Moderation, Musik, Wirtschaft und Registrierung. Kostenlos, Setup in 30 Sekunden." }
};

let curLang = 'tr';
function applyLang(l) {
  if (!I18N[l]) l = 'tr';
  curLang = l;
  const d = I18N[l];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (d[k] != null) el.innerHTML = d[k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const k = el.getAttribute('data-i18n-ph');
    if (d[k] != null) el.setAttribute('placeholder', d[k]);
  });
  if (d.metaDesc) document.querySelector('meta[name="description"]').setAttribute('content', d.metaDesc);
  document.documentElement.setAttribute('lang', l);
  document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
  document.getElementById('langBtn').textContent = l.toUpperCase();
  document.querySelectorAll('#langMenu button').forEach(b => b.classList.toggle('active', b.dataset.lang === l));
  try { localStorage.setItem('grave-lang', l); } catch (e) {}
  if (typeof filter === 'function') filter();
}
let savedLang = null;
try { savedLang = localStorage.getItem('grave-lang'); } catch (e) {}
applyLang(savedLang || 'tr');
document.getElementById('langBtn').addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('langMenu').classList.toggle('show');
});
document.querySelectorAll('#langMenu button').forEach(b => b.addEventListener('click', () => {
  const btn = document.getElementById('langBtn');
  btn.classList.remove('pulse');
  void btn.offsetWidth;
  btn.classList.add('pulse');
  if (document.startViewTransition) document.startViewTransition(() => applyLang(b.dataset.lang));
  else applyLang(b.dataset.lang);
  document.getElementById('langMenu').classList.remove('show');
}));
document.addEventListener('click', () => document.getElementById('langMenu').classList.remove('show'));

// 3D kart eğilmesi (sadece fareli cihazlarda)
if (matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.feat,.review').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(700px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });
}

// Yukarı butonu
const toTop = document.getElementById('toTop');
addEventListener('scroll', () => toTop.classList.toggle('show', scrollY > 600), { passive: true });
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

// İmleç spot ışığı (kartlarda)
if (matchMedia('(hover:hover)').matches) {
  document.addEventListener('mousemove', e => {
    const card = e.target.closest('.feat,.review,.step,.show-mock');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
}

// Mıknatıs butonlar + sarılarda konfeti
if (matchMedia('(hover:hover)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.btn-yellow,.btn-dark').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) / r.width;
      const y = (e.clientY - r.top - r.height / 2) / r.height;
      b.style.transform = `translate(${x * 7}px,${y * 5}px)`;
    });
    b.addEventListener('mouseleave', () => b.style.transform = '');
  });
  document.addEventListener('click', e => {
    const y = e.target.closest('.btn-yellow');
    if (y) burst(e.clientX, e.clientY);
  });
}

// Yorum spot ışığı (dönüşümlü vurgu)
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const reviews = document.querySelectorAll('.review');
  let spot = 0;
  setInterval(() => {
    reviews.forEach(r => r.classList.remove('spot'));
    if (reviews.length && !document.hidden) {
      reviews[spot % reviews.length].classList.add('spot');
      spot++;
    }
  }, 3000);
}

// Scroll ilerleme çubuğu + hero paralaks
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reduceMotion) {
  const prog = document.createElement('div');
  prog.className = 'scroll-progress';
  document.body.appendChild(prog);
  const heroR = document.querySelector('.hero-right');
  const heroL = document.querySelector('.hero-left');
  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement;
      prog.style.width = (h.scrollTop / ((h.scrollHeight - h.clientHeight) || 1) * 100) + '%';
      if (h.scrollTop < innerHeight && heroR && heroL) {
        heroR.style.transform = `translateY(${h.scrollTop * .07}px)`;
        heroL.style.transform = `translateY(${h.scrollTop * -.03}px)`;
      }
      ticking = false;
    });
  }, { passive: true });
}

// Buton dalga efekti
document.addEventListener('click', e => {
  const b = e.target.closest('.btn');
  if (!b || reduceMotion) return;
  const r = b.getBoundingClientRect();
  const s = Math.max(r.width, r.height);
  const rip = document.createElement('span');
  rip.className = 'ripple';
  rip.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
  b.appendChild(rip);
  setTimeout(() => rip.remove(), 650);
});

// Konfeti patlaması
const CONF_COLORS = ['#FFC800', '#5865F2', '#57F287', '#EB459E', '#FF8A3D'];
function burst(x, y) {
  if (reduceMotion) return;
  for (let i = 0; i < 14; i++) {
    const c = document.createElement('span');
    c.className = 'confetti';
    const a = Math.random() * Math.PI * 2;
    const d = 40 + Math.random() * 70;
    c.style.cssText = `left:${x}px;top:${y}px;background:${CONF_COLORS[i % 5]};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 30}px`;
    if (i % 3 === 0) c.style.borderRadius = '50%';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 900);
  }
}

// Sağ tık / inceleme caydırıcı (tam koruma sağlamaz, sadece acemiyi oyalar)
window.oncontextmenu = () => false;
document.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); }, true);
document.addEventListener('keydown', e => {
  const k = e.key.toUpperCase();
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'F12') { e.preventDefault(); location.href = '404.html'; return; }
  if ((mod && e.shiftKey && ['I', 'J', 'C', 'K', 'E', 'S'].includes(k)) ||
      (mod && !e.shiftKey && ['U', 'S', 'P'].includes(k))) e.preventDefault();
});

// DevTools açılırsa 404'e at (F12 JS ile engellenemez, bu en sert caydırıcıdır)
setInterval(() => {
  const t0 = performance.now();
  debugger;
  if (performance.now() - t0 > 120) location.href = '404.html';
}, 1500);
