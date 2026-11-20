import { Router } from 'express';
import categoriesRouter from './categories.routes.js';
import itemsRouter from './items.routes.js';
import tablesRouter from './tables.routes.js';
import billsRouter from './bills.routes.js';
import menuRouter from './menu.routes.js';
import authRouter from './auth.routes.js';
import reportsRouter from './reports.routes.js';
import { authenticate } from '../middleware/authenticate.js';
import { env } from '../config/env.js';
import { query } from '../config/database.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use(authenticate);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/items', itemsRouter);
apiRouter.use('/tables', tablesRouter);
apiRouter.use('/bills', billsRouter);
apiRouter.use('/menu', menuRouter);
apiRouter.use('/reports', reportsRouter);

apiRouter.get('/dashboard', async (req, res, next) => {
  try {
    const [tables, bills, items] = await Promise.all([
      query(`SELECT COUNT(*)::int AS total,
                    COUNT(*) FILTER (WHERE is_occupied)::int AS active
             FROM cafe_tables`),
      query(`SELECT COALESCE(SUM(total), 0)::float AS total_sales,
                    COUNT(*)::int AS bills_count,
                    COALESCE(SUM(total) FILTER (
                      WHERE (closed_at AT TIME ZONE $1)::date =
                        (NOW() AT TIME ZONE $1)::date
                    ), 0)::float AS today_revenue
             FROM bills`, [env.appTimezone]),
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
