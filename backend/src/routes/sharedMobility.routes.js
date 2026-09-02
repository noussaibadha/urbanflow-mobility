import { Router } from 'express';
import { listStations, getNearestBike } from '../controllers/sharedMobility.controller.js';

const router = Router();

router.get('/stations', listStations);
router.get('/dott-bikes/nearest', getNearestBike);

export default router;
