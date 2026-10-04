export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_QUERY: 'INVALID_QUERY',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  FORBIDDEN: 'FORBIDDEN',
  JURISDICTION_FORBIDDEN: 'JURISDICTION_FORBIDDEN',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  NOT_ACCEPTABLE: 'NOT_ACCEPTABLE',
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export class AppError extends Error {
  constructor(status, code, message, detail = '', headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.headers = headers;
  }
}

export const badRequest = (message, detail, code = ErrorCodes.VALIDATION_ERROR) =>
  new AppError(400, code, message, detail);

export const invalidQuery = (message, detail) =>
  new AppError(400, ErrorCodes.INVALID_QUERY, message, detail);

export const notFound = (message, detail) =>
  new AppError(404, ErrorCodes.RESOURCE_NOT_FOUND, message, detail);

export const notAcceptable = (message, detail) =>
  new AppError(406, ErrorCodes.NOT_ACCEPTABLE, message, detail);

// 401: the client must (re)authenticate. 403: authenticated, but not allowed.
export const unauthorized = (message, detail, code = ErrorCodes.AUTHENTICATION_REQUIRED) =>
  new AppError(401, code, message, detail, { 'WWW-Authenticate': 'Bearer realm="solar-generation-api"' });

export const forbidden = (message, detail, code = ErrorCodes.FORBIDDEN) =>
  new AppError(403, code, message, detail);

export const unsupportedMediaType = (message, detail) =>
  new AppError(415, ErrorCodes.VALIDATION_ERROR, message, detail);

export const conflict = (message, detail) =>
  new AppError(409, ErrorCodes.CONFLICT, message, detail);

export const methodNotAllowed = (allowed) =>
  new AppError(405, ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed.', `Allowed methods: ${allowed}.`, {
    Allow: allowed,
  });
