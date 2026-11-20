import { Router } from 'express';
import { query } from '../config/database.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const bills = await query('SELECT * FROM bills ORDER BY closed_at DESC');
    const billIds = bills.rows.map((bill) => bill.id);
    const items = billIds.length
      ? await query('SELECT * FROM bill_items WHERE bill_id = ANY($1::text[])', [billIds])
      : { rows: [] };

    const itemsByBill = new Map();
    for (const item of items.rows) {
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

router.delete('/', async (req, res, next) => {
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
