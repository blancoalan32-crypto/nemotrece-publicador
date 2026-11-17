// THE SONG — every sound is placed from the score into out/music.wav.
//   node song.js   (STEMS=1 writes stems, LUFS=-14 sets loudness)
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev, clock } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const drums = bus(), bass = bus(), pad = bus(), keys = bus(), gtr = bus(), brass = bus(), fx = bus();
const verb = bus(), dly = bus();

// ---------- drums ----------
const K = I.kick(), SN = I.snare(), CL = I.clap(), HC = [I.hat(false, 11), I.hat(false, 12)], HO = I.hat(true, 14);
const CR = (s) => I.crash(s);
const kicks = [];
const quiet = (t) => t >= ev.breath && t < ev.drop;
clock.eachStep(0, 26, 16, (t, b, s) => {
  if (quiet(t) || t >= ev.end) return;
  const drop = t >= ev.drop && t < ev.cta;
  const intro = b < 3;
  const outro = t >= ev.cta;
  if (drop ? s % 4 === 0 : (s === 0 || s === 8 || (!intro && !outro && s === 10))) { drums.addMono(K, t, intro ? 0.7 : 0.95); kicks.push(t); }
  if (!intro && s % 8 === 4) { drums.addMono(CL, t, 0.55); verb.addMono(CL, t, 0.25); if (drop) drums.addMono(SN, t, 0.25); }
  if (s % 2 === 0) drums.addMono(HC[(s / 2) % 2], t, (s % 4 === 2 ? 0.2 : 0.12) * (intro ? 0.7 : 1), -0.3);
  if (drop && s % 4 === 2) drums.addMono(HO, t, 0.12, 0.3);
});
// big hits: title, every theory header, the drop, the CTA
for (const [t, g, seed] of [[T(1, 2), 0.35, 18], [ev.t1, 0.35, 19], [ev.t2, 0.35, 20], [ev.t3, 0.35, 21], [ev.drop, 0.5, 22], [ev.cta, 0.35, 23]]) {
  drums.addMono(CR(seed), t, g, 0.15);
  drums.addMono(I.tom(90, 0.25), t, 0.5);
  fx.addMono(I.thud(70, 0.1), t, 0.6);
}
// snare roll that stops a beat before the held breath
for (let i = 0; i < 8; i++) drums.addMono(SN, T(20, 0) + i * BEAT / 4, 0.18 + i * 0.03, 0.05);

// ---------- bass ----------
clock.eachStep(0, 26, 8, (t, b, s) => {
  if (quiet(t) || t >= ev.end) return;
  const c = sc.chordAt(t); if (!c) return;
  const R = c.bass + 12;
  if (t >= ev.drop && t < ev.cta) bass.addMono(I.bass(s % 2 ? R + 12 : R, BEAT / 2 * 0.8, { sub: 0.8 }), t, 0.6);
  else if (b >= 3 && (s === 0 || s === 3 || s === 4 || s === 6)) bass.addMono(I.bass(s === 4 ? R + 7 : R, BEAT / 2 * 0.9), t, 0.55);
  else if (b < 3 && s === 0) bass.addMono(I.bass(R, BAR(), { sub: 1 }), t, 0.5);
});
function BAR() { return BEAT * 4 * 0.95; }
bass.addMono(I.bass(m('A2'), 2.5, { bright: 0.3, sub: 1 }), ev.end - 2, 0.0);

// ---------- pads ----------
for (const c of sc.chords) {
  if (c.t0 >= ev.end) continue;
  const t1 = c.t1 > ev.breath && c.t0 < ev.breath ? ev.breath : c.t1;
  const opts = c.t0 >= ev.drop && c.t0 < ev.cta ? { cutoff: 2600, attack: 0.05 } : { cutoff: c.t0 >= ev.t3 && c.t0 < ev.rivals ? 700 : 1100, attack: 0.4, release: 1.2 };
  for (const n of c.notes) { const { L, R } = I.padNote(n, t1 - c.t0, opts); pad.addStereo(L, R, c.t0, 0.09); }
}

// ---------- intro: music box under the title, pops on "1, 2, 3" ----------
for (const w of sc.title) { const mb = I.musicBox(m(w.big ? 'A5' : 'E5')); keys.addMono(mb, w.t, 0.25); verb.addMono(mb, w.t, 0.2); }
sc.three.forEach((t, i) => fx.addMono(I.pop(1 + i * 0.25), t, 0.5, (i - 1) * 0.4));

// ---------- teoría 1: every brick is a marimba note ----------
for (const b of sc.bricks) {
  const x = I.marimba(b.midi, { thock: 0.4 });
  keys.addMono(x, b.t, 0.5, (b.i % 2 ? 0.25 : -0.25)); verb.addMono(x, b.t, 0.15);
  fx.addMono(I.woodTick(0.7), b.t, 0.15);
}

// ---------- teoría 2: hooves on 8ths, a guitar arpeggio, a plop of bosta on beat 4 ----------
sc.hooves.forEach((t, i) => fx.addMono(I.woodTick(i % 2 ? 1.25 : 0.95), t, i % 2 ? 0.22 : 0.32, i % 2 ? 0.2 : -0.2));
clock.eachStep(8, 14, 8, (t, b, s) => {
  if (t >= ev.t3) return;
  const c = sc.chordAt(t); if (!c) return;
  const tones = [c.notes[0], c.notes[1], c.notes[2], c.notes[1] + 12];
  const g = I.guitar(tones[s % 4] + (s >= 4 ? 12 : 0), BEAT, { bright: 0.6, seed: s + b * 8 });
  gtr.addMono(g, t, 0.35, s % 2 ? 0.3 : -0.3); dly.addMono(g, t, 0.06);
});
for (const p of sc.plops) { fx.addMono(I.thud(55, 0.12), p.t, 0.7); fx.addMono(I.pop(0.45), p.t, 0.35); }

// ---------- teoría 3: bubbles on the offbeats ----------
for (const b of sc.bubbles) { const x = I.musicBox(b.midi, { decay: 0.25 }); keys.addMono(x, b.t, 0.12, (b.x - 0.5) * 1.2); fx.addMono(I.pop(1.6), b.t, 0.12, (b.x - 0.5) * 1.2); }

// ---------- drop: brass stamps each letter, then the hook ----------
for (const l of sc.letters) {
  const a = I.brassNote(l.midi, BEAT / 2 * 0.8, { stab: 1 });
  brass.addStereo(a.L, a.R, l.t, 0.35); verb.addStereo(a.L, a.R, l.t, 0.1);
  fx.addMono(I.thud(120, 0.06), l.t, 0.35);
}
fx.addMono(I.subBoom(2.2), ev.drop, 0.7);
for (const n of sc.brass) {
  const a = I.brassNote(n.midi, n.dur * 0.92), b = I.brassNote(n.midi - 12, n.dur * 0.92, { bright: 0.8, seed: 99 });
  brass.addStereo(a.L, a.R, n.t, 0.3); brass.addStereo(b.L, b.R, n.t, 0.16);
  verb.addStereo(a.L, a.R, n.t, 0.12); dly.addStereo(a.L, a.R, n.t, 0.05);
}
// caption swooshes
for (const c of sc.captions) fx.addMono(I.paperFwip(1.0, Math.round(c.t * 10)), c.t - 0.03, 0.18);

// ---------- the voiceover (the user's recording); the music ducks under it ----------
const vo = MIX.loadAudio(path.join(__dirname, sc.VO.file), { at: sc.VO.at, gain: 1, length: DURATION });
vo.n = N; // same length as the music buses

// ---------- mix ----------
MIX.sidechain([pad, bass], kicks.filter((t) => t >= ev.drop && t < ev.cta));
const stems = {
  drums, bass, pad, keys, gtr, brass, fx,
  verb: reverb(verb, { room: 0.8, damp: 0.3 }),
  dly: pingpong(dly, BEAT * 0.75, 0.35, 3500),
};
const GAIN = { vo: 1.6, drums: 0.4, bass: 0.7, pad: 2.4, keys: 0.9, gtr: 2.2, brass: 2.0, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
MIX.duck([drums, bass, pad, keys, gtr, brass, stems.verb, stems.dly], vo, { depth: 0.55, release: 0.35, threshold: 0.03 });
stems.vo = vo;
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 22);
MIX.gate(mix, ev.breath, ev.drop - 0.2); // the voice's "y la..." leads into the drop
MIX.fadeOut(mix, DURATION - 1.8, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS` : ''})`);
