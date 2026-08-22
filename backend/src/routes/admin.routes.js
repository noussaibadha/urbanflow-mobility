import { Router } from 'express';
import { listUsers } from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/users', requireAuth, requireAdmin, listUsers);

export default router;
