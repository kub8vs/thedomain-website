import { authorized, deny } from '../lib/auth.js';
import { runTick, newState } from '../lib/engine.js';
import { saveState } from '../lib/store.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  // reset eksperymentu: tylko z sekretem crona (nie z telefonu)
  if (req.query?.reset === '1' && req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`) {
    await saveState(newState());
    return res.status(200).json({ reset: true });
  }
  const manual = req.method === 'POST';
  try {
    const out = await runTick({ source: manual ? 'ręcznie' : 'automat', force: manual });
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
