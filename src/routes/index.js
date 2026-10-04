import { Router } from 'express';
import provinceRoutes from './provinceRoutes.js';
import districtRoutes from './districtRoutes.js';
import substationRoutes from './substationRoutes.js';
import installationRoutes from './installationRoutes.js';
import readingRoutes from './readingRoutes.js';
import authRoutes from './authRoutes.js';
import { authenticateUser } from '../middleware/authenticateUser.js';

const router = Router();

router.use(authRoutes); 

router.use((req, res, next) => (req.method === 'GET' || req.method === 'HEAD' ? authenticateUser(req, res, next) : next()));

router.use(provinceRoutes);
router.use(districtRoutes);
router.use(substationRoutes);
router.use(installationRoutes);
router.use(readingRoutes);

export default router;
