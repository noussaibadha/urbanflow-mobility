import AdmZip from 'adm-zip';
import { parse } from 'csv-parse/sync';
import * as TransitStopsModel from '../models/transitStops.model.js';

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
    .filter((stop) => stop.id && stop.name && Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));

  await TransitStopsModel.replaceAll(stops, feedUrl);
  return { imported: stops.length };
}

export async function listTransitStops() {
  return TransitStopsModel.findAll();
}
