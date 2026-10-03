import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { jwtSecret } from '../config/env.js';
import { unauthorized, ErrorCodes } from '../utils/errors.js';

export const USER_TOKEN_EXPIRY = '8h';

// Compared against when the email is unknown, so unknown-email and wrong-password
// take about the same time and give the same answer.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export async function login(email, password) {
  const user = await User.findOne({ email }).lean();
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw unauthorized('Invalid email or password.', 'The supplied credentials are not valid.', ErrorCodes.INVALID_CREDENTIALS);
  }

  const token = jwt.sign({ sub: String(user._id), type: 'user' }, jwtSecret, {
    algorithm: 'HS256',
    expiresIn: USER_TOKEN_EXPIRY,
  });

  return {
    token,
    role: user.role,
    jurisdictionType: user.jurisdictionType,
    jurisdictionId: user.jurisdictionId ? String(user.jurisdictionId) : null,
  };
}
