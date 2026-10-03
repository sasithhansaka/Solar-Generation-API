import { Types } from 'mongoose';

export const SEED = 20261003;

// Seeded PRNG (mulberry32): the same seed always gives the same sequence.
export function mulberry32(seed) {
  let a = seed | 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random value in [0, 1) derived from integers, so a given
// (installation, time slot) always produces the same value.
export function hashRand(...ints) {
  let h = 2166136261 ^ SEED;
  for (const n of ints) {
    h ^= n | 0;
    h = Math.imul(h, 16777619);
  }
  return mulberry32(h)();
}

// Fixed ObjectIds, so re-seeding keeps the same ids (and the same device tokens).
const KIND_PREFIX = { province: 1, district: 2, substation: 3, installation: 4, user: 5 };

export function makeId(kind, n) {
  const hex = KIND_PREFIX[kind].toString(16).padStart(4, '0') + n.toString(16).padStart(20, '0');
  return new Types.ObjectId(hex);
}
