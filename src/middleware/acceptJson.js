import { notAcceptable } from '../utils/errors.js';


export function acceptJson(req, res, next) {
  if (!req.accepts('json')) {
    return next(notAcceptable('Not acceptable.', `This API only produces application/json (Accept: ${req.get('Accept')}).`));
  }
  next();
}
