import { sendJson } from '../utils/response.js';
import { buildPage, parsePagination } from '../utils/pagination.js';
import { getDistrictForUser } from '../services/districtService.js';
import { listSubstationsByDistrict } from '../services/substationService.js';

export async function getDistrictHandler(req, res) {
  sendJson(req, res, await getDistrictForUser(req.params.districtId, req.user));
}

export async function listDistrictSubstationsHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listSubstationsByDistrict(req.params.districtId, page, req.user);
  sendJson(req, res, buildPage(req, items, total, page));
}
