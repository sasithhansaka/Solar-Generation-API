import User from '../models/User.js';
import { jwtSecret } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';
import { bearerToken, verifyToken } from './authenticate.js';


export async function authenticateUser(req, res, next) {
  try {
    const payload = verifyToken(bearerToken(req), jwtSecret, 'user');

    const user = await User.findById(payload.sub).lean();
    if (!user) throw unauthorized('Invalid token.', 'The user for this token no longer exists.');

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      jurisdictionType: user.jurisdictionType,
      jurisdictionId: user.jurisdictionId,
    };
    next();
  } catch (err) {
    next(err);
  }
}
