import { Router } from 'express';
import { rejectOtherMethods } from '../middleware/validateObjectId.js';
import { requireJsonBody } from '../middleware/requireJsonBody.js';
import { loginHandler } from '../controllers/authController.js';

const router = Router();

router.route('/auth/login').post(requireJsonBody, loginHandler).all(rejectOtherMethods('POST'));

export default router;
