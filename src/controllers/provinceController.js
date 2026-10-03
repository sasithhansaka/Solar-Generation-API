import { buildPage, parsePagination } from '../utils/pagination.js';
import { getProvince, listProvinces } from '../services/provinceService.js';
import { listDistrictsByProvince } from '../services/districtService.js';

export async function listProvincesHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listProvinces(page);
  res.json(buildPage(req, items, total, page));
}

export async function getProvinceHandler(req, res) {
  res.json(await getProvince(req.params.provinceId));
}

export async function listProvinceDistrictsHandler(req, res) {
  const page = parsePagination(req.query);
  const { items, total } = await listDistrictsByProvince(req.params.provinceId, page);
  res.json(buildPage(req, items, total, page));
}
