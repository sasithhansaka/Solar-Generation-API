import District from '../../models/District.js';
import { GEOGRAPHY } from './geography.js';
import { makeId } from './random.js';

// Returns the district documents plus the geography row (code, centre, substation count)
// for each, so later steps can derive substations and coordinates.
export function buildDistricts(provinces) {
  const districts = [];
  const info = new Map();
  let n = 0;

  GEOGRAPHY.forEach((p, pi) => {
    for (const d of p.districts) {
      n += 1;
      const doc = { _id: makeId('district', n), name: d.name, provinceId: provinces[pi]._id };
      districts.push(doc);
      info.set(String(doc._id), d);
    }
  });

  return { districts, info };
}

export async function seedDistricts(provinces) {
  const built = buildDistricts(provinces);
  await District.insertMany(built.districts);
  return built;
}
