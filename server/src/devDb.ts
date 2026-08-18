/**
 * Development-only MongoDB.
 *
 * Runs a real mongod (downloaded and cached by mongodb-memory-server) on a fixed
 * port with its data persisted to .data/mongo, as its own long-lived process. It
 * deliberately does NOT live inside the API process: the API restarts on every
 * save, and restarting the database with it loses data, costs seconds per reload
 * and races the previous instance for the data directory lock.
 *
 * Not used in production - there, MONGODB_URI points at a real cluster.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { DEV_DB_NAME, DEV_DB_PORT, env } from './config/env.js';

async function main() {
  if (!env.usesManagedDevDb) {
    console.log('[db:dev] MONGODB_URI is set - using that database, nothing to start.');
    return;
  }

  const dbPath = path.join(env.repoRoot, '.data/mongo');
  fs.mkdirSync(dbPath, { recursive: true });

  const server = await MongoMemoryServer.create({
    instance: {
      port: DEV_DB_PORT,
      dbPath,
      dbName: DEV_DB_NAME,
      storageEngine: 'wiredTiger',
    },
  });

  console.log(`[db:dev] mongod ready on ${server.getUri(DEV_DB_NAME)}`);
  console.log(`[db:dev] data persists in ${path.relative(env.repoRoot, dbPath)}`);

  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    console.log('[db:dev] stopping mongod');
    await server.stop().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

main().catch((err) => {
  console.error('[db:dev] failed to start mongod:', err);
  process.exit(1);
});
