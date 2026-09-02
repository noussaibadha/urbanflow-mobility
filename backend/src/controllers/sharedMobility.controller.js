import { getSharedMobilityStations } from '../services/sharedMobility.service.js';
import { getAvailableBikes, DottUnavailableError } from '../services/dottBikes.service.js';

const EARTH_RADIUS_M = 6371000;
const BIKE_SEARCH_RADIUS_M = 500;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

export async function listStations(req, res, next) {
  try {
    const data = await getSharedMobilityStations();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// Real-vehicle info for the "Vélo" mode — a free-floating Dott bike near the
// departure point, on top of the existing OSRM-based bike routing (which
// works the same whether or not one is found nearby).
export async function getNearestBike(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return res.status(400).json({ error: 'lat and lon are required numbers' });
    }

    let bikes;
    try {
      bikes = await getAvailableBikes();
    } catch (err) {
      if (err instanceof DottUnavailableError) {
        console.error(`[shared-mobility/dott-bikes/nearest] Dott GBFS feed unavailable: ${err.message}`);
        return res.json({ found: false, reason: 'service_unavailable' });
      }
      throw err;
    }

    let nearest = null;
    let nearestDist = Infinity;
    for (const bike of bikes) {
      const dist = haversineMeters(lat, lon, bike.lat, bike.lon);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = bike;
      }
    }

    if (!nearest || nearestDist > BIKE_SEARCH_RADIUS_M) {
      return res.json({ found: false, reason: 'no_bike_nearby' });
    }

    res.json({
      found: true,
      bike: { id: nearest.id, lat: nearest.lat, lon: nearest.lon },
      walkMeters: Math.round(nearestDist),
    });
  } catch (err) {
    next(err);
  }
}
