import { Router } from 'express';
import { listFavorites, createFavorite, deleteFavorite } from '../controllers/favorites.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listFavorites);
router.post('/', requireAuth, createFavorite);
router.delete('/:id', requireAuth, deleteFavorite);

export default router;
