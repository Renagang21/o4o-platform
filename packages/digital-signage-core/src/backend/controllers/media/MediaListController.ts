import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MediaListService } from '../../services/media/MediaListService.js';
import { CreateMediaListDto, UpdateMediaListDto } from '../../dto/index.js';

/**
 * MediaListController
 *
 * 미디어 리스트 관리 API
 */
export function createMediaListController(dataSource: DataSource): Router {
  const router = Router();
  const service = new MediaListService(dataSource);

  /**
   * GET /api/signage/media-lists
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
   * GET /api/signage/media-lists/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'MediaList not found',
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
   * POST /api/signage/media-lists
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateMediaListDto = req.body;
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
   * PUT /api/signage/media-lists/:id
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateMediaListDto = req.body;
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
   * DELETE /api/signage/media-lists/:id
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'MediaList deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PUT /api/signage/media-lists/:id/activate
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
   * PUT /api/signage/media-lists/:id/deactivate
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
