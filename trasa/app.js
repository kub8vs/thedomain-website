/* Trasa: piesza nawigacja + fitness. Wersja 1 (Warszawa). */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const WAW = [21.0122, 52.2297];
const FALLBACK = { lng: 21.0032, lat: 52.2287, name: 'Dworzec Centralny' };
const OSRM = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/';
const PHOTON = 'https://photon.komoot.io/api/';

// ---------- storage ----------
const store = {
  get(k, d) { try { const v = localStorage.getItem('trasa:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('trasa:' + k, JSON.stringify(v)); } catch {} }
};
const prof = Object.assign({ kg: 75, step: 72, goal: 8000 }, store.get('profile', {}));
const today = () => new Date().toISOString().slice(0, 10);
const kcalFor = m => 0.7 * prof.kg * m / 1000;          // ok. 3,5 MET przy 5 km/h
const stepsFor = m => m / (prof.step / 100);
const fmt = n => Math.round(n).toLocaleString('pl-PL');
const fmtDist = m => m >= 1000 ? [(m / 1000).toFixed(1).replace('.', ','), 'km'] : [String(Math.round(m / 10) * 10), 'm'];

// ---------- UI helpers ----------
function view(v) {
  document.querySelectorAll('.sheet section').forEach(s => s.hidden = s.dataset.v !== v);
  $('#top').hidden = v === 'nav';
  $('#instr').hidden = v !== 'nav';
  if (v === 'home') renderToday();
  if (v === 'history') renderHistory();
  if (v === 'profile') { $('#pW').value = prof.kg; $('#pS').value = prof.step; $('#pG').value = prof.goal; }
}
document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => view(b.dataset.go)));
let toastT;
function toast(t, ms = 2600) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, ms); }

function renderToday() {
  const h = store.get('history', []).filter(w => w.day === today());
  const steps = h.reduce((a, w) => a + w.steps, 0), kcal = h.reduce((a, w) => a + w.kcal, 0);
  $('#tSteps').textContent = fmt(steps); $('#tGoal').textContent = fmt(prof.goal); $('#tKcal').textContent = fmt(kcal);
  $('#tBar').style.width = Math.min(100, steps / prof.goal * 100) + '%';
}
function renderHistory() {
  const h = store.get('history', []);
  $('#hTotal').textContent = (h.reduce((a, w) => a + w.m, 0) / 1000).toFixed(1).replace('.', ',') + ' km łącznie';
  $('#hList').innerHTML = h.length ? h.slice().reverse().map(w => `<div class="hitem"><div><b>${esc(w.to)}</b><span>${new Date(w.t).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${fmt(w.min)} min</span></div><div class="r">${fmt(w.steps)} kroków<br><span>${fmt(w.kcal)} kcal</span></div></div>`).join('')
    : '<p class="hint">Jeszcze nie masz spacerów. Wyznacz trasę i kliknij Start.</p>';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('#pSave').addEventListener('click', () => {
  prof.kg = Math.max(30, Math.min(200, +$('#pW').value || 75));
  prof.step = Math.max(40, Math.min(120, +$('#pS').value || 72));
  prof.goal = Math.max(1000, Math.min(50000, +$('#pG').value || 8000));
  store.set('profile', prof); toast('Zapisano'); view('home');
});

// ---------- map ----------
const map = new maplibregl.Map({
  container: 'map', style: 'https://tiles.openfreemap.org/styles/positron',
  center: WAW, zoom: 15.5, pitch: 55, bearing: -18, maxPitch: 75, attributionControl: { compact: true }
});
map.on('load', () => {
  const firstLabel = map.getStyle().layers.find(l => l.type === 'symbol')?.id;
  map.addLayer({
    id: 'b3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 14,
    paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 10], 0, '#eef0f3', 80, '#dfe4ec', 200, '#cfd7e3'],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 10],
      'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.92
    }
  }, firstLabel);
  map.addSource('route', { type: 'geojson', data: fc([]), lineMetrics: true });
  map.addSource('done', { type: 'geojson', data: fc([]) });
  map.addLayer({ id: 'alt', type: 'line', source: 'route', filter: ['!=', ['get', 'sel'], 1], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#9aa3ae', 'line-width': 6, 'line-opacity': .8 } }, firstLabel);
  map.addLayer({ id: 'r-case', type: 'line', source: 'route', filter: ['==', ['get', 'sel'], 1], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 12 } }, firstLabel);
  map.addLayer({ id: 'r-main', type: 'line', source: 'route', filter: ['==', ['get', 'sel'], 1], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#12a866', 'line-width': 7 } }, firstLabel);
  map.addLayer({ id: 'r-done', type: 'line', source: 'done', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#8f98a3', 'line-width': 7 } }, firstLabel);
  map.on('click', 'alt', e => { const i = e.features[0]?.properties?.i; if (i != null) selectRoute(+i); });
  locate(false);
});
const fc = f => ({ type: 'FeatureCollection', features: f });
const line = (coords, props = {}) => ({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: coords } });

// user puck
const puckEl = document.createElement('div'); puckEl.className = 'puck';
puckEl.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2.5 4.2 21 12 17l7.8 4L12 2.5Z" fill="#12a866" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>';
const puck = new maplibregl.Marker({ element: puckEl, rotationAlignment: 'map', pitchAlignment: 'map' });
const pinEl = document.createElement('div'); pinEl.className = 'pin';
const pin = new maplibregl.Marker({ element: pinEl });

// ---------- location ----------
let me = null, heading = 0, watchId = null;
function setMe(lng, lat, h) {
  me = { lng, lat }; if (h != null && !isNaN(h)) heading = h;
  puck.setLngLat([lng, lat]).setRotation(heading).addTo(map);
}
function locate(fly = true) {
  if (!navigator.geolocation) { useFallback(fly); return; }
  navigator.geolocation.getCurrentPosition(p => {
    setMe(p.coords.longitude, p.coords.latitude, p.coords.heading);
    if (fly) map.flyTo({ center: [me.lng, me.lat], zoom: 16.5, pitch: 55 });
    else map.jumpTo({ center: [me.lng, me.lat] });
  }, () => useFallback(fly), { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 });
}
function useFallback(fly) {
  setMe(FALLBACK.lng, FALLBACK.lat);
  if (fly) { toast('Brak GPS. Start: ' + FALLBACK.name); map.flyTo({ center: [me.lng, me.lat], zoom: 16 }); }
}
$('#me').addEventListener('click', () => locate(true));

// ---------- search ----------
let qT, qCtl;
$('#q').addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(search, 280); });
$('#q').addEventListener('focus', () => { if ($('#results').innerHTML) $('#results').hidden = false; });
async function search() {
  const q = $('#q').value.trim(); const box = $('#results');
  if (q.length < 2) { box.hidden = true; return; }
  qCtl?.abort(); qCtl = new AbortController();
  const c = map.getCenter();
  try {
    const r = await fetch(`${PHOTON}?q=${encodeURIComponent(q)}&lat=${c.lat}&lon=${c.lng}&limit=7`, { signal: qCtl.signal });
    const j = await r.json();
    const items = j.features.filter(f => f.properties.countrycode === 'PL' || !f.properties.countrycode);
    box.innerHTML = items.length ? items.map((f, i) => {
      const p = f.properties; const title = p.name || [p.street, p.housenumber].filter(Boolean).join(' ');
      const sub = [p.name ? [p.street, p.housenumber].filter(Boolean).join(' ') : '', p.district || p.locality, p.city].filter(Boolean).join(', ');
      return `<button data-i="${i}"><b>${esc(title)}</b><span>${esc(sub)}</span></button>`;
    }).join('') : '<button disabled><span>Nic nie znaleziono</span></button>';
    box.hidden = false;
    box.querySelectorAll('button[data-i]').forEach(b => b.addEventListener('click', () => {
      const f = items[+b.dataset.i]; const p = f.properties;
      box.hidden = true; $('#q').value = p.name || [p.street, p.housenumber].filter(Boolean).join(' ');
      $('#q').blur();
      plan(f.geometry.coordinates, $('#q').value);
    }));
  } catch (e) { if (e.name !== 'AbortError') toast('Wyszukiwarka nie odpowiada, spróbuj za chwilę'); }
}
// long-press / right click on map = destination
let pressT;
map.on('contextmenu', e => plan([e.lngLat.lng, e.lngLat.lat], 'Wybrany punkt'));
map.on('touchstart', e => { if (e.originalEvent.touches.length > 1) return; clearTimeout(pressT); pressT = setTimeout(() => plan([e.lngLat.lng, e.lngLat.lat], 'Wybrany punkt'), 550); });
['touchend', 'touchmove', 'dragstart', 'zoomstart'].forEach(ev => map.on(ev, () => clearTimeout(pressT)));

// ---------- routing ----------
let routes = [], sel = 0, destName = '', dest = null;
async function plan(to, name) {
  if (nav) return;
  if (!me) useFallback(false);
  dest = to; destName = name;
  pin.setLngLat(to).addTo(map);
  toast('Szukam trasy pieszej…', 1500);
  try {
    const r = await fetch(`${OSRM}${me.lng},${me.lat};${to[0]},${to[1]}?overview=full&geometries=geojson&steps=true&alternatives=true`);
    const j = await r.json();
    if (j.code !== 'Ok' || !j.routes.length) throw new Error(j.code);
    routes = j.routes.map((rt, i) => ({
      coords: rt.geometry.coordinates, m: rt.distance,
      min: rt.distance / 1000 / 4.8 * 60, // 4,8 km/h: realne tempo w mieście
      steps: rt.legs[0].steps, i
    }));
    $('#rDest').textContent = name;
    $('#opts').innerHTML = routes.map((rt, i) => `<button class="opt${i === 0 ? ' sel' : ''}" data-i="${i}"><div class="on"><b>${i === 0 ? 'Najszybsza' : 'Spacerowa'}</b><span>${fmtDist(rt.m).join(' ')} · ${fmt(stepsFor(rt.m))} kroków</span></div><div class="pr">${Math.max(1, Math.round(rt.min))} min<span>${fmt(kcalFor(rt.m))} kcal</span></div></button>`).join('');
    $('#opts').querySelectorAll('.opt').forEach(b => b.addEventListener('click', () => selectRoute(+b.dataset.i)));
    selectRoute(0, true);
    view('route');
  } catch (e) { toast('Nie udało się wyznaczyć trasy. Sprawdź internet.'); }
}
function selectRoute(i, fit) {
  sel = i;
  document.querySelectorAll('.opt').forEach(b => b.classList.toggle('sel', +b.dataset.i === i));
  map.getSource('route').setData(fc(routes.map((rt, k) => line(rt.coords, { sel: k === i ? 1 : 0, i: k }))));
  map.getSource('done').setData(fc([]));
  if (fit !== false) {
    const b = new maplibregl.LngLatBounds(); routes[i].coords.forEach(c => b.extend(c));
    map.fitBounds(b, { padding: { top: 90, bottom: $('#sheet').offsetHeight + 40, left: 40, right: 40 }, pitch: 40, bearing: map.getBearing(), duration: 900 });
  }
}
$('#rClose').addEventListener('click', clearRoute);
function clearRoute() { routes = []; map.getSource('route').setData(fc([])); map.getSource('done').setData(fc([])); pin.remove(); view('home'); }

// ---------- geometry ----------
const R = 6371000, rad = d => d * Math.PI / 180;
function hav(a, b) { const dl = rad(b[1] - a[1]), dn = rad(b[0] - a[0]); const s = Math.sin(dl / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(s)); }
function bearing(a, b) { const y = Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1])); const x = Math.cos(rad(a[1])) * Math.sin(rad(b[1])) - Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0])); return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360; }
function cumul(c) { const d = [0]; for (let i = 1; i < c.length; i++) d.push(d[i - 1] + hav(c[i - 1], c[i])); return d; }
function project(c, cum, p) { // nearest point on polyline: returns {along, off}
  const kx = Math.cos(rad(p[1])) * 111320, ky = 110540; let best = { along: 0, off: 1e9 };
  for (let i = 0; i < c.length - 1; i++) {
    const ax = (c[i][0] - p[0]) * kx, ay = (c[i][1] - p[1]) * ky, bx = (c[i + 1][0] - p[0]) * kx, by = (c[i + 1][1] - p[1]) * ky;
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2));
    const ox = ax + dx * t, oy = ay + dy * t, off = Math.hypot(ox, oy);
    if (off < best.off) best = { along: cum[i] + (cum[i + 1] - cum[i]) * t, off, i, t };
  }
  return best;
}
function pointAt(c, cum, d) { let i = 0; while (i < c.length - 2 && cum[i + 1] < d) i++; const t = Math.max(0, Math.min(1, (d - cum[i]) / ((cum[i + 1] - cum[i]) || 1))); return { p: [c[i][0] + (c[i + 1][0] - c[i][0]) * t, c[i][1] + (c[i + 1][1] - c[i][1]) * t], i }; }
function sliceTo(c, cum, d) { const { p, i } = pointAt(c, cum, d); return c.slice(0, i + 1).concat([p]); }

// ---------- instructions (PL) ----------
const MOD = { left: 'w lewo', right: 'w prawo', 'slight left': 'lekko w lewo', 'slight right': 'lekko w prawo', 'sharp left': 'ostro w lewo', 'sharp right': 'ostro w prawo', straight: 'prosto', uturn: 'zawróć' };
function sayStep(s) {
  const m = s.maneuver, name = s.name ? ` w ${s.name}` : '', mod = MOD[m.modifier] || '';
  switch (m.type) {
    case 'depart': return `Idź ${s.name ? s.name : 'prosto'}`;
    case 'arrive': return 'Jesteś na miejscu';
    case 'roundabout': case 'rotary': return `Obejdź rondo i wyjdź ${m.exit ? m.exit + '. wyjściem' : ''}`;
    case 'continue': case 'new name': return m.modifier && m.modifier !== 'straight' ? `Idź ${mod}${name}` : `Idź prosto${name}`;
    case 'end of road': case 'turn': case 'fork': default:
      return m.modifier === 'straight' ? `Idź prosto${name}` : m.modifier === 'uturn' ? 'Zawróć' : `Skręć ${mod}${name}`;
  }
}
const ICON = {
  left: 'M15 20v-7a4 4 0 0 0-4-4H6m4-4L6 9l4 4', right: 'M9 20v-7a4 4 0 0 1 4-4h5m-4-4 4 4-4 4',
  'slight left': 'M15 20v-7L9 7m0 5V7h5', 'slight right': 'M9 20v-7l6-6m0 5V7h-5',
  'sharp left': 'M16 20V8l-8 8m0-5v5h5', 'sharp right': 'M8 20V8l8 8m0-5v5h-5',
  straight: 'M12 20V4M7 9l5-5 5 5', uturn: 'M8 20V9a4 4 0 0 1 8 0v4m-4-1 4 4 4-4', arrive: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11Zm0-9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z'
};
const iconSvg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[k] || ICON.straight}"/></svg>`;

// ---------- navigation ----------
let nav = null, wakeLock = null;
$('#go').addEventListener('click', () => startNav(false));
$('#sim').addEventListener('click', () => startNav(true));
$('#stop').addEventListener('click', () => endNav(false));

function startNav(sim) {
  const rt = routes[sel]; if (!rt) return;
  const cum = cumul(rt.coords);
  const stepStarts = rt.steps.map(s => project(rt.coords, cum, s.maneuver.location).along);
  nav = { rt, cum, total: cum[cum.length - 1], along: 0, sim, t0: Date.now(), stepStarts, offCount: 0, last: null };
  map.getSource('route').setData(fc([line(rt.coords, { sel: 1, i: 0 })]));
  view('nav');
  try { navigator.wakeLock?.request('screen').then(w => wakeLock = w).catch(() => {}); } catch {}
  if (sim) { nav.simAlong = 0; nav.timer = setInterval(simTick, 100); toast('Symulacja: idziesz 10× szybciej'); }
  else if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(p => onPos([p.coords.longitude, p.coords.latitude], p.coords.heading),
      () => toast('Brak sygnału GPS'), { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 });
  }
  update(true);
}
function simTick() { // 5 km/h × 10
  nav.simAlong = Math.min(nav.total, nav.simAlong + 5 / 3.6 * 10 * 0.1);
  const { p } = pointAt(nav.rt.coords, nav.cum, nav.simAlong);
  const ahead = pointAt(nav.rt.coords, nav.cum, Math.min(nav.total, nav.simAlong + 8)).p;
  onPos(p, bearing(p, ahead), true);
}
function onPos(p, h, simulated) {
  if (!nav) return;
  const pr = project(nav.rt.coords, nav.cum, p);
  if (!simulated && pr.off > 40) { // zszedłeś z trasy
    if (++nav.offCount > 4) { nav.offCount = 0; reroute(p); }
  } else nav.offCount = 0;
  nav.along = Math.max(nav.along, pr.along);
  const hh = h != null && !isNaN(h) ? h : nav.last ? bearing(nav.last, p) : heading;
  nav.last = p;
  setMe(p[0], p[1], hh);
  update();
  if (nav.total - nav.along < 12) endNav(true);
}
async function reroute(p) {
  toast('Wyznaczam nową trasę…');
  try {
    const r = await fetch(`${OSRM}${p[0]},${p[1]};${dest[0]},${dest[1]}?overview=full&geometries=geojson&steps=true`);
    const j = await r.json(); if (j.code !== 'Ok') return;
    const rt = j.routes[0]; const walked = nav.along + (nav.extra || 0);
    nav.extra = walked; nav.rt = { coords: rt.geometry.coordinates, m: rt.distance, steps: rt.legs[0].steps };
    nav.cum = cumul(nav.rt.coords); nav.total = nav.cum[nav.cum.length - 1]; nav.along = 0;
    nav.stepStarts = nav.rt.steps.map(s => project(nav.rt.coords, nav.cum, s.maneuver.location).along);
    map.getSource('route').setData(fc([line(nav.rt.coords, { sel: 1, i: 0 })]));
  } catch {}
}
function update(first) {
  const walked = nav.along + (nav.extra || 0), rem = Math.max(0, nav.total - nav.along);
  // next maneuver
  let k = nav.stepStarts.findIndex(s => s > nav.along + 3);
  if (k < 0) k = nav.stepStarts.length - 1;
  const st = nav.rt.steps[k], dTo = Math.max(0, nav.stepStarts[k] - nav.along);
  const [dv, du] = fmtDist(dTo);
  $('#iDist').textContent = st.maneuver.type === 'arrive' && dTo < 15 ? 'Cel' : `${dv} ${du}`;
  $('#iText').textContent = sayStep(st);
  $('#iIcon').innerHTML = iconSvg(st.maneuver.type === 'arrive' ? 'arrive' : st.maneuver.modifier || 'straight');
  $('#nMin').textContent = Math.max(0, Math.ceil(rem / 1000 / 4.8 * 60));
  const [rv, ru] = fmtDist(rem); $('#nDist').textContent = rv; $('#nDistU').textContent = ru;
  $('#nKcal').textContent = fmt(kcalFor(walked));
  $('#nSteps').textContent = fmt(stepsFor(walked));
  $('#nBar').style.width = (walked / (walked + rem) * 100) + '%';
  map.getSource('done').setData(fc([line(sliceTo(nav.rt.coords, nav.cum, nav.along))]));
  if (me) map.easeTo({ center: [me.lng, me.lat], bearing: heading, pitch: 62, zoom: 18, duration: first ? 1200 : 450, padding: { top: 120, bottom: 220 } });
}
function endNav(arrived) {
  if (!nav) return;
  clearInterval(nav.timer); if (watchId != null) navigator.geolocation.clearWatch(watchId); watchId = null;
  try { wakeLock?.release(); } catch {}
  const walked = nav.along + (nav.extra || 0), min = (Date.now() - nav.t0) / 60000;
  const w = { t: Date.now(), day: today(), to: destName, m: walked, min: nav.sim ? walked / 1000 / 4.8 * 60 : min, steps: Math.round(stepsFor(walked)), kcal: Math.round(kcalFor(walked)) };
  nav = null;
  if (walked > 30) { const h = store.get('history', []); h.push(w); store.set('history', h.slice(-200)); }
  $('#dTitle').textContent = arrived ? `Dotarłeś: ${destName}` : 'Spacer przerwany';
  $('#dMin').textContent = fmt(w.min); $('#dDist').textContent = (w.m / 1000).toFixed(2).replace('.', ',');
  $('#dKcal').textContent = fmt(w.kcal); $('#dSteps').textContent = fmt(w.steps);
  map.getSource('route').setData(fc([])); map.getSource('done').setData(fc([])); pin.remove(); routes = [];
  map.easeTo({ pitch: 50, zoom: 16.3, padding: { top: 0, bottom: 0 }, duration: 800 });
  view('done');
}

// ---------- boot ----------
view('home');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
