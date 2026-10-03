import { AppError, ErrorCodes } from '../utils/errors.js';

const CODE_BY_STATUS = {
  400: ErrorCodes.VALIDATION_ERROR,
  401: ErrorCodes.AUTHENTICATION_REQUIRED,
  403: ErrorCodes.FORBIDDEN,
  404: ErrorCodes.RESOURCE_NOT_FOUND,
  405: ErrorCodes.METHOD_NOT_ALLOWED,
  406: ErrorCodes.NOT_ACCEPTABLE,
  409: ErrorCodes.CONFLICT,
  412: ErrorCodes.PRECONDITION_FAILED,
};

function normalize(err) {
  if (err instanceof AppError) return err;

  if (err.type === 'entity.parse.failed') {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Malformed JSON.', 'The request body is not valid JSON.');
  }
  
  if (err.name === 'CastError') {
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid identifier.', `"${err.value}" is not a valid ${err.path}.`);
  }

  if (err.name === 'ValidationError' && err.errors) {
    const detail = Object.values(err.errors).map((e) => e.message).join('; ');
    return new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Validation failed.', detail);
  }

  if (err.code === 11000) {
    return new AppError(409, ErrorCodes.CONFLICT, 'Resource already exists.', 'A resource with the same unique value already exists.');
  }

  if (err.status >= 400 && err.status < 500) {
    return new AppError(err.status, CODE_BY_STATUS[err.status] || ErrorCodes.VALIDATION_ERROR, err.message, '');
  }

  return new AppError(500, ErrorCodes.INTERNAL_ERROR, 'Internal server error.', 'An unexpected error occurred.');
}


export function errorHandler(err, req, res, next) {
  const error = normalize(err);

  if (error.status >= 500) console.error(err);
  if (res.headersSent) return next(err);

  res.status(error.status).set(error.headers).json({
    error: { code: error.code, message: error.message, detail: error.detail },
  });
}
