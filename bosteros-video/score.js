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
  const DURATION = T(26) + 2; // 54.5 s, cut to the recorded voiceover

  const ev = {
    t1: T(3), // "Teoría uno" (voice 6.50)
    t2: T(8), // "Teoría dos" (voice 16.62)
    t3: T(13, 2), // "Teoría tres" (voice 27.65)
    rivals: T(18, 1), // "Lo cierto es que..." (voice 37.41)
    breath: T(20, 3), // the voice pauses 41.35-42.35
    drop: T(21), // "...y la hinchada de Boca lo adoptó con orgullo"
    adopto: T(21, 3),
    orgullo: T(22, 1),
    cta: T(23), // "¿Cuál creés que es la verdadera?" (voice 47.10)
    comment: T(25), // "Dejalo en los comentarios" (voice ~50.5)
    end: T(26),
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

  // ---------- the voiceover: the user's own recording, trimmed to 2.6-54.7 s of the take ----------
  const VO = { file: 'assets/vo_trim.wav', at: 0.82 };

  // ---------- harmony: Am F C E (a little tango-minor colour) ----------
  const prog = ['Am', 'F', 'C', 'E'];
  const rows = [];
  for (let b = 0; b < 26; b++) rows.push([b, 0, 4, prog[b % 4]]);
  const { chords, chordAt } = makeChords(clock, {
    Am: { notes: ['A3', 'C4', 'E4'], bass: 'A1' },
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    E: { notes: ['G#3', 'B3', 'E4'], bass: 'E1' },
  }, rows);

  // ---------- intro: title words stamp on beats ----------
  const title = [
    { w: '¿POR QUÉ', t: T(0, 2) },
    { w: 'A LOS DE BOCA', t: T(1, 0) },
    { w: 'LES DICEN', t: T(1, 1) },
    { w: 'BOSTEROS?', t: T(1, 2), big: true },
  ];
  const three = [T(2, 1), T(2, 2), T(2, 3)]; // "3 teorías": 1, 2, 3 pop on beats

  // ---------- teoría 1: one brick per beat, each brick plays a marimba note ----------
  const BRICK_NOTES = ['A4', 'C5', 'E5', 'A5', 'F5', 'E5', 'C5', 'A4', 'G4', 'C5', 'E5', 'G#4', 'B4', 'E5'];
  const bricks = [];
  { let k = 0; clock.eachStep(3, 8, 4, (t, b, s) => { if (t < T(3, 2) || t >= T(7, 2) + 1e-6) return; bricks.push({ t, midi: m(BRICK_NOTES[k % BRICK_NOTES.length]), i: k++ }); }); }

  // ---------- teoría 2: hooves on 8ths, plops of bosta on beat 4 ----------
  const hooves = [];
  clock.eachStep(8, 14, 8, (t) => { if (t < ev.t3) hooves.push(t); });
  const plops = [T(8, 3), T(9, 3), T(10, 3), T(11, 3), T(12, 3)].map((t, i) => ({ t, i }));

  // ---------- teoría 3: stink waves on beats 1 & 3, bubbles on offbeat 8ths ----------
  const rng = U.mulberry32(77);
  const stink = [];
  clock.eachStep(13, 19, 4, (t, b, s) => { if (t >= ev.t3 && t < ev.rivals && s % 2 === 0) stink.push({ t, x: 0.2 + rng() * 0.6 }); });
  const bubbles = [];
  clock.eachStep(13, 19, 8, (t, b, s) => { if (t >= ev.t3 && t < ev.rivals - 0.3 && s % 2 === 1) bubbles.push({ t, x: 0.08 + rng() * 0.84, r: 10 + rng() * 14, midi: m(['A5', 'C6', 'E6', 'B5'][Math.floor(rng() * 4)]) }); });

  // ---------- drop: B-O-S-T-E-R-O letters stamp on 8ths, the brass plays them ----------
  const LETTER_NOTES = ['A4', 'C5', 'E5', 'A5', 'G#5', 'E5', 'A5'];
  const letters = 'BOSTERO'.split('').map((ch, i) => ({ ch, i, t: ev.drop + i * BEAT / 2, midi: m(LETTER_NOTES[i]) }));
  const brass = [
    ...placeBar(clock, [['A4', 0, 2], ['C5', 2, 2], ['E5', 4, 3], ['D5', 7, 1]], 22),
    { t: T(23), dur: 2, midi: m('A4') },
  ];

  // ---------- captions (Spanish, rioplatense) ----------
  const cap = (t, end, text, o = {}) => ({ t, end, text, ...o });
  const captions = [
    // timed to the recorded voice (film seconds)
    cap(8.75, 11.7, 'Cerca de la cancha había hornos de ladrillos...'),
    cap(11.7, 16.2, '...que usaban bosta de caballo, y el olor llegaba a todo el barrio.'),
    cap(17.5, 23.5, 'A principios del siglo XX, La Boca estaba llena de carros y tranvías tirados por caballos.'),
    cap(23.6, 27.2, 'Las calles quedaban llenas de bosta.'),
    cap(28.5, 32.0, 'Mataderos y curtiembres tiraban sus desechos al Riachuelo...'),
    cap(32.0, 36.6, '...y el olor quedó pegado a un barrio pobre de inmigrantes.'),
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
    { t: 1.4, end: 4.3, text: '¿Por qué a los hinchas de Boca les dicen bosteros?' },
    { t: 4.3, end: 6.3, text: 'Hay tres teorías.' },
    { t: 6.5, end: 8.6, text: 'Teoría uno.' },
    captions[0], captions[1],
    { t: 16.6, end: 17.5, text: 'Teoría dos.' },
    captions[2], captions[3],
    { t: 27.6, end: 28.5, text: 'Teoría tres.' },
    captions[4], captions[5],
    { t: 37.4, end: 41.5, text: 'Lo cierto es que el apodo lo pusieron los rivales para burlarse...' },
    { t: 42.3, end: 45.6, text: '...y la hinchada de Boca lo adoptó con orgullo.' },
    { t: 47.1, end: 49.5, text: '¿Cuál creés que es la verdadera?' },
    { t: 50.4, end: 52.8, text: 'Dejalo en los comentarios.' },
  ];

  const SCORE = { VO, FPS, FORMAT, STYLE, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, title, three, bricks, hooves, plops, stink, bubbles, letters, brass, captions, headers, markers, subtitles };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
