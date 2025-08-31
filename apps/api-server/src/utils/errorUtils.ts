export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class InternalServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalServerError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/**
 * Validate that required fields are present in the request body
 */
export function validateRequiredFields(body: any, requiredFields: string[]): void {
  const missingFields = requiredFields.filter(field => !body[field]);
  if (missingFields.length > 0) {
    throw new ValidationError(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * Create a validation error with a custom message
 */
export function createValidationError(message: string): ValidationError {
  return new ValidationError(message);
}

/**
 * Create a not found error with a custom message
 */
export function createNotFoundError(message: string): NotFoundError {
  return new NotFoundError(message);
}

/**
 * Create a forbidden error with a custom message
 */
export function createForbiddenError(message: string): ForbiddenError {
  return new ForbiddenError(message);
}

/**
 * Create an unauthorized error with a custom message
 */
export function createUnauthorizedError(message: string): UnauthorizedError {
  return new UnauthorizedError(message);
}

/**
 * Create an internal server error with a custom message
 */
export function createInternalServerError(message: string): InternalServerError {
  return new InternalServerError(message);
}

/**
 * Create a conflict error with a custom message
 */
export function createConflictError(message: string): ConflictError {
  return new ConflictError(message);
}

/**
 * Create a bad request error with a custom message
 */
export function createBadRequestError(message: string): BadRequestError {
  return new BadRequestError(message);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format (basic validation)
 */
export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate that a value is within a specific range
 */
export function validateRange(value: number, min: number, max: number, fieldName: string): void {
  if (value < min || value > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
  }
}

/**
 * Validate that a string has a minimum and maximum length
 */
export function validateStringLength(value: string, min: number, max: number, fieldName: string): void {
  if (value.length < min || value.length > max) {
    throw new ValidationError(`${fieldName} must be between ${min} and ${max} characters`);
  }
}

/**
 * Validate that a value is one of the allowed values
 */
export function validateAllowedValues<T>(value: T, allowedValues: T[], fieldName: string): void {
  if (!allowedValues.includes(value)) {
    throw new ValidationError(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Create a validation error for invalid UUID
 */
export function validateUUIDOrThrow(uuid: string, fieldName: string): void {
  if (!validateUUID(uuid)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`);
  }
}