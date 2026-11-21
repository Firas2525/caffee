import { Router } from 'express';
import { z } from 'zod';
import { pool, query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../utils/httpError.js';
import { newId } from '../utils/id.js';
import { requireAdmin } from '../middleware/authenticate.js';

const router = Router();

const tableSchema = z.object({
  id: z.string().trim().min(1).optional(),
  tableNumber: z.coerce.number().int().positive(),
  tableName: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(500).default(''),
});

const orderSchema = z.object({
  itemId: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive().default(1),
  notes: z.string().trim().max(500).default(''),
});

const quantitySchema = z.object({
  quantity: z.coerce.number().int().positive(),
});

const closeSchema = z.object({
  discount: z.coerce.number().nonnegative().default(0),
  paymentMethod: z.string().trim().min(1).max(50).default('نقدًا'),
});

router.get('/', async (req, res, next) => {
  try {
    const tables = await query('SELECT * FROM cafe_tables ORDER BY table_number');
    const orders = await query(`
      SELECT table_orders.*
      FROM table_orders
      INNER JOIN cafe_tables ON cafe_tables.id = table_orders.table_id
      ORDER BY table_orders.created_at
    `);

    const ordersByTable = new Map();
    for (const order of orders.rows) {
      const list = ordersByTable.get(order.table_id) ?? [];
      list.push(mapOrder(order));
      ordersByTable.set(order.table_id, list);
    }

    res.json({
      success: true,
      data: tables.rows.map((row) => mapTable(row, ordersByTable.get(row.id) ?? [])),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAdmin, validate(tableSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const id = body.id || newId('table');
    const result = await query(
      `INSERT INTO cafe_tables (id, table_number, table_name, notes)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, body.tableNumber, body.tableName, body.notes],
    );
    res.status(201).json({ success: true, data: mapTable(result.rows[0], []) });
  } catch (error) {
    if (error.code === '23505') return next(httpError(409, 'TABLE_EXISTS', 'Table number already exists'));
    next(error);
  }
});

router.put('/:id', requireAdmin, validate(tableSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const body = req.body;
    const lockResult = await client.query(
      'SELECT id FROM cafe_tables WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    if (!lockResult.rows.length) throw httpError(404, 'TABLE_NOT_FOUND', 'Table not found');
    const result = await client.query(
      `UPDATE cafe_tables SET table_number = $2, table_name = $3, notes = $4, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, body.tableNumber, body.tableName, body.notes],
    );
    await client.query('COMMIT');
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockResult = await client.query(
      'SELECT id FROM cafe_tables WHERE id = $1 AND is_occupied = FALSE FOR UPDATE',
      [req.params.id],
    );
    if (!lockResult.rows.length) {
      const tableResult = await client.query('SELECT id FROM cafe_tables WHERE id = $1', [req.params.id]);
      if (!tableResult.rows.length) throw httpError(404, 'TABLE_NOT_FOUND', 'Table not found');
      throw httpError(409, 'TABLE_OCCUPIED', 'Only available tables can be deleted');
    }
    const result = await client.query('DELETE FROM cafe_tables WHERE id = $1 RETURNING id', [req.params.id]);
    await client.query('COMMIT');
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/open', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const lockResult = await client.query(
      'SELECT * FROM cafe_tables WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    if (!lockResult.rows.length) throw httpError(404, 'TABLE_NOT_FOUND', 'Table not found');
    const result = await client.query(
      `UPDATE cafe_tables SET is_occupied = TRUE, opened_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.json({ success: true, data: mapTable(result.rows[0], []) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/orders', validate(orderSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tableResult = await client.query('SELECT * FROM cafe_tables WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!tableResult.rows.length) throw httpError(404, 'TABLE_NOT_FOUND', 'Table not found');

    const itemResult = await client.query(
      'SELECT * FROM items WHERE id = $1 AND is_available = TRUE',
      [req.body.itemId],
    );
    if (!itemResult.rows.length) throw httpError(404, 'ITEM_NOT_FOUND', 'Available item not found');

    const item = itemResult.rows[0];
    const existing = await client.query(
      'SELECT * FROM table_orders WHERE table_id = $1 AND item_id = $2',
      [req.params.id, item.id],
    );

    let order;
    if (existing.rows.length) {
      const result = await client.query(
        `UPDATE table_orders SET quantity = quantity + $3, notes = $4, updated_at = NOW()
         WHERE table_id = $1 AND item_id = $2 RETURNING *`,
        [req.params.id, item.id, req.body.quantity, req.body.notes],
      );
      order = result.rows[0];
    } else {
      const result = await client.query(
        `INSERT INTO table_orders
         (id, table_id, item_id, item_name, unit_price, quantity, icon, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [newId('order'), req.params.id, item.id, item.name, item.price, req.body.quantity, item.icon, req.body.notes],
      );
      order = result.rows[0];
    }

    await client.query(
      `UPDATE cafe_tables SET is_occupied = TRUE, opened_at = COALESCE(opened_at, NOW()), updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');
    res.status(existing.rows.length ? 200 : 201).json({ success: true, data: mapOrder(order) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.put('/:id/orders/:orderId', validate(quantitySchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM cafe_tables WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    const result = await client.query(
      `UPDATE table_orders SET quantity = $3, updated_at = NOW()
       WHERE table_id = $1 AND id = $2 RETURNING *`,
      [req.params.id, req.params.orderId, req.body.quantity],
    );
    if (!result.rows.length) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    await client.query('COMMIT');
    res.json({ success: true, data: mapOrder(result.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.delete('/:id/orders/:orderId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT id FROM cafe_tables WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    const result = await client.query(
      'DELETE FROM table_orders WHERE table_id = $1 AND id = $2 RETURNING id',
      [req.params.id, req.params.orderId],
    );
    if (!result.rows.length) throw httpError(404, 'ORDER_NOT_FOUND', 'Order not found');
    await client.query('COMMIT');
    res.json({ success: true, data: { id: req.params.orderId } });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

router.post('/:id/close', validate(closeSchema), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tableResult = await client.query('SELECT * FROM cafe_tables WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!tableResult.rows.length) throw httpError(404, 'TABLE_NOT_FOUND', 'Table not found');

    const table = tableResult.rows[0];
    const ordersResult = await client.query(
      'SELECT * FROM table_orders WHERE table_id = $1 ORDER BY created_at',
      [req.params.id],
    );
    if (!ordersResult.rows.length) throw httpError(400, 'TABLE_HAS_NO_ORDERS', 'Table has no orders');

    const subtotal = ordersResult.rows.reduce(
      (sum, order) => sum + Number(order.unit_price) * order.quantity,
      0,
    );
    const total = Math.max(0, subtotal - req.body.discount);
    const billId = newId('bill');
    const openedAt = table.opened_at ?? new Date();

    await client.query(
      `INSERT INTO bills
       (id, table_number, table_name, subtotal, discount, total, opened_at, closed_at,
        payment_method, created_by_user_id, created_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10)`,
      [
        billId,
        table.table_number,
        table.table_name,
        subtotal,
        req.body.discount,
        total,
        openedAt,
        req.body.paymentMethod,
        req.user.id,
        req.user.displayName,
      ],
    );

    for (const order of ordersResult.rows) {
      await client.query(
        `INSERT INTO bill_items
         (id, bill_id, item_id, item_name, unit_price, quantity, icon, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [newId('bill_item'), billId, order.item_id, order.item_name, order.unit_price, order.quantity, order.icon, order.notes],
      );
    }

    await client.query('DELETE FROM table_orders WHERE table_id = $1', [req.params.id]);
    await client.query(
      `UPDATE cafe_tables SET is_occupied = FALSE, opened_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.params.id],
    );
    await client.query('COMMIT');

    const bill = await query('SELECT * FROM bills WHERE id = $1', [billId]);
    const billItems = await query('SELECT * FROM bill_items WHERE bill_id = $1', [billId]);
    res.status(201).json({ success: true, data: mapBill(bill.rows[0], billItems.rows) });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

function mapTable(row, orders = []) {
  return {
    id: row.id,
    tableNumber: row.table_number,
    tableName: row.table_name,
    isOccupied: row.is_occupied,
    openedAt: row.opened_at,
    orders,
    notes: row.notes,
  };
}

function mapOrder(row) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    unitPrice: Number(row.unit_price),
    quantity: row.quantity,
    icon: row.icon,
    notes: row.notes,
  };
}

function mapBill(row, items) {
  return {
    id: row.id,
    tableNumber: row.table_number,
    tableName: row.table_name,
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    paymentMethod: row.payment_method,
    createdByName: row.created_by_name,
    items: items.map(mapOrder),
  };
}

export default router;
