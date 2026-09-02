import {
  importGtfsStatic,
  listTransitStops,
  listTransitStopRoutes,
  listTransitRouteDirections,
} from '../services/gtfs.service.js';

const EARTH_RADIUS_M = 6371000;
// Beyond this, "nearest station" stops being a meaningful walk — treat it as
// outside the GTFS import's coverage area (central Paris) rather than
// silently proposing a station that's actually kilometers away.
const MAX_WALK_TO_STATION_METERS = 3000;

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

// Picks the (route, direction) whose station_sequence visits fromStationId
// before toStationId, so we can tell the rider which terminus to board
// towards. Falls back to the first known direction if the order can't be
// determined (e.g. the representative trip didn't cover both stations).
function resolveDirection(directionsByRoute, routeId, fromStationId, toStationId) {
  const candidates = directionsByRoute.get(routeId) || [];
  for (const d of candidates) {
    const seq = d.station_sequence.split(',');
    const fromIdx = seq.indexOf(fromStationId);
    const toIdx = seq.indexOf(toStationId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
      return d;
    }
  }
  return candidates[0] || null;
}

function buildLeg(directionsByRoute, route, fromStationId, toStationId, boardName, alightName) {
  const direction = resolveDirection(directionsByRoute, route.route_id, fromStationId, toStationId);

  // Real GTFS stop_times aren't loaded (see backend/scripts/run-gtfs-import.mjs),
  // so there's no scheduled ride time — the frontend estimates it from this
  // station count instead. null when the representative trip's sequence
  // doesn't cover both stations, so the caller falls back to a default.
  let stopsCount = null;
  if (direction) {
    const seq = direction.station_sequence.split(',');
    const fromIdx = seq.indexOf(fromStationId);
    const toIdx = seq.indexOf(toStationId);
    if (fromIdx !== -1 && toIdx !== -1) stopsCount = Math.abs(toIdx - fromIdx);
  }

  return {
    shortName: route.route_short_name,
    color: route.route_color,
    type: route.route_type,
    headsign: direction?.headsign || null,
    board: boardName,
    alight: alightName,
    stopsCount,
  };
}

// When several route types serve the same station (e.g. a hub with both
// métro and bus), pick one "headline" type to color the map marker with —
// métro and RER read as more useful landmarks than the bus routes that
// happen to also stop there.
const DOMINANT_TYPE_PRIORITY = [1, 0, 2, 3];

function dominantRouteType(routeTypes) {
  for (const type of DOMINANT_TYPE_PRIORITY) {
    if (routeTypes.has(type)) return type;
  }
  return null;
}

export async function getStops(req, res, next) {
  try {
    const [stops, links] = await Promise.all([listTransitStops(), listTransitStopRoutes()]);

    const typesByStop = new Map();
    for (const link of links) {
      if (!typesByStop.has(link.stop_id)) typesByStop.set(link.stop_id, new Set());
      typesByStop.get(link.stop_id).add(link.route_type);
    }

    const enriched = stops.map((s) => {
      const types = typesByStop.get(s.id);
      return {
        ...s,
        routeTypes: types ? [...types] : [],
        dominantType: types ? dominantRouteType(types) : null,
      };
    });

    res.json({ stops: enriched });
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

    const [stops, links, routeDirections] = await Promise.all([
      listTransitStops(),
      listTransitStopRoutes(),
      listTransitRouteDirections(),
    ]);

    const routesByStop = new Map();
    for (const link of links) {
      if (!routesByStop.has(link.stop_id)) routesByStop.set(link.stop_id, []);
      routesByStop.get(link.stop_id).push(link);
    }

    const directionsByRoute = new Map();
    for (const d of routeDirections) {
      if (!directionsByRoute.has(d.route_id)) directionsByRoute.set(d.route_id, []);
      directionsByRoute.get(d.route_id).push(d);
    }

    const stations = stops
      .filter((s) => routesByStop.has(s.id))
      .map((s) => ({ ...s, routes: routesByStop.get(s.id) }));

    if (stations.length === 0) {
      console.error(
        `[transit/journey] No station has any route linked (${stops.length} stops, ${links.length} stop_routes links, ` +
          `${routeDirections.length} route_directions). The GTFS import likely hasn't been run against this database — ` +
          `see backend/scripts/run-gtfs-import.mjs / POST /api/transit/import.`
      );
      return res.json({ found: false, reason: 'no_transit_data' });
    }

    const fromNearest = nearestStation(stations, fromLat, fromLon);
    const toNearest = nearestStation(stations, toLat, toLon);

    if (fromNearest.distanceMeters > MAX_WALK_TO_STATION_METERS || toNearest.distanceMeters > MAX_WALK_TO_STATION_METERS) {
      console.error(
        `[transit/journey] Nearest station too far to be useful: from=${Math.round(fromNearest.distanceMeters)}m ` +
          `(${fromNearest.station.name}), to=${Math.round(toNearest.distanceMeters)}m (${toNearest.station.name}). ` +
          `Requested points (${fromLat},${fromLon}) -> (${toLat},${toLon}) are likely outside the GTFS import's ` +
          `coverage area (central Paris).`
      );
      return res.json({
        found: false,
        reason: 'out_of_coverage',
        fromDistanceMeters: Math.round(fromNearest.distanceMeters),
        toDistanceMeters: Math.round(toNearest.distanceMeters),
      });
    }

    const fromStation = fromNearest.station;
    const toStation = toNearest.station;

    const baseResponse = {
      found: true,
      fromStation: { id: fromStation.id, name: fromStation.name, walkMeters: Math.round(fromNearest.distanceMeters) },
      toStation: { id: toStation.id, name: toStation.name, walkMeters: Math.round(toNearest.distanceMeters) },
    };

    if (fromStation.id === toStation.id) {
      return res.json({ ...baseResponse, direct: true, sameStation: true, legs: [] });
    }

    const fromRouteIds = new Set(fromStation.routes.map((r) => r.route_id));
    const sharedRoute = toStation.routes.find((r) => fromRouteIds.has(r.route_id));

    if (sharedRoute) {
      return res.json({
        ...baseResponse,
        direct: true,
        legs: [buildLeg(directionsByRoute, sharedRoute, fromStation.id, toStation.id, fromStation.name, toStation.name)],
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
      return res.json({ ...baseResponse, direct: false, transferFound: false, legs: [] });
    }

    const { candidate, lineFromOrigin, lineToDestination } = bestTransfer;
    res.json({
      ...baseResponse,
      direct: false,
      transferFound: true,
      transferStation: { id: candidate.id, name: candidate.name },
      legs: [
        buildLeg(directionsByRoute, lineFromOrigin, fromStation.id, candidate.id, fromStation.name, candidate.name),
        buildLeg(directionsByRoute, lineToDestination, candidate.id, toStation.id, candidate.name, toStation.name),
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
