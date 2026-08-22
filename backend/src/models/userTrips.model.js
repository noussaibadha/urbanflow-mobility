import { pool } from '../config/db.js';

export async function create({ userId, mode, distanceMeters, durationSeconds, fromLabel, toLabel }) {
  const { rows } = await pool.query(
    `INSERT INTO user_trips (user_id, mode, distance_meters, duration_seconds, from_label, to_label)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [userId, mode, distanceMeters, durationSeconds, fromLabel ?? null, toLabel ?? null]
  );
  return rows[0];
}

export async function findRecentByUser(userId, limit) {
  const { rows } = await pool.query(
    'SELECT * FROM user_trips WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return rows;
}

export async function findAllByUser(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM user_trips WHERE user_id = $1',
    [userId]
  );
  return rows;
}

export async function findSinceByUser(userId, since) {
  const { rows } = await pool.query(
    'SELECT * FROM user_trips WHERE user_id = $1 AND created_at >= $2 ORDER BY created_at DESC',
    [userId, since]
  );
  return rows;
}
