import { Router } from 'express';
import categoriesRouter from './categories.routes.js';
import itemsRouter from './items.routes.js';
import tablesRouter from './tables.routes.js';
import billsRouter from './bills.routes.js';

export const apiRouter = Router();

apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/items', itemsRouter);
apiRouter.use('/tables', tablesRouter);
apiRouter.use('/bills', billsRouter);

apiRouter.get('/dashboard', async (req, res, next) => {
  try {
    const { query } = await import('../config/database.js');
    const [tables, bills, items] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE is_occupied)::int AS active
             FROM cafe_tables`),
      query(`SELECT COALESCE(SUM(total), 0)::float AS total_sales,
                    COUNT(*)::int AS bills_count,
                    COALESCE(SUM(total) FILTER (
                      WHERE closed_at >= date_trunc('day', NOW())
                    ), 0)::float AS today_revenue
             FROM bills`),
      query('SELECT COUNT(*)::int AS total FROM items'),
    ]);
    res.json({
      success: true,
      data: {
        ...tables.rows[0],
        ...bills.rows[0],
        items: items.rows[0].total,
      },
    });
  } catch (error) {
    next(error);
  }
});
