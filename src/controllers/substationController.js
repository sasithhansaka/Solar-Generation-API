import { sendJson } from '../utils/response.js';
import { buildPage, parsePagination } from '../utils/pagination.js';
import { getSubstation } from '../services/substationService.js';
import { listInstallationsBySubstation } from '../services/installationService.js';

export async function getSubstationHandler(req, res) {
  sendJson(req, res, await getSubstation(req.params.substationId));
}

export async function listSubstationInstallationsHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listInstallationsBySubstation(req.params.substationId, page);
  sendJson(req, res, buildPage(req, items, total, page));
}
