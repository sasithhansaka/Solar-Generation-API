import { invalidQuery } from './errors.js';
import { parsePagination } from './pagination.js';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
// 2026-10-03 or 2026-10-03T10:30:00Z (a time needs Z or an offset such as +05:30)
const ISO_8601 = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

const SORTS = { 'timestamp:asc': 1, 'timestamp:desc': -1 };
const SCOPE_PARAMS = ['provinceId', 'districtId', 'substationId'];

function single(name, value) {
  if (typeof value !== 'string' || value === '') {
    throw invalidQuery(`Invalid "${name}" parameter.`, `"${name}" must be given once with a value.`);
  }
  return value;
}

function parseDate(name, value) {
  const text = single(name, value);
  const date = new Date(text);
  if (!ISO_8601.test(text) || Number.isNaN(date.getTime())) {
    throw invalidQuery(
      `Invalid "${name}" parameter.`,
      `"${name}" must be an ISO 8601 date or date-time with Z or an offset, for example 2026-10-03T10:30:00Z. Encode "+" as %2B.`
    );
  }
  return date;
}

function parseObjectId(name, value) {
  const text = single(name, value);
  if (!OBJECT_ID.test(text)) {
    throw invalidQuery(`Invalid "${name}" parameter.`, `"${name}" must be a 24-character hexadecimal id.`);
  }
  return text;
}

// Validates ?page&limit&sort&from&to (and, for GET /readings, provinceId/districtId/substationId).
// Unknown parameters are rejected with 400 INVALID_QUERY.
export function parseReadingQuery(query, { scopeFilters = false } = {}) {
  const extra = ['sort', 'from', 'to', ...(scopeFilters ? SCOPE_PARAMS : [])];
  const pagination = parsePagination(query, extra);

  let direction = -1; // default: newest first
  if (query.sort !== undefined) {
    const sort = single('sort', query.sort);
    if (!(sort in SORTS)) {
      throw invalidQuery('Invalid "sort" parameter.', 'Use sort=timestamp:asc or sort=timestamp:desc.');
    }
    direction = SORTS[sort];
  }

  const from = query.from !== undefined ? parseDate('from', query.from) : null;
  const to = query.to !== undefined ? parseDate('to', query.to) : null;
  if (from && to && from > to) {
    throw invalidQuery('Invalid time window.', '"from" must not be later than "to".');
  }

  const parsed = { ...pagination, direction, from, to };
  if (scopeFilters) {
    for (const name of SCOPE_PARAMS) {
      if (query[name] !== undefined) parsed[name] = parseObjectId(name, query[name]);
    }
  }
  return parsed;
}
