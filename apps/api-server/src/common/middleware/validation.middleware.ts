import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * DTO Validation Middleware
 *
 * Validates request body against a DTO class using class-validator.
 * Automatically transforms plain objects to class instances and validates constraints.
 *
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * // In route definition:
 * router.post('/login', validateDto(LoginRequestDto), AuthController.login);
 *
 * // DTO definition:
 * export class LoginRequestDto {
 *   @IsEmail()
 *   email: string;
 *
 *   @IsString()
 *   @MinLength(6)
 *   password: string;
 * }
 * ```
 */
export function validateDto(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dtoInstance = plainToInstance(dtoClass, req.body);

      // Validate the instance
      const errors: ValidationError[] = await validate(dtoInstance, {
        whitelist: true, // Strip properties not defined in DTO
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
        skipMissingProperties: false, // Validate all properties
      });

      if (errors.length > 0) {
        // Format validation errors
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors,
        });
      }

      // Replace req.body with validated DTO instance
      req.body = dtoInstance;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Validation error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Validate Query Parameters
 *
 * Similar to validateDto but validates query parameters instead of body.
 *
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export function validateQuery(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.query as object);
      const errors: ValidationError[] = await validate(dtoInstance as object, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        }));

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: formattedErrors,
        });
      }

      req.query = dtoInstance as any;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Query validation error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Validate Route Parameters
 *
 * Validates route parameters (e.g., /users/:id) against a DTO class.
 *
 * @param dtoClass - The DTO class to validate against
 * @returns Express middleware function
 */
export function validateParams(dtoClass: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const dtoInstance = plainToInstance(dtoClass, req.params as object);
      const errors: ValidationError[] = await validate(dtoInstance as object);

      if (errors.length > 0) {
        const formattedErrors = errors.map((error) => ({
          property: error.property,
          constraints: error.constraints,
          value: error.value,
        }));

        return res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: formattedErrors,
        });
      }

      req.params = dtoInstance as any;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Parameter validation error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}
