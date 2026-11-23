import { authorized, deny } from '../lib/auth.js';
import { VAPID_PUBLIC, addSub, notify } from '../lib/push.js';

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  try {
    if (req.method === 'GET') return res.status(200).json({ publicKey: VAPID_PUBLIC });
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (body.subscription?.endpoint) {
      const n = await addSub(body.subscription);
      const r = await notify([{ title: 'Powiadomienia włączone', body: 'Dam znać o każdym kupnie i sprzedaży, akcji strażnika i ruchu portfela o 3% lub więcej.', tag: 'hello' }]);
      return res.status(200).json({ ok: true, devices: n, sent: r.sent });
    }
    if (body.test) return res.status(200).json(await notify([{ title: 'Test powiadomienia', body: 'Działa. Tak będą wyglądać wiadomości od bota.', tag: 'test' }]));
    res.status(400).json({ error: 'brak subskrypcji' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
