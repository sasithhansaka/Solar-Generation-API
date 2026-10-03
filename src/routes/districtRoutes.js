import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import { getDistrictHandler, listDistrictSubstationsHandler } from '../controllers/districtController.js';

const router = Router();
const ALLOW = 'GET, HEAD';

router.param('districtId', validateObjectIdParam);

router.route('/districts/:districtId').get(getDistrictHandler).all(rejectOtherMethods(ALLOW));
router
  .route('/districts/:districtId/substations')
  .get(listDistrictSubstationsHandler)
  .all(rejectOtherMethods(ALLOW));

export default router;
