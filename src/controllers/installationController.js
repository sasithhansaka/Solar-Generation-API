import { getInstallation } from '../services/installationService.js';

// Plain installation for now. The composite (with latest reading) comes in a later phase.
export async function getInstallationHandler(req, res) {
  res.json(await getInstallation(req.params.installationId));
}
