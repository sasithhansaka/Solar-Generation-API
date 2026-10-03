import District from '../models/District.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getProvince } from './provinceService.js';

export async function listDistrictsByProvince(provinceId, page) {
  await getProvince(provinceId);
  return findPage(District, { provinceId }, page);
}

export async function getDistrict(districtId) {
  const district = await District.findById(districtId).lean();
  if (!district) throw notFound('District not found.', 'No district exists for the supplied identifier.');
  return district;
}
