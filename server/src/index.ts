import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, disconnectDb } from './db/connect.js';
import { initRealtime, shutdownRealtime } from './realtime/io.js';

/** Hides credentials before a connection string reaches the logs. */
const redact = (uri: string) => uri.replace(/\/\/([^:/]+):[^@]+@/, '//$1:***@');

async function main() {
  const conn = await connectDb();
  const app = createApp();
  const server = http.createServer(app);
  initRealtime(server);

  await new Promise<void>((resolve) => server.listen(env.PORT, resolve));
  console.log(`[server] listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  console.log(`[server] mongodb: ${redact(conn.uri)}`);

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    console.log(`\n[server] ${signal} received, shutting down`);
    await shutdownRealtime();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
