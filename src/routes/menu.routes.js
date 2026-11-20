import { Router } from 'express';
import { pool } from '../config/database.js';
import { seedMenu } from '../database/defaultData.js';
import { requireAdmin } from '../middleware/authenticate.js';

const router = Router();

router.post('/reset', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await seedMenu(client, { reset: true });
    await client.query('COMMIT');
    res.json({ success: true, data: { reset: true } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
