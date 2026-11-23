import { authorized, deny } from '../lib/auth.js';
import { runTick } from '../lib/engine.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  const manual = req.method === 'POST';
  try {
    const out = await runTick({ source: manual ? 'ręcznie' : 'automat', force: manual });
    res.status(200).json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
