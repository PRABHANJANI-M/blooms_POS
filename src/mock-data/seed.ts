/** Deterministic pseudo-random generator so demo data is identical on every reload. */
export const createRng = (seed = 20261104) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

export const rng = createRng();

export const pick = <T,>(list: readonly T[], r: () => number = rng): T => list[Math.floor(r() * list.length)];
export const between = (min: number, max: number, r: () => number = rng): number => min + Math.floor(r() * (max - min + 1));
