import type { RequestHandler } from 'express';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { clearAuthCookie, verifyToken } from '../utils/token.js';
import { unauthorized } from './error.js';

/**
 * Loads the caller from the auth cookie. A token that is valid but points at a
 * deleted user is treated as no session, and the stale cookie is cleared so the
 * client stops retrying with it.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[env.COOKIE_NAME];
  if (!token) return next(unauthorized());

  const userId = verifyToken(token);
  if (!userId) {
    clearAuthCookie(res);
    return next(unauthorized('Your session has expired'));
  }

  const user = await User.findById(userId);
  if (!user) {
    clearAuthCookie(res);
    return next(unauthorized());
  }

  req.user = user;
  req.userId = String(user._id);
  next();
};
