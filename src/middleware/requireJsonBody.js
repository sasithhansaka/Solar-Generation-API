import { unsupportedMediaType } from '../utils/errors.js';

// 415 unless the request body is declared as application/json.
export function requireJsonBody(req, res, next) {
  if (!req.is('application/json')) {
    return next(unsupportedMediaType('Unsupported media type.', 'Send the body as Content-Type: application/json.'));
  }
  next();
}
