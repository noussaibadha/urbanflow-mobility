import { pool } from '../config/db.js';

export async function findByUserId(userId) {
  const { rows } = await pool.query(
    'SELECT * FROM mobility_profiles WHERE user_id = $1',
    [userId]
  );
  return rows[0];
}

export async function upsert(
  userId,
  { preferred_transport, home_station_id, bio, eco_priority, avoid_highways, notifications_enabled, route_priority }
) {
  const { rows } = await pool.query(
    `INSERT INTO mobility_profiles
       (user_id, preferred_transport, home_station_id, bio, eco_priority, avoid_highways, notifications_enabled, route_priority, updated_at)
     VALUES ($1, COALESCE($2, 'bike'), $3, $4, COALESCE($5, true), COALESCE($6, false), COALESCE($7, true), COALESCE($8, 'fast'), now())
     ON CONFLICT (user_id) DO UPDATE SET
       preferred_transport = COALESCE($2, mobility_profiles.preferred_transport),
       home_station_id = $3,
       bio = $4,
       eco_priority = COALESCE($5, mobility_profiles.eco_priority),
       avoid_highways = COALESCE($6, mobility_profiles.avoid_highways),
       notifications_enabled = COALESCE($7, mobility_profiles.notifications_enabled),
       route_priority = COALESCE($8, mobility_profiles.route_priority),
       updated_at = now()
     RETURNING *`,
    [userId, preferred_transport, home_station_id, bio, eco_priority, avoid_highways, notifications_enabled, route_priority]
  );
  return rows[0];
}
