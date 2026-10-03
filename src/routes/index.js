import { Router } from 'express';
import provinceRoutes from './provinceRoutes.js';
import districtRoutes from './districtRoutes.js';
import substationRoutes from './substationRoutes.js';
import installationRoutes from './installationRoutes.js';
import readingRoutes from './readingRoutes.js';

// Mounted at /api/v1
const router = Router();

router.use(provinceRoutes);
router.use(districtRoutes);
router.use(substationRoutes);
router.use(installationRoutes);
router.use(readingRoutes);

export default router;
