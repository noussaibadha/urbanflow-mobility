import { pool } from '../config/db.js';

export async function findByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return rows[0];
}

export async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, email, full_name, role, created_at FROM users WHERE id = $1',
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
    'SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at ASC'
  );
  return rows;
}

export async function findByResetToken(token) {
  const { rows } = await pool.query('SELECT * FROM users WHERE reset_token = $1', [token]);
  return rows[0];
}

export async function setResetToken(userId, token, expiresAt) {
  await pool.query('UPDATE users SET reset_token = $2, reset_token_expires = $3 WHERE id = $1', [
    userId,
    token,
    expiresAt,
  ]);
}

export async function clearResetToken(userId) {
  await pool.query('UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1', [userId]);
}

export async function updatePasswordHash(userId, passwordHash) {
  await pool.query('UPDATE users SET password_hash = $2 WHERE id = $1', [userId, passwordHash]);
}
