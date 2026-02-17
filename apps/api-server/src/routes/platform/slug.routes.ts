/**
 * Platform Slug Routes
 *
 * WO-CORE-STORE-REQUESTED-SLUG-V1
 *
 * Public API endpoints for slug availability checking.
 *
 * GET /api/v1/platform/slug/check?value=xxx — Check if a slug is available
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { query, validationResult } from 'express-validator';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { normalizeSlug } from '@o4o/platform-core/store-identity';

export function createSlugRoutes(dataSource: DataSource): Router {
  const router = Router();

  /**
   * GET /api/v1/platform/slug/check
   *
   * Check if a slug is available for use.
   * This is a public endpoint (no auth required) for real-time validation.
   *
   * Query params:
   *   - value: The slug to check (required, 3-120 chars)
   *
   * Response:
   *   - 200: { available: true } or { available: false, reason: '...' }
   *   - 400: Validation error
   */
  router.get(
    '/check',
    query('value')
      .isString()
      .isLength({ min: 1, max: 120 })
      .withMessage('Slug must be between 1 and 120 characters'),
    async (req: Request, res: Response) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({
            success: false,
            error: 'Invalid slug format',
            code: 'INVALID_SLUG_FORMAT',
            details: errors.array(),
          });
          return;
        }

        const value = req.query.value as string;
        const normalized = normalizeSlug(value);

        // Check minimum length after normalization
        if (normalized.length < 3) {
          res.json({
            available: false,
            reason: 'invalid',
            message: 'Slug must be at least 3 characters',
          });
          return;
        }

        const slugService = new StoreSlugService(dataSource);
        const result = await slugService.checkAvailability(normalized);

        if (result.available) {
          res.json({
            available: true,
            normalizedValue: normalized,
          });
        } else {
          res.json({
            available: false,
            reason: result.reason,
            validationError: result.validationError,
          });
        }
      } catch (error: any) {
        console.error('[SlugRoutes] check error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to check slug availability',
          code: 'SLUG_CHECK_ERROR',
        });
      }
    }
  );

  return router;
}
