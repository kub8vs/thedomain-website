import { put, list, del } from '@vercel/blob';

// Stan trzymamy w Vercel Blob. Każdy zapis to nowy plik (stare = kopia zapasowa),
// więc nie ma problemu z cache CDN.
const PREFIX = 'stan/';
const KEEP = 30;

export async function loadState() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  if (!blobs.length) return null;
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const r = await fetch(blobs[0].url, { cache: 'no-store' });
  if (!r.ok) throw new Error('Nie mogę odczytać stanu: HTTP ' + r.status);
  return await r.json();
}

export async function saveState(state) {
  state.savedAt = new Date().toISOString();
  await put(`${PREFIX}${Date.now()}.json`, JSON.stringify(state), {
    access: 'public', addRandomSuffix: true, contentType: 'application/json', cacheControlMaxAge: 31536000,
  });
  try {
    const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
    if (blobs.length > KEEP) {
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      await del(blobs.slice(KEEP).map(b => b.url));
    }
  } catch {}
}
