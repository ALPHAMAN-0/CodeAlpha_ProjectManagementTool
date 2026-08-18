import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Set before any module loads, because config/env.ts reads process.env at
    // import time and validates it once.
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-only-secret-long-enough-to-pass-validation',
    },
    setupFiles: ['./tests/setup.ts'],
    // Each file gets its own database, so files cannot interfere with each other.
    fileParallelism: true,
    testTimeout: 20_000,
    hookTimeout: 60_000, // first run may download a mongod binary
    include: ['tests/**/*.test.ts'],
  },
});
