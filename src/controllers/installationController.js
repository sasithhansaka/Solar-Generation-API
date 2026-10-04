import { sendJson } from '../utils/response.js';
import { getInstallationComposite, getInstallationLastReading } from '../services/installationService.js';

// Composite resource: installation + substation, district, province and lastReading.
export async function getInstallationHandler(req, res) {
  sendJson(req, res, await getInstallationComposite(req.params.installationId, req.user));
}

// Operational view: the newest reading as a bare object.
export async function getInstallationLastReadingHandler(req, res) {
  sendJson(req, res, await getInstallationLastReading(req.params.installationId, req.user));
}
