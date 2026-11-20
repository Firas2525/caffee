import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabase, pool } from './config/database.js';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`Caffee API listening on 0.0.0.0:${env.port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
