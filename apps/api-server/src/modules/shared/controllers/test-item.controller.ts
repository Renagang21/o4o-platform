import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { testItemService } from '../services/test-item.service.js';

export class TestItemController extends BaseController {
  /**
   * Get all test items (paginated)
   * GET /api/test-items?page=1&limit=20
   */
  static async list(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;

    const result = await testItemService.paginate(Number(page), Number(limit));

    return BaseController.okPaginated(res, result.items, result.pagination);
  }

  /**
   * Get single test item by ID
   * GET /api/test-items/:id
   */
  static async getById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const item = await testItemService.findById(id);

    if (!item) {
      return BaseController.notFound(res, 'TestItem not found');
    }

    return BaseController.ok(res, item);
  }

  /**
   * Create new test item
   * POST /api/test-items
   */
  static async create(req: Request, res: Response): Promise<void> {
    const data = req.body;

    const item = await testItemService.create(data);

    return BaseController.created(res, item);
  }

  /**
   * Update test item
   * PUT /api/test-items/:id
   */
  static async update(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const data = req.body;

    const item = await testItemService.update(id, data);

    if (!item) {
      return BaseController.notFound(res, 'TestItem not found');
    }

    return BaseController.ok(res, item);
  }

  /**
   * Delete test item
   * DELETE /api/test-items/:id
   */
  static async delete(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const deleted = await testItemService.delete(id);

    if (!deleted) {
      return BaseController.notFound(res, 'TestItem not found');
    }

    return BaseController.noContent(res);
  }

  /**
   * Get active test items
   * GET /api/test-items/active
   */
  static async getActive(req: Request, res: Response): Promise<void> {
    const items = await testItemService.findActive();

    return BaseController.ok(res, items);
  }

  /**
   * Increment value
   * POST /api/test-items/:id/increment
   */
  static async increment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const item = await testItemService.incrementValue(id);

    return BaseController.ok(res, item);
  }
}
