import { badRequest, methodNotAllowed } from '../utils/errors.js';

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export function validateObjectIdParam(req, res, next, value, name) {
  if (!OBJECT_ID.test(value)) {
    return next(badRequest('Invalid identifier.', `"${name}" must be a 24-character hexadecimal id.`));
  }
  next();
}

// For route.all(...) after the supported methods: 405 with an Allow header.
export const rejectOtherMethods = (allowed) => (req, res, next) => next(methodNotAllowed(allowed));
