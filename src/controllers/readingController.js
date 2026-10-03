import { buildPage } from '../utils/pagination.js';
import { parseReadingQuery } from '../utils/readingQuery.js';
import { listInstallationReadings, listReadings } from '../services/readingService.js';

// History of one installation: page, limit, sort, from, to.
export async function listInstallationReadingsHandler(req, res) {
  const query = parseReadingQuery(req.query);
  const { items, total } = await listInstallationReadings(req.params.installationId, query);
  res.json(buildPage(req, items, total, query));
}

// Readings across installations: the same plus provinceId, districtId, substationId.
export async function listReadingsHandler(req, res) {
  const query = parseReadingQuery(req.query, { scopeFilters: true });
  const { items, total } = await listReadings(query);
  res.json(buildPage(req, items, total, query));
}
