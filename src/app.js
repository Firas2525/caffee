import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { query } from './config/database.js';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin: env.corsOrigins.length && !env.corsOrigins.includes('*')
    ? env.corsOrigins
    : true,
}));
app.use(express.json({ limit: '1mb' }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/health/deep', async (req, res) => {
  const checks = [
    ['categories', 'SELECT * FROM categories ORDER BY created_at'],
    ['items', 'SELECT * FROM items ORDER BY name'],
    ['tables', 'SELECT * FROM cafe_tables ORDER BY table_number'],
    ['tableOrders', 'SELECT table_orders.* FROM table_orders INNER JOIN cafe_tables ON cafe_tables.id = table_orders.table_id ORDER BY table_orders.created_at'],
    ['bills', 'SELECT * FROM bills ORDER BY closed_at DESC'],
    ['billItems', 'SELECT bill_items.* FROM bill_items INNER JOIN bills ON bills.id = bill_items.bill_id ORDER BY bill_items.bill_id'],
  ];
  const results = {};

  for (const [name, sql] of checks) {
    try {
      const result = await query(sql);
      results[name] = { status: 'ok', rowCount: result.rowCount };
    } catch (error) {
      console.error(`Deep health check failed: ${name}`, error);
      results[name] = {
        status: 'error',
        code: error.code ?? 'UNKNOWN',
        message: error.message,
      };
    }
  }

  const failed = Object.values(results).some((check) => check.status === 'error');
  res.status(failed ? 500 : 200).json({
    success: !failed,
    data: {
      status: failed ? 'database_error' : 'ok',
      timezone: env.appTimezone,
      checks: results,
    },
  });
});

app.use('/api/v1', apiRouter);
app.use(notFound);
app.use(errorHandler);
