import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../utils/httpError.js';
import { newId } from '../utils/id.js';

const router = Router();

const itemSchema = z.object({
  id: z.string().trim().min(1).optional(),
  categoryId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  price: z.coerce.number().nonnegative(),
  icon: z.string().trim().max(20).default('🍽️'),
  description: z.string().trim().max(500).default(''),
  isAvailable: z.boolean().default(true),
});

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM items ORDER BY name');
    res.json({ success: true, data: result.rows.map(mapItem) });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(itemSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const id = body.id || newId('item');
    const result = await query(
      `INSERT INTO items (id, category_id, name, price, icon, description, is_available)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [id, body.categoryId, body.name, body.price, body.icon, body.description, body.isAvailable],
    );
    res.status(201).json({ success: true, data: mapItem(result.rows[0]) });
  } catch (error) {
    if (error.code === '23503') return next(httpError(400, 'CATEGORY_NOT_FOUND', 'Category not found'));
    if (error.code === '23505') return next(httpError(409, 'ITEM_EXISTS', 'Item already exists'));
    next(error);
  }
});

router.put('/:id', validate(itemSchema), async (req, res, next) => {
  try {
    const body = req.body;
    const result = await query(
      `UPDATE items SET category_id = $2, name = $3, price = $4, icon = $5,
       description = $6, is_available = $7, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, body.categoryId, body.name, body.price, body.icon, body.description, body.isAvailable],
    );
    if (!result.rows.length) return next(httpError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    res.json({ success: true, data: mapItem(result.rows[0]) });
  } catch (error) {
    if (error.code === '23503') return next(httpError(400, 'CATEGORY_NOT_FOUND', 'Category not found'));
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM items WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return next(httpError(404, 'ITEM_NOT_FOUND', 'Item not found'));
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

function mapItem(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    price: Number(row.price),
    icon: row.icon,
    description: row.description,
    isAvailable: row.is_available,
  };
}

export default router;
