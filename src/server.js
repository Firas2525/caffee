import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabase } from './config/database.js';
import { initializeDatabase } from './database/initialize.js';

let server;

async function start() {
  await initializeDatabase();
  server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Caffee API listening on 0.0.0.0:${env.port}`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  if (server) {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  } else {
    await closeDatabase();
    process.exit(0);
  }
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch(async (error) => {
  console.error('Server startup failed:', error);
  await closeDatabase();
  process.exit(1);
});
