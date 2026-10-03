import SolarInstallation from '../models/SolarInstallation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getSubstation, getSubstationForUser } from './substationService.js';
import { getDistrict } from './districtService.js';
import { getProvince } from './provinceService.js';
import { getLastReading } from './readingService.js';
import { getInstallationForUser } from './installationLookup.js';

export { getInstallation, getInstallationForUser } from './installationLookup.js';

// Once the substation is accessible, every installation under it is in the user's scope.
export async function listInstallationsBySubstation(substationId, page, user) {
  await getSubstationForUser(substationId, user); // 404 if missing, 403 if out of scope
  return findPage(SolarInstallation, { substationId }, page);
}

// Composite: the installation plus its substation, district, province and latest reading.
// The ancestors are embedded as context for a user who may read the installation.
// The readings history is not included.
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

// The single most recent reading. 404 if the installation does not exist or has no readings.
export async function getInstallationLastReading(installationId, user) {
  await getInstallationForUser(installationId, user);

  const reading = await getLastReading(installationId);
  if (!reading) {
    throw notFound('No readings found.', 'This installation has not reported any generation readings yet.');
  }
  return reading;
}
