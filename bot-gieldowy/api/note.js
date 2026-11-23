import { authorized, deny } from '../lib/auth.js';
import { loadState, saveState } from '../lib/store.js';

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  if (req.method !== 'POST') return res.status(405).end();
  const text = String(req.body?.text || '').trim().slice(0, 1000);
  if (!text) return res.status(400).json({ error: 'Pusta notatka' });
  const state = await loadState();
  if (!state) return res.status(409).json({ error: 'Eksperyment jeszcze nie wystartował' });
  state.notes.unshift({ id: crypto.randomUUID(), at: new Date().toISOString(), text });
  state.notes = state.notes.slice(0, 50);
  await saveState(state);
  res.status(200).json({ ok: true, notes: state.notes });
}
