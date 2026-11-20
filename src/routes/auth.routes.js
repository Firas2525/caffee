import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { query } from '../config/database.js';
import { env } from '../config/env.js';
import { authenticate, requireAdmin } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { httpError } from '../utils/httpError.js';
import { newId } from '../utils/id.js';

const router = Router();

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

const createUserSchema = z.object({
  username: z.string().trim().regex(/^[a-zA-Z0-9._-]{3,32}$/),
  displayName: z.string().trim().min(2).max(100),
  password: z.string().min(12).max(200),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'LOGIN_RATE_LIMIT', message: 'Too many login attempts' },
  },
});
const dummyPasswordHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, display_name, password_hash, role, is_active
       FROM users WHERE username = $1`,
      [req.body.username.toLowerCase()],
    );
    const user = result.rows[0];
    const validPassword = user
      ? await bcrypt.compare(req.body.password, user.password_hash)
      : await bcrypt.compare(req.body.password, dummyPasswordHash);
    if (!user || !user.is_active || !validPassword) {
      return next(httpError(401, 'INVALID_CREDENTIALS', 'اسم المستخدم أو كلمة المرور غير صحيحة'));
    }

    const token = jwt.sign(
      { role: user.role },
      env.jwtSecret,
      { subject: user.id, expiresIn: '12h' },
    );
    res.json({
      success: true,
      data: { token, user: mapUser(user) },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: req.user });
});

router.get('/users', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, display_name, role, is_active, created_at
       FROM users ORDER BY created_at`,
    );
    res.json({ success: true, data: result.rows.map(mapUser) });
  } catch (error) {
    next(error);
  }
});

router.post('/users', authenticate, requireAdmin, validate(createUserSchema), async (req, res, next) => {
  try {
    const passwordHash = await bcrypt.hash(req.body.password, 12);
    const result = await query(
      `INSERT INTO users (id, username, display_name, password_hash, role)
       VALUES ($1, $2, $3, $4, 'staff')
       RETURNING id, username, display_name, role, is_active, created_at`,
      [
        newId('user'),
        req.body.username.toLowerCase(),
        req.body.displayName,
        passwordHash,
      ],
    );
    res.status(201).json({ success: true, data: mapUser(result.rows[0]) });
  } catch (error) {
    if (error.code === '23505') {
      return next(httpError(409, 'USERNAME_EXISTS', 'اسم المستخدم مستخدم مسبقاً'));
    }
    next(error);
  }
});

router.patch('/users/:id/status', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({ isActive: z.boolean() });
    const body = schema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid account status' },
      });
    }
    if (req.params.id === req.user.id && !body.data.isActive) {
      return next(httpError(400, 'CANNOT_DISABLE_SELF', 'لا يمكنك تعطيل حسابك الحالي'));
    }
    const result = await query(
      `UPDATE users SET is_active = $2, updated_at = NOW()
       WHERE id = $1 AND role = 'staff'
       RETURNING id, username, display_name, role, is_active, created_at`,
      [req.params.id, body.data.isActive],
    );
    if (!result.rows.length) return next(httpError(404, 'USER_NOT_FOUND', 'الحساب غير موجود'));
    res.json({ success: true, data: mapUser(result.rows[0]) });
  } catch (error) {
    next(error);
  }
});

function mapUser(row) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export default router;
