import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { ScheduleService } from '../../services/schedule/ScheduleService.js';
import { CreateScheduleDto, UpdateScheduleDto } from '../../dto/index.js';

/**
 * ScheduleController
 *
 * 스케줄 관리 API
 */
export function createScheduleController(dataSource: DataSource): Router {
  const router = Router();
  const service = new ScheduleService(dataSource);

  /**
   * GET /api/signage/schedules
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { organizationId, isActive, limit, offset } = req.query;

      const result = await service.findList({
        organizationId: organizationId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      res.json({
        success: true,
        data: result.items,
        total: result.total,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/schedules/by-slot/:displaySlotId
   */
  router.get('/by-slot/:displaySlotId', async (req: Request, res: Response) => {
    try {
      const items = await service.findByDisplaySlotId(req.params.displaySlotId);

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/signage/schedules/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Schedule not found',
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/signage/schedules
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateScheduleDto = req.body;
      const item = await service.create(dto);

      res.status(201).json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/schedules/:id
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateScheduleDto = req.body;
      const item = await service.update(req.params.id, dto);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /api/signage/schedules/:id
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'Schedule deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/schedules/:id/activate
   */
  router.put('/:id/activate', async (req: Request, res: Response) => {
    try {
      const item = await service.setActive(req.params.id, true);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/schedules/:id/deactivate
   */
  router.put('/:id/deactivate', async (req: Request, res: Response) => {
    try {
      const item = await service.setActive(req.params.id, false);

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
