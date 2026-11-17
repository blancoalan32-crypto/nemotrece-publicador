// THE FILM — frame t is a pure function of t, read from score.js.
(function () {
  const U = globalThis.U, G = globalThis.G, Ch = globalThis.Ch, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { BEAT, ev, clock, T } = S;
  const { clamp, lerp, ease, pulse } = U;
  const W = G.W, H = G.H, SAFE = G.SAFE;
  const CX = SAFE.x + SAFE.w / 2; // centre of the safe area (9:16 reserves the right edge)
  const BLUE = '#0B2A66', BLUE2 = '#123C8C', GOLD = '#F7C21B', GOLD2 = '#FFD95A', CREAM = '#FFF6DF', INK = '#0A1E4A';
  const GROUND = Math.round(H * 0.74);

  const lastBeat = (t, from) => from + Math.floor((t - from) / BEAT) * BEAT;
  const bounce = (t, t0, d = 0.3) => ease.outBack(clamp((t - t0) / d), 2.6);

  // ---------- text helpers ----------
  function wrap(ctx, str, maxW, size, fam, weight) {
    const words = str.split(' '); const lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (G.measure(ctx, n, size, fam, weight) > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur); return lines;
  }
  function textBlock(ctx, str, x, y, { size = 64, fam = 'Inter', weight = 800, color = CREAM, maxW = SAFE.w - 60, lh = 1.18, align = 'center', alpha = 1, stroke, strokeW } = {}) {
    const lines = wrap(ctx, str, maxW, size, fam, weight);
    lines.forEach((l, i) => G.text(ctx, l, x, y + i * size * lh, { size, fam, weight, color, align, alpha, stroke, strokeW, boil: 0 }));
    return lines.length * size * lh;
  }
  // caption card: cream card with blue text, pops in, slides out
  function captionCard(ctx, c, t, y) {
    const handoff = S.captions.some((o) => o !== c && Math.abs(o.t - c.end) < 0.05); // the next card replaces this one
    if (t < c.t || t > c.end + (handoff ? 0 : 0.2)) return;
    if (handoff && t >= c.end) return;
    const u = clamp((t - c.t) / 0.3), out = handoff ? 0 : clamp((t - c.end) / 0.2);
    const size = 54, maxW = SAFE.w - 150;
    const lines = wrap(ctx, c.text, maxW, size, 'Inter', 800);
    const h = lines.length * size * 1.22 + 56;
    const w = SAFE.w - 70;
    ctx.save();
    ctx.globalAlpha *= clamp(u * 3) * (1 - out);
    ctx.translate(CX, y + h / 2 + 40 * (1 - ease.outCubic(u)));
    const sc = 0.85 + 0.15 * ease.outBack(u, 2);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(ctx, -w / 2 + 8, -h / 2 + 10, w, h, 26); ctx.fill();
    ctx.fillStyle = CREAM; roundRect(ctx, -w / 2, -h / 2, w, h, 26); ctx.fill();
    ctx.fillStyle = GOLD; roundRect(ctx, -w / 2, -h / 2, 16, h, 8); ctx.fill();
    lines.forEach((l, i) => G.text(ctx, l, 8, -h / 2 + 28 + size * 0.95 + i * size * 1.22, { size, fam: 'Inter', weight: 800, color: INK, align: 'center', boil: 0 }));
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // "TEORÍA N" pill + title
  function header(ctx, h, t) {
    const a = t - h.t; if (a < 0) return;
    const y = SAFE.y + 30;
    const p = bounce(t, h.t, 0.35);
    ctx.save(); ctx.translate(CX, y + 60); ctx.scale(p, p);
    const pw = 360, ph = 96;
    ctx.fillStyle = GOLD; roundRect(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2); ctx.fill();
    G.text(ctx, `TEORÍA ${h.n}`, 0, 22, { size: 58, fam: 'Bungee', weight: 400, color: BLUE, align: 'center', boil: 0 });
    ctx.restore();
    const q = clamp((a - 0.25) / 0.35);
    if (q > 0) textBlock(ctx, h.title, CX, y + 200, { size: 70, fam: 'Bungee', weight: 400, color: CREAM, alpha: q, maxW: SAFE.w - 40, stroke: BLUE, strokeW: 10 });
  }

  // ---------- backgrounds ----------
  function blueAndGold(ctx, t, rot = -0.22) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, BLUE2); g.addColorStop(1, BLUE); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H * 0.5); ctx.rotate(rot);
    ctx.fillStyle = GOLD; ctx.fillRect(-W * 1.5, -H * 0.09, W * 3, H * 0.18);
    ctx.restore();
  }
  function sky(ctx, top, bottom) { const g = ctx.createLinearGradient(0, 0, 0, GROUND); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }

  // ---------- intro ----------
  function intro(ctx, t) {
    blueAndGold(ctx, t);
    const y0 = SAFE.y + 260;
    let y = y0;
    for (const w of S.title) {
      const p = bounce(t, w.t, 0.28);
      const size = w.big ? 132 : 84;
      if (w.big) y += 50;
      if (p > 0) {
        ctx.save(); ctx.translate(CX, y); ctx.scale(p, p); ctx.rotate(w.big ? -0.05 : 0);
        G.text(ctx, w.w, 0, 0, { size, fam: 'Bungee', weight: 400, color: w.big ? GOLD : CREAM, align: 'center', stroke: INK, strokeW: w.big ? 16 : 10, boil: 0 });
        ctx.restore();
      }
      y += w.big ? 170 : 115;
    }
    // "hay 3 teorías"
    if (t >= T(2) - 0.05) {
      const a = clamp((t - T(2)) / 0.3);
      G.text(ctx, 'HAY 3 TEORÍAS', CX, y + 90, { size: 66, fam: 'Bungee', weight: 400, color: CREAM, align: 'center', alpha: a, stroke: INK, strokeW: 10, boil: 0 });
      S.three.forEach((tt, i) => {
        const p = bounce(t, tt, 0.3); if (p <= 0) return;
        const x = CX + (i - 1) * 220, cy = y + 260;
        ctx.save(); ctx.translate(x, cy); ctx.scale(p, p);
        ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.stroke();
        G.text(ctx, String(i + 1), 0, 34, { size: 96, fam: 'Bungee', weight: 400, color: BLUE, align: 'center', boil: 0 });
        ctx.restore();
      });
    }
  }

  // ---------- teoría 1: hornos de ladrillos ----------
  const BW = 120, BH = 56;
  function brickPos(i) { const row = Math.floor(i / 4), col = i % 4; return [CX - 40 + col * BW + (row % 2 ? BW / 2 : 0) - BW, GROUND - BH * (row + 1)]; }
  function brick(ctx, x, y, a = 1) {
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = '#B5482C'; ctx.fillRect(x + 3, y + 3, BW - 6, BH - 6);
    ctx.fillStyle = '#CF6240'; ctx.fillRect(x + 3, y + 3, BW - 6, 12);
    ctx.strokeStyle = '#6E2615'; ctx.lineWidth = 4; ctx.strokeRect(x + 3, y + 3, BW - 6, BH - 6);
    ctx.restore();
  }
  function ladrillos(ctx, t) {
    sky(ctx, '#F4A259', '#F8D49A');
    // ground
    ctx.fillStyle = '#8A5A3B'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#6F4529'; ctx.fillRect(0, GROUND, W, 14);
    // kiln + chimney (left)
    const kx = SAFE.x + 70, kw = 300;
    ctx.fillStyle = '#9C3E25'; roundRect(ctx, kx, GROUND - 260, kw, 260, [120, 120, 0, 0]); ctx.fill();
    ctx.fillStyle = '#2A1410'; roundRect(ctx, kx + 95, GROUND - 130, 110, 130, [55, 55, 0, 0]); ctx.fill();
    const fl = 0.6 + 0.4 * pulse(t, lastBeat(t, ev.t1), 6);
    ctx.fillStyle = `rgba(255,${140 + 60 * fl},40,${0.8})`; ctx.beginPath(); ctx.ellipse(kx + 150, GROUND - 20, 40, 30 + 20 * fl, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7F2F1B'; ctx.fillRect(kx + 190, GROUND - 560, 70, 320);
    for (let r = 0; r < 10; r++) { ctx.strokeStyle = 'rgba(40,10,5,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(kx + 190, GROUND - 560 + r * 32); ctx.lineTo(kx + 260, GROUND - 560 + r * 32); ctx.stroke(); }
    // smoke puffs rising, one born every beat
    for (let k = 0; k < 10; k++) {
      const born = lastBeat(t, ev.t1) - k * BEAT; const a = t - born; if (born < ev.t1 - 2 || a < 0) continue;
      const u = a / (BEAT * 8);
      const sx = kx + 225 + Math.sin(a * 1.6 + k) * 30 + a * 40, sy = GROUND - 580 - a * 110;
      ctx.fillStyle = `rgba(110,80,60,${0.55 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx, sy, 40 + a * 22, 0, Math.PI * 2); ctx.fill();
    }
    // stink lines after "bosta" caption
    if (t > 11.7) stinkLines(ctx, t, CX + 60, GROUND - 40, 11.7, '#4F7A1F');
    // bricks: each lands on its note
    for (const b of S.bricks) {
      const [x, y] = brickPos(b.i);
      const a = t - b.t; if (a < -0.25) continue;
      const yy = a < 0 ? lerp(y - 500, y, ease.inQuad((a + 0.25) / 0.25)) : y;
      brick(ctx, x, yy);
    }
    // horse-dung pile on a wheelbarrow-free sign
    if (t > 11.7) bosta(ctx, CX + 60, GROUND + 90, 1.1, bounce(t, 11.7, 0.35));
  }

  // a pile of bosta (brown cartoon pile)
  function bosta(ctx, x, y, s, p = 1) {
    if (p <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s * p, s * p);
    const tiers = [[0, -20, 80, 26], [0, -48, 60, 22], [0, -72, 40, 18], [4, -90, 20, 12]];
    for (const [dx, dy, rx, ry] of tiers) { ctx.fillStyle = '#6B4423'; ctx.beginPath(); ctx.ellipse(dx, dy, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#835530'; ctx.beginPath(); ctx.ellipse(dx - rx * 0.3, dy - ry * 0.35, rx * 0.4, ry * 0.3, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  function stinkLines(ctx, t, x, y, t0, color) {
    for (let k = 0; k < 3; k++) {
      const a = ((t - t0) * 0.8 + k / 3) % 1;
      ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * a) * 0.9; ctx.strokeStyle = color; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) { const yy = y - a * 160 - i * 9; const xx = x + (k - 1) * 60 + Math.sin(i * 0.6 + t * 6 + k) * 16; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); }
      ctx.stroke(); ctx.restore();
    }
  }

  // ---------- teoría 2: caballos y carros ----------
  const HOUSES = ['#C8423B', '#F2C14E', '#3D7EB8', '#4E9E6B', '#E07A3B', '#2F5D9E'];
  function facades(ctx, base, hScale = 1) {
    let x = -20;
    for (let i = 0; x < W + 40; i++) {
      const w = 170 + U.hash(i, 3) * 90, h = (330 + U.hash(i, 4) * 220) * hScale;
      ctx.fillStyle = HOUSES[i % HOUSES.length]; ctx.fillRect(x, base - h, w, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 3;
      for (let k = 12; k < w; k += 18) { ctx.beginPath(); ctx.moveTo(x + k, base - h); ctx.lineTo(x + k, base); ctx.stroke(); } // chapa
      ctx.fillStyle = '#5A3A22'; ctx.fillRect(x - 6, base - h - 14, w + 12, 16);
      ctx.fillStyle = '#20324F';
      ctx.fillRect(x + w * 0.2, base - h * 0.75, w * 0.22, h * 0.22); ctx.fillRect(x + w * 0.58, base - h * 0.75, w * 0.22, h * 0.22);
      ctx.fillRect(x + w * 0.38, base - h * 0.35, w * 0.24, h * 0.35);
      x += w;
    }
  }
  function cobbles(ctx) {
    ctx.fillStyle = '#7C7468'; ctx.fillRect(0, GROUND, W, H - GROUND);
    ctx.fillStyle = '#958D80';
    for (let r = 0; r < 14; r++) for (let c = -1; c < 14; c++) { const x = c * 86 + (r % 2) * 43, y = GROUND + 10 + r * 34; ctx.beginPath(); ctx.ellipse(x, y, 36, 13, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  const HS = 0.78; // horse scale
  const horseX = (t) => lerp(-420, W + 760, clamp((t - ev.t2 + 0.3) / (ev.t3 - ev.t2 + 0.2)));
  function caballos(ctx, t) {
    sky(ctx, '#9FD3F2', '#DDF0F8');
    facades(ctx, GROUND);
    cobbles(ctx);
    // plops: a pile appears behind the horse on beat 4
    for (const p of S.plops) {
      const a = t - p.t; if (a < -0.2) continue;
      const px = horseX(p.t) - 200 * HS;
      if (a < 0) { const u = (a + 0.2) / 0.2; bosta(ctx, px, lerp(GROUND - 200 * HS, GROUND + 30, ease.inQuad(u)), 0.35, 1); }
      else { bosta(ctx, px, GROUND + 30, 0.8 + 0.15 * Math.exp(-a * 10), 1); if (a > 0.2) stinkLines(ctx, t, px, GROUND - 40, p.t, '#5E7A2A'); }
    }
    // the cart (behind the horse)
    const hx = horseX(t);
    const walk = (t - ev.t2) / (BEAT * 2);
    const cx = hx - 520 * HS, cy = GROUND + 20;
    ctx.fillStyle = '#8B5A2B'; ctx.fillRect(cx - 170, cy - 230, 340, 120);
    ctx.fillStyle = '#6B421E'; ctx.fillRect(cx - 170, cy - 230, 340, 18);
    ctx.strokeStyle = '#5A3518'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx + 170, cy - 170); ctx.lineTo(hx - 120 * HS, cy - 150 * HS); ctx.stroke();
    // barrels on the cart
    for (let k = 0; k < 3; k++) { ctx.fillStyle = '#A9743E'; roundRect(ctx, cx - 140 + k * 100, cy - 320, 80, 92, 14); ctx.fill(); ctx.fillStyle = '#4A3020'; ctx.fillRect(cx - 140 + k * 100, cy - 296, 80, 8); ctx.fillRect(cx - 140 + k * 100, cy - 260, 80, 8); }
    for (const wx of [cx - 100, cx + 100]) {
      ctx.save(); ctx.translate(wx, cy - 70); ctx.rotate(walk * 2.5);
      ctx.fillStyle = '#3B2A1A'; ctx.beginPath(); ctx.arc(0, 0, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C79A5C'; ctx.beginPath(); ctx.arc(0, 0, 56, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3B2A1A'; ctx.lineWidth = 8; for (let s = 0; s < 6; s++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(s * 1.047) * 56, Math.sin(s * 1.047) * 56); ctx.stroke(); }
      ctx.restore();
    }
    Ch.horse(ctx, { x: hx, y: GROUND + 30, s: HS, walk, color: '#8A5632', mane: '#3E2414', decorated: false, seed: 840 });
  }

  // ---------- teoría 3: el Riachuelo ----------
  function riachuelo(ctx, t) {
    sky(ctx, '#B9C2A0', '#E1DDB8');
    const bank = GROUND - 140;
    // factory with chimney + drain pipe (left)
    ctx.fillStyle = '#6E6A63'; ctx.fillRect(SAFE.x + 20, bank - 300, 280, 300);
    ctx.fillStyle = '#5A564F'; ctx.beginPath(); ctx.moveTo(SAFE.x + 20, bank - 300); for (let k = 0; k < 4; k++) { ctx.lineTo(SAFE.x + 20 + k * 70 + 70, bank - 360); ctx.lineTo(SAFE.x + 20 + k * 70 + 70, bank - 300); } ctx.fill();
    ctx.fillStyle = '#4C4842'; ctx.fillRect(SAFE.x + 230, bank - 560, 50, 260);
    G.text(ctx, 'CURTIEMBRE', SAFE.x + 160, bank - 150, { size: 34, fam: 'Inter', weight: 800, color: '#E8E2D0', align: 'center', boil: 0 });
    // houses on the bank (right), Caminito-style colours
    ctx.save(); ctx.beginPath(); ctx.rect(SAFE.x + 330, 0, W, H); ctx.clip(); facades(ctx, bank, 0.75); ctx.restore();
    // pipe + sludge
    ctx.fillStyle = '#3A3A3A'; ctx.fillRect(SAFE.x + 280, bank - 60, 110, 40);
    const fl = 0.7 + 0.3 * Math.sin(t * 12);
    ctx.fillStyle = '#5C5A2E'; ctx.fillRect(SAFE.x + 370, bank - 26, 26 * fl, 160);
    // the river
    const g = ctx.createLinearGradient(0, bank, 0, H); g.addColorStop(0, '#5E6B3A'); g.addColorStop(1, '#3B4426'); ctx.fillStyle = g; ctx.fillRect(0, bank, W, H - bank);
    ctx.strokeStyle = 'rgba(160,170,110,0.5)'; ctx.lineWidth = 6;
    for (let r = 0; r < 6; r++) { ctx.beginPath(); for (let x = 0; x <= W; x += 20) { const y = bank + 40 + r * 70 + Math.sin(x * 0.02 + t * 2 + r) * 8; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); } ctx.stroke(); }
    // bubbles that pop on the offbeats
    for (const b of S.bubbles) {
      const a = t - b.t; if (a < -0.6 || a > 0.25) continue;
      const x = b.x * W, y = bank + 90;
      if (a < 0) { const u = (a + 0.6) / 0.6; ctx.fillStyle = 'rgba(150,160,90,0.9)'; ctx.beginPath(); ctx.arc(x, y + 20 - 20 * u, b.r * u, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.strokeStyle = `rgba(200,210,140,${1 - a / 0.25})`; ctx.lineWidth = 4; for (let k = 0; k < 6; k++) { const an = k * 1.047, r0 = b.r, r1 = b.r + 40 * a / 0.25; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r0, y + Math.sin(an) * r0); ctx.lineTo(x + Math.cos(an) * r1, y + Math.sin(an) * r1); ctx.stroke(); } }
    }
    // stink waves rising on beats 1 and 3
    for (const s of S.stink) {
      const a = t - s.t; if (a < 0 || a > 2.2) continue;
      const u = a / 2.2; const x = s.x * W, y = bank + 40 - a * 260;
      ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * u) * 0.85; ctx.strokeStyle = '#4F7A1F'; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); for (let i = 0; i <= 14; i++) { const yy = y - i * 10; const xx = x + Math.sin(i * 0.7 + a * 5) * 22; if (i) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy); } ctx.stroke(); ctx.restore();
    }
  }

  // ---------- rivales + held breath ----------
  function rivales(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1B1F2E'); g.addColorStop(1, '#2C3248'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const a = clamp((t - ev.rivals) / 0.3);
    const y = SAFE.y + 320;
    textBlock(ctx, 'LO CIERTO:', CX, y, { size: 64, fam: 'Bungee', weight: 400, color: GOLD, alpha: a });
    const b = clamp((t - ev.rivals - 0.4) / 0.4);
    textBlock(ctx, 'el apodo lo pusieron los rivales para burlarse...', CX, y + 130, { size: 74, color: CREAM, alpha: b, maxW: SAFE.w - 80 });
  }

  // ---------- drop: BOSTERO, con orgullo ----------
  function orgullo(ctx, t) {
    blueAndGold(ctx, t, -0.22 + 0.04 * Math.sin((t - ev.drop) * 1.3));
    G.rays(ctx, CX, SAFE.y + 560, { n: 18, r0: 120, r1: 1400, color: GOLD2, alpha: 0.18 + 0.12 * pulse(t, lastBeat(t, ev.drop), 6), spin: (t - ev.drop) * 0.25 });
    // letters
    const size = 150, gap = 6;
    const widths = S.letters.map((l) => G.measure(ctx, l.ch, size, 'Bungee', 400) + gap);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = CX - total / 2; const y = SAFE.y + 620;
    S.letters.forEach((l, i) => {
      const p = bounce(t, l.t, 0.22);
      if (p > 0) {
        const hopY = t > S.letters[6].t + 0.3 ? -18 * pulse(t, lastBeat(t, ev.drop) - i * 0.04, 8) : 0;
        ctx.save(); ctx.translate(x + widths[i] / 2, y + hopY); ctx.scale(p, p); ctx.rotate((i % 2 ? 1 : -1) * 0.05);
        G.text(ctx, l.ch, 0, 0, { size, fam: 'Bungee', weight: 400, color: GOLD, align: 'center', stroke: INK, strokeW: 18, boil: 0 });
        ctx.restore();
      }
      x += widths[i];
    });
    const a = clamp((t - ev.adopto) / 0.35);
    if (a > 0) {
      textBlock(ctx, 'y la hinchada lo adoptó', CX, y + 170, { size: 64, color: CREAM, alpha: a, stroke: INK, strokeW: 10 });
      const p = bounce(t, ev.orgullo, 0.3);
      if (p > 0) { ctx.save(); ctx.translate(CX, y + 300); ctx.scale(p, p); ctx.rotate(-0.04); G.text(ctx, 'CON ORGULLO', 0, 0, { size: 104, fam: 'Bungee', weight: 400, color: CREAM, align: 'center', stroke: INK, strokeW: 16, boil: 0 }); ctx.restore(); }
    }
    G.confetti(ctx, t, ev.drop, { n: 140, seed: 7, spawn: 2.5 });
  }

  // ---------- CTA ----------
  function cta(ctx, t) {
    blueAndGold(ctx, t, 0.22);
    const y = SAFE.y + 180;
    const a = bounce(t, ev.cta, 0.3);
    ctx.save(); ctx.translate(CX, y); ctx.scale(a, a);
    textBlock(ctx, '¿CUÁL CREÉS QUE ES LA VERDADERA?', 0, 0, { size: 76, fam: 'Bungee', weight: 400, color: CREAM, stroke: INK, strokeW: 12, maxW: SAFE.w - 60 });
    ctx.restore();
    const items = ['Los ladrillos', 'Los caballos', 'El Riachuelo'];
    items.forEach((s, i) => {
      const tt = ev.cta + (i + 1) * BEAT; const p = bounce(t, tt, 0.3); if (p <= 0) return;
      const yy = y + 330 + i * 150;
      ctx.save(); ctx.translate(CX, yy); ctx.scale(p, p);
      ctx.fillStyle = CREAM; roundRect(ctx, -380, -60, 760, 120, 60); ctx.fill();
      ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(-320, 0, 48, 0, Math.PI * 2); ctx.fill();
      G.text(ctx, String(i + 1), -320, 24, { size: 64, fam: 'Bungee', weight: 400, color: BLUE, align: 'center', boil: 0 });
      G.text(ctx, s, -240, 22, { size: 60, fam: 'Inter', weight: 800, color: INK, align: 'left', boil: 0 });
      ctx.restore();
    });
    const c = clamp((t - ev.comment) / 0.4);
    if (c > 0) {
      G.text(ctx, 'Comentá 1, 2 o 3', CX, y + 860, { size: 64, fam: 'Bungee', weight: 400, color: GOLD, align: 'center', alpha: c, stroke: INK, strokeW: 10, boil: 0 });
      G.text(ctx, 'Teorías populares: ninguna está 100% confirmada.', CX, y + 940, { size: 36, fam: 'Inter', weight: 700, color: CREAM, align: 'center', alpha: c, boil: 0 });
    }
  }

  Studio.film({
    draw(ctx, t) {
      // camera kick on every big hit
      const hits = [T(1, 2), ev.t1, ev.t2, ev.t3, ev.drop, ev.cta];
      const lastHit = hits.filter((h) => h <= t).pop();
      const shake = lastHit !== undefined ? 16 * Math.exp(-(t - lastHit) * 7) : 0;
      ctx.save(); ctx.translate(U.noise1(t * 30, 1) * shake, U.noise1(t * 30, 2) * shake);
      if (t < ev.t1) intro(ctx, t);
      else if (t < ev.t2) { ladrillos(ctx, t); header(ctx, S.headers[0], t); }
      else if (t < ev.t3) { caballos(ctx, t); header(ctx, S.headers[1], t); }
      else if (t < ev.rivals) { riachuelo(ctx, t); header(ctx, S.headers[2], t); }
      else if (t < ev.drop) rivales(ctx, t);
      else if (t < ev.cta) orgullo(ctx, t);
      else cta(ctx, t);
      ctx.restore();
      // captions sit under the header, inside the safe area
      for (const c of S.captions) captionCard(ctx, c, t, SAFE.y + 365);
      if (t >= ev.breath && t < ev.drop) { ctx.fillStyle = 'rgba(5,8,20,0.45)'; ctx.fillRect(0, 0, W, H); }
      const lastFlash = hits.filter((h) => h <= t).pop();
      const flash = lastFlash !== undefined ? (lastFlash === ev.drop ? 0.85 : 0.5) * Math.exp(-(t - lastFlash) * 14) : 0;
      if (flash > 0.01) { ctx.fillStyle = `rgba(255,248,225,${flash})`; ctx.fillRect(0, 0, W, H); }
    },
    post: { vignette: 0.15 },
  });
})();
