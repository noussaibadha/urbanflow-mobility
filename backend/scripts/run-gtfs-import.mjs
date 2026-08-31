import 'dotenv/config';
import { importGtfsStatic } from '../src/services/gtfs.service.js';

const feedUrl = process.env.GTFS_STATIC_URL || 'https://eu.ftp.opendatasoft.com/stif/GTFS/IDFM-gtfs.zip';
console.log('Starting GTFS import from', feedUrl);
const start = Date.now();
const result = await importGtfsStatic(feedUrl);
console.log('Done in', Math.round((Date.now() - start) / 1000), 's');
console.log(result);
process.exit(0);
