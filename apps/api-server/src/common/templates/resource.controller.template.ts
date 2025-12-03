/**
 * TEMPLATE: Resource Controller
 *
 * Copy this file and replace:
 * - RESOURCE_NAME (e.g., Product, User, Order)
 * - RESOURCE_LOWER (e.g., product, user, order)
 * - DOMAIN (e.g., commerce, auth, dropshipping)
 */

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { RESOURCE_LOWERService } from '../services/RESOURCE_LOWER.service.js';

export class RESOURCE_NAMEController extends BaseController {
  /**
   * Get all RESOURCE_NAMEs (paginated)
   * GET /api/DOMAINs/RESOURCE_LOWERs?page=1&limit=20
   */
  static async list(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;

    const result = await RESOURCE_LOWERService.paginate(
      Number(page),
      Number(limit)
    );

    return BaseController.okPaginated(res, result.items, result.pagination);
  }

  /**
   * Get single RESOURCE_NAME by ID
   * GET /api/DOMAINs/RESOURCE_LOWERs/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const RESOURCE_LOWER = await RESOURCE_LOWERService.findById(id);

    if (!RESOURCE_LOWER) {
      return BaseController.notFound(res, 'RESOURCE_NAME not found');
    }

    return BaseController.ok(res, RESOURCE_LOWER);
  }

  /**
   * Create new RESOURCE_NAME
   * POST /api/DOMAINs/RESOURCE_LOWERs
   */
  static async create(req: AuthRequest, res: Response): Promise<void> {
    const data = req.body; // Already validated by validateDto middleware

    const RESOURCE_LOWER = await RESOURCE_LOWERService.create(data);

    return BaseController.created(res, RESOURCE_LOWER);
  }

  /**
   * Update existing RESOURCE_NAME
   * PUT /api/DOMAINs/RESOURCE_LOWERs/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body; // Already validated by validateDto middleware

    const RESOURCE_LOWER = await RESOURCE_LOWERService.update(id, data);

    if (!RESOURCE_LOWER) {
      return BaseController.notFound(res, 'RESOURCE_NAME not found');
    }

    return BaseController.ok(res, RESOURCE_LOWER);
  }

  /**
   * Delete RESOURCE_NAME
   * DELETE /api/DOMAINs/RESOURCE_LOWERs/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const deleted = await RESOURCE_LOWERService.delete(id);

    if (!deleted) {
      return BaseController.notFound(res, 'RESOURCE_NAME not found');
    }

    return BaseController.noContent(res);
  }
}
