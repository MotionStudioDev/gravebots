// Vercel serverless: top.gg'den canli sunucu sayisini ceker.
// Vercel -> Settings -> Environment Variables -> TOPGG_TOKEN eklenmeli.
// Guvenlik: yalnizca GET, kisa timeout, token sizintisi yok, hata detayi sizdirmaz.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ servers: null, error: 'method_not_allowed' });
    return;
  }

  const token = process.env.TOPGG_TOKEN || '';
  if (!token) {
    res.status(200).json({ servers: null });
    return;
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4500);
  try {
    const r = await fetch('https://top.gg/api/bots/1066016782827130960/stats', {
      headers: { Authorization: token },
      signal: ctrl.signal
    });
    if (!r.ok) throw new Error('upstream_' + r.status);
    const j = await r.json();
    const n = Number(j && j.server_count);
    res.status(200).json({ servers: Number.isFinite(n) && n >= 0 ? Math.floor(n) : null });
  } catch (e) {
    // ic hata mesajini istemciye sizdirma
    res.status(200).json({ servers: null });
  } finally {
    clearTimeout(t);
  }
};
