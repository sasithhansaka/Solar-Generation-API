import SolarInstallation from '../models/SolarInstallation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getSubstation, getSubstationForUser } from './substationService.js';
import { getDistrict } from './districtService.js';
import { getProvince } from './provinceService.js';
import { getLastReading } from './readingService.js';
import { getInstallationForUser } from './installationLookup.js';

export { getInstallation, getInstallationForUser } from './installationLookup.js';

export async function listInstallationsBySubstation(substationId, page, user) {
  await getSubstationForUser(substationId, user); // 404 if missing, 403 if out of scope
  return findPage(SolarInstallation, { substationId }, page);
}

export async function getInstallationComposite(installationId, user) {
  const installation = await getInstallationForUser(installationId, user);

  const [substation, lastReading] = await Promise.all([
    getSubstation(installation.substationId),
    getLastReading(installation._id),
  ]);
  const district = await getDistrict(substation.districtId);
  const province = await getProvince(district.provinceId);

  return { ...installation, substation, district, province, lastReading };
}

export async function getInstallationLastReading(installationId, user) {
  await getInstallationForUser(installationId, user);

  const reading = await getLastReading(installationId);
  if (!reading) {
    throw notFound('No readings found.', 'This installation has not reported any generation readings yet.');
  }
  return reading;
}
