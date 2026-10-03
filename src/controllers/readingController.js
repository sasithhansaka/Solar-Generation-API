import { sendJson } from '../utils/response.js';
import { buildPage } from '../utils/pagination.js';
import { parseReadingQuery } from '../utils/readingQuery.js';
import { forbidden, unsupportedMediaType } from '../utils/errors.js';
import { validateReadingBody } from '../validators/readingValidators.js';
import { getInstallation } from '../services/installationService.js';
import {
  createReading,
  getReading,
  listInstallationReadings,
  listReadings,
} from '../services/readingService.js';

// History of one installation: page, limit, sort, from, to.
export async function listInstallationReadingsHandler(req, res) {
  const query = parseReadingQuery(req.query);
  const { items, total } = await listInstallationReadings(req.params.installationId, query);
  sendJson(req, res, buildPage(req, items, total, query));
}

// Readings across installations: the same plus provinceId, districtId, substationId.
export async function listReadingsHandler(req, res) {
  const query = parseReadingQuery(req.query, { scopeFilters: true });
  const { items, total } = await listReadings(query);
  sendJson(req, res, buildPage(req, items, total, query));
}

export async function getReadingHandler(req, res) {
  const { installationId, readingId } = req.params;
  sendJson(req, res, await getReading(installationId, readingId));
}

// Device ingestion. By the time this runs the device token is verified (401 otherwise).
export async function createReadingHandler(req, res) {
  const { installationId } = req.params;

  // A device may only write for its own installation.
  if (req.device.installationId !== installationId) {
    throw forbidden(
      'Forbidden.',
      'This device token does not belong to this installation.'
    );
  }

  await getInstallation(installationId); // 404 if the installation does not exist

  if (!req.is('application/json')) {
    throw unsupportedMediaType('Unsupported media type.', 'Send the body as Content-Type: application/json.');
  }

  const data = validateReadingBody(req.body);
  const reading = await createReading(installationId, data);

  res
    .status(201)
    .location(`/api/v1/installations/${installationId}/readings/${reading._id}`)
    .json(reading);
}
