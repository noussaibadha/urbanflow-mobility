import { Router } from 'express';
import { listFavorites, createFavorite, updateFavorite, deleteFavorite } from '../controllers/favorites.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, listFavorites);
router.post('/', requireAuth, createFavorite);
router.patch('/:id', requireAuth, updateFavorite);
router.delete('/:id', requireAuth, deleteFavorite);

export default router;
