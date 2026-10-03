import { notAcceptable } from '../utils/errors.js';

// The API only produces JSON: reject an Accept header that excludes application/json.
// A missing Accept header, */* and application/* are fine.
export function acceptJson(req, res, next) {
  if (!req.accepts('json')) {
    return next(notAcceptable('Not acceptable.', `This API only produces application/json (Accept: ${req.get('Accept')}).`));
  }
  next();
}
