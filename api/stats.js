// Vercel serverless: top.gg'den canlı sunucu sayısını çeker.
// Vercel → Settings → Environment Variables → TOPGG_TOKEN eklenmeli.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=600');
  try {
    const r = await fetch('https://top.gg/api/bots/1066016782827130960/stats', {
      headers: { Authorization: process.env.TOPGG_TOKEN || '' }
    });
    if (!r.ok) throw new Error('topgg ' + r.status);
    const j = await r.json();
    res.status(200).json({ servers: j.server_count ?? null });
  } catch (e) {
    res.status(200).json({ servers: null });
  }
};
