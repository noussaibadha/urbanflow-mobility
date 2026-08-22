import * as FavoritePlacesModel from '../models/favoritePlaces.model.js';

export async function listFavorites(req, res, next) {
  try {
    const favorites = await FavoritePlacesModel.findByUserId(req.userId);
    res.json({ favorites });
  } catch (err) {
    next(err);
  }
}

export async function createFavorite(req, res, next) {
  try {
    const { name, address, latitude, longitude } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'name and address are required' });
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude and longitude must be numbers' });
    }

    const favorite = await FavoritePlacesModel.create({
      userId: req.userId,
      name,
      address,
      latitude,
      longitude,
    });
    res.status(201).json({ favorite });
  } catch (err) {
    next(err);
  }
}

export async function deleteFavorite(req, res, next) {
  try {
    const deleted = await FavoritePlacesModel.remove(req.params.id, req.userId);
    if (!deleted) return res.status(404).json({ error: 'Favorite not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}
