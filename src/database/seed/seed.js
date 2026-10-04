import { readFile, writeFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { nodeEnv, deviceTokenSecret } from '../../config/env.js';
import { connectDatabase } from '../../config/database.js';
import Province from '../../models/Province.js';
import District from '../../models/District.js';
import GridSubstation from '../../models/GridSubstation.js';
import SolarInstallation from '../../models/SolarInstallation.js';
import GenerationReading from '../../models/GenerationReading.js';
import User from '../../models/User.js';

const BATCH_SIZE = 5000;
const DATA_DIR = new URL('./data/', import.meta.url);
const DEVICE_TOKENS_FILE = new URL('../../../device-tokens.json', import.meta.url);

async function main() {
  if (nodeEnv === 'production' && !process.argv.includes('--force')) {
    throw new Error('Refusing to wipe a production database. Re-run with --force to confirm.');
  }
  if (!deviceTokenSecret) {
    throw new Error('DEVICE_TOKEN_SECRET is not set in .env (needed for device tokens).');
  }

  // Load the static JSON files.
  const data = {};
  for (const name of ['provinces', 'districts', 'substations', 'installations', 'users', 'readings']) {
    data[name] = JSON.parse(await readFile(new URL(`${name}.json`, DATA_DIR), 'utf8'));
  }

  await connectDatabase();
  console.log(`Seeding database "${mongoose.connection.name}" on ${mongoose.connection.host}`);

  // 1. Clear collections (children first), then make sure indexes exist.
  for (const model of [GenerationReading, SolarInstallation, GridSubstation, District, Province, User]) {
    await model.deleteMany({});
    await model.syncIndexes();
  }
  console.log('Cleared collections');

  // 2-6. Hierarchy and users, parents before children. Mongoose casts the id strings to ObjectIds.
  await Province.insertMany(data.provinces);
  console.log(`Provinces: ${data.provinces.length}`);

  await District.insertMany(data.districts);
  console.log(`Districts: ${data.districts.length}`);

  await GridSubstation.insertMany(data.substations);
  console.log(`Substations: ${data.substations.length}`);

  await SolarInstallation.insertMany(data.installations);
  console.log(`Installations: ${data.installations.length}`);

  await User.insertMany(data.users);
  console.log(`Users: ${data.users.length}`);
  data.users.forEach((u) => console.log(`  ${u.role.padEnd(8)} ${u.email}`));

  // 7. Readings, in batches of 5000. lean skips Mongoose casting, so convert the types here.
  let inserted = 0;
  for (let i = 0; i < data.readings.length; i += BATCH_SIZE) {
    const batch = data.readings.slice(i, i + BATCH_SIZE).map((r) => ({
      installationId: new mongoose.Types.ObjectId(r.installationId),
      timestamp: new Date(r.timestamp),
      powerKw: r.powerKw,
      energyKwh: r.energyKwh,
      voltage: r.voltage,
    }));
    await GenerationReading.insertMany(batch, { ordered: false, lean: true });
    inserted += batch.length;
  }
  console.log(`Readings: ${inserted}`);

  // One device JWT per installation. noTimestamp keeps the tokens identical on every run.
  const tokens = data.installations.map((inst) => ({
    installationId: inst._id,
    name: inst.name,
    meterId: inst.meterId,
    token: jwt.sign({ sub: inst._id, type: 'device' }, deviceTokenSecret, { noTimestamp: true }),
  }));
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
