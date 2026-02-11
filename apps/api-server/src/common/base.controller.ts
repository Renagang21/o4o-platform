import { Request, Response } from 'express';

// Import error codes from SSOT
import { API_ERROR_CODES, AUTH_ERROR_CODES } from '@o4o/types';

/**
 * Combined error codes for BaseController
 */
export const ERROR_CODES = {
  ...API_ERROR_CODES,
  ...AUTH_ERROR_CODES,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES | string;

/**
 * BaseController - Abstract base class for all NextGen controllers
 *
 * Provides standardized response methods for consistent API responses.
 * All module controllers should extend this class and use static methods.
 *
 * Response Format (SSOT):
 * - Success: { success: true, data: T, message?: string }
 * - Error: { success: false, error: string, code?: string, details?: unknown }
 *
 * @example
 * ```typescript
 * export class UserController extends BaseController {
 *   static async getUser(req: Request, res: Response): Promise<void> {
 *     try {
 *       const user = await userService.findById(req.params.id);
 *       if (!user) {
 *         return BaseController.notFound(res, 'User not found', 'USER_NOT_FOUND');
 *       }
 *       return BaseController.ok(res, user);
 *     } catch (error) {
 *       return BaseController.error(res, error);
 *     }
 *   }
 * }
 * ```
 */
export abstract class BaseController {
  /**
   * Standard success response
   * @param res - Express Response object
   * @param data - Response data payload
   * @returns JSON response with success: true
   */
  protected static ok<T>(res: Response, data: T): Response {
    return res.json({
      success: true,
      data,
    });
  }

  /**
   * Paginated success response
   * @param res - Express Response object
   * @param data - Array of paginated items
   * @param pagination - Pagination metadata
   * @returns JSON response with success: true and pagination info
   */
  protected static okPaginated<T>(
    res: Response,
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): Response {
    return res.json({
      success: true,
      data,
      pagination,
    });
  }

  /**
   * Error response
   * @param res - Express Response object
   * @param error - Error object or error message string
   * @param statusCode - HTTP status code (default: 500)
   * @param code - Machine-readable error code (optional)
   * @returns JSON response with success: false
   */
  protected static error(
    res: Response,
    error: Error | string,
    statusCode: number = 500,
    code?: ErrorCode
  ): Response {
    const message = error instanceof Error ? error.message : error;

    // Try to extract code from Error object if not provided
    const errorCode = code || (error instanceof Error ? (error as any).code : undefined) || 'INTERNAL_ERROR';

    return res.status(statusCode).json({
      success: false,
      error: message,
      code: errorCode,
    });
  }

  /**
   * Not found response
   * @param res - Express Response object
   * @param message - Custom not found message (default: 'Resource not found')
   * @param code - Machine-readable error code (default: 'NOT_FOUND')
   * @returns JSON response with 404 status
   */
  protected static notFound(
    res: Response,
    message: string = 'Resource not found',
    code: ErrorCode = 'NOT_FOUND'
  ): Response {
    return res.status(404).json({
      success: false,
      error: message,
      code,
    });
  }

  /**
   * Validation error response
   * @param res - Express Response object
   * @param errors - Validation error details
   * @param message - Custom error message (default: 'Validation failed')
   * @returns JSON response with 400 status
   */
  protected static validationError(
    res: Response,
    errors: any,
    message: string = 'Validation failed'
  ): Response {
    return res.status(400).json({
      success: false,
      error: message,
      code: 'VALIDATION_ERROR',
      details: errors,
    });
  }

  /**
   * Unauthorized response
   * @param res - Express Response object
   * @param message - Custom unauthorized message (default: 'Unauthorized')
   * @param code - Machine-readable error code (default: 'AUTH_REQUIRED')
   * @returns JSON response with 401 status
   */
  protected static unauthorized(
    res: Response,
    message: string = 'Unauthorized',
    code: ErrorCode = 'AUTH_REQUIRED'
  ): Response {
    return res.status(401).json({
      success: false,
      error: message,
      code,
    });
  }

  /**
   * Forbidden response
   * @param res - Express Response object
   * @param message - Custom forbidden message (default: 'Forbidden')
   * @param code - Machine-readable error code (default: 'FORBIDDEN')
   * @returns JSON response with 403 status
   */
  protected static forbidden(
    res: Response,
    message: string = 'Forbidden',
    code: ErrorCode = 'FORBIDDEN'
  ): Response {
    return res.status(403).json({
      success: false,
      error: message,
      code,
    });
  }

  /**
   * Bad request response
   * @param res - Express Response object
   * @param message - Custom bad request message (default: 'Bad request')
   * @param code - Machine-readable error code (default: 'BAD_REQUEST')
   * @returns JSON response with 400 status
   */
  protected static badRequest(
    res: Response,
    message: string = 'Bad request',
    code: ErrorCode = 'BAD_REQUEST'
  ): Response {
    return res.status(400).json({
      success: false,
      error: message,
      code,
    });
  }

  /**
   * Created response (for POST requests)
   * @param res - Express Response object
   * @param data - Created resource data
   * @returns JSON response with 201 status
   */
  protected static created<T>(res: Response, data: T): Response {
    return res.status(201).json({
      success: true,
      data,
    });
  }

  /**
   * No content response (for DELETE requests)
   * @param res - Express Response object
   * @returns Empty response with 204 status
   */
  protected static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
