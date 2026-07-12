import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM vehicles ORDER BY id');
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM vehicles WHERE id = $1', [id]);
  return rows[0];
}

export async function create({ type, status, battery_level, station_id }) {
  const { rows } = await pool.query(
    `INSERT INTO vehicles (type, status, battery_level, station_id)
     VALUES ($1, COALESCE($2, 'available'), $3, $4) RETURNING *`,
    [type, status, battery_level, station_id]
  );
  return rows[0];
}

export async function updateStatus(id, status) {
  const { rows } = await pool.query(
    'UPDATE vehicles SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );
  return rows[0];
}

export async function remove(id) {
  await pool.query('DELETE FROM vehicles WHERE id = $1', [id]);
}
