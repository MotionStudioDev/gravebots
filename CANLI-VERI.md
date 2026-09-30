# Canlı Veri — Siteyi Gerçek Sayılarla Besleme

Site şu an **örnek (hardcode) değerlerle** çalışıyor. Bu doküman, sayfadaki her sayıyı
**discord.js bot'undan gelen gerçek verilerle** otomatik güncellemek için gereken üç adımı anlatır:

1. Bot API'sini aç (`bot-stats-api.js`)
2. Bot olaylarını API'ye yaz (5 satır)
3. Sitede API adresini belirt (`script.js` → `LIVE_API`)

API'ye ulaşılamazsa site **çökmez**: örnek değerler kalır ve istatistiklerin altında
"GraveBOT API'ye ulaşılamadı — örnek veriler gösteriliyor" yazısı görünür.

---

## 1. Hangi veri nereden geliyor

| Sayı | API anahtarı | Bot kaynağı |
|---|---|---|
| Aktif Sunucu | `servers` | `client.guilds.cache.size` |
| Kullanıcı Erişimi | `users` | `guild.memberCount` toplamı |
| İşlenen İstek | `requests` | `messageCreate` / komut sayaçları |
| Uptime % | `uptimePercent` | otomatik (`addDowntime()` ile) veya UptimeRobot webhook |
| Gecikme (ms) | `pingMs` | `client.ws.ping` |
| Engellenen Tehdit | `threatsBlocked` | moderasyon/anti-raid event'lerinde `addThreat()` |
| Konsol log akışı | `logs?scope=console` | `log(seviye, etiket, mesaj)` |
| Koruma paneli olayları | `logs?scope=shield` | `addThreat(metin)` |
| Müzik demosu | — | statik kalır (gerçek "çalan parça" verisi istenirse `/api/now-playing` eklenir) |

---

## 2. Bot tarafı

`bot-stats-api.js` dosyasını bot projenin kök dizinine koy, **hiçbir paket kurmana gerek yok**
(Node 18+). Ardından bot kodduna ekle:

```js
const { createStatsApi } = require('./bot-stats-api');

const stats = createStatsApi({
  port: 8081,                                  // dinlenecek port
  host: '127.0.0.1',                           // ters proxy'nin arkasında -> yerel
  corsOrigin: 'https://site-alan-adin.com',    // sitenin alan adı (CORS)
  persistFile: './stats-data.json'             // sayaçlar restart'ta sıfırlanmasın
});

client.once('ready', () => {
  stats.setGuilds(client.guilds.cache.size);
  stats.setUsers(client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0));
  stats.setRequests(40000); // elindeki toplamı bir kez tohumla, sonrası kendiliğinden artar

  setInterval(() => {
    stats.setPing(Math.round(client.ws.ping));
    stats.setGuilds(client.guilds.cache.size);
    stats.setUsers(client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0));
  }, 30_000);
});

// Her komut işlendiğinde
client.on('messageCreate', (msg) => {
  if (!msg.author.bot && msg.content.startsWith('g!')) stats.addRequest();
  stats.log('sys', 'SİSTEM', `${msg.author.tag} → g!komut çalıştı.`);
});

// Anti-raid / koruma engelleri
client.on('guildMemberAdd', (member) => {
  if (antiRaidEngellendi) stats.addThreat('taze hesaptan toplu giriş');
});

// Düzeyler: sys | sec | aud | ok  (sitede farklı renkte görünür)
stats.log('sec', 'KORUMA', 'Anti-raid kalkanı aktif — 3 şüpheli giriş engellendi.');
stats.log('ok',  'DURUM',  'Tüm shard\'lar senkronize.');

// Eski toplamlarını geri taşımak istersen (tek seferlik tohumlama)
stats.setRequests(40000);
stats.setThreats(148290);

// Patlama/durum süresi -> uptime yüzdesi otomatik hesaplanır
stats.addDowntime(95_000); // 95 sn kesinti
```

Yalnızca test etmek istersen:

```bash
node bot-stats-api.js
# → http://127.0.0.1:8081/api/stats
```

### Uçlar

```
GET /api/stats
{
  "ok": true, "updatedAt": 1790000000000,
  "servers": 74, "users": 176420, "requests": 41358,
  "threatsBlocked": 148321, "pingMs": 12, "uptimePercent": 99.99
}

GET /api/logs?scope=console&limit=6
{ "ok": true, "events": [ { "time": "12:53:01", "level": "sec", "tag": "KORUMA", "text": "…" } ] }

GET /api/logs?scope=shield&limit=3
{ "ok": true, "events": [ { "time": "12:53:01", "label": "ENGELLENDİ", "text": "…" } ] }

GET /api/health
{ "ok": true, "uptimeSec": 91234, "pingMs": 12, "guilds": 74, "requests": 41358 }
```

---

## 3. Site tarafı

`script.js` en altındaki **§13 CANLI VERİ** bloğunda tek satır ayar var:

```js
// Aynı sunucuda isen boş bırak (''):
const LIVE_API = [''];

// Site ayrı bir host'taysa API adresini yaz:
const LIVE_API = ['https://api.alan-adin.com'];
```

Davranış:

- Sayaçlar `data-stat` üzerinden güncellenir (`servers`, `users`, `requests`, `pingMs`,
  `uptimePercent`, `threatsBlocked`) — sayaç animasyonu çalışıyorsa hedefe gerçek değerle varır.
- **30 sn'de bir** sayaçlar, **60 sn'de bir** log akışları tazelenir.
- API `ok: false` dönerse veya ağ hatası olursa değerler **değişmez**, durum rozeti
  "örnek veriler" (amber) olur.
- API verisi gelince rozet yeşil olur: `Canlı veri · GraveBOT API · son güncelleme 12:34`
- API'den gelen metinler `esc()` ile kaçışlanır (XSS yok), log düzeyleri beyaz liste.

İzlenecek alanlar: `index.html` içinde `data-stat="…"` geçen her etiket.

---

## 4. Yayına alma

### A) Site ve bot aynı sunucuda (en kolay)

Sadece `LIVE_API = ['']` bırak; `index.html` siteyle aynı origin'de servis edildiği için
`/api/stats` doğrudan batar. Nginx/Caddy ile:

```nginx
# /api/* yerel API'ye gitsin
location /api/ {
    proxy_pass http://127.0.0.1:8081;
    proxy_set_header Host $host;
}
```

### B) Site ayrı yerde (GitHub Pages vb.)

- API'nin **CORS** başlığı site alan adını içermeli: `corsOrigin: 'https://site.github.io'`
- API'nin **HTTPS** ile açık olması gerekir (API'yi ters proxy/Caddy arkasına al, portu
  internete doğrudan açma).
- `LIVE_API = ['https://api.alan-adin.com']`

### Güvenlik

- Portu **127.0.0.1**'de dinlet, yalnızca ters proxy üzerinden dışarı aç.
- Yalnızca `GET` uçları var; yazma fonksiyonları botun kendi process'inde çalışır.
- Token/anahtar asla API'ye konmaz.
- İstersen `corsOrigin`'i tek alan adıyla sınırla (`'*'` yerine).

---

## 5. Sorun giderme

| Belirti | Nedeni | Çözüm |
|---|---|---|
| Rozet amber: "API'ye ulaşılamadı" | API çalışmıyor / adres yanlış / CORS | `node bot-stats-api.js` ile test et, `curl` ile `/api/stats`, tarayıcı konsoluna bak |
| Sayılar hiç değişmiyor | `LIVE_API` boş + site dosyadan (`file://`) açılıyor | `LIVE_API`'ye tam adresi yaz veya siteyi HTTP ile sun |
| 0 görünüyor | API `0` döndürüyor (bot olayları bağlanmadı) | `setGuilds/setUsers/setRequests` çağrılarını `ready` içine ekle |
| Rozet hep amber ama curl çalışıyor | CORS | `corsOrigin` alan adını yaz, Nginx'te `/api/` konumunu kontrol et |
| Sayaçlar restart'ta sıfırlanıyor | `persistFile` verilmedi | `persistFile: './stats-data.json'` ekle |

---

## 6. Test listesi

1. `node bot-stats-api.js` → `curl http://127.0.0.1:8081/api/stats` JSON döner.
2. Siteyi aç → istatistiklerin altında **yeşil nokta + "Canlı veri"** yazısı görünür.
3. `stats.addThreat('test tehdidi')` → 30 sn içinde "Engellenen Tehdit" artar,
   koruma paneli sayacı güncellenir.
4. `stats.log('sec','KORUMA','test')` → 60 sn içinde konsol akışında görünür
   (örnek akış durur).
5. API'yi durdur → rozet amber'a döner, sayılar **eski değerinde kalır** (0 olmaz).
