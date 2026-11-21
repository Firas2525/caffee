import { Router } from 'express';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { requireAdmin } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';

const router = Router();
const billsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.get('/', validate(billsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const requestedDate = req.validatedQuery?.date;
    let bills;
    if (typeof requestedDate === 'string') {
      bills = await query(
        `SELECT * FROM bills
         WHERE (closed_at AT TIME ZONE $1)::date = $2::date
         ORDER BY closed_at DESC`,
        [env.appTimezone, requestedDate],
      );
    } else {
      bills = await query('SELECT * FROM bills ORDER BY closed_at DESC');
    }
    const billIds = new Set(bills.rows.map((bill) => bill.id));
    const items = billIds.size
      ? await query(`
          SELECT bill_items.*
          FROM bill_items
          INNER JOIN bills ON bills.id = bill_items.bill_id
          ORDER BY bill_items.bill_id
        `)
      : { rows: [] };

    const itemsByBill = new Map();
    for (const item of items.rows) {
      if (!billIds.has(item.bill_id)) continue;
      const list = itemsByBill.get(item.bill_id) ?? [];
      list.push(mapItem(item));
      itemsByBill.set(item.bill_id, list);
    }

    res.json({
      success: true,
      data: bills.rows.map((bill) => mapBill(bill, itemsByBill.get(bill.id) ?? [])),
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/', requireAdmin, async (req, res, next) => {
  try {
    await query('DELETE FROM bills');
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

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
    items,
  };
}

function mapItem(row) {
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

export default router;
