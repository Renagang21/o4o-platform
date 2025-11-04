/**
 * Custom HTTP Exception Classes
 * Used for structured error handling in the API
 */

export class HttpException extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestException extends HttpException {
  constructor(message: string = 'Bad Request') {
    super(400, message);
  }
}

export class UnauthorizedException extends HttpException {
  constructor(message: string = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenException extends HttpException {
  constructor(message: string = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundException extends HttpException {
  constructor(message: string = 'Not Found') {
    super(404, message);
  }
}

export class ConflictException extends HttpException {
  constructor(message: string = 'Conflict') {
    super(409, message);
  }
}

export class ValidationException extends HttpException {
  public errors: any[];

  constructor(message: string = 'Validation Error', errors: any[] = []) {
    super(422, message);
    this.errors = errors;
  }
}

export class InternalServerException extends HttpException {
  constructor(message: string = 'Internal Server Error') {
    super(500, message);
  }
}
