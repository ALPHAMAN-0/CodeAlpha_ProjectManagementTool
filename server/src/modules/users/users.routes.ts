import { Router } from 'express';
import { userSearchSchema, type UserDTO } from '@pm/shared';
import { requireAuth } from '../../middleware/auth.js';
import { validateQuery } from '../../middleware/validate.js';
import { User } from '../../models/User.js';
import { toUserDTO } from '../../utils/serialize.js';

/** Prevents a user-supplied string from being interpreted as a regex. */
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const usersRouter = Router();

/**
 * Powers the "add member" and "assignee" pickers. Returns public fields only,
 * and requires a query so it can never be used to enumerate every user.
 */
usersRouter.get('/search', requireAuth, validateQuery(userSearchSchema), async (req, res) => {
  const { q } = req.validatedQuery as { q: string };
  const pattern = new RegExp(escapeRegex(q), 'i');

  const users = await User.find({ $or: [{ name: pattern }, { email: pattern }] })
    .sort({ name: 1 })
    .limit(8);

  const results: UserDTO[] = users.map(toUserDTO);
  res.json({ users: results });
});
