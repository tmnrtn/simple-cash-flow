// Shared HTTP helpers: an error type, an async wrapper, tiny request-body
// validators, and the centralised error/404 middleware.

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap an async handler so a rejection is forwarded to the error middleware.
// Without this, Express 4 leaves the request hanging on an unhandled rejection.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isNil = (val) => val === undefined || val === null;

// Each validator coerces and returns the value, or throws ApiError(400).
// `required` defaults to true; an absent optional value returns null.
const v = {
  string(val, field, { required = true } = {}) {
    if (isNil(val) || val === '') {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    if (typeof val !== 'string') throw new ApiError(400, `${field} must be a string`);
    return val;
  },
  number(val, field, { required = true, positive = false } = {}) {
    if (isNil(val) || val === '') {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n)) throw new ApiError(400, `${field} must be a number`);
    if (positive && n <= 0) throw new ApiError(400, `${field} must be greater than 0`);
    return n;
  },
  boolean(val, field, { required = true } = {}) {
    if (isNil(val)) {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    if (typeof val !== 'boolean') throw new ApiError(400, `${field} must be a boolean`);
    return val;
  },
  date(val, field, { required = true } = {}) {
    if (isNil(val) || val === '') {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    const s = String(val);
    if (!/^\d{4}-\d{2}-\d{2}/.test(s) || Number.isNaN(Date.parse(s))) {
      throw new ApiError(400, `${field} must be a valid date (YYYY-MM-DD)`);
    }
    return s.slice(0, 10);
  },
  enum(val, field, allowed, { required = true } = {}) {
    if (isNil(val) || val === '') {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    if (!allowed.includes(val)) {
      throw new ApiError(400, `${field} must be one of: ${allowed.join(', ')}`);
    }
    return val;
  },
  id(val, field = 'id', { required = true } = {}) {
    if (isNil(val) || val === '') {
      if (required) throw new ApiError(400, `${field} is required`);
      return null;
    }
    const n = Number(val);
    if (!Number.isInteger(n) || n <= 0) {
      throw new ApiError(400, `${field} must be a positive integer`);
    }
    return n;
  },
};

// Translate common PostgreSQL errors into helpful 4xx responses.
function mapPgError(err) {
  switch (err.code) {
    case '23503': {
      // foreign_key_violation
      const c = err.constraint || '';
      if (c.includes('category'))
        return { status: 400, message: 'category does not reference an existing category' };
      if (c.includes('project'))
        return { status: 400, message: 'project_id does not reference an existing project' };
      return { status: 400, message: 'a referenced record does not exist' };
    }
    case '23505': // unique_violation
      return { status: 409, message: 'that record already exists' };
    case '23502': // not_null_violation
      return { status: 400, message: `${err.column} is required` };
    case '22P02': // invalid_text_representation
      return { status: 400, message: 'invalid value in request' };
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return { status: 400, message: 'invalid date value' };
    default:
      return null;
  }
}

function notFoundHandler(req, res, next) {
  next(new ApiError(404, 'Not found'));
}

// Central error handler (must keep 4 args for Express to recognise it).
function errorHandler(err, req, res, next) {
  let status = err.status;
  let message = err.message;
  if (!status) {
    const mapped = mapPgError(err);
    if (mapped) ({ status, message } = mapped);
  }
  if (!status || status >= 500) {
    // Log the real error server-side; never leak internals to the client.
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
  res.status(status).json({ error: message });
}

module.exports = { ApiError, asyncHandler, v, notFoundHandler, errorHandler };
