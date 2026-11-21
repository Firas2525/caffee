import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { newId } from '../utils/id.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function initializeDatabase() {
  const migration = await readFile(path.join(here, 'migration.sql'), 'utf8');
  await pool.query(migration);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM items
       WHERE id LIKE 'item_hot_%'
          OR id LIKE 'item_cold_%'
          OR id LIKE 'item_shisha_%'
          OR id LIKE 'item_dessert_%'`,
    );
    await client.query(
      `DELETE FROM categories
       WHERE id IN ('cat_hot', 'cat_cold', 'cat_shisha', 'cat_desserts')`,
    );
    await client.query(
      `DELETE FROM cafe_tables
       WHERE id ~ '^table_[1-9][0-9]*$'`,
    );

    const userCount = await client.query('SELECT COUNT(*)::int AS count FROM users');
    if (userCount.rows[0].count === 0) {
      if (!env.adminUsername || env.adminPassword.length < 12) {
        throw new Error(
          'The database has no users. Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.',
        );
      }
      const passwordHash = await bcrypt.hash(env.adminPassword, 12);
      await client.query(
        `INSERT INTO users (id, username, display_name, password_hash, role)
         VALUES ($1, $2, $3, $4, 'admin')`,
        [
          newId('user'),
          env.adminUsername.toLowerCase(),
          env.adminName,
          passwordHash,
        ],
      );
      console.log('Initial administrator account created');
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
