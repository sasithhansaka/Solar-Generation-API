import { Router } from 'express';
import { rejectOtherMethods } from '../middleware/validateObjectId.js';
import { listReadingsHandler } from '../controllers/readingController.js';

const router = Router();

router.route('/readings').get(listReadingsHandler).all(rejectOtherMethods('GET, HEAD'));

export default router;
