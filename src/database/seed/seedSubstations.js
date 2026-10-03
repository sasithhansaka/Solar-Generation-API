import GridSubstation from '../../models/GridSubstation.js';
import { makeId } from './random.js';

// At least one substation per district; larger districts get more.
export function buildSubstations(districts, districtInfo) {
  const substations = [];
  const info = new Map();
  let n = 0;

  for (const district of districts) {
    const d = districtInfo.get(String(district._id));
    for (let k = 1; k <= d.substations; k += 1) {
      n += 1;
      const doc = {
        _id: makeId('substation', n),
        name: `${d.name} Grid Substation ${k}`,
        code: `GSS-${d.code}-${String(k).padStart(2, '0')}`,
        districtId: district._id,
      };
      substations.push(doc);
      info.set(String(doc._id), d);
    }
  }

  return { substations, info };
}

export async function seedSubstations(districts, districtInfo) {
  const built = buildSubstations(districts, districtInfo);
  await GridSubstation.insertMany(built.substations);
  return built;
}
