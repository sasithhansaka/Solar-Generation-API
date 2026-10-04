import { sendJson } from '../utils/response.js';
import { buildPage, parsePagination } from '../utils/pagination.js';
import { getProvinceForUser, listProvinces } from '../services/provinceService.js';
import { listDistrictsByProvince } from '../services/districtService.js';

export async function listProvincesHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listProvinces(page, req.user);
  sendJson(req, res, buildPage(req, items, total, page));
}

export async function getProvinceHandler(req, res) {
  sendJson(req, res, await getProvinceForUser(req.params.provinceId, req.user));
}

export async function listProvinceDistrictsHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listDistrictsByProvince(req.params.provinceId, page, req.user);
  sendJson(req, res, buildPage(req, items, total, page));
}
