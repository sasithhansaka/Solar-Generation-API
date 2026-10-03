import { invalidQuery } from './errors.js';

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

const PAGINATION_PARAMS = ['page', 'limit'];

function parsePositiveInt(name, value, fallback) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1) {
    throw invalidQuery(`Invalid "${name}" parameter.`, `"${name}" must be a positive integer.`);
  }
  return Number(value);
}

// Reads ?page=&limit= (defaults 1 and 10, limit capped at 100).
// Unknown query parameters are rejected; extraParams lists the other parameters a route accepts.
export function parsePagination(query, extraParams = []) {
  const allowed = [...PAGINATION_PARAMS, ...extraParams];
  const unknown = Object.keys(query).filter((key) => !allowed.includes(key));
  if (unknown.length > 0) {
    throw invalidQuery(
      'Unsupported query parameter.',
      `Unknown parameter(s): ${unknown.join(', ')}. Supported: ${allowed.join(', ')}.`
    );
  }

  const page = parsePositiveInt('page', query.page, 1);
  const limit = Math.min(parsePositiveInt('limit', query.limit, DEFAULT_LIMIT), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
}

// Runs the query for one page and the total count of all matching documents.
export async function findPage(Model, filter, { skip, limit }) {
  const [items, total] = await Promise.all([
    Model.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter),
  ]);
  return { items, total };
}

// { data, pagination: { page, limit, total, next, previous } }
export function buildPage(req, items, total, { page, limit }) {
  const path = new URL(req.originalUrl, 'http://localhost').pathname;

  // Keep every active filter and the sort order; only page and limit change.
  const link = (p) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    for (const [key, value] of Object.entries(req.query)) {
      if (!PAGINATION_PARAMS.includes(key)) params.append(key, value);
    }
    return `${path}?${params}`;
  };

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      next: page * limit < total ? link(page + 1) : null,
      previous: page > 1 ? link(page - 1) : null,
    },
  };
}
