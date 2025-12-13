import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { DisplayService } from '../../services/display/DisplayService.js';
import { CreateDisplayDto, UpdateDisplayDto } from '../../dto/index.js';

/**
 * DisplayController
 *
 * 디스플레이 관리 API
 */
export function createDisplayController(dataSource: DataSource): Router {
  const router = Router();
  const service = new DisplayService(dataSource);

  /**
   * GET /api/signage/displays
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
   * GET /api/signage/displays/by-code/:deviceCode
   */
  router.get('/by-code/:deviceCode', async (req: Request, res: Response) => {
    try {
      const item = await service.findByDeviceCode(req.params.deviceCode);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Display not found',
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
   * GET /api/signage/displays/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'Display not found',
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
   * POST /api/signage/displays
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateDisplayDto = req.body;
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
   * PUT /api/signage/displays/:id
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateDisplayDto = req.body;
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
   * DELETE /api/signage/displays/:id
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'Display deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/displays/:id/activate
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
   * PUT /api/signage/displays/:id/deactivate
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

  /**
   * PUT /api/signage/displays/:id/status
   */
  router.put('/:id/status', async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      const item = await service.setStatus(req.params.id, status);

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
   * POST /api/signage/displays/:id/heartbeat
   */
  router.post('/:id/heartbeat', async (req: Request, res: Response) => {
    try {
      const item = await service.updateHeartbeat(req.params.id);

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
