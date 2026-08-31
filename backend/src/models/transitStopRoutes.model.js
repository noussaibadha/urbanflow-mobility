import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM transit_stop_routes');
  return rows;
}

export async function replaceAll(links) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM transit_stop_routes');

    for (const link of links) {
      await client.query(
        `INSERT INTO transit_stop_routes (stop_id, route_id, route_short_name, route_color, route_type)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (stop_id, route_id) DO NOTHING`,
        [link.stopId, link.routeId, link.shortName, link.color, link.type]
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
