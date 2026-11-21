import { pool, closeDatabase } from '../config/database.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('COMMIT');
    console.log('No default cafe data was seeded');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
