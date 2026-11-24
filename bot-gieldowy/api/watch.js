import { authorized, deny } from '../lib/auth.js';
import { runWatch } from '../lib/watch.js';

export const config = { maxDuration: 180 };

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  try {
    res.status(200).json(await runWatch({ force: req.query?.force === '1' }));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
