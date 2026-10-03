import GenerationReading from '../../models/GenerationReading.js';
import { hashRand } from './random.js';

export const SLOT_MS = 15 * 60 * 1000;
export const READINGS_PER_INSTALLATION = 7 * 24 * 4; // 672: 7 days at 15 minutes
export const BATCH_SIZE = 5000;

const LK_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Sri Lanka is UTC+5:30
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const SUNRISE_H = 6;
const SUNSET_H = 18;

const round = (v, dp) => Math.round(v * 10 ** dp) / 10 ** dp;

// Current 15-minute boundary (UTC).
export function currentBoundary(now = Date.now()) {
  return Math.floor(now / SLOT_MS) * SLOT_MS;
}

// One installation's readings, oldest first, ending at endMs (inclusive).
// All random values are derived from (installation index, time), so the same
// installation and time slot always give the same reading.
export function generateReadings(installationId, index, capacityKw, endMs) {
  const readings = [];
  let energy = 200 + hashRand(index, 1) * 1800; // kWh already on the meter before the window

  for (let s = 0; s < READINGS_PER_INSTALLATION; s += 1) {
    const ts = endMs - (READINGS_PER_INSTALLATION - 1 - s) * SLOT_MS;
    const slot = Math.floor(ts / SLOT_MS);
    const local = ts + LK_OFFSET_MS;
    const day = Math.floor(local / DAY_MS);
    const hour = (local % DAY_MS) / HOUR_MS;

    // 0 at night, rising after sunrise, peak at midday, falling to 0 by sunset.
    const daylight =
      hour > SUNRISE_H && hour < SUNSET_H
        ? Math.sin((Math.PI * (hour - SUNRISE_H)) / (SUNSET_H - SUNRISE_H))
        : 0;
    const cloud = 0.6 + 0.4 * hashRand(index, 2, day); // per-day weather
    const noise = 1 + (hashRand(index, 3, slot) - 0.5) * 0.1; // +/- 5%

    const powerKw = Math.min(capacityKw, capacityKw * 0.9 * daylight * cloud * noise);
    energy += powerKw * 0.25; // kW for 15 minutes = kWh
    const voltage = 230 + (hashRand(index, 4, slot) - 0.5) * 8; // 226 to 234 V

    readings.push({
      installationId,
      timestamp: new Date(ts),
      powerKw: round(powerKw, 3),
      energyKwh: round(energy, 3),
      voltage: round(voltage, 1),
    });
  }

  return readings;
}

// Collects readings and inserts them in batches of 5000 (never one by one).
export async function seedReadings(installations, capacities, endMs = currentBoundary()) {
  let batch = [];
  let total = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    await GenerationReading.insertMany(batch, { ordered: false, lean: true });
    total += batch.length;
    batch = [];
  };

  for (let i = 0; i < installations.length; i += 1) {
    const inst = installations[i];
    for (const reading of generateReadings(inst._id, i + 1, capacities.get(String(inst._id)), endMs)) {
      batch.push(reading);
      if (batch.length >= BATCH_SIZE) await flush();
    }
    if ((i + 1) % 20 === 0) console.log(`  readings: ${i + 1}/${installations.length} installations generated`);
  }
  await flush();

  return { total, endMs };
}
