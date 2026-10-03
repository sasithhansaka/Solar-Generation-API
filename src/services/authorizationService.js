import Province from '../models/Province.js';
import District from '../models/District.js';
import GridSubstation from '../models/GridSubstation.js';
import SolarInstallation from '../models/SolarInstallation.js';
import { forbidden, ErrorCodes } from '../utils/errors.js';

// Jurisdiction rules for SLSEA users (req.user comes from the verified JWT + the database,
// never from request parameters):
//   national -> all data
//   province -> only their province (its districts, substations, installations, readings)
//   district -> only their district (its substations, installations, readings)
// Ancestors of a user's scope (for example a district user's province) are not directly
// readable; they only appear embedded in the installation composite.

const NOTHING = { _id: { $in: [] } };

function scopeOf(user) {
  const id = user.jurisdictionId ? String(user.jurisdictionId) : null;
  if (user.role === 'national' && user.jurisdictionType === 'all') return { kind: 'all' };
  if (user.role === 'province' && user.jurisdictionType === 'province' && id) return { kind: 'province', id };
  if (user.role === 'district' && user.jurisdictionType === 'district' && id) return { kind: 'district', id };
  return { kind: 'none' }; // inconsistent user record: deny everything
}

// Mongo filter for the provinces a user may list.
export function getProvinceScope(user) {
  const scope = scopeOf(user);
  if (scope.kind === 'all') return {};
  if (scope.kind === 'province') return { _id: scope.id };
  return NOTHING;
}

// Mongo filter for the installations a user may see (through their substations and districts).
export async function getInstallationScope(user) {
  const scope = scopeOf(user);
  if (scope.kind === 'all') return {};
  if (scope.kind === 'none') return NOTHING;

  let districtIds = [scope.id];
  if (scope.kind === 'province') {
    districtIds = await District.distinct('_id', { provinceId: scope.id });
  }
  const substationIds = await GridSubstation.distinct('_id', { districtId: { $in: districtIds } });
  return { substationId: { $in: substationIds } };
}

// Ids of the installations a user may see, or null for "all of them" (national).
export async function getScopedInstallationIds(user) {
  const filter = await getInstallationScope(user);
  if (Object.keys(filter).length === 0) return null;
  return SolarInstallation.distinct('_id', filter);
}

async function provinceOfDistrict(districtId) {
  const district = await District.findById(districtId).select('provinceId').lean();
  return district ? String(district.provinceId) : null;
}

// Walks up from the resource (installation -> substation -> district -> province) far enough
// to compare with the user's jurisdiction. Returns null for a link that cannot be found.
async function ancestry(type, doc, kind) {
  if (type === 'province') return { provinceId: String(doc._id), districtId: null };
  if (type === 'district') return { provinceId: String(doc.provinceId), districtId: String(doc._id) };

  let substation = doc;
  if (type === 'installation') {
    substation = await GridSubstation.findById(doc.substationId).select('districtId').lean();
    if (!substation) return { provinceId: null, districtId: null };
  }
  const districtId = String(substation.districtId);
  const provinceId = kind === 'province' ? await provinceOfDistrict(districtId) : null;
  return { provinceId, districtId };
}

// Throws 403 JURISDICTION_FORBIDDEN unless the user may read this resource.
// type: 'province' | 'district' | 'substation' | 'installation'; doc: the (lean) document.
// Call it after the lookup, so a missing resource is already a 404.
export async function assertCanAccess(user, type, doc) {
  const scope = scopeOf(user);
  if (scope.kind === 'all') return;

  let allowed = false;
  if (scope.kind !== 'none') {
    const { provinceId, districtId } = await ancestry(type, doc, scope.kind);
    allowed = scope.kind === 'province' ? provinceId === scope.id : districtId === scope.id;
  }

  if (!allowed) {
    throw forbidden(
      'Outside your jurisdiction.',
      `Your account is not allowed to access this ${type}.`,
      ErrorCodes.JURISDICTION_FORBIDDEN
    );
  }
}
