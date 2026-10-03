import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import { authenticateDevice } from '../middleware/authenticateDevice.js';
import {
  createReadingHandler,
  getReadingHandler,
  listInstallationReadingsHandler,
} from '../controllers/readingController.js';
import {
  getInstallationHandler,
  getInstallationLastReadingHandler,
} from '../controllers/installationController.js';

const router = Router();
const ALLOW = 'GET, HEAD';

router.param('installationId', validateObjectIdParam);
router.param('readingId', validateObjectIdParam);

router.route('/installations/:installationId').get(getInstallationHandler).all(rejectOtherMethods(ALLOW));
router
  .route('/installations/:installationId/last-reading')
  .get(getInstallationLastReadingHandler)
  .all(rejectOtherMethods(ALLOW));

// GET: history (user). POST: device ingestion. PUT, PATCH and DELETE are not allowed (append-only).
router
  .route('/installations/:installationId/readings')
  .get(listInstallationReadingsHandler)
  .post(authenticateDevice, createReadingHandler)
  .all(rejectOtherMethods('GET, HEAD, POST'));

router
  .route('/installations/:installationId/readings/:readingId')
  .get(getReadingHandler)
  .all(rejectOtherMethods(ALLOW));

export default router;
