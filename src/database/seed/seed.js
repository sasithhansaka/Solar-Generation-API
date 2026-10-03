import { writeFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { nodeEnv, deviceTokenSecret } from '../../config/env.js';
import { connectDatabase } from '../../config/database.js';
import GenerationReading from '../../models/GenerationReading.js';
import SolarInstallation from '../../models/SolarInstallation.js';
import GridSubstation from '../../models/GridSubstation.js';
import District from '../../models/District.js';
import Province from '../../models/Province.js';
import User from '../../models/User.js';
import { seedProvinces } from './seedProvinces.js';
import { seedDistricts } from './seedDistricts.js';
import { seedSubstations } from './seedSubstations.js';
import { seedInstallations } from './seedInstallations.js';
import { seedUsers, USER_PASSWORD } from './seedUsers.js';
import { seedReadings } from './seedReadings.js';

const DEVICE_TOKENS_FILE = new URL('../../../device-tokens.json', import.meta.url);

function createDeviceTokens(installations) {
  // noTimestamp keeps tokens identical between runs (ids are deterministic too).
  return installations.map((inst) => ({
    installationId: String(inst._id),
    name: inst.name,
    meterId: inst.meterId,
    token: jwt.sign({ sub: String(inst._id), type: 'device' }, deviceTokenSecret, {
      noTimestamp: true,
    }),
  }));
}

async function main() {
  if (nodeEnv === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to wipe a production database. Re-run with --force to confirm.');
  }
  if (!deviceTokenSecret) {
    throw new Error('DEVICE_TOKEN_SECRET is not set in .env (needed for device tokens).');
  }

  await connectDatabase();
  console.log(`Seeding database "${mongoose.connection.name}" on ${mongoose.connection.host}`);

  // 1. Clear collections (children first), then make sure indexes exist.
  const models = [GenerationReading, SolarInstallation, GridSubstation, District, Province, User];
  for (const model of models) {
    await model.deleteMany({});
    await model.syncIndexes();
  }
  console.log('Cleared collections');

  // 2-5. Hierarchy, parents before children.
  const provinces = await seedProvinces();
  console.log(`Provinces: ${provinces.length}`);

  const { districts, info: districtInfo } = await seedDistricts(provinces);
  console.log(`Districts: ${districts.length}`);

  const { substations, info: substationInfo } = await seedSubstations(districts, districtInfo);
  console.log(`Substations: ${substations.length}`);

  const { installations, capacities } = await seedInstallations(substations, substationInfo);
  console.log(`Installations: ${installations.length}`);

  // 6. Users.
  const users = await seedUsers(provinces, districts);
  console.log(`Users: ${users.length} (password for all: ${USER_PASSWORD})`);
  users.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));

  // 7. Readings (batches of 5000).
  const { total, endMs } = await seedReadings(installations, capacities);
  console.log(`Readings: ${total} (latest ${new Date(endMs).toISOString()})`);

  // Device tokens for the demo / Postman.
  const tokens = createDeviceTokens(installations);
  await writeFile(DEVICE_TOKENS_FILE, JSON.stringify(tokens, null, 2) + '\n');
  console.log(`Wrote ${tokens.length} device tokens to device-tokens.json`);
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (err) => {
    console.error('Seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
