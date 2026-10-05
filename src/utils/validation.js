export const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

export const ISO_8601 = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
