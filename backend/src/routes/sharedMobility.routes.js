import { Router } from 'express';
import { listStations } from '../controllers/sharedMobility.controller.js';

const router = Router();

router.get('/stations', listStations);

export default router;
