import { pool } from '../config/db.js';

export async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM mobility_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0];
}

export async function upsert(userId, { preferred_transport, home_station_id, bio }) {
  const { rows } = await pool.query(
    `INSERT INTO mobility_profiles (user_id, preferred_transport, home_station_id, bio, updated_at)
     VALUES ($1, COALESCE($2, 'bike'), $3, $4, now())
     ON CONFLICT (user_id) DO UPDATE SET
       preferred_transport = COALESCE($2, mobility_profiles.preferred_transport),
       home_station_id = $3,
       bio = $4,
       updated_at = now()
     RETURNING *`,
    [userId, preferred_transport, home_station_id, bio]
  );
  return rows[0];
}
