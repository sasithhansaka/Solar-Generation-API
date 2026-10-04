import Province from '../models/Province.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { assertCanAccess, getProvinceScope } from './authorizationService.js';

export const listProvinces = (page, user) => findPage(Province, getProvinceScope(user), page);

export async function getProvince(provinceId) {
  const province = await Province.findById(provinceId).lean();
  if (!province) throw notFound('Province not found.', 'No province exists for the supplied identifier.');
  return province;
}

export async function getProvinceForUser(provinceId, user) {
  const province = await getProvince(provinceId);
  await assertCanAccess(user, 'province', province);
  return province;
}
