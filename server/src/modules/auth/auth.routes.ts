import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { loginSchema, registerSchema } from '@pm/shared';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/validate.js';
import { clearAuthCookie, setAuthCookie, signToken } from '../../utils/token.js';
import { toUserDTO } from '../../utils/serialize.js';
import { loginUser, registerUser } from './auth.service.js';

/** Credential endpoints only. Disabled under test so the suite is not throttled. */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.isTest,
  message: { error: 'Too many attempts. Please try again in a few minutes.' },
});

export const authRouter = Router();

authRouter.post('/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  const { user, id } = await registerUser(req.body);
  setAuthCookie(res, signToken(id));
  res.status(201).json({ user });
});

authRouter.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { user, id } = await loginUser(req.body);
  setAuthCookie(res, signToken(id));
  res.json({ user });
});

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: toUserDTO(req.user!) });
});
