// THE SCORE — single source of truth for music AND picture.
// "¿Por qué a los de Boca les dicen BOSTEROS?" — 3 teorías, 9:16, 120 BPM (1 compás = 2 s).
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, placeBar, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const STYLE = 'flat';
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const clock = makeClock({ bpm: 120, offset: 0.5 });
  const { T, BEAT } = clock;
  const DURATION = T(21) + 1.2; // ~43.7 s

  const ev = {
    t1: T(3), // teoría 1: ladrillos
    t2: T(7), // teoría 2: caballos
    t3: T(11), // teoría 3: Riachuelo
    rivals: T(15),
    breath: T(15, 3),
    drop: T(16),
    cta: T(19),
    end: T(21),
  };

  const S = {
    intro: [0, ev.t1],
    ladrillos: [ev.t1, ev.t2],
    caballos: [ev.t2, ev.t3],
    riachuelo: [ev.t3, ev.rivals],
    rivales: [ev.rivals, ev.drop],
    orgullo: [ev.drop, ev.cta],
    outro: [ev.cta, DURATION],
  };

  // ---------- harmony: Am F C E (a little tango-minor colour) ----------
  const prog = ['Am', 'F', 'C', 'E'];
  const rows = [];
  for (let b = 0; b < 21; b++) rows.push([b, 0, 4, prog[b % 4]]);
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    E: { notes: ['G#3', 'B3', 'E4'], bass: 'E1' },
  }, rows);

  // ---------- intro: title words stamp on beats ----------
  const title = [
    { w: '¿POR QUÉ', t: T(0, 0) },
    { w: 'A LOS DE BOCA', t: T(0, 2) },
    { w: 'LES DICEN', t: T(1, 0) },
    { w: 'BOSTEROS?', t: T(1, 2), big: true },
  ];
  const three = [T(2, 1), T(2, 2), T(2, 3)]; // "3 teorías": 1, 2, 3 pop on beats

  // ---------- teoría 1: one brick per beat, each brick plays a marimba note ----------
  const BRICK_NOTES = ['A4', 'C5', 'E5', 'A5', 'F5', 'E5', 'C5', 'A4', 'G4', 'C5', 'E5', 'G#4', 'B4', 'E5'];
  const bricks = [];
  { let k = 0; clock.eachStep(3, 7, 4, (t, b, s) => { if (t < T(3, 2) || t >= T(6, 3) + 1e-6) return; bricks.push({ t, midi: m(BRICK_NOTES[k % BRICK_NOTES.length]), i: k++ }); }); }

  // ---------- teoría 2: hooves on 8ths, plops of bosta on beat 4 ----------
  const hooves = [];
  clock.eachStep(7, 11, 8, (t) => hooves.push(t));
  const plops = [T(7, 3), T(8, 3), T(9, 3), T(10, 1)].map((t, i) => ({ t, i }));

  // ---------- teoría 3: stink waves on beats 1 & 3, bubbles on offbeat 8ths ----------
  const rng = U.mulberry32(77);
  const stink = [];
  clock.eachStep(11, 15, 4, (t, b, s) => { if (s % 2 === 0) stink.push({ t, x: 0.2 + rng() * 0.6 }); });
  const bubbles = [];
  clock.eachStep(11, 15, 8, (t, b, s) => { if (s % 2 === 1) bubbles.push({ t, x: 0.08 + rng() * 0.84, r: 10 + rng() * 14, midi: m(['A5', 'C6', 'E6', 'B5'][Math.floor(rng() * 4)]) }); });

  // ---------- drop: B-O-S-T-E-R-O letters stamp on 8ths, the brass plays them ----------
  const LETTER_NOTES = ['A4', 'C5', 'E5', 'A5', 'G#5', 'E5', 'A5'];
  const letters = 'BOSTERO'.split('').map((ch, i) => ({ ch, i, t: T(16) + i * BEAT / 2, midi: m(LETTER_NOTES[i]) }));
  const brass = [
    ...placeBar(clock, [['A4', 0, 2], ['C5', 2, 2], ['E5', 4, 3], ['D5', 7, 1]], 17),
    ...placeBar(clock, [['C5', 0, 2], ['B4', 2, 2], ['G#4', 4, 2], ['B4', 6, 2]], 18),
    { t: T(19), dur: 2, midi: m('A4') },
  ];

  // ---------- captions (Spanish, rioplatense) ----------
  const cap = (t, end, text, o = {}) => ({ t, end, text, ...o });
  const captions = [
    cap(T(4, 0), T(5, 0), 'Cerca de donde jugaba Boca había hornos de ladrillos...'),
    cap(T(5, 0), T(6, 3), '...que usaban bosta de caballo. El olor llegaba a todo el barrio.'),
    cap(T(8, 0), T(9, 0), 'La Boca, 1900: puerto, carros y tranvías tirados por caballos.'),
    cap(T(9, 0), T(10, 3), 'Las calles del barrio quedaban llenas de bosta.'),
    cap(T(12, 0), T(13, 0), 'Mataderos y curtiembres tiraban sus desechos al Riachuelo.'),
    cap(T(13, 0), T(14, 3), 'El olor quedó pegado al barrio. Y era una burla a un barrio pobre de inmigrantes.'),
  ];
  const headers = [
    { t: ev.t1, n: 1, title: 'LA FÁBRICA DE LADRILLOS' },
    { t: ev.t2, n: 2, title: 'LOS CABALLOS DEL BARRIO' },
    { t: ev.t3, n: 3, title: 'EL RIACHUELO' },
  ];

  const markers = {
    titulo: { t: T(1, 2), sync: 'av' },
    teoria1: { t: ev.t1, sync: 'av' },
    teoria2: { t: ev.t2, sync: 'av' },
    teoria3: { t: ev.t3, sync: 'av' },
    rivales: ev.rivals,
    breath: ev.breath,
    drop: { t: ev.drop, sync: 'av' },
    cta: { t: ev.cta, sync: 'av' },
  };

  const subtitles = [
    { t: T(0, 0), end: T(2, 0), text: '¿Por qué a los de Boca les dicen bosteros?' },
    { t: T(2, 0), end: T(3, 0), text: 'Hay 3 teorías.' },
    ...headers.map((h) => ({ t: h.t, end: h.t + 2, text: `Teoría ${h.n}: ${h.title.toLowerCase()}` })),
    ...captions.map((c) => ({ t: c.t, end: c.end, text: c.text })),
    { t: ev.rivals, end: ev.drop, text: 'El apodo lo pusieron los rivales para burlarse...' },
    { t: ev.drop, end: ev.cta, text: '...y la hinchada lo adoptó con orgullo.' },
    { t: ev.cta, end: ev.end, text: '¿Cuál creés que es la verdadera? Comentá 1, 2 o 3.' },
  ];

  const SCORE = { FPS, FORMAT, STYLE, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, title, three, bricks, hooves, plops, stink, bubbles, letters, brass, captions, headers, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
