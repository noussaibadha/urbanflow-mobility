import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import * as TransitStopsModel from '../models/transitStops.model.js';
import * as TransitStopRoutesModel from '../models/transitStopRoutes.model.js';
import * as TransitRouteDirectionsModel from '../models/transitRouteDirections.model.js';

// Les données GTFS complètes d'Île-de-France Mobilités sont énormes. Pour
// cette démo on garde que les arrêts du centre de Paris, avec un plafond,
// pour que l'import reste rapide.
const PARIS_BBOX = { minLat: 48.815, maxLat: 48.902, minLon: 2.224, maxLon: 2.47 };
const MAX_STOPS = 2000;

// route_type GTFS : 0=tram, 1=métro, 2=RER/train, 3=bus. On garde ces 4 car
// c'est ce qu'on prend réellement à Paris ; les autres (ferry, téléphérique...)
// sont pas concernés ici.
const SUPPORTED_ROUTE_TYPES = new Set([0, 1, 2, 3]);

function loadCsvEntry(zip, filename) {
  const entry = zip.getEntry(filename);
  if (!entry) throw new Error(`Le flux GTFS ne contient pas de fichier ${filename}`);
  return parse(entry.getData().toString('utf-8'), { columns: true, skip_empty_lines: true, trim: true });
}

export async function importGtfsStatic(feedUrl) {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Impossible de télécharger le flux GTFS (statut ${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);

  const stopsRows = loadCsvEntry(zip, 'stops.txt');

  // Les lignes location_type=1 sont les vraies stations (ex: Nation,
  // République), contrairement aux ids "monomodalStopPlace" qui couvrent mal
  // les grosses stations.
  const stations = stopsRows
    .filter((row) => row.location_type === '1')
    .map((row) => ({
      id: row.stop_id,
      name: row.stop_name,
      latitude: parseFloat(row.stop_lat),
      longitude: parseFloat(row.stop_lon),
    }))
    .filter((stop) => stop.id && stop.name && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
    .filter(
      (stop) =>
        stop.latitude >= PARIS_BBOX.minLat &&
        stop.latitude <= PARIS_BBOX.maxLat &&
        stop.longitude >= PARIS_BBOX.minLon &&
        stop.longitude <= PARIS_BBOX.maxLon
    )
    .slice(0, MAX_STOPS);

  await TransitStopsModel.replaceAll(stations, feedUrl);

  const linesResult = await importTransitLines(zip, stopsRows, stations);

  return { imported: stations.length, totalInFeed: stopsRows.length, ...linesResult };
}

async function importTransitLines(zip, stopsRows, stations) {
  const stationIds = new Set(stations.map((s) => s.id));

  // Les arrêts "quay" (location_type=0) sont ceux que stop_times.txt utilise
  // réellement pour référencer une station.
  const quayToStation = new Map();
  for (const row of stopsRows) {
    if (row.location_type === '0' && stationIds.has(row.parent_station)) {
      quayToStation.set(row.stop_id, row.parent_station);
    }
  }

  const routesById = new Map();
  for (const r of loadCsvEntry(zip, 'routes.txt')) {
    routesById.set(r.route_id, {
      shortName: r.route_short_name || r.route_long_name || r.route_id,
      color: r.route_color || null,
      type: Number(r.route_type),
    });
  }

  const tripToRoute = new Map();
  const tripToHeadsign = new Map();
  const tripToDirection = new Map();
  // On garde un seul trajet par ligne/direction, ça suffit pour connaître
  // l'ordre des stations : une ligne change rarement d'ordre d'arrêt selon
  // les trajets.
  const representativeTrip = new Map();

  for (const t of loadCsvEntry(zip, 'trips.txt')) {
    if (!routesById.has(t.route_id)) continue;
    tripToRoute.set(t.trip_id, t.route_id);
    tripToHeadsign.set(t.trip_id, t.trip_headsign || '');
    tripToDirection.set(t.trip_id, t.direction_id || '0');
    const key = `${t.route_id}|${t.direction_id || '0'}`;
    if (!representativeTrip.has(key)) representativeTrip.set(key, t.trip_id);
  }
  const representativeTripIds = new Set(representativeTrip.values());

  // stop_times.txt est énorme (centaines de Mo), donc on le lit ligne par
  // ligne au lieu de tout charger en tableau, pour économiser de la mémoire.
  const stopTimesEntry = zip.getEntry('stop_times.txt');
  if (!stopTimesEntry) throw new Error('Le flux GTFS ne contient pas de fichier stop_times.txt');
  const buffer = stopTimesEntry.getData();

  const stationRoutes = new Map(); // station id -> Set<route_id>
  const sequences = new Map(); // `${routeId}|${directionId}` -> [{stationId, stopSequence}]
  const NEWLINE = 0x0a;
  let lineStart = 0;
  let tripIdIdx = 0;
  let stopIdIdx = 5;
  let stopSeqIdx = 6;
  let headerParsed = false;

  for (let i = 0; i <= buffer.length; i++) {
    if (i < buffer.length && buffer[i] !== NEWLINE) continue;
    if (i > lineStart) {
      const line = buffer.toString('utf-8', lineStart, i);
      const fields = line[line.length - 1] === '\r' ? line.slice(0, -1).split(',') : line.split(',');

      if (!headerParsed) {
        tripIdIdx = fields.indexOf('trip_id');
        stopIdIdx = fields.indexOf('stop_id');
        stopSeqIdx = fields.indexOf('stop_sequence');
        headerParsed = true;
      } else {
        const tripId = fields[tripIdIdx];
        const stationId = quayToStation.get(fields[stopIdIdx]);
        if (stationId) {
          const routeId = tripToRoute.get(tripId);
          const route = routeId && routesById.get(routeId);
          if (route && SUPPORTED_ROUTE_TYPES.has(route.type)) {
            let set = stationRoutes.get(stationId);
            if (!set) {
              set = new Set();
              stationRoutes.set(stationId, set);
            }
            set.add(routeId);

            if (representativeTripIds.has(tripId)) {
              const key = `${routeId}|${tripToDirection.get(tripId)}`;
              let seq = sequences.get(key);
              if (!seq) {
                seq = [];
                sequences.set(key, seq);
              }
              seq.push({ stationId, stopSequence: Number(fields[stopSeqIdx]) });
            }
          }
        }
      }
    }
    lineStart = i + 1;
  }

  const links = [];
  for (const [stationId, routeIds] of stationRoutes) {
    for (const routeId of routeIds) {
      const route = routesById.get(routeId);
      links.push({ stopId: stationId, routeId, shortName: route.shortName, color: route.color, type: route.type });
    }
  }
  await TransitStopRoutesModel.replaceAll(links);

  const directions = [];
  for (const [key, seq] of sequences) {
    const [routeId, directionId] = key.split('|');
    const tripId = representativeTrip.get(key);
    const route = routesById.get(routeId);
    const stationSequence = seq
      .sort((a, b) => a.stopSequence - b.stopSequence)
      .map((s) => s.stationId)
      .filter((id, idx, arr) => idx === 0 || arr[idx - 1] !== id);

    if (stationSequence.length < 2) continue;

    directions.push({
      routeId,
      directionId,
      headsign: tripToHeadsign.get(tripId) || '',
      shortName: route.shortName,
      color: route.color,
      stationSequence,
    });
  }
  await TransitRouteDirectionsModel.replaceAll(directions);

  return { stationsWithLines: stationRoutes.size, lineLinks: links.length, routeDirections: directions.length };
}

export async function listTransitStops() {
  return TransitStopsModel.findAll();
}

export async function listTransitStopRoutes() {
  return TransitStopRoutesModel.findAll();
}

export async function listTransitRouteDirections() {
  return TransitRouteDirectionsModel.findAll();
}
