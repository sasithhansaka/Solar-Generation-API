import SolarInstallation from '../../models/SolarInstallation.js';
import { SEED, makeId, mulberry32 } from './random.js';

export const INSTALLATION_COUNT = 240;

const round6 = (v) => Math.round(v * 1e6) / 1e6;

// Spread installations round-robin across substations. Coordinates sit within about
// 11 km of the district centre. Capacity (kW) is not part of the data model, so it is
// returned separately and only used to cap powerKw when readings are generated.
export function buildInstallations(substations, substationInfo) {
  const rand = mulberry32(SEED);
  const installations = [];
  const capacities = new Map();

  for (let i = 0; i < INSTALLATION_COUNT; i += 1) {
    const substation = substations[i % substations.length];
    const district = substationInfo.get(String(substation._id));
    const n = i + 1;
    const doc = {
      _id: makeId('installation', n),
      name: `${district.name} Rooftop Solar ${String(n).padStart(3, '0')}`,
      meterId: `MTR-${String(n).padStart(6, '0')}`,
      inverterId: `INV-${String(n).padStart(6, '0')}`,
      latitude: round6(district.lat + (rand() - 0.5) * 0.2),
      longitude: round6(district.lng + (rand() - 0.5) * 0.2),
      substationId: substation._id,
    };
    installations.push(doc);
    capacities.set(String(doc._id), 3 + Math.floor(rand() * 16) * 0.5); // 3.0 to 10.5 kW
  }

  return { installations, capacities };
}

export async function seedInstallations(substations, substationInfo) {
  const built = buildInstallations(substations, substationInfo);
  await SolarInstallation.insertMany(built.installations);
  return built;
}
