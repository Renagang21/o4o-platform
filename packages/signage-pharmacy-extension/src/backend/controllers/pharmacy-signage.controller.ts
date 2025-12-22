/**
 * Pharmacy Signage Controller
 *
 * REST API controller for pharmacy signage extension.
 */

import { Router, Request, Response } from 'express';
import { PharmacySignageService } from '../services/pharmacy-signage.service.js';
import type {
  ContentFilterDto,
  CreatePlaylistDto,
  UpdatePlaylistDto,
  AddPlaylistItemDto,
  ReorderPlaylistItemsDto,
  CreateScheduleDto,
  PharmacyQuickActionDto,
  TimeSlot,
} from '../dto/index.js';

export function createPharmacySignageController(
  service: PharmacySignageService
): Router {
  const router = Router();

  // ==================== Dashboard ====================

  router.get('/dashboard', async (req: Request, res: Response) => {
    try {
      const dashboard = await service.getDashboard();
      res.json({ success: true, data: dashboard });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==================== Content ====================

  router.get('/content', async (req: Request, res: Response) => {
    try {
      const filter: ContentFilterDto = {
        category: req.query.category as any,
        provider: req.query.provider as string,
        search: req.query.search as string,
        selectedOnly: req.query.selectedOnly === 'true',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await service.getAvailableContent(filter);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/content/selected', async (req: Request, res: Response) => {
    try {
      const content = await service.getSelectedContent();
      res.json({ success: true, data: content });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/content/:id/select', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { selected } = req.body;
      const result = await service.toggleContentSelection(id, selected);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==================== Playlists ====================

  router.get('/playlists', async (req: Request, res: Response) => {
    try {
      const playlists = await service.getPlaylists();
      res.json({ success: true, data: playlists });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/playlists/:id', async (req: Request, res: Response) => {
    try {
      const playlist = await service.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      res.json({ success: true, data: playlist });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/playlists', async (req: Request, res: Response) => {
    try {
      const { name, description, loop } = req.body as CreatePlaylistDto;
      const playlist = await service.createPlaylist(name, description, loop);
      res.status(201).json({ success: true, data: playlist });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.patch('/playlists/:id', async (req: Request, res: Response) => {
    try {
      const playlist = await service.updatePlaylist(req.params.id, req.body);
      res.json({ success: true, data: playlist });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.delete('/playlists/:id', async (req: Request, res: Response) => {
    try {
      const result = await service.deletePlaylist(req.params.id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Playlist Items
  router.post('/playlists/:id/items', async (req: Request, res: Response) => {
    try {
      const { contentId, position, durationSeconds } = req.body as AddPlaylistItemDto;
      const result = await service.addPlaylistItem(
        req.params.id,
        contentId,
        position,
        durationSeconds
      );
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.delete('/playlists/:playlistId/items/:itemId', async (req: Request, res: Response) => {
    try {
      const result = await service.removePlaylistItem(
        req.params.playlistId,
        req.params.itemId
      );
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/playlists/:id/reorder', async (req: Request, res: Response) => {
    try {
      const { items } = req.body as ReorderPlaylistItemsDto;
      const result = await service.reorderPlaylistItems(req.params.id, items);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==================== Schedule ====================

  router.get('/schedules', async (req: Request, res: Response) => {
    try {
      const schedules = await service.getSchedules();
      res.json({ success: true, data: schedules });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/schedules', async (req: Request, res: Response) => {
    try {
      const { timeSlot, playlistId, startTime, endTime } = req.body as CreateScheduleDto;
      const schedule = await service.setSchedule(
        timeSlot,
        playlistId,
        startTime,
        endTime
      );
      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.delete('/schedules/:id', async (req: Request, res: Response) => {
    try {
      const result = await service.removeSchedule(req.params.id);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==================== Quick Action ====================

  router.post('/quick-action', async (req: Request, res: Response) => {
    try {
      const action = req.body as PharmacyQuickActionDto;
      const result = await service.executeQuickAction(action);
      res.json(result);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.post('/quick-action/:executionId/stop', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      const result = await service.stopAction(req.params.executionId, reason);
      res.json({ success: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/quick-action/:executionId/status', async (req: Request, res: Response) => {
    try {
      const status = await service.getActionStatus(req.params.executionId);
      res.json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ==================== Displays ====================

  router.get('/displays', async (req: Request, res: Response) => {
    try {
      const displays = await service.getDisplays();
      res.json({ success: true, data: displays });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/displays/:id', async (req: Request, res: Response) => {
    try {
      const display = await service.getDisplayStatus(req.params.id);
      if (!display) {
        return res.status(404).json({ success: false, error: 'Display not found' });
      }
      res.json({ success: true, data: display });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  router.get('/displays/:displayId/slots/:slotId/status', async (req: Request, res: Response) => {
    try {
      const status = await service.getSlotStatus(req.params.slotId);
      res.json(status);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return router;
}
