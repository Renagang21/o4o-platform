import { Request, Response } from 'express';

/**
 * BaseController - Abstract base class for all NextGen controllers
 *
 * Provides standardized response methods for consistent API responses.
 * All module controllers should extend this class and use static methods.
 *
 * @example
 * ```typescript
 * export class UserController extends BaseController {
 *   static async getUser(req: Request, res: Response): Promise<void> {
 *     try {
 *       const user = await userService.findById(req.params.id);
 *       if (!user) {
 *         return BaseController.notFound(res, 'User not found');
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
   * @returns JSON response with success: false
   */
  protected static error(
    res: Response,
    error: Error | string,
    statusCode: number = 500
  ): Response {
    const message = error instanceof Error ? error.message : error;
    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }

  /**
   * Not found response
   * @param res - Express Response object
   * @param message - Custom not found message (default: 'Resource not found')
   * @returns JSON response with 404 status
   */
  protected static notFound(
    res: Response,
    message: string = 'Resource not found'
  ): Response {
    return res.status(404).json({
      success: false,
      error: message,
    });
  }

  /**
   * Validation error response
   * @param res - Express Response object
   * @param errors - Validation error details
   * @returns JSON response with 400 status
   */
  protected static validationError(res: Response, errors: any): Response {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
    });
  }

  /**
   * Unauthorized response
   * @param res - Express Response object
   * @param message - Custom unauthorized message (default: 'Unauthorized')
   * @returns JSON response with 401 status
   */
  protected static unauthorized(
    res: Response,
    message: string = 'Unauthorized'
  ): Response {
    return res.status(401).json({
      success: false,
      error: message,
    });
  }

  /**
   * Forbidden response
   * @param res - Express Response object
   * @param message - Custom forbidden message (default: 'Forbidden')
   * @returns JSON response with 403 status
   */
  protected static forbidden(
    res: Response,
    message: string = 'Forbidden'
  ): Response {
    return res.status(403).json({
      success: false,
      error: message,
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
