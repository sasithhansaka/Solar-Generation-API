import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import { listInstallationReadingsHandler } from '../controllers/readingController.js';
import {
  getInstallationHandler,
  getInstallationLastReadingHandler,
} from '../controllers/installationController.js';

const router = Router();
const ALLOW = 'GET, HEAD';

router.param('installationId', validateObjectIdParam);

router.route('/installations/:installationId').get(getInstallationHandler).all(rejectOtherMethods(ALLOW));
router
  .route('/installations/:installationId/last-reading')
  .get(getInstallationLastReadingHandler)
  .all(rejectOtherMethods(ALLOW));

router
  .route('/installations/:installationId/readings')
  .get(listInstallationReadingsHandler)
  .all(rejectOtherMethods(ALLOW));

export default router;
