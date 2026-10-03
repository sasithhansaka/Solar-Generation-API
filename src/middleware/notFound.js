import { notFound as notFoundError } from '../utils/errors.js';

// Any request that matched no route.
export function notFound(req, res, next) {
  next(notFoundError('Route not found.', `${req.method} ${req.path} does not exist.`));
}
