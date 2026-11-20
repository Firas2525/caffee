import { pool, closeDatabase } from '../config/database.js';
import { seedMenu } from './defaultData.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedMenu(client);

    for (let number = 1; number <= 12; number += 1) {
      const id = `table_${number}`;
      const name = number === 1 ? 'طاولة VIP 1' : number === 2 ? 'طاولة VIP 2' : `طاولة ${number}`;
      await client.query(
        `INSERT INTO cafe_tables (id, table_number, table_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [id, number, name],
      );
    }

    await client.query('COMMIT');
    console.log('Database seed completed');
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
