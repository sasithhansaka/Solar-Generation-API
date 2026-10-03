import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import { getInstallationHandler } from '../controllers/installationController.js';

const router = Router();

router.param('installationId', validateObjectIdParam);

router
  .route('/installations/:installationId')
  .get(getInstallationHandler)
  .all(rejectOtherMethods('GET, HEAD'));

export default router;
