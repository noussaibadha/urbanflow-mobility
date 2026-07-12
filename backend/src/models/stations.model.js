import { pool } from '../config/db.js';

export async function findAll() {
  const { rows } = await pool.query('SELECT * FROM stations ORDER BY id');
  return rows;
}

export async function findById(id) {
  const { rows } = await pool.query('SELECT * FROM stations WHERE id = $1', [id]);
  return rows[0];
}

export async function create({ name, latitude, longitude, capacity }) {
  const { rows } = await pool.query(
    `INSERT INTO stations (name, latitude, longitude, capacity)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, latitude, longitude, capacity]
  );
  return rows[0];
}

export async function remove(id) {
  await pool.query('DELETE FROM stations WHERE id = $1', [id]);
}
