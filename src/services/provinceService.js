import Province from '../models/Province.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';

export const listProvinces = (page) => findPage(Province, {}, page);

export async function getProvince(provinceId) {
  const province = await Province.findById(provinceId).lean();
  if (!province) throw notFound('Province not found.', 'No province exists for the supplied identifier.');
  return province;
}
