import { pool } from '../config/db.js';
import { insertRowsInBatches } from '../db/bulkInsert.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM transit_stops ORDER BY name');
  return rows;
}

export async function replaceAll(stops, sourceFeed) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transit_stops WHERE source_feed = $1', [sourceFeed]);

    await insertRowsInBatches(client, {
      table: 'transit_stops',
      columns: ['id', 'name', 'latitude', 'longitude', 'source_feed'],
      conflictClause: `ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
        source_feed = EXCLUDED.source_feed, imported_at = now()`,
      rows: stops.map((stop) => [stop.id, stop.name, stop.latitude, stop.longitude, sourceFeed]),
    });

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
