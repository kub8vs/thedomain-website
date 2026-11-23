import { put } from '@vercel/blob';

// Test: czy nadpisany blob jest od razu widoczny przy odczycie z unikalnym parametrem ?v=
export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const out = [];
  for (const v of ['A', 'B']) {
    const b = await put('test/cache.json', JSON.stringify({ v, at: Date.now() }), {
      access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60,
    });
    const plain = await (await fetch(b.url, { cache: 'no-store' })).json();
    const busted = await (await fetch(`${b.url}?v=${Date.now()}`, { cache: 'no-store' })).json();
    out.push({ wrote: v, plain: plain.v, busted: busted.v, url: b.url });
  }
  res.json(out);
}
