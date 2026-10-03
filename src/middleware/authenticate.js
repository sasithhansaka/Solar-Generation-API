import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/errors.js';

// Reads "Authorization: Bearer <token>". Missing or malformed header -> 401.
export function bearerToken(req) {
  const header = req.get('Authorization');
  if (!header) throw unauthorized('Authentication required.', 'Send an "Authorization: Bearer <token>" header.');

  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  if (!match) throw unauthorized('Authentication required.', 'The Authorization header must be "Bearer <token>".');
  return match[1];
}

// Verifies the signature (with the secret for this kind of token), the expiry and the
// token type. User tokens and device tokens use different secrets AND different "type"
// claims, so neither is accepted where the other is expected.
export function verifyToken(token, secret, expectedType) {
  let payload;
  try {
    payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (err) {
    const detail = err.name === 'TokenExpiredError' ? 'The token has expired.' : 'The token is not valid.';
    throw unauthorized('Invalid token.', detail);
  }

  if (payload.type !== expectedType || typeof payload.sub !== 'string') {
    throw unauthorized('Invalid token.', `This endpoint requires a ${expectedType} token.`);
  }
  return payload;
}
