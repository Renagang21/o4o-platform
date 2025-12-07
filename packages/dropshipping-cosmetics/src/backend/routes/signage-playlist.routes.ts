/**
 * Signage Playlist Routes
 *
 * REST API endpoints for signage playlist management
 */

import { Router } from 'express';
import type { DataSource } from 'typeorm';
import { SignagePlaylistService } from '../services/signage-playlist.service.js';
import { SignagePlaylistController } from '../controllers/signage-playlist.controller.js';

export function createSignagePlaylistRoutes(dataSource: DataSource): Router {
  const router = Router();
  const playlistService = new SignagePlaylistService(dataSource);
  const playlistController = new SignagePlaylistController(playlistService);

  /**
   * POST /api/v1/cosmetics/signage/playlists
   * Create a new playlist
   */
  router.post('/signage/playlists', (req, res) =>
    playlistController.createPlaylist(req, res)
  );

  /**
   * GET /api/v1/cosmetics/signage/playlists
   * List all playlists
   */
  router.get('/signage/playlists', (req, res) =>
    playlistController.listPlaylists(req, res)
  );

  /**
   * GET /api/v1/cosmetics/signage/playlists/:id
   * Get playlist by ID
   */
  router.get('/signage/playlists/:id', (req, res) =>
    playlistController.getPlaylistById(req, res)
  );

  /**
   * PUT /api/v1/cosmetics/signage/playlists/:id
   * Update playlist
   */
  router.put('/signage/playlists/:id', (req, res) =>
    playlistController.updatePlaylist(req, res)
  );

  /**
   * DELETE /api/v1/cosmetics/signage/playlists/:id
   * Delete playlist
   */
  router.delete('/signage/playlists/:id', (req, res) =>
    playlistController.deletePlaylist(req, res)
  );

  /**
   * POST /api/v1/cosmetics/signage/auto-playlist
   * Generate auto playlist based on filters
   */
  router.post('/signage/auto-playlist', (req, res) =>
    playlistController.generateAutoPlaylist(req, res)
  );

  return router;
}
