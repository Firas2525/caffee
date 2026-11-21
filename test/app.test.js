import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { z } from 'zod';
import { app } from '../src/app.js';
import { validate } from '../src/middleware/validate.js';

const server = app.listen(0);
let baseUrl;

before(() => {
  if (!server.listening) {
    return new Promise((resolve) => server.once('listening', resolve));
  }
});

before(() => {
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

test('health endpoint responds without database credentials', async () => {
  const response = await fetch(`${baseUrl}/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    data: { status: 'ok' },
  });
});

test('unknown paths return a structured 404 response', async () => {
  const response = await fetch(`${baseUrl}/missing`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

test('query validation works with Express 5 read-only query getters', () => {
  const schema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  const req = Object.create(null);
  Object.defineProperty(req, 'query', {
    enumerable: true,
    get: () => ({ date: '2026-11-21' }),
  });
  let nextCalled = false;

  validate(schema, 'query')(req, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.validatedQuery.date, '2026-11-21');
});
