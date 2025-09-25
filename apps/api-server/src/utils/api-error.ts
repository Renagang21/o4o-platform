/**
 * Standardized API Error Classes
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    statusCode: number,
    message: string,
    code: string,
    isOperational = true,
    details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    
    Error.captureStackTrace(this);
  }
}

// Common API Errors
export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST', details?: any) {
    super(400, message, code, true, details);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', code = 'UNAUTHORIZED') {
    super(401, message, code, true);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN') {
    super(403, message, code, true);
  }
}

export class NotFoundError extends ApiError {
  constructor(resource = 'Resource', code = 'NOT_FOUND') {
    super(404, `${resource} not found`, code, true);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict', code = 'CONFLICT', details?: any) {
    super(409, message, code, true, details);
  }
}

export class ValidationError extends ApiError {
  constructor(message = 'Validation failed', details?: any) {
    super(422, message, 'VALIDATION_ERROR', true, details);
  }
}

export class InternalServerError extends ApiError {
  constructor(message = 'Internal server error', code = 'INTERNAL_ERROR') {
    super(500, message, code, false);
  }
}

export class ServiceUnavailableError extends ApiError {
  constructor(message = 'Service temporarily unavailable', code = 'SERVICE_UNAVAILABLE') {
    super(503, message, code, true);
  }
}

// Database specific errors
export class DatabaseError extends ApiError {
  constructor(message = 'Database error', code = 'DATABASE_ERROR', details?: any) {
    super(500, message, code, false, details);
  }
}

export class EntityNotFoundError extends NotFoundError {
  constructor(entity: string, id?: string | number) {
    const message = id ? `${entity} with id ${id} not found` : `${entity} not found`;
    super(message, 'ENTITY_NOT_FOUND');
  }
}

// Helper function to handle TypeORM errors
export function handleDatabaseError(error: any): ApiError {
  // PostgreSQL error codes
  if (error.code === '23505') {
    return new ConflictError('Duplicate entry', 'DUPLICATE_ENTRY', {
      field: error.detail
    });
  }
  
  if (error.code === '23503') {
    return new BadRequestError('Foreign key constraint violation', 'FK_VIOLATION');
  }
  
  if (error.code === '42P01') {
    return new DatabaseError('Table does not exist', 'TABLE_NOT_FOUND');
  }
  
  if (error.code === '42501') {
    return new DatabaseError('Insufficient permissions', 'PERMISSION_DENIED');
  }
  
  // TypeORM specific
  if (error.name === 'EntityNotFoundError') {
    return new EntityNotFoundError('Entity');
  }
  
  if (error.name === 'QueryFailedError') {
    return new DatabaseError(error.message, 'QUERY_FAILED');
  }
  
  return new DatabaseError('Unknown database error', 'DATABASE_ERROR');
}