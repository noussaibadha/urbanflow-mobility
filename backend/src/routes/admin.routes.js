import { Router } from 'express';
import {
  listUsers,
  changeUserRole,
  suspendUser,
  deleteUserAccount,
  getUserStats,
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

router.get('/users', requireAuth, requireAdmin, listUsers);
router.patch('/users/:id/role', requireAuth, requireAdmin, changeUserRole);
router.patch('/users/:id/suspend', requireAuth, requireAdmin, suspendUser);
router.delete('/users/:id', requireAuth, requireAdmin, deleteUserAccount);
router.get('/users/:id/stats', requireAuth, requireAdmin, getUserStats);

export default router;
