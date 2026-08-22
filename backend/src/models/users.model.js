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
