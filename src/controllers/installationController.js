import { getInstallationComposite, getInstallationLastReading } from '../services/installationService.js';

// Composite resource: installation + substation, district, province and lastReading.
export async function getInstallationHandler(req, res) {
  res.json(await getInstallationComposite(req.params.installationId));
}

// Operational view: the newest reading as a bare object.
export async function getInstallationLastReadingHandler(req, res) {
  res.json(await getInstallationLastReading(req.params.installationId));
}
