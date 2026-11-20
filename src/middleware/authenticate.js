import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';
import { env } from '../config/env.js';

export async function authenticate(req, res, next) {
  const authorization = req.get('authorization') ?? '';
  const [scheme, token] = authorization.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Please log in' },
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload !== 'object' || typeof payload.sub !== 'string') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid access token' },
      });
    }

    const result = await query(
      'SELECT id, username, display_name, role, is_active FROM users WHERE id = $1',
      [payload.sub],
    );
    const user = result.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({
        success: false,
        error: { code: 'SESSION_REVOKED', message: 'This account is unavailable' },
      });
    }
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
    };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Session expired; please log in again' },
      });
    }
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Administrator access required' },
    });
  }
  next();
}
