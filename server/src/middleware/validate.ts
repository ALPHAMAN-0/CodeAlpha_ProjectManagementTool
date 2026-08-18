import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { badRequest } from './error.js';

const details = (error: { issues: Array<{ path: (string | number)[]; message: string }> }) =>
  error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));

/** Replaces req.body with the parsed (defaulted, trimmed, coerced) value. */
export const validateBody =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(badRequest('Validation failed', details(result.error)));
    req.body = result.data;
    next();
  };

/** Express 5's req.query is getter-only, so the parsed value goes to req.validatedQuery. */
export const validateQuery =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) return next(badRequest('Validation failed', details(result.error)));
    req.validatedQuery = result.data;
    next();
  };
