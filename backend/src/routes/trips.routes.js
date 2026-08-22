import { Router } from 'express';
import { createTrip, getSummary } from '../controllers/trips.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, createTrip);
router.get('/summary', requireAuth, getSummary);

export default router;
