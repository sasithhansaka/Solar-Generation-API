import GridSubstation from '../models/GridSubstation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { assertCanAccess } from './authorizationService.js';
import { getDistrictForUser } from './districtService.js';

// Once the district is accessible, every substation in it is in the user's scope.
export async function listSubstationsByDistrict(districtId, page, user) {
  await getDistrictForUser(districtId, user); // 404 if missing, 403 if out of scope
  return findPage(GridSubstation, { districtId }, page);
}

// Plain lookup (404 if missing). Does not check jurisdiction: used to embed ancestors.
export async function getSubstation(substationId) {
  const substation = await GridSubstation.findById(substationId).lean();
  if (!substation) throw notFound('Substation not found.', 'No substation exists for the supplied identifier.');
  return substation;
}

// 404 if missing, 403 if outside the user's jurisdiction.
export async function getSubstationForUser(substationId, user) {
  const substation = await getSubstation(substationId);
  await assertCanAccess(user, 'substation', substation);
  return substation;
}
