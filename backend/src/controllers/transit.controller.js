import { importGtfsStatic, listTransitStops, listTransitStopRoutes } from '../services/gtfs.service.js';

const EARTH_RADIUS_M = 6371000;

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function nearestStation(stations, lat, lon) {
  let best = null;
  let bestDist = Infinity;
  for (const station of stations) {
    const dist = haversineMeters(lat, lon, station.latitude, station.longitude);
    if (dist < bestDist) {
      bestDist = dist;
      best = station;
    }
  }
  return best ? { station: best, distanceMeters: bestDist } : null;
}

export async function getStops(req, res, next) {
  try {
    const stops = await listTransitStops();
    res.json({ stops });
  } catch (err) {
    next(err);
  }
}

export async function getJourney(req, res, next) {
  try {
    const fromLat = parseFloat(req.query.fromLat);
    const fromLon = parseFloat(req.query.fromLon);
    const toLat = parseFloat(req.query.toLat);
    const toLon = parseFloat(req.query.toLon);

    if (![fromLat, fromLon, toLat, toLon].every(Number.isFinite)) {
      return res.status(400).json({ error: 'fromLat, fromLon, toLat and toLon are required numbers' });
    }

    const [stops, links] = await Promise.all([listTransitStops(), listTransitStopRoutes()]);

    const routesByStop = new Map();
    for (const link of links) {
      if (!routesByStop.has(link.stop_id)) routesByStop.set(link.stop_id, []);
      routesByStop.get(link.stop_id).push(link);
    }

    const stations = stops
      .filter((s) => routesByStop.has(s.id))
      .map((s) => ({ ...s, routes: routesByStop.get(s.id) }));

    if (stations.length === 0) {
      return res.json({ found: false, reason: 'no_transit_data' });
    }

    const fromNearest = nearestStation(stations, fromLat, fromLon);
    const toNearest = nearestStation(stations, toLat, toLon);

    const fromStation = fromNearest.station;
    const toStation = toNearest.station;

    if (fromStation.id === toStation.id) {
      return res.json({
        found: true,
        direct: true,
        sameStation: true,
        fromStation: { id: fromStation.id, name: fromStation.name, walkMeters: Math.round(fromNearest.distanceMeters) },
        toStation: { id: toStation.id, name: toStation.name, walkMeters: Math.round(toNearest.distanceMeters) },
        lines: fromStation.routes.map((r) => ({ shortName: r.route_short_name, color: r.route_color })),
      });
    }

    const fromRouteIds = new Set(fromStation.routes.map((r) => r.route_id));
    const sharedRoutes = toStation.routes.filter((r) => fromRouteIds.has(r.route_id));

    const baseResponse = {
      found: true,
      fromStation: { id: fromStation.id, name: fromStation.name, walkMeters: Math.round(fromNearest.distanceMeters) },
      toStation: { id: toStation.id, name: toStation.name, walkMeters: Math.round(toNearest.distanceMeters) },
    };

    if (sharedRoutes.length > 0) {
      return res.json({
        ...baseResponse,
        direct: true,
        lines: sharedRoutes.map((r) => ({ shortName: r.route_short_name, color: r.route_color })),
      });
    }

    // No direct line: look for the best single-transfer station — one that
    // shares a line with the origin and a (possibly different) line with
    // the destination, minimizing the detour.
    const toRouteIds = new Set(toStation.routes.map((r) => r.route_id));
    let bestTransfer = null;
    let bestScore = Infinity;

    for (const candidate of stations) {
      if (candidate.id === fromStation.id || candidate.id === toStation.id) continue;
      const lineFromOrigin = candidate.routes.find((r) => fromRouteIds.has(r.route_id));
      const lineToDestination = candidate.routes.find((r) => toRouteIds.has(r.route_id));
      if (!lineFromOrigin || !lineToDestination) continue;

      const score =
        haversineMeters(fromStation.latitude, fromStation.longitude, candidate.latitude, candidate.longitude) +
        haversineMeters(candidate.latitude, candidate.longitude, toStation.latitude, toStation.longitude);

      if (score < bestScore) {
        bestScore = score;
        bestTransfer = { candidate, lineFromOrigin, lineToDestination };
      }
    }

    if (!bestTransfer) {
      return res.json({ ...baseResponse, direct: false, transferFound: false, lines: [] });
    }

    res.json({
      ...baseResponse,
      direct: false,
      transferFound: true,
      transferStation: { id: bestTransfer.candidate.id, name: bestTransfer.candidate.name },
      lines: [
        { shortName: bestTransfer.lineFromOrigin.route_short_name, color: bestTransfer.lineFromOrigin.route_color },
        { shortName: bestTransfer.lineToDestination.route_short_name, color: bestTransfer.lineToDestination.route_color },
      ],
    });
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
