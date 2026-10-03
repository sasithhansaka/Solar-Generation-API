import { sendJson } from '../utils/response.js';
import { buildPage, parsePagination } from '../utils/pagination.js';
import { getDistrictForUser } from '../services/districtService.js';
import { listSubstationsByDistrict } from '../services/substationService.js';
import { getDistrictGenerationSummary } from '../services/generationSummaryService.js';

export async function getDistrictHandler(req, res) {
  sendJson(req, res, await getDistrictForUser(req.params.districtId, req.user));
}

export async function listDistrictSubstationsHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listSubstationsByDistrict(req.params.districtId, page, req.user);
  sendJson(req, res, buildPage(req, items, total, page));
}

// Operational summary for a district (derived resource). The generation time changes on every
// request, so the ETag is computed from the figures only and is weak: a client that already
// holds the same figures gets 304.
export async function getDistrictGenerationSummaryHandler(req, res) {
  const summary = await getDistrictGenerationSummary(req.params.districtId, req.user);
  const { generatedAt, ...figures } = summary;
  sendJson(req, res, summary, { etagBody: figures, weak: true });
}
