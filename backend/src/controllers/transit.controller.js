import { importGtfsStatic, listTransitStops } from '../services/gtfs.service.js';

export async function getStops(req, res, next) {
  try {
    const stops = await listTransitStops();
    res.json({ stops });
  } catch (err) {
    next(err);
  }
}

export async function importStops(req, res, next) {
  try {
    const feedUrl = req.body.feed_url || process.env.GTFS_STATIC_URL;
    if (!feedUrl) {
      return res.status(400).json({
        error: "Aucune URL de flux GTFS fournie (champ 'feed_url' ou variable GTFS_STATIC_URL)",
      });
    }

    const result = await importGtfsStatic(feedUrl);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
