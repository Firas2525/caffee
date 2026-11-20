import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';
import { env } from '../config/env.js';
import { newId } from '../utils/id.js';
import { seedMenu } from './defaultData.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export async function initializeDatabase() {
  const migration = await readFile(path.join(here, 'migration.sql'), 'utf8');
  await pool.query(migration);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
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

    const categoryCount = await client.query('SELECT COUNT(*)::int AS count FROM categories');
    if (categoryCount.rows[0].count === 0) {
      await seedMenu(client);
    }

    const tableCount = await client.query('SELECT COUNT(*)::int AS count FROM cafe_tables');
    if (tableCount.rows[0].count === 0) {
      for (let number = 1; number <= 12; number += 1) {
        const name = number === 1
          ? 'طاولة VIP 1'
          : number === 2
            ? 'طاولة VIP 2'
            : `طاولة ${number}`;
        await client.query(
          'INSERT INTO cafe_tables (id, table_number, table_name) VALUES ($1, $2, $3)',
          [`table_${number}`, number, name],
        );
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
