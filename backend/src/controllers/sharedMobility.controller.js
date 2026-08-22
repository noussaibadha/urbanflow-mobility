import { getSharedMobilityStations } from '../services/sharedMobility.service.js';

export async function listStations(req, res, next) {
  try {
    const data = await getSharedMobilityStations();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
