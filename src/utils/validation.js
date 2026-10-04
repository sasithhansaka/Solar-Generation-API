export const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// 2026-10-03 or 2026-10-03T10:30:00Z (a time needs Z or an offset such as +05:30)
export const ISO_8601 = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

export const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);
