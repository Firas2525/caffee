import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.databaseUrl.replace(
    /([?&])sslmode=require(?=&|$)/i,
    '$1sslmode=verify-full',
  ),
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function closeDatabase() {
  await pool.end();
}
