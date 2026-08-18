import mongoose from 'mongoose';
import { env } from '../config/env.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Connects to MongoDB at env.MONGODB_URI. Dev and production take the same code
 * path - the only difference is which URI is configured.
 *
 * In development the mongod is a sibling process (`npm run db:dev`), not an
 * in-process one: the API restarts on every file save, and a database tied to
 * that lifecycle gets torn down and rebuilt constantly. Because start order
 * between the two is not guaranteed, we retry briefly before giving up.
 */
export async function connectDb(): Promise<{ uri: string }> {
  mongoose.set('strictQuery', true);

  const attempts = env.usesManagedDevDb ? 15 : 1;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
      return { uri: env.MONGODB_URI };
    } catch (err) {
      if (attempt === attempts) {
        if (env.usesManagedDevDb) {
          console.error(
            `\n[db] could not reach a local MongoDB at ${env.MONGODB_URI}\n` +
              '     Start one with:  npm run db:dev\n' +
              '     Or point MONGODB_URI at your own MongoDB / Atlas cluster.\n',
          );
        }
        throw err;
      }
      if (attempt === 1) console.log('[db] waiting for MongoDB...');
      await sleep(1000);
    }
  }
  throw new Error('unreachable');
}

export const disconnectDb = (): Promise<void> => mongoose.disconnect();
