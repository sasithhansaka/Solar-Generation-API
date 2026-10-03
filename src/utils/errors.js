// Error codes used in the response body: { error: { code, message, detail } }
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

export const methodNotAllowed = (allowed) =>
  new AppError(405, ErrorCodes.METHOD_NOT_ALLOWED, 'Method not allowed.', `Allowed methods: ${allowed}.`, {
    Allow: allowed,
  });
