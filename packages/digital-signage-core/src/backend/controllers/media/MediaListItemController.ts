import { Router, Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { MediaListItemService } from '../../services/media/MediaListItemService.js';
import { CreateMediaListItemDto, UpdateMediaListItemDto } from '../../dto/index.js';

/**
 * MediaListItemController
 *
 * 미디어 리스트 아이템 관리 API
 */
export function createMediaListItemController(dataSource: DataSource): Router {
  const router = Router();
  const service = new MediaListItemService(dataSource);

  /**
   * GET /api/signage/media-list-items/by-list/:mediaListId
   */
  router.get('/by-list/:mediaListId', async (req: Request, res: Response) => {
    try {
      const items = await service.findByMediaListId(req.params.mediaListId);

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
   * GET /api/signage/media-list-items/:id
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const item = await service.findById(req.params.id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: 'MediaListItem not found',
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
   * POST /api/signage/media-list-items
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const dto: CreateMediaListItemDto = req.body;
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
   * PUT /api/signage/media-list-items/:id
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const dto: UpdateMediaListItemDto = req.body;
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
   * DELETE /api/signage/media-list-items/:id
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      await service.delete(req.params.id);

      res.json({
        success: true,
        message: 'MediaListItem deleted successfully',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /api/signage/media-list-items/reorder/:mediaListId
   */
  router.post('/reorder/:mediaListId', async (req: Request, res: Response) => {
    try {
      const { itemIds } = req.body;
      await service.reorder(req.params.mediaListId, itemIds);

      res.json({
        success: true,
        message: 'Items reordered successfully',
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
