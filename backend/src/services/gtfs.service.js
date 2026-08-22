import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import * as TransitStopsModel from '../models/transitStops.model.js';

// Full regional GTFS feeds (e.g. Île-de-France Mobilités) can list tens of
// thousands of stops network-wide. For this demo we only keep stops inside
// central Paris, capped at MAX_STOPS, so the import stays fast and light
// while still demonstrating the GTFS integration end to end.
const PARIS_BBOX = { minLat: 48.815, maxLat: 48.902, minLon: 2.224, maxLon: 2.47 };
const MAX_STOPS = 2000;

export async function importGtfsStatic(feedUrl) {
  const res = await fetch(feedUrl);
  if (!res.ok) {
    throw new Error(`Impossible de télécharger le flux GTFS (statut ${res.status})`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const stopsEntry = zip.getEntry('stops.txt');
  if (!stopsEntry) {
    throw new Error('Le flux GTFS ne contient pas de fichier stops.txt');
  }

  const rows = parse(stopsEntry.getData().toString('utf-8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const stops = rows
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

  await TransitStopsModel.replaceAll(stops, feedUrl);
  return { imported: stops.length, totalInFeed: rows.length };
}

export async function listTransitStops() {
  return TransitStopsModel.findAll();
}
