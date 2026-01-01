/**
 * GlucoseView Customer Controller
 *
 * Phase C-2: Customer Management
 * API endpoints for pharmacist-managed customer records
 *
 * All endpoints require authentication and scope to the logged-in pharmacist
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { DataSource } from 'typeorm';
import { CustomerService } from '../services/customer.service.js';
import type {
  CreateCustomerRequestDto,
  UpdateCustomerRequestDto,
  ListCustomersQueryDto,
} from '../dto/index.js';
import type { AuthRequest } from '../../../types/auth.js';

type AuthMiddleware = RequestHandler;

// Validation error handler
const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array(),
      },
    });
    return;
  }
  next();
};

export function createCustomerController(
  dataSource: DataSource,
  requireAuth: AuthMiddleware
): Router {
  const router = Router();
  const service = new CustomerService(dataSource);

  /**
   * GET /customers - List customers for the logged-in pharmacist
   */
  router.get(
    '/',
    requireAuth,
    [
      query('search').optional().isString(),
      query('sort_by').optional().isIn(['recent', 'frequent', 'name']),
      query('page').optional().isInt({ min: 1 }),
      query('limit').optional().isInt({ min: 1, max: 100 }),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const queryDto: ListCustomersQueryDto = {
          search: req.query.search as string,
          sort_by: req.query.sort_by as 'recent' | 'frequent' | 'name',
          page: req.query.page ? Number(req.query.page) : 1,
          limit: req.query.limit ? Number(req.query.limit) : 20,
        };

        const result = await service.listCustomers(pharmacistId, queryDto);
        res.json(result);
      } catch (error: any) {
        console.error('Failed to list customers:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /customers/stats - Get customer statistics
   */
  router.get(
    '/stats',
    requireAuth,
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const stats = await service.getCustomerStats(pharmacistId);
        res.json({ data: stats });
      } catch (error: any) {
        console.error('Failed to get customer stats:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * GET /customers/:id - Get a single customer
   */
  router.get(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const customer = await service.getCustomerById(pharmacistId, req.params.id);
        if (!customer) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Customer not found' },
          });
          return;
        }

        res.json({ data: customer });
      } catch (error: any) {
        console.error('Failed to get customer:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /customers - Create a new customer
   */
  router.post(
    '/',
    requireAuth,
    [
      body('name').isString().notEmpty().withMessage('Name is required'),
      body('phone').optional().isString(),
      body('email').optional().isEmail(),
      body('age').optional().isInt({ min: 1, max: 150 }),
      body('gender').optional().isIn(['male', 'female']),
      body('kakao_id').optional().isString(),
      body('notes').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const dto: CreateCustomerRequestDto = req.body;
        const customer = await service.createCustomer(pharmacistId, dto);
        res.status(201).json({ data: customer });
      } catch (error: any) {
        console.error('Failed to create customer:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * PUT /customers/:id - Update a customer
   */
  router.put(
    '/:id',
    requireAuth,
    [
      param('id').isUUID(),
      body('name').optional().isString().notEmpty(),
      body('phone').optional().isString(),
      body('email').optional().isEmail(),
      body('age').optional().isInt({ min: 1, max: 150 }),
      body('gender').optional().isIn(['male', 'female']),
      body('kakao_id').optional().isString(),
      body('notes').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const dto: UpdateCustomerRequestDto = req.body;
        const customer = await service.updateCustomer(pharmacistId, req.params.id, dto);
        if (!customer) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Customer not found' },
          });
          return;
        }

        res.json({ data: customer });
      } catch (error: any) {
        console.error('Failed to update customer:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * DELETE /customers/:id - Delete a customer
   */
  router.delete(
    '/:id',
    requireAuth,
    [param('id').isUUID(), handleValidationErrors],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const deleted = await service.deleteCustomer(pharmacistId, req.params.id);
        if (!deleted) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Customer not found' },
          });
          return;
        }

        res.status(204).send();
      } catch (error: any) {
        console.error('Failed to delete customer:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  /**
   * POST /customers/:id/visit - Record a customer visit
   */
  router.post(
    '/:id/visit',
    requireAuth,
    [
      param('id').isUUID(),
      body('notes').optional().isString(),
      handleValidationErrors,
    ],
    async (req: AuthRequest, res: Response): Promise<void> => {
      try {
        const pharmacistId = req.user?.id;
        if (!pharmacistId) {
          res.status(401).json({
            error: { code: 'UNAUTHORIZED', message: 'User not authenticated' },
          });
          return;
        }

        const customer = await service.recordVisit(
          pharmacistId,
          req.params.id,
          req.body.notes
        );
        if (!customer) {
          res.status(404).json({
            error: { code: 'NOT_FOUND', message: 'Customer not found' },
          });
          return;
        }

        res.json({ data: customer });
      } catch (error: any) {
        console.error('Failed to record visit:', error);
        res.status(500).json({
          error: { code: 'INTERNAL_ERROR', message: error.message },
        });
      }
    }
  );

  return router;
}
