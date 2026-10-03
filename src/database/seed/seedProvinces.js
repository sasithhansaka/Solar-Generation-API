import Province from '../../models/Province.js';
import { GEOGRAPHY } from './geography.js';
import { makeId } from './random.js';

export function buildProvinces() {
  return GEOGRAPHY.map((p, i) => ({ _id: makeId('province', i + 1), name: p.province }));
}

export async function seedProvinces() {
  const provinces = buildProvinces();
  await Province.insertMany(provinces);
  return provinces;
}
