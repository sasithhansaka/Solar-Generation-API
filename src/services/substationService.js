import GridSubstation from '../models/GridSubstation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getDistrict } from './districtService.js';

export async function listSubstationsByDistrict(districtId, page) {
  await getDistrict(districtId); // 404 if the parent does not exist
  return findPage(GridSubstation, { districtId }, page);
}

export async function getSubstation(substationId) {
  const substation = await GridSubstation.findById(substationId).lean();
  if (!substation) throw notFound('Substation not found.', 'No substation exists for the supplied identifier.');
  return substation;
}
