import { Router } from 'express';
import { getStops, importStops } from '../controllers/transit.controller.js';

const router = Router();

router.get('/stops', getStops);
router.post('/import', importStops);

export default router;
