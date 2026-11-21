import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { validate } from '../middleware/validate.js';

const router = Router();
const reportQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

router.get('/daily', validate(reportQuerySchema, 'query'), async (req, res, next) => {
  try {
    const requestedDate = req.validatedQuery?.date;
    const result = await query(
      `SELECT
         COUNT(*)::int AS bills_count,
         COALESCE(SUM(total), 0)::float AS total_sales,
         COALESCE(SUM(discount), 0)::float AS discounts_total,
         COALESCE(AVG(total), 0)::float AS average_bill,
         COALESCE(MAX(total), 0)::float AS largest_bill
       FROM bills
       WHERE (closed_at AT TIME ZONE $1)::date = $2::date`,
      [env.appTimezone, requestedDate],
    );
    res.json({
      success: true,
      data: {
        date: requestedDate,
        timezone: env.appTimezone,
        ...result.rows[0],
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
