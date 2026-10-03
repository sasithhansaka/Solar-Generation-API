import { deviceTokenSecret } from '../config/env.js';
import { unauthorized } from '../utils/errors.js';
import { OBJECT_ID } from '../utils/validation.js';
import { bearerToken, verifyToken } from './authenticate.js';

// Metering device (write client). Verifies a device JWT and attaches
// req.device = { installationId }. A user token is rejected here.
export function authenticateDevice(req, res, next) {
  try {
    const payload = verifyToken(bearerToken(req), deviceTokenSecret, 'device');
    if (!OBJECT_ID.test(payload.sub)) throw unauthorized('Invalid token.', 'The token does not identify an installation.');

    req.device = { installationId: payload.sub };
    next();
  } catch (err) {
    next(err);
  }
}
