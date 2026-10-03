import { badRequest } from '../utils/errors.js';
import { ISO_8601, isFiniteNumber } from '../utils/validation.js';

const ALLOWED_FIELDS = ['timestamp', 'powerKw', 'energyKwh', 'voltage'];

// POST /installations/:installationId/readings body.
// installationId is never read from the body: it comes from the URL.
export function validateReadingBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Invalid reading.', 'The request body must be a JSON object.');
  }

  const problems = [];

  const unknown = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unknown.length > 0) {
    problems.push(`unknown field(s): ${unknown.join(', ')} (allowed: ${ALLOWED_FIELDS.join(', ')})`);
  }

  let timestamp;
  if (typeof body.timestamp !== 'string' || !ISO_8601.test(body.timestamp) || Number.isNaN(Date.parse(body.timestamp))) {
    problems.push('"timestamp" is required and must be an ISO 8601 date-time such as 2026-10-03T10:30:00Z');
  } else {
    timestamp = new Date(body.timestamp);
    if (timestamp.getTime() > Date.now()) problems.push('"timestamp" must not be in the future');
  }

  if (!isFiniteNumber(body.powerKw) || body.powerKw < 0) problems.push('"powerKw" is required and must be a number >= 0');
  if (!isFiniteNumber(body.energyKwh) || body.energyKwh < 0) problems.push('"energyKwh" is required and must be a number >= 0');
  if (!isFiniteNumber(body.voltage) || body.voltage <= 0) problems.push('"voltage" is required and must be a number > 0');

  if (problems.length > 0) throw badRequest('Invalid reading.', `${problems.join('; ')}.`);

  return { timestamp, powerKw: body.powerKw, energyKwh: body.energyKwh, voltage: body.voltage };
}
