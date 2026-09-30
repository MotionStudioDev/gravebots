'use strict';

/**
 * GraveBOT — Canlı İstatistik API'si
 * ------------------------------------------------------------------
 * Sitedeki sayıları (sunucu, kullanıcı, ping, engellenen tehdit, loglar)
 * DISCORD BOT'UNDAN gerçek verilerle besleyen, HIÇBIR pakete bağlı olmayan
 * küçük bir HTTP API'sidir. Node 18+ yeterlidir (fetch kullanılmaz,
 * dahili `http` modülü kullanılır).
 *
 * HIZLI BAŞLANGIÇ (bot içinden):
 *
 *   const { createStatsApi } = require('./bot-stats-api');
 *
 *   const stats = createStatsApi({
 *     port: 8081,                                  // dinlenecek port
 *     host: '127.0.0.1',                           // ters proxy arkasında yerel
 *     corsOrigin: 'https://site-alan-adin.com',    // site alan adın
 *     persistFile: './stats-data.json'             // sayaçlar yeniden başlasın da kaybolmasın
 *   });
 *
 *   client.once('ready', () => {
 *     stats.setGuilds(client.guilds.cache.size);
 *     stats.setUsers(client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0));
 *     setInterval(() => {
 *       stats.setPing(Math.round(client.ws.ping));
 *       stats.setGuilds(client.guilds.cache.size);
 *     }, 30000);
 *   });
 *
 *   client.on('messageCreate', () => stats.addRequest());
 *   client.on('guildMemberAdd', m => {
 *     if (antiRaidEngellendi) stats.addThreat('taze hesaptan toplu giriş');
 *   });
 *   stats.log('ok', 'DURUM', 'Shard senkronize, gecikme 12 ms.');
 *
 * UÇLAR (GET):
 *   /api/stats  -> { ok, updatedAt, servers, users, requests,
 *                    threatsBlocked, pingMs, uptimePercent }
 *   /api/logs?scope=console&limit=6 -> { ok, events: [{ time, level, tag, text }] }
 *   /api/logs?scope=shield&limit=3  -> { ok, events: [{ time, label, text }] }
 *   /api/health -> { ok, uptimeSec, pingMs, guilds, requests, threatsBlocked }
 *
 * KURULUM NOTLARI: bkz. CANLI-VERI.md
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const DEFAULTS = {
  port: 8081,
  host: '127.0.0.1',
  corsOrigin: '*',
  persistFile: null,
  saveEveryMs: 15000,
  logLimit: 50
};

const LEVELS = ['sys', 'sec', 'aud', 'ok'];

function createStore(opts) {
  const now = Date.now();
  let data = {
    servers: 0,
    users: 0,
    requests: 0,
    threatsBlocked: 0,
    pingMs: null,
    downtimeMs: 0,
    downtimeSince: now,
    uptimePercent: 100,
    console: [],
    shield: [],
    updatedAt: now
  };

  // Kalıcı kayıt: sayaçlar bot yeniden başlarken sıfırlanmasın
  if (opts.persistFile) {
    try {
      if (fs.existsSync(opts.persistFile)) {
        const raw = JSON.parse(fs.readFileSync(opts.persistFile, 'utf8'));
        data = Object.assign(data, raw);
        data.console = Array.isArray(raw.console) ? raw.console : [];
        data.shield = Array.isArray(raw.shield) ? raw.shield : [];
        data.downtimeSince = Date.now();
      }
    } catch (err) {
      console.warn('[stats-api] kayıt dosyası okunamadı:', err.message);
    }
  }

  const save = () => {
    if (!opts.persistFile) return;
    try {
      const dir = path.dirname(opts.persistFile);
      if (dir && dir !== '.') fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(opts.persistFile, JSON.stringify(data, null, 2));
    } catch (err) {
      console.warn('[stats-api] kayıt yapılamadı:', err.message);
    }
  };

  const touch = () => { data.updatedAt = Date.now(); };

  const stamp = () => {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const push = (list, item) => {
    list.push(item);
    const limit = opts.logLimit;
    while (list.length > limit) list.shift();
  };

  const calcUptime = () => {
    const total = Math.max(Date.now() - data.downtimeSince, 1);
    const percent = (1 - data.downtimeMs / total) * 100;
    data.uptimePercent = Math.min(100, Math.max(0, Number(percent.toFixed(2))));
    return data.uptimePercent;
  };

  return {
    // --- yazma uçları (bot bunları çağırır) ---
    setGuilds(n) { data.servers = Math.max(0, Math.round(Number(n) || 0)); touch(); },
    setUsers(n) { data.users = Math.max(0, Math.round(Number(n) || 0)); touch(); },
    /** Toplam işlenen istek sayısını tohumlar (ilk kurulum/geri taşıma). */
    setRequests(n) { data.requests = Math.max(0, Math.round(Number(n) || 0)); touch(); },
    /** Engellenen tehlite toplamını tohumlar (eski sayıyı geri taşımak için). */
    setThreats(n) { data.threatsBlocked = Math.max(0, Math.round(Number(n) || 0)); touch(); },
    setPing(ms) {
      const v = Math.round(Number(ms));
      if (Number.isFinite(v) && v >= 0) { data.pingMs = v; touch(); }
    },
    addRequest(n = 1) { data.requests += Math.max(1, Math.round(n)); touch(); },

    /** Engellenen tehlite sayacı artırır + koruma paneline olay yazar. */
    addThreat(text, blocked = true) {
      if (blocked) data.threatsBlocked += 1;
      push(data.shield, {
        time: stamp(),
        label: blocked ? 'ENGELLENDİ' : 'TEMİZ',
        text: String(text).slice(0, 120)
      });
      touch();
    },

    /** Konsol akışına olay yazar. level: sys | sec | aud | ok */
    log(level, tag, text) {
      push(data.console, {
        time: stamp(),
        level: LEVELS.includes(level) ? level : 'sys',
        tag: String(tag).slice(0, 24).toUpperCase(),
        text: String(text).slice(0, 160)
      });
      touch();
    },

    /** Bakım/patlama süresini işler; uptime yüzdesi otomatik hesaplanır. */
    addDowntime(ms) { data.downtimeMs += Math.max(0, Number(ms) || 0); touch(); },

    // --- okuma uçları ---
    stats() {
      return {
        ok: true,
        updatedAt: data.updatedAt,
        servers: data.servers,
        users: data.users,
        requests: data.requests,
        threatsBlocked: data.threatsBlocked,
        pingMs: data.pingMs,
        uptimePercent: calcUptime()
      };
    },

    logs(scope, limit) {
      const list = scope === 'shield' ? data.shield : data.console;
      const n = Math.min(Math.max(1, Number(limit) || 6), opts.logLimit);
      return { ok: true, scope, events: list.slice(-n) };
    },

    health() {
      return {
        ok: true,
        uptimeSec: Math.round(process.uptime()),
        pingMs: data.pingMs,
        guilds: data.servers,
        requests: data.requests,
        threatsBlocked: data.threatsBlocked,
        uptimePercent: calcUptime()
      };
    },

    save
  };
}

function createStatsApi(options = {}) {
  const opts = Object.assign({}, DEFAULTS, options);
  const store = createStore(opts);

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // CORS
    res.setHeader('Access-Control-Allow-Origin', opts.corsOrigin);
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end('{"ok":false}'); return; }

    const send = (code, body) => {
      res.writeHead(code).end(JSON.stringify(body));
    };

    try {
      if (url.pathname === '/api/stats') return send(200, store.stats());

      if (url.pathname === '/api/logs') {
        return send(200, store.logs(
          url.searchParams.get('scope') || 'console',
          url.searchParams.get('limit')
        ));
      }

      if (url.pathname === '/api/health') return send(200, store.health());

      return send(404, { ok: false, error: 'not found' });
    } catch (err) {
      console.error('[stats-api] hata:', err);
      return send(500, { ok: false, error: 'internal error' });
    }
  });

  server.listen(opts.port, opts.host, () => {
    console.log(
      `[stats-api] http://${opts.host}:${opts.port}/api/stats  (CORS: ${opts.corsOrigin})`
    );
  });

  server.on('error', err => {
    console.error('[stats-api] sunucu hatası:', err.message);
  });

  if (opts.persistFile) {
    setInterval(() => store.save(), opts.saveEveryMs).unref();
    process.on('exit', () => store.save());
    process.on('SIGINT', () => { store.save(); process.exit(0); });
    process.on('SIGTERM', () => { store.save(); process.exit(0); });
  }

  return Object.assign(store, { server, close: () => server.close() });
}

module.exports = { createStatsApi, createStore };

// Bağımsız çalışan örnek:  node bot-stats-api.js
if (require.main === module) {
  const api = createStatsApi({
    port: Number(process.env.PORT) || 8081,
    host: process.env.HOST || '127.0.0.1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    persistFile: process.env.STATS_FILE || './stats-data.json'
  });

  // Demo veriler (gerçek botta bunlar olaylardan gelir)
  api.setGuilds(74);
  api.setUsers(176420);
  api.setRequests(40000);
  api.setThreats(148290);
  api.setPing(12);
  api.addThreat('taze hesaptan toplu giriş');
  api.log('ok', 'DURUM', 'GraveBOT çevrimiçi — 74 sunucu yüklendi.');

  console.log('[stats-api] demo modda çalışıyor; durdurmak için Ctrl+C');
}
