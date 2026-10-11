class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { scene: 'Start', playing: false, copied: false };
    this.cvEl = null; this.orbEl = null; this.barEl = null; this.plEl = null;
    this.cv = (el) => { this.cvEl = el; };
    this.orbRef = (el) => { this.orbEl = el; };
    this.barRef = (el) => { this.barEl = el; };
    this.plRef = (el) => { this.plEl = el; };
    this.togglePlay = () => { if (this.playing) this.stop(); else this.play(false); };
    this.playStory = () => this.play(false);
    this.replay = () => { window.scrollTo(0, 0); this.sy = 0; this.play(true); };
    this.copyMail = () => {
      const done = () => { this.setState({ copied: true }); clearTimeout(this.cpT); this.cpT = setTimeout(() => this.setState({ copied: false }), 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText('kub.mktg@gmail.com').then(done, done); else done();
    };
    this.userScroll = () => { if (this.playing) this.stop(); };
    this.onResize = () => this.measure();
    this.onMove = (e) => { this.mx = e.clientX; this.my = e.clientY; };
    this.onLeave = () => { this.mx = -9999; this.my = -9999; };
    this.tick = this.tick.bind(this);
  }

  renderVals() {
    const st = this.state;
    return {
      cv: this.cv, orbRef: this.orbRef, barRef: this.barRef, plRef: this.plRef,
      sceneName: st.scene,
      playDisp: st.playing ? 'none' : 'block',
      pauseDisp: st.playing ? 'block' : 'none',
      playAria: st.playing ? 'Zatrzymaj przewijanie' : 'Odtwórz historię',
      togglePlay: this.togglePlay, playStory: this.playStory, replay: this.replay,
      copyMail: this.copyMail,
      copyLabel: st.copied ? 'Skopiowano' : 'Kopiuj'
    };
  }

  componentDidMount() {
    this.sy = window.scrollY || 0;
    this.mx = -9999; this.my = -9999;
    this.cur = -1; this.lastT = 0; this.burst = 0; this.lastMeasure = 0; this.docH = 0; this.spinEl = null;
    window.addEventListener('resize', this.onResize);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('wheel', this.userScroll, { passive: true });
    window.addEventListener('touchmove', this.userScroll, { passive: true });
    this.measure();
    this.buildDots();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!this.dead) this.measure(); });
    this.raf = requestAnimationFrame(this.tick);
  }

  componentWillUnmount() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.cpT);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onMove);
    document.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('wheel', this.userScroll);
    window.removeEventListener('touchmove', this.userScroll);
  }

  measure() {
    const root = document.documentElement;
    const tall = window.innerHeight > 1500;
    this.vh = tall ? 900 : window.innerHeight;
    this.W = window.innerWidth;
    root.style.setProperty('--vh', this.vh + 'px');
    root.style.setProperty('--sc', String(Math.min(1, (this.W - 32) / 880)));
    const y0 = window.scrollY || 0;
    this.secs = Array.prototype.slice.call(document.querySelectorAll('[data-sec]')).map((el) => {
      const r = el.getBoundingClientRect();
      return { el, top: r.top + y0, h: el.offsetHeight, p: -1, name: el.getAttribute('data-name') || '' };
    });
    this.kfs = Array.prototype.slice.call(document.querySelectorAll('[data-kf]')).map((el) => {
      const s = el.closest('[data-sec]');
      const frames = el.getAttribute('data-kf').split(';').map((f) => f.split(',').map(Number));
      return { el, sec: s ? +s.getAttribute('data-sec') : 0, frames, last: '' };
    });
    this.cts = Array.prototype.slice.call(document.querySelectorAll('[data-ct]')).map((el) => {
      const s = el.closest('[data-sec]');
      const g = (k, d) => { const v = el.getAttribute('data-' + k); return v == null ? d : v; };
      return { el, sec: s ? +s.getAttribute('data-sec') : 0, from: +g('from', 0), to: +g('to', 0), a: +g('a', 0), b: +g('b', 1), dec: +g('dec', 0), pre: g('pre', ''), suf: g('suf', ''), last: '' };
    });
    this.docH = document.documentElement.scrollHeight;
    this.sizeCanvas();
  }

  maxScroll() { return Math.max(1, document.documentElement.scrollHeight - window.innerHeight); }

  play(fromTop) {
    const max = this.maxScroll();
    if (!fromTop && (window.scrollY || 0) >= max - 4) { window.scrollTo(0, 0); this.sy = 0; }
    this.ap = fromTop ? 0 : (window.scrollY || 0);
    this.playing = true;
    document.documentElement.style.setProperty('--pl', '1');
    this.setState({ playing: true });
  }

  stop() {
    this.playing = false;
    document.documentElement.style.setProperty('--pl', '0');
    this.setState({ playing: false });
  }

  tick(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.tick);
    const dt = this.lastT ? Math.min(0.05, (now - this.lastT) / 1000) : 0.016;
    this.lastT = now;
    if (now - this.lastMeasure > 1500) {
      this.lastMeasure = now;
      if (document.documentElement.scrollHeight !== this.docH) this.measure();
    }
    const max = this.maxScroll();
    const y = window.scrollY || 0;
    if (this.playing) {
      // the person grabbed the scrollbar or used the keyboard: hand control back
      if (Math.abs(y - Math.round(this.ap)) > 4) this.stop();
      else {
        this.ap = Math.min(max, this.ap + (max / 95) * dt);
        window.scrollTo(0, this.ap);
        if (this.ap >= max - 1) this.stop();
      }
    }
    const target = window.scrollY || 0;
    this.sy += (target - this.sy) * Math.min(1, dt * 12);
    if (Math.abs(target - this.sy) < 0.3) this.sy = target;
    const sy = this.sy, vh = this.vh;
    let idx = 0, ip = 0;
    for (let i = 0; i < this.secs.length; i++) {
      const s = this.secs[i];
      const span = s.h - vh;
      let p = span > 40 ? (sy - s.top) / span : (sy - s.top + vh) / vh;
      p = Math.max(0, Math.min(1, p));
      if (Math.abs(p - s.p) > 0.0002) { s.p = p; s.el.style.setProperty('--p', p.toFixed(4)); }
      if (s.top <= sy + vh * 0.5) { idx = i; ip = p; }
    }
    if (this.secs[0]) document.documentElement.style.setProperty('--hp', this.secs[0].p.toFixed(3));
    if (idx !== this.cur) { this.cur = idx; this.setState({ scene: (this.secs[idx] && this.secs[idx].name) || 'Start' }); }
    if (this.barEl) this.barEl.style.transform = 'scaleX(' + Math.min(1, sy / max).toFixed(4) + ')';
    if (this.plEl) this.plEl.style.pointerEvents = (this.playing || (this.secs[0] && this.secs[0].p > 0.08)) ? 'auto' : 'none';
    for (let i = 0; i < this.kfs.length; i++) {
      const k = this.kfs[i];
      const s = this.secs[k.sec]; if (!s) continue;
      const p = s.p, f = k.frames;
      let x = f[0][1], yy = f[0][2];
      if (p >= f[f.length - 1][0]) { x = f[f.length - 1][1]; yy = f[f.length - 1][2]; }
      else for (let j = 0; j < f.length - 1; j++) {
        if (p >= f[j][0] && p < f[j + 1][0]) {
          let u = (p - f[j][0]) / (f[j + 1][0] - f[j][0]); u = u * u * (3 - 2 * u);
          x = f[j][1] + (f[j + 1][1] - f[j][1]) * u; yy = f[j][2] + (f[j + 1][2] - f[j][2]) * u; break;
        }
      }
      const tr = 'translate3d(' + x.toFixed(1) + 'px,' + yy.toFixed(1) + 'px,0)';
      if (tr !== k.last) { k.last = tr; k.el.style.transform = tr; }
    }
    for (let i = 0; i < this.cts.length; i++) {
      const c = this.cts[i];
      const s = this.secs[c.sec]; if (!s) continue;
      let u = Math.max(0, Math.min(1, (s.p - c.a) / (c.b - c.a)));
      u = 1 - Math.pow(1 - u, 3);
      const v = c.from + (c.to - c.from) * u;
      const parts = v.toFixed(c.dec).split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      const txt = c.pre + parts.join(',') + c.suf;
      if (txt !== c.last) { c.last = txt; c.el.textContent = txt; }
    }
    this.moveOrb(idx, ip);
    this.drawDots(dt, idx, sy / max);
  }

  moveOrb(idx, p) {
    const el = this.orbEl; if (!el) return;
    const W = this.W, H = this.vh;
    // x, y (share of the screen), scale, opacity for each scene
    const K = [[0.74, 0.46, 1, 1], [0.5, 0.2, 0.6, 0], [0.3, 0.8, 0.6, 0], [0.24, 0.6, 0.8, 1], [0.2, 0.42, 0.85, 1], [0.1, 0.3, 0.75, 1], [0.08, 0.36, 0.75, 1], [0.07, 0.17, 0.7, 1], [0.08, 0.3, 0.75, 1], [0.3, 0.78, 0.7, 0], [0.5, 0.2, 0.6, 0]];
    const at = (i) => K[Math.min(K.length - 1, i)];
    const A = at(idx), B = at(idx + 1);
    let u = Math.max(0, Math.min(1, (p - 0.84) / 0.16)); u = u * u * (3 - 2 * u);
    const v = A.map((a, i) => a + (B[i] - a) * u);
    const sz = 76;
    el.style.transform = 'translate3d(' + (v[0] * W - sz / 2).toFixed(1) + 'px,' + (v[1] * H - sz / 2).toFixed(1) + 'px,0) scale(' + v[2].toFixed(3) + ')';
    el.style.opacity = (W < 900 ? 0 : v[3]).toFixed(3);
    if (!this.spinEl) this.spinEl = el.querySelector('.orb-spin');
    if (this.spinEl) this.spinEl.style.transform = 'rotateX(14deg) rotateY(' + ((this.sy / this.maxScroll()) * 2160).toFixed(1) + 'deg)';
  }

  sizeCanvas() {
    const c = this.cvEl; if (!c) return;
    this.ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    c.width = Math.round(this.W * dpr); c.height = Math.round(this.vh * dpr);
    c.style.height = this.vh + 'px';
  }

  // ---- white dots that keep turning into new shapes
  buildDots() {
    const N = this.W < 700 ? 1300 : 2400;
    this.N = N;
    const rnd = (() => { let s = 7; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
    const probe = document.createElement('canvas').getContext('2d');
    const fill2d = (path, w, h, depth) => {
      const out = [];
      let guard = 0;
      while (out.length < N && guard++ < N * 60) {
        const x = rnd() * w, y = rnd() * h;
        if (probe.isPointInPath(path, x, y, 'evenodd')) {
          const s = 2 / Math.max(w, h);
          out.push([(x - w / 2) * s, (y - h / 2) * s, (rnd() - 0.5) * depth]);
        }
      }
      while (out.length < N) out.push(out[out.length % Math.max(1, out.length)] || [0, 0, 0]);
      return out;
    };
    const shapes = [];
    // sphere
    shapes.push(Array.from({ length: N }, (_, i) => { const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * 2.39996; return [Math.cos(th) * r, y, Math.sin(th) * r]; }));
    // the D with the cursor cut out
    shapes.push(fill2d(new Path2D('M0 0 H42 A42 42 0 0 1 42 84 H0 Z M26 22 L26 56.85 L34.61 49.06 L40.35 62.18 L45.68 59.92 L40.14 47.22 L51.42 47.22 Z'), 84, 84, 0.25));
    // torus
    shapes.push(Array.from({ length: N }, () => { const a = rnd() * Math.PI * 2, b = rnd() * Math.PI * 2, R = 0.75, r = 0.28; return [(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)]; }));
    // a big cursor
    shapes.push(fill2d(new Path2D('M0 0 L0 34.85 L8.61 27.06 L14.35 40.18 L19.68 37.92 L14.14 25.22 L25.42 25.22 Z'), 26, 41, 0.2).map((p) => [p[0] + 0.25, p[1], p[2]]));
    // wave field
    shapes.push(Array.from({ length: N }, (_, i) => { const gx = (i % 60) / 59 * 2 - 1, gz = Math.floor(i / 60) / (N / 60) * 2 - 1; return [gx * 1.3, Math.sin(gx * 4) * 0.18 + Math.cos(gz * 5) * 0.12, gz * 1.3]; }));
    // double helix
    shapes.push(Array.from({ length: N }, (_, i) => { const t = (i / N) * Math.PI * 6, s = i % 2 ? Math.PI : 0, rr = i % 7 === 0 ? rnd() : 1; return [Math.cos(t + s) * 0.45 * rr, (i / N) * 2.2 - 1.1, Math.sin(t + s) * 0.45 * rr]; }));
    // spiral galaxy
    shapes.push(Array.from({ length: N }, (_, i) => { const arm = i % 3, d = Math.pow(rnd(), 0.6), a = d * 5.5 + arm * 2.094 + (rnd() - 0.5) * 0.5; return [Math.cos(a) * d * 1.15, (rnd() - 0.5) * 0.08 * (1.2 - d), Math.sin(a) * d * 1.15]; }));
    // trefoil knot
    shapes.push(Array.from({ length: N }, (_, i) => { const t = (i / N) * Math.PI * 2, j = 0.06; return [(Math.sin(t) + 2 * Math.sin(2 * t)) * 0.3 + (rnd() - 0.5) * j, (Math.cos(t) - 2 * Math.cos(2 * t)) * 0.3 + (rnd() - 0.5) * j, -Math.sin(3 * t) * 0.3 + (rnd() - 0.5) * j]; }));
    // cube lattice
    shapes.push(Array.from({ length: N }, () => { const e = Math.floor(rnd() * 12), t = rnd() * 2 - 1, A = [[0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1], [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1], [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0]][e].map((v) => v * 0.62); const ax = e < 4 ? 0 : e < 8 ? 1 : 2; A[ax] = t * 0.62; return A; }));
    this.shapes = shapes;
    this.cur3 = shapes[0].map((p) => p.slice());
    this.seedD = Array.from({ length: N }, () => rnd());
    this.offs = new Float32Array(N * 2);
  }

  drawDots(dt, idx, g) {
    const ctx = this.ctx; if (!ctx || !this.shapes) return;
    const W = this.W, H = this.vh, dpr = this.dpr, N = this.N;
    // everything below follows the scroll position only
    const S = this.shapes;
    const pos = g * (S.length - 1) * 1.999;
    const k = Math.floor(pos), frac = pos - k, t = pos * 2.2;
    const from = S[k % S.length], to = S[(k + 1) % S.length];
    const hero = this.secs && this.secs[0] ? this.secs[0].p : 0;
    const narrow = W < 900;
    const cxH = narrow ? 0.5 : 0.7, cyH = narrow ? 0.34 : 0.46;
    const mixc = Math.min(1, hero * 1.6);
    const cx = W * (cxH + (0.5 - cxH) * mixc), cy = H * (cyH + (0.5 - cyH) * mixc);
    const scale = Math.min(W, H) * (narrow ? 0.36 : 0.34) * (1 + 0.25 * mixc);
    const dims = [1, 0.5, 0.45, 0.45, 0.45, 0.4, 0.4, 0.4, 0.42, 0.5, 0.35];
    const dim = dims[Math.min(dims.length - 1, idx)];
    const rotY = g * 14, rotX = 0.35 + Math.sin(g * 6) * 0.15;
    const cyR = Math.cos(rotY), syR = Math.sin(rotY), cxR = Math.cos(rotX), sxR = Math.sin(rotX);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W * dpr, H * dpr);
    const buckets = [[], [], []];
    const mx = this.mx, my = this.my, offs = this.offs;
    const relax = Math.min(1, dt * 6);
    for (let i = 0; i < N; i++) {
      let u = (frac - this.seedD[i] * 0.3) / 0.45;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      u = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      const a = from[i], b = to[i];
      let x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u, z = a[2] + (b[2] - a[2]) * u;
      // drift + scatter mid-morph
      const sc = Math.sin(u * Math.PI) * 0.12;
      x += Math.sin(i * 1.7 + t) * sc; y += Math.cos(i * 2.3 + t * 0.8) * sc;
      const x1 = x * cyR + z * syR, z1 = -x * syR + z * cyR;
      const y1 = y * cxR - z1 * sxR, z2 = y * sxR + z1 * cxR;
      const persp = 2.6 / (2.6 + z2);
      let px = cx + x1 * scale * persp, py = cy + y1 * scale * persp;
      // push dots away from the pointer
      const dx = px - mx, dy = py - my, d2 = dx * dx + dy * dy;
      let ox = offs[i * 2], oy = offs[i * 2 + 1];
      if (d2 < 14400) { const d = Math.sqrt(d2) || 1, f = (1 - d / 120) * 34; ox += ((dx / d) * f - ox) * relax * 2; oy += ((dy / d) * f - oy) * relax * 2; }
      else { ox -= ox * relax; oy -= oy * relax; }
      offs[i * 2] = ox; offs[i * 2 + 1] = oy;
      px += ox; py += oy;
      const depth = (1 - z2) * 0.5;
      const bk = depth < 0.35 ? 0 : depth < 0.65 ? 1 : 2;
      buckets[bk].push(px, py, persp);
    }
    const al = [0.28, 0.55, 0.9];
    for (let bk = 0; bk < 3; bk++) {
      const arr = buckets[bk];
      ctx.fillStyle = 'rgba(243,242,238,' + (al[bk] * dim).toFixed(3) + ')';
      ctx.beginPath();
      for (let j = 0; j < arr.length; j += 3) {
        const r = (0.7 + 0.75 * arr[j + 2]) * dpr;
        ctx.rect(arr[j] * dpr - r, arr[j + 1] * dpr - r, r * 2, r * 2);
      }
      ctx.fill();
    }
  }
}
