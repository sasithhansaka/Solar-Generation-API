import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import {
  getSubstationHandler,
  listSubstationInstallationsHandler,
} from '../controllers/substationController.js';

const router = Router();
const ALLOW = 'GET, HEAD';

router.param('substationId', validateObjectIdParam);

router.route('/substations/:substationId').get(getSubstationHandler).all(rejectOtherMethods(ALLOW));
router
  .route('/substations/:substationId/installations')
  .get(listSubstationInstallationsHandler)
  .all(rejectOtherMethods(ALLOW));

export default router;
