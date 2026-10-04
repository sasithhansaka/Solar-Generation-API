import District from '../models/District.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { assertCanAccess } from './authorizationService.js';
import { getProvinceForUser } from './provinceService.js';

export async function listDistrictsByProvince(provinceId, page, user) {
  await getProvinceForUser(provinceId, user); // 404 if missing, 403 if out of scope
  return findPage(District, { provinceId }, page);
}

export async function getDistrict(districtId) {
  const district = await District.findById(districtId).lean();
  if (!district) throw notFound('District not found.', 'No district exists for the supplied identifier.');
  return district;
}

export async function getDistrictForUser(districtId, user) {
  const district = await getDistrict(districtId);
  await assertCanAccess(user, 'district', district);
  return district;
}
