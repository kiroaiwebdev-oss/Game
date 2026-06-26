// rng.js
// Tiny seeded pseudo-random generator (mulberry32) so generated levels are
// reproducible: the same seed always yields the same level. Pure, testable.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng, minInclusive, maxExclusive) {
  return minInclusive + Math.floor(rng() * (maxExclusive - minInclusive));
}

export function pick(rng, arr) {
  return arr[randInt(rng, 0, arr.length)];
}

export function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
