import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiError } from '@pm/shared';
import { env } from '../config/env.js';

/** An error we raised deliberately, with the status code we want the client to see. */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: ApiError['details'],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (m: string, d?: ApiError['details']) => new AppError(400, m, d);
export const unauthorized = (m = 'Not authenticated') => new AppError(401, m);
export const forbidden = (m = 'Not allowed') => new AppError(403, m);
/** Used for "exists but you may not see it" as well, so membership is not leakable. */
export const notFound = (m = 'Not found') => new AppError(404, m);
export const conflict = (m: string) => new AppError(409, m);

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, `Cannot ${req.method} ${req.originalUrl.split('?')[0]}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let status = 500;
  let body: ApiError = { error: 'Something went wrong' };

  if (err instanceof AppError) {
    status = err.statusCode;
    body = { error: err.message, ...(err.details ? { details: err.details } : {}) };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: 'Validation failed',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  } else if (err instanceof mongoose.Error.CastError) {
    // A malformed id is a client error, not a server fault.
    status = 400;
    body = { error: `Invalid ${err.path}` };
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 400;
    body = {
      error: 'Validation failed',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    };
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    status = 409;
    body = { error: 'That value is already taken' };
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (!env.isProd && err instanceof Error) body.error = err.message;
  }

  res.status(status).json(body);
};
