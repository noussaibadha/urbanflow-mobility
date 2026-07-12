import * as StationsModel from '../models/stations.model.js';

export async function getStations(req, res, next) {
  try {
    const stations = await StationsModel.findAll();
    res.json(stations);
  } catch (err) {
    next(err);
  }
}

export async function getStation(req, res, next) {
  try {
    const station = await StationsModel.findById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (err) {
    next(err);
  }
}

export async function createStation(req, res, next) {
  try {
    const { name, latitude, longitude, capacity } = req.body;
    if (!name || latitude == null || longitude == null) {
      return res.status(400).json({ error: 'name, latitude and longitude are required' });
    }
    const station = await StationsModel.create({ name, latitude, longitude, capacity: capacity ?? 0 });
    res.status(201).json(station);
  } catch (err) {
    next(err);
  }
}

export async function deleteStation(req, res, next) {
  try {
    await StationsModel.remove(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
