import { put, list } from '@vercel/blob';

// Stan bota. Dwa tryby:
// 1) Redis (Upstash) – jeśli w projekcie są zmienne KV_REST_API_URL/TOKEN albo UPSTASH_REDIS_REST_URL/TOKEN.
//    Duży darmowy limit operacji, najlepszy przy decyzjach co 5 minut.
// 2) Vercel Blob – jeden plik nadpisywany przy każdym zapisie (1 operacja na zapis).
const KEY = 'dbot:state';
const PATH = 'stan/state.json';

const R_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const R_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(R_URL && R_TOK);

async function redis(cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOK}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('Redis: ' + j.error);
  return j.result;
}

function blobBase() {
  const m = /^vercel_blob_rw_([^_]+)_/.exec(process.env.BLOB_READ_WRITE_TOKEN || '');
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com/` : null;
}

async function loadBlob({ fresh }) {
  const base = blobBase();
  if (base) {
    const r = await fetch(`${base}${PATH}${fresh ? `?v=${Date.now()}` : ''}`, { cache: 'no-store' });
    if (r.ok) return await r.json();
    if (r.status !== 404) throw new Error('Nie mogę odczytać stanu: HTTP ' + r.status);
  }
  // stary format (wiele plików) – jednorazowa migracja
  const { blobs } = await list({ prefix: 'stan/', limit: 1000 });
  const old = blobs.filter(b => b.pathname !== PATH).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))[0];
  if (!old) return null;
  return await (await fetch(old.url, { cache: 'no-store' })).json();
}

export async function loadState({ fresh = true } = {}) {
  if (useRedis) {
    const v = await redis(['GET', KEY]);
    if (v) return JSON.parse(v);
    const migrated = await loadBlob({ fresh: true }).catch(() => null); // przeniesienie z Bloba
    return migrated;
  }
  return loadBlob({ fresh });
}

export async function saveState(state) {
  state.savedAt = new Date().toISOString();
  const body = JSON.stringify(state);
  if (useRedis) return void await redis(['SET', KEY, body]);
  await put(PATH, body, {
    access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60,
  });
}

export const storageKind = useRedis ? 'redis' : 'blob';
