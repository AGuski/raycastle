export function hashSeed(input: string | number): number {
  let h = 0x811c9dc5;
  const s = String(input);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mixHash(...values: number[]): number {
  let h = 0;
  for (const v of values) {
    h = Math.imul(h ^ (v | 0), 0x85ebca6b);
    h ^= h >>> 13;
  }
  return (h >>> 0) || 1;
}

export function hash01(seed: number, x: number, y: number): number {
  const h = mixHash(seed, x, y);
  return (h & 0xffffff) / 0x1000000;
}

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = (seed >>> 0) || 1;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  nextInt(max: number): number {
    if (max <= 0) return 0;
    return Math.floor(this.next() * max);
  }

  fork(salt: number): SeededRng {
    return new SeededRng(mixHash(this.state, salt));
  }
}

export function chunkSeed(worldSeed: number, cx: number, cy: number): number {
  return mixHash(worldSeed, cx, cy);
}

/** Random 16-digit numeric seed (first digit 1–9, rest 0–9). */
export function randomDefaultSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const digits = Array.from(bytes, (b, i) => (i === 0 ? 1 + (b % 9) : b % 10));
  return digits.join('');
}
