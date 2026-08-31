import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM transit_route_directions');
  return rows;
}

export async function replaceAll(directions) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transit_route_directions');

    for (const d of directions) {
      await client.query(
        `INSERT INTO transit_route_directions
           (route_id, direction_id, headsign, route_short_name, route_color, station_sequence)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (route_id, direction_id) DO NOTHING`,
        [d.routeId, d.directionId, d.headsign, d.shortName, d.color, d.stationSequence.join(',')]
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
