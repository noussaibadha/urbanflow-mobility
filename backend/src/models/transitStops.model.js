import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM transit_stops ORDER BY name');
  return rows;
}

export async function replaceAll(stops, sourceFeed) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transit_stops WHERE source_feed = $1', [sourceFeed]);

    for (const stop of stops) {
      await client.query(
        `INSERT INTO transit_stops (id, name, latitude, longitude, source_feed)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, latitude = $3, longitude = $4, source_feed = $5, imported_at = now()`,
        [stop.id, stop.name, stop.latitude, stop.longitude, sourceFeed]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
