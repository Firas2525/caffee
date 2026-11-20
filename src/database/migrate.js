import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool, closeDatabase } from '../config/database.js';

const here = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const sql = await readFile(path.join(here, 'migration.sql'), 'utf8');
  await pool.query(sql);
  console.log('Database migration completed');
}

migrate()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
