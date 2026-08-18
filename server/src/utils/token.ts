import jwt from 'jsonwebtoken';
import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { durationToMs } from './duration.js';

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/** Returns the user id, or null for any invalid/expired/malformed token. */
export function verifyToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (typeof payload === 'object' && payload && typeof payload.sub === 'string') {
      return payload.sub;
    }
    return null;
  } catch {
    return null;
  }
}

const cookieBase: CookieOptions = {
  httpOnly: true,
  // The API and the SPA share an origin, so Lax is enough - no third-party
  // cookie exposure, and no SameSite=None to be blocked by a strict browser.
  sameSite: 'lax',
  secure: env.isProd,
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(env.COOKIE_NAME, token, {
    ...cookieBase,
    maxAge: durationToMs(env.JWT_EXPIRES_IN),
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(env.COOKIE_NAME, cookieBase);
}
