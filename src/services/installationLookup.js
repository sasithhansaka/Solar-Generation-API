import SolarInstallation from '../models/SolarInstallation.js';
import { notFound } from '../utils/errors.js';
import { assertCanAccess } from './authorizationService.js';

// Plain lookup (404 if missing). Does not check jurisdiction (the device write path uses it).
export async function getInstallation(installationId) {
  const installation = await SolarInstallation.findById(installationId).lean();
  if (!installation) throw notFound('Installation not found.', 'No installation exists for the supplied identifier.');
  return installation;
}

// 404 if missing, 403 if outside the user's jurisdiction.
export async function getInstallationForUser(installationId, user) {
  const installation = await getInstallation(installationId);
  await assertCanAccess(user, 'installation', installation);
  return installation;
}
