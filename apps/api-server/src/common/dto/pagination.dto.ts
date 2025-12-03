import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Pagination Query DTO
 *
 * Standard pagination parameters for list endpoints.
 * Use with validateQuery middleware.
 *
 * @example
 * ```typescript
 * // In route:
 * router.get('/users', validateQuery(PaginationQueryDto), UserController.list);
 *
 * // In controller:
 * const { page, limit } = req.query as PaginationQueryDto;
 * const result = await userService.paginate(page, limit);
 * ```
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Pagination Response Interface
 *
 * Standard pagination metadata for responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated Response DTO
 *
 * Generic paginated response structure.
 */
export interface PaginatedResponseDto<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}
