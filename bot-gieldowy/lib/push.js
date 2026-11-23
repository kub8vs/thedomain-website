// Powiadomienia push (Web Push, działa też na iPhonie z aplikacją dodaną do ekranu początkowego).
// Subskrypcje trzymamy w osobnym pliku, żeby nie ścigać się z zapisem stanu bota.
import webpush from 'web-push';
import { put } from '@vercel/blob';

const PATH = 'stan/push.json';
export const VAPID_PUBLIC = process.env.VAPID_PUBLIC || '';

function base() {
  const m = /^vercel_blob_rw_([^_]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/` : null;
}

export async function loadSubs() {
  const b = base(); if (!b) return [];
  const r = await fetch(`${b}${PATH}?v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return [];
  return (await r.json()).subs || [];
}
export async function saveSubs(subs) {
  await put(PATH, JSON.stringify({ subs }), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
}
export async function addSub(sub) {
  const subs = (await loadSubs()).filter(s => s.endpoint !== sub.endpoint);
  subs.push({ ...sub, addedAt: new Date().toISOString() });
  await saveSubs(subs.slice(-10));
  return subs.length;
}

// messages: [{ title, body, tag }]
export async function notify(messages) {
  messages = (messages || []).filter(Boolean);
  if (!messages.length || !VAPID_PUBLIC || !process.env.VAPID_PRIVATE) return { sent: 0 };
  let subs;
  try { subs = await loadSubs(); } catch { return { sent: 0 }; }
  if (!subs.length) return { sent: 0 };
  webpush.setVapidDetails('https://kub-bot-gieldowy.vercel.app', VAPID_PUBLIC, process.env.VAPID_PRIVATE);
  const dead = new Set(); let sent = 0;
  await Promise.all(subs.flatMap(s => messages.map(m =>
    webpush.sendNotification(s, JSON.stringify(m), { TTL: 3600, urgency: 'high', timeout: 8000 })
      .then(() => sent++)
      .catch(e => { if (e.statusCode === 404 || e.statusCode === 410) dead.add(s.endpoint); else console.error('push', e.statusCode, e.body); }))));
  if (dead.size) await saveSubs(subs.filter(s => !dead.has(s.endpoint))).catch(() => {});
  return { sent };
}

const zl = x => x.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Komunikat o transakcjach jednej decyzji
export function tradeMessage(dec, trades, total) {
  if (!trades.length) return null;
  const who = dec.source === 'strażnik' ? 'Strażnik' : 'AI';
  const head = trades.map(t => `${t.side === 'KUPNO' ? 'kupił' : 'sprzedał'} ${t.symbol} za ${zl(t.amountPLN)} zł${t.plPLN != null ? ` (${t.plPLN >= 0 ? '+' : '−'}${zl(Math.abs(t.plPLN))} zł)` : ''}`).join(', ');
  return { title: `${who} ${head}`.replace(/^AI kupił/, 'AI kupiło').replace(/^AI sprzedał/, 'AI sprzedało'), body: `${dec.summary || ''} Portfel: ${zl(total)} zł.`.trim().slice(0, 230), tag: 'trade-' + dec.id };
}

// Komunikat o dużym ruchu portfela (co najmniej 3% od ostatniego powiadomienia)
export function moveMessage(state, total, goal) {
  const last = state.lastNotifiedTotal ?? state.startCapitalPLN;
  const ch = (total / last - 1) * 100;
  if (Math.abs(ch) < 3) return null;
  state.lastNotifiedTotal = total;
  const fromStart = (total / state.startCapitalPLN - 1) * 100;
  return { title: `Portfel ${ch > 0 ? 'w górę' : 'w dół'} o ${zl(Math.abs(ch))}%: ${zl(total)} zł`, body: `Od startu ${fromStart >= 0 ? '+' : '−'}${zl(Math.abs(fromStart))}%. Do celu ${goal} zł brakuje ${zl(Math.max(0, goal - total))} zł.`, tag: 'move' };
}
