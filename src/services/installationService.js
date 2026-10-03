import SolarInstallation from '../models/SolarInstallation.js';
import { notFound } from '../utils/errors.js';
import { findPage } from '../utils/pagination.js';
import { getSubstation } from './substationService.js';

export async function listInstallationsBySubstation(substationId, page) {
  await getSubstation(substationId); // 404 if the parent does not exist
  return findPage(SolarInstallation, { substationId }, page);
}

export async function getInstallation(installationId) {
  const installation = await SolarInstallation.findById(installationId).lean();
  if (!installation) throw notFound('Installation not found.', 'No installation exists for the supplied identifier.');
  return installation;
}
