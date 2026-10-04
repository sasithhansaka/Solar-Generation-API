import GenerationReading from '../models/GenerationReading.js';
import SolarInstallation from '../models/SolarInstallation.js';
import GridSubstation from '../models/GridSubstation.js';
import District from '../models/District.js';
import Province from '../models/Province.js';
import { conflict, invalidQuery, notFound } from '../utils/errors.js';
import { assertCanAccess, getScopedInstallationIds } from './authorizationService.js';
import { getInstallationForUser } from './installationLookup.js';

export function getLastReading(installationId) {
  return GenerationReading.findOne({ installationId }).sort({ timestamp: -1 }).lean();
}

function timeWindow({ from, to }) {
  if (!from && !to) return {};
  const range = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  return { timestamp: range };
}

async function queryReadings(filter, sort, { skip, limit }) {
  const [items, total] = await Promise.all([
    GenerationReading.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    GenerationReading.countDocuments(filter),
  ]);
  return { items, total };
}

export async function listInstallationReadings(installationId, query, user) {
  await getInstallationForUser(installationId, user);

  const filter = { installationId, ...timeWindow(query) };
  return queryReadings(filter, { timestamp: query.direction }, query);
}


export async function getReading(installationId, readingId, user) {
  await getInstallationForUser(installationId, user);

  const reading = await GenerationReading.findOne({ _id: readingId, installationId }).lean();
  if (!reading) throw notFound('Reading not found.', 'No reading with this id exists for this installation.');
  return reading;
}

// Resolves provinceId / districtId / substationId into the ids of the installations in that
// scope (province -> districts -> substations -> installations). Returns null for "no filter".
// 400 if an id does not exist or the ids contradict each other; 403 if the user may not read
// the province, district or substation they name.
async function resolveInstallationIds({ provinceId, districtId, substationId }, user) {
  if (!provinceId && !districtId && !substationId) return null;

  let substation = null;
  let district = null;
  let province = null;

  if (substationId) {
    substation = await GridSubstation.findById(substationId).lean();
    if (!substation) throw invalidQuery('Invalid "substationId" parameter.', 'No substation exists for this id.');
    await assertCanAccess(user, 'substation', substation);
    if (districtId && String(substation.districtId) !== districtId) {
      throw invalidQuery('Conflicting filters.', 'The substation does not belong to the given district.');
    }
  }

  const effectiveDistrictId = districtId || (substation && String(substation.districtId));
  if (effectiveDistrictId) {
    district = await District.findById(effectiveDistrictId).lean();
    if (!district) throw invalidQuery('Invalid "districtId" parameter.', 'No district exists for this id.');
    await assertCanAccess(user, 'district', district);
    if (provinceId && String(district.provinceId) !== provinceId) {
      throw invalidQuery('Conflicting filters.', 'The district does not belong to the given province.');
    }
  }

  if (provinceId) {
    province = await Province.findById(provinceId).lean();
    if (!province) throw invalidQuery('Invalid "provinceId" parameter.', 'No province exists for this id.');
    await assertCanAccess(user, 'province', province);
  }

  // Narrowest scope wins: substation, else district, else province.
  let substationIds;
  if (substationId) {
    substationIds = [substation._id];
  } else if (districtId) {
    substationIds = await GridSubstation.distinct('_id', { districtId });
  } else {
    const districtIds = await District.distinct('_id', { provinceId });
    substationIds = await GridSubstation.distinct('_id', { districtId: { $in: districtIds } });
  }
  return SolarInstallation.distinct('_id', { substationId: { $in: substationIds } });
}

// Readings across installations, optionally narrowed to a province, district or substation.
// Results are always limited to the installations the user may see.
export async function listReadings(query, user) {
  const requestedIds = await resolveInstallationIds(query, user);
  const allowedIds = await getScopedInstallationIds(user); // null = every installation (national)

  let installationIds = requestedIds;
  if (allowedIds) {
    const allowed = new Set(allowedIds.map(String));
    installationIds = (requestedIds || allowedIds).filter((id) => allowed.has(String(id)));
  }

  const filter = { ...timeWindow(query) };
  if (installationIds) filter.installationId = { $in: installationIds };

  // installationId is a tie-breaker: many installations share the same timestamp,
  // so without it the order of those rows (and therefore the pages) is not stable.
  const sort = { timestamp: query.direction, installationId: query.direction };
  return queryReadings(filter, sort, query);
}

// Device ingestion: appends one reading for an installation (readings are never updated or deleted).
// 409 if the installation already has a reading with this timestamp.
// The caller has already checked that the installation exists.
export async function createReading(installationId, data) {
  try {
    const reading = await GenerationReading.create({ installationId, ...data });
    return reading.toObject();
  } catch (err) {
    if (err.code === 11000) {
      throw conflict('Reading already exists.', 'This installation already has a reading with this timestamp.');
    }
    throw err;
  }
}
