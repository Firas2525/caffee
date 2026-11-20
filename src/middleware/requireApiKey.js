import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export function requireApiKey(req, res, next) {
  if (!env.apiKey && env.nodeEnv !== 'production') return next();

  const provided = req.get('x-api-key') ?? '';
  const expectedBuffer = Buffer.from(env.apiKey);
  const providedBuffer = Buffer.from(provided);
  const isValid = providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer);

  if (!isValid) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Valid API key required' },
    });
  }
  next();
}
