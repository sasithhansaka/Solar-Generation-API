import SolarInstallation from '../models/SolarInstallation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getSubstation } from './substationService.js';
import { getDistrict } from './districtService.js';
import { getProvince } from './provinceService.js';
import { getLastReading } from './readingService.js';

export async function listInstallationsBySubstation(substationId, page) {
  await getSubstation(substationId); // 404 if the parent does not exist
  return findPage(SolarInstallation, { substationId }, page);
}

export async function getInstallation(installationId) {
  const installation = await SolarInstallation.findById(installationId).lean();
  if (!installation) throw notFound('Installation not found.', 'No installation exists for the supplied identifier.');
  return installation;
}

// Composite: the installation plus its substation, district, province and latest reading.
// The readings history is not included.
export async function getInstallationComposite(installationId) {
  const installation = await getInstallation(installationId);

  const [substation, lastReading] = await Promise.all([
    getSubstation(installation.substationId),
    getLastReading(installation._id),
  ]);
  const district = await getDistrict(substation.districtId);
  const province = await getProvince(district.provinceId);

  return { ...installation, substation, district, province, lastReading };
}

// The single most recent reading. 404 if the installation does not exist or has no readings.
export async function getInstallationLastReading(installationId) {
  await getInstallation(installationId);

  const reading = await getLastReading(installationId);
  if (!reading) {
    throw notFound('No readings found.', 'This installation has not reported any generation readings yet.');
  }
  return reading;
}
