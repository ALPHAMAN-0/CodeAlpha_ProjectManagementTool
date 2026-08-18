import bcrypt from 'bcryptjs';
import type { LoginInput, RegisterInput, UserDTO } from '@pm/shared';
import { User } from '../../models/User.js';
import { conflict, unauthorized } from '../../middleware/error.js';
import { toUserDTO } from '../../utils/serialize.js';

const BCRYPT_ROUNDS = 12;

export async function registerUser(input: RegisterInput): Promise<{ user: UserDTO; id: string }> {
  const existing = await User.findOne({ email: input.email }).lean();
  if (existing) throw conflict('An account with that email already exists');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  return { user: toUserDTO(user), id: String(user._id) };
}

export async function loginUser(input: LoginInput): Promise<{ user: UserDTO; id: string }> {
  // passwordHash is select:false, so it must be asked for explicitly.
  const user = await User.findOne({ email: input.email }).select('+passwordHash');

  // Same message and roughly the same work either way - no user enumeration.
  if (!user) {
    await bcrypt.compare(input.password, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    throw unauthorized('Incorrect email or password');
  }

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Incorrect email or password');

  return { user: toUserDTO(user), id: String(user._id) };
}
