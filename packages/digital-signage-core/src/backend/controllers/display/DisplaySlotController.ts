import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { DisplaySlotService } from '../../services/display/DisplaySlotService.js';
import { CreateDisplaySlotDto, UpdateDisplaySlotDto } from '../../dto/index.js';

/**
 * DisplaySlotController
 *
 * 디스플레이 슬롯 관리 API
 */
export function createDisplaySlotController(dataSource: DataSource): Router {
  const router = Router();
  const service = new DisplaySlotService(dataSource);

  /**
   * GET /api/signage/display-slots/by-display/:displayId
   */
  router.get('/by-display/:displayId', async (req: Request, res: Response) => {
    try {
      const items = await service.findByDisplayId(req.params.displayId);

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
   * GET /api/signage/display-slots/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'DisplaySlot not found',
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
   * POST /api/signage/display-slots
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateDisplaySlotDto = req.body;
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
   * PUT /api/signage/display-slots/:id
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateDisplaySlotDto = req.body;
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
   * DELETE /api/signage/display-slots/:id
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'DisplaySlot deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/display-slots/:id/activate
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
   * PUT /api/signage/display-slots/:id/deactivate
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
