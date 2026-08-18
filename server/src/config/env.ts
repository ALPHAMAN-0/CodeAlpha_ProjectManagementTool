import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

// server/src/config -> repo root in dev, server/dist/config -> repo root in prod.
// Same depth either way, so one resolve covers both.
const repoRoot = path.resolve(import.meta.dirname, '../../..');
dotenv.config({ path: [path.join(repoRoot, '.env'), path.join(repoRoot, 'server/.env')] });

const DEV_JWT_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

/** Port and database for the mongod that `npm run db:dev` manages. */
export const DEV_DB_PORT = 27018;
export const DEV_DB_NAME = 'pm';
export const DEV_MONGODB_URI = `mongodb://127.0.0.1:${DEV_DB_PORT}/${DEV_DB_NAME}`;

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).optional(),
  JWT_SECRET: z.string().min(32).optional(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_NAME: z.string().default('pm_token'),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail at boot, never at the first request.
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

const raw = parsed.data;
const isProd = raw.NODE_ENV === 'production';

if (isProd) {
  if (!raw.MONGODB_URI) throw new Error('MONGODB_URI is required when NODE_ENV=production');
  if (!raw.JWT_SECRET) {
    throw new Error('JWT_SECRET (>= 32 chars) is required when NODE_ENV=production');
  }
} else if (!raw.JWT_SECRET) {
  console.warn(
    '[env] JWT_SECRET is not set - falling back to a well-known development secret.\n' +
      '      Set JWT_SECRET in .env before deploying anywhere real.',
  );
}

/**
 * Outside production, an unset MONGODB_URI points at the locally managed mongod
 * instead of failing, so `npm run dev` needs no database setup at all.
 */
const mongoUri = raw.MONGODB_URI ?? DEV_MONGODB_URI;

export const env = {
  ...raw,
  MONGODB_URI: mongoUri,
  /** True when we are pointing at the mongod that `npm run db:dev` owns. */
  usesManagedDevDb: !raw.MONGODB_URI && !isProd,
  JWT_SECRET: raw.JWT_SECRET ?? DEV_JWT_SECRET,
  isProd,
  isTest: raw.NODE_ENV === 'test',
  repoRoot,
  clientDist: path.join(repoRoot, 'client/dist'),
};

export type Env = typeof env;
