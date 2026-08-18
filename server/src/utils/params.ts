import type { Request } from 'express';

/**
 * Express 5 types route params as `string | string[]` because a pattern can
 * repeat. Ours never do, so this narrows once instead of casting at every call
 * site. A repeated param collapses to its first value, which then fails id
 * validation as it should.
 */
export function param(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
