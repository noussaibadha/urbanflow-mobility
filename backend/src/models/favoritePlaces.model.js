import { pool } from '../config/db.js';

export async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM favorite_places WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return rows;
}

export async function create({ userId, name, address, latitude, longitude }) {
  const { rows } = await pool.query(
    `INSERT INTO favorite_places (user_id, name, address, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [userId, name, address, latitude, longitude]
  );
  return rows[0];
}

export async function remove(id, userId) {
  const { rowCount } = await pool.query(
    'DELETE FROM favorite_places WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount > 0;
}
