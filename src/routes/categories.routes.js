import { Router } from 'express';
import { z } from 'zod';
import { query } from '../config/database.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../utils/httpError.js';
import { newId } from '../utils/id.js';

const router = Router();

const categorySchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).max(100),
  icon: z.string().trim().max(20).default('☕'),
  colorHex: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/).default('#D4A373'),
});

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY created_at');
    res.json({ success: true, data: result.rows.map(mapCategory) });
  } catch (error) {
    next(error);
  }
});

router.post('/', validate(categorySchema), async (req, res, next) => {
  try {
    const body = req.body;
    const id = body.id || newId('cat');
    const result = await query(
      `INSERT INTO categories (id, name, icon, color_hex)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, body.name, body.icon, body.colorHex],
    );
    res.status(201).json({ success: true, data: mapCategory(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return next(httpError(409, 'CATEGORY_EXISTS', 'Category already exists'));
    }
    next(error);
  }
});

router.put('/:id', validate(categorySchema), async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE categories SET name = $2, icon = $3, color_hex = $4, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id, req.body.name, req.body.icon, req.body.colorHex],
    );
    if (!result.rows.length) return next(httpError(404, 'CATEGORY_NOT_FOUND', 'Category not found'));
    res.json({ success: true, data: mapCategory(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query('DELETE FROM categories WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return next(httpError(404, 'CATEGORY_NOT_FOUND', 'Category not found'));
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

function mapCategory(row) {
  return { id: row.id, name: row.name, icon: row.icon, colorHex: row.color_hex };
}

export default router;
