import { Router } from 'express';
import { validateObjectIdParam, rejectOtherMethods } from '../middleware/validateObjectId.js';
import {
  getProvinceHandler,
  listProvinceDistrictsHandler,
  listProvincesHandler,
} from '../controllers/provinceController.js';

const router = Router();
const ALLOW = 'GET, HEAD';

router.param('provinceId', validateObjectIdParam);

router.route('/provinces').get(listProvincesHandler).all(rejectOtherMethods(ALLOW));
router.route('/provinces/:provinceId').get(getProvinceHandler).all(rejectOtherMethods(ALLOW));
router
  .route('/provinces/:provinceId/districts')
  .get(listProvinceDistrictsHandler)
  .all(rejectOtherMethods(ALLOW));

export default router;
