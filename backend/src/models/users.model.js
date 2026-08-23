import { pool } from '../config/db.js';

export async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

export async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, is_suspended, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0];
}

export async function create({ email, passwordHash, fullName }) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, $2, $3) RETURNING id, email, full_name, role, created_at`,
    [email, passwordHash, fullName]
  );
  return rows[0];
}

export async function findAll() {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, is_suspended, created_at FROM users ORDER BY created_at ASC'
  );
  return rows;
}

export async function updateRole(userId, newRole) {
  const { rows } = await pool.query(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING id, email, full_name, role, is_suspended, created_at',
    [userId, newRole]
  );
  return rows[0];
}

export async function updateSuspended(userId, isSuspended) {
  const { rows } = await pool.query(
    'UPDATE users SET is_suspended = $2 WHERE id = $1 RETURNING id, email, full_name, role, is_suspended, created_at',
    [userId, isSuspended]
  );
  return rows[0];
}

export async function deleteUser(userId) {
  const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  return rowCount > 0;
}
