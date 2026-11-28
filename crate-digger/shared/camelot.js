// Musical key, Camelot and BPM compatibility.

// Camelot number -> [minor key, major key]
const WHEEL = {
  1: ['G#m', 'B'], 2: ['D#m', 'F#'], 3: ['A#m', 'C#'], 4: ['Fm', 'G#'],
  5: ['Cm', 'D#'], 6: ['Gm', 'A#'], 7: ['Dm', 'F'], 8: ['Am', 'C'],
  9: ['Em', 'G'], 10: ['Bm', 'D'], 11: ['F#m', 'A'], 12: ['C#m', 'E'],
};
const DISPLAY = {
  'G#m': 'A♭ minor', 'D#m': 'E♭ minor', 'A#m': 'B♭ minor', Fm: 'F minor', Cm: 'C minor', Gm: 'G minor',
  Dm: 'D minor', Am: 'A minor', Em: 'E minor', Bm: 'B minor', 'F#m': 'F♯ minor', 'C#m': 'C♯ minor',
  B: 'B major', 'F#': 'F♯ major', 'C#': 'D♭ major', 'G#': 'A♭ major', 'D#': 'E♭ major', 'A#': 'B♭ major',
  F: 'F major', C: 'C major', G: 'G major', D: 'D major', A: 'A major', E: 'E major',
};
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E', 'E#': 'F', 'B#': 'C' };

const CODE_BY_KEY = {};
for (const [n, [minor, major]] of Object.entries(WHEEL)) {
  CODE_BY_KEY[minor] = `${n}A`;
  CODE_BY_KEY[major] = `${n}B`;
}

/**
 * Parse any common key notation into a Camelot code ("8A").
 * Accepts Camelot (8A), Open Key (1m / 1d), and musical keys (Am, A minor, F#m, Gb maj, Ebmin).
 */
export function toCamelot(input) {
  if (input == null) return null;
  let s = String(input).trim().replace(/♯/g, '#').replace(/♭/g, 'b');
  if (!s) return null;
  let m = s.match(/^0?(\d{1,2})\s*([AB])$/i);
  if (m) {
    const n = Number(m[1]);
    return n >= 1 && n <= 12 ? `${n}${m[2].toUpperCase()}` : null;
  }
  m = s.match(/^0?(\d{1,2})\s*([dm])$/i);
  if (m) {
    const n = Number(m[1]);
    if (n < 1 || n > 12) return null;
    const c = ((n - 1 + 7) % 12) + 1; // Open Key 1 = Camelot 8
    return `${c}${m[2].toLowerCase() === 'm' ? 'A' : 'B'}`;
  }
  m = s.match(/^([A-Ga-g])\s*([#b]?)\s*([a-zA-Z]*)$/);
  if (!m) return null;
  let root = m[1].toUpperCase() + (m[2] || '');
  root = FLAT_TO_SHARP[root] || root;
  const suffix = m[3] === 'M' ? 'maj' : m[3].toLowerCase();
  let minor;
  if (['m', 'mi', 'min', 'minor'].includes(suffix)) minor = true;
  else if (['', 'maj', 'ma', 'major'].includes(suffix)) minor = false;
  else return null;
  return CODE_BY_KEY[minor ? `${root}m` : root] || null;
}

export function parseCode(code) {
  const m = String(code || '').match(/^(\d{1,2})([AB])$/);
  return m ? { n: Number(m[1]), letter: m[2] } : null;
}

export function camelotToOpenKey(code) {
  const c = parseCode(code);
  if (!c) return null;
  return `${((c.n - 8 + 12) % 12) + 1}${c.letter === 'A' ? 'm' : 'd'}`;
}

export function camelotToMusical(code) {
  const c = parseCode(code);
  if (!c) return null;
  return DISPLAY[WHEEL[c.n][c.letter === 'A' ? 0 : 1]];
}

/** Format a stored Camelot code for display in the preferred notation. */
export function formatKey(code, notation = 'camelot') {
  if (!code) return '';
  if (notation === 'openkey') return camelotToOpenKey(code) || code;
  if (notation === 'musical') return camelotToMusical(code) || code;
  return code;
}

const wrap = (n) => ((n - 1 + 120) % 12) + 1;

/**
 * Harmonic relationship between two Camelot codes.
 * Returns { tier: 'strong'|'partial'|'weak', label, why } or null when a key is missing.
 */
export function harmonic(a, b) {
  const x = parseCode(a);
  const y = parseCode(b);
  if (!x || !y) return null;
  if (x.n === y.n && x.letter === y.letter) return { tier: 'strong', label: 'Same key', why: `${a} and ${b} are the same key.` };
  if (x.letter === y.letter && (wrap(x.n + 1) === y.n || wrap(x.n - 1) === y.n)) {
    const dir = wrap(x.n + 1) === y.n ? 'up' : 'down';
    return { tier: 'strong', label: 'Adjacent key', why: `${b} is one step ${dir} the wheel from ${a} (a perfect fifth ${dir === 'up' ? 'up' : 'down'}).` };
  }
  if (x.n === y.n) {
    return { tier: 'strong', label: x.letter === 'A' ? 'Relative major' : 'Relative minor', why: `${b} is the relative ${y.letter === 'B' ? 'major' : 'minor'} of ${a}: same notes, different mood.` };
  }
  if (x.letter === y.letter && wrap(x.n + 2) === y.n) return { tier: 'partial', label: 'Energy boost (+2)', why: `${b} is two steps up from ${a} (a whole tone up). Works as a deliberate lift.` };
  if (x.letter === y.letter && wrap(x.n + 7) === y.n) return { tier: 'partial', label: 'Semitone lift (+7)', why: `${b} is a semitone above ${a}. A classic key-change lift; use sparingly.` };
  if (x.letter === 'A' && y.letter === 'B' && wrap(x.n + 1) === y.n) return { tier: 'partial', label: 'Diagonal (minor → major)', why: `${b} is one step up and across from ${a}. Brighter shift.` };
  if (x.letter === 'B' && y.letter === 'A' && wrap(x.n - 1) === y.n) return { tier: 'partial', label: 'Diagonal (major → minor)', why: `${b} is one step down and across from ${a}. Darker shift.` };
  if (x.letter === y.letter && wrap(x.n - 2) === y.n) return { tier: 'partial', label: 'Energy drop (−2)', why: `${b} is two steps down from ${a}. Works as a deliberate cool-down.` };
  return { tier: 'weak', label: 'Clashing key', why: `${a} and ${b} share few notes. Expect a clash unless you mix over a breakdown.` };
}

/**
 * Tempo relationship between a reference BPM and a candidate BPM.
 * Considers 1×, 2× and ½× relationships but reports which applies.
 */
export function tempo(refBpm, bpm, tolerancePct = 6) {
  const a = Number(refBpm);
  const b = Number(bpm);
  if (!(a > 0) || !(b > 0)) return null;
  const options = [
    { factor: 1, rel: 'Direct', bpm: b },
    { factor: 2, rel: 'Half-time', bpm: b * 2 },
    { factor: 0.5, rel: 'Double-time', bpm: b / 2 },
  ].map((o) => ({ ...o, pct: ((o.bpm - a) / a) * 100 }));
  options.sort((p, q) => Math.abs(p.pct) - Math.abs(q.pct) || p.factor - q.factor);
  // Prefer a direct match when it is within tolerance even if a multiple is closer.
  const direct = options.find((o) => o.factor === 1);
  const best = Math.abs(direct.pct) <= tolerancePct ? direct : options[0];
  const within = Math.abs(best.pct) <= tolerancePct;
  const pct = Math.round(best.pct * 10) / 10;
  let tier;
  if (within && best.factor === 1) tier = Math.abs(pct) <= tolerancePct / 2 ? 'strong' : 'partial';
  else if (within) tier = 'partial';
  else tier = 'weak';
  const sign = pct > 0 ? '+' : '';
  const why = best.factor === 1
    ? `${b} BPM is ${sign}${pct}% from ${a} BPM.`
    : `${b} BPM is a ${best.rel.toLowerCase()} relationship to ${a} BPM (${b} × ${best.factor} = ${Math.round(best.bpm * 10) / 10}, ${sign}${pct}%). Check the groove before relying on it.`;
  return { tier, factor: best.factor, relation: best.rel, pct, within, why, diff: Math.round((b - a) * 10) / 10 };
}

const RANK = { strong: 3, partial: 2, weak: 1 };

/** Combined match between a reference track and a candidate. */
export function matchTracks(ref, cand, tolerancePct = 6) {
  const h = harmonic(ref.camelot, cand.camelot);
  const t = tempo(ref.bpm, cand.bpm, tolerancePct);
  if (!h && !t) return null;
  let overall;
  if (h && t) {
    const r = Math.min(RANK[h.tier], RANK[t.tier]);
    overall = r === 3 ? 'strong' : r === 2 ? 'partial' : 'weak';
  } else {
    // Missing one dimension: never better than partial.
    const r = RANK[(h || t).tier];
    overall = r >= 2 ? 'partial' : 'weak';
  }
  const score = (h ? RANK[h.tier] * 10 : 0) + (t ? RANK[t.tier] * 10 - Math.min(Math.abs(t.pct), 30) / 3 : 0);
  return { overall, harmonic: h, tempo: t, score };
}

export const CAMELOT_CODES = Object.keys(WHEEL).flatMap((n) => [`${n}A`, `${n}B`]);
