import { Router } from 'express';
import { getStops, getJourney, importStops } from '../controllers/transit.controller.js';

const router = Router();

router.get('/stops', getStops);
router.get('/journey', getJourney);
router.post('/import', importStops);

export default router;
