import GenerationReading from '../models/GenerationReading.js';
import SolarInstallation from '../models/SolarInstallation.js';
import GridSubstation from '../models/GridSubstation.js';
import { getDistrictForUser } from './districtService.js';

const LK_OFFSET_MS = 5.5 * 60 * 60 * 1000; // Sri Lanka time, UTC+5:30
const DAY_MS = 24 * 60 * 60 * 1000;

const round3 = (v) => Math.round(v * 1000) / 1000;

// Midnight (00:00) in Sri Lanka time at the start of "today", as a UTC instant.
export function startOfSriLankaDay(now) {
  return new Date(Math.floor((now.getTime() + LK_OFFSET_MS) / DAY_MS) * DAY_MS - LK_OFFSET_MS);
}

// Aggregate generation for a district: total of every installation's latest power, and the
// energy generated since Sri Lanka midnight. 404 if the district does not exist, 403 if
// outside the user's jurisdiction. `now` is injectable so the result can be tested.
export async function getDistrictGenerationSummary(districtId, user, now = new Date()) {
  await getDistrictForUser(districtId, user);

  // Installations in the district (district -> substations -> installations).
  const substationIds = await GridSubstation.distinct('_id', { districtId });
  const installationIds = await SolarInstallation.distinct('_id', { substationId: { $in: substationIds } });

  const todayStart = startOfSriLankaDay(now);
  const todayOnly = (field) => ({ $cond: [{ $gte: ['$timestamp', todayStart] }, field, null] });

  // One pipeline for the whole district (not one query per installation):
  // 1. per installation, oldest to newest, take the latest powerKw and the lowest and highest
  //    energyKwh since midnight. energyKwh is cumulative, so the lowest value today is the
  //    first reading of the day and the highest is the last: last minus first = energy today.
  // 2. add the installations up.
  const [totals] = await GenerationReading.aggregate([
    { $match: { installationId: { $in: installationIds }, timestamp: { $lte: now } } },
    { $sort: { installationId: -1, timestamp: 1 } }, // walks the { installationId, timestamp } index backwards
    {
      $group: {
        _id: '$installationId',
        latestPowerKw: { $last: '$powerKw' },
        firstEnergyToday: { $min: todayOnly('$energyKwh') },
        lastEnergyToday: { $max: todayOnly('$energyKwh') },
      },
    },
    {
      $group: {
        _id: null,
        currentPowerKw: { $sum: '$latestPowerKw' },
        todayEnergyKwh: {
          $sum: {
            $cond: [{ $ne: ['$firstEnergyToday', null] }, { $subtract: ['$lastEnergyToday', '$firstEnergyToday'] }, 0],
          },
        },
      },
    },
  ]);

  return {
    districtId: String(districtId),
    currentPowerKw: round3(totals?.currentPowerKw ?? 0),
    todayEnergyKwh: round3(totals?.todayEnergyKwh ?? 0),
    installationCount: installationIds.length,
    generatedAt: now.toISOString(),
  };
}
