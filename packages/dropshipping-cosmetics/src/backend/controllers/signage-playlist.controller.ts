/**
 * Signage Playlist Controller
 *
 * Handles HTTP requests for signage playlist management
 */

import { Request, Response } from 'express';
import {
  SignagePlaylistService,
  CreatePlaylistDTO,
  UpdatePlaylistDTO,
  AutoPlaylistFilters,
} from '../services/signage-playlist.service.js';

export class SignagePlaylistController {
  constructor(private playlistService: SignagePlaylistService) {}

  /**
   * POST /api/v1/cosmetics/signage/playlists
   * Create a new playlist
   */
  async createPlaylist(req: Request, res: Response): Promise<void> {
    try {
      const dto: CreatePlaylistDTO = {
        name: req.body.name,
        description: req.body.description,
        items: req.body.items || [],
        metadata: req.body.metadata,
      };

      // Validate required fields
      if (!dto.name || dto.name.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Playlist name is required',
        });
        return;
      }

      if (!Array.isArray(dto.items)) {
        res.status(400).json({
          success: false,
          message: 'Items must be an array',
        });
        return;
      }

      const playlist = await this.playlistService.createPlaylist(dto);

      res.status(201).json({
        success: true,
        data: playlist,
        message: 'Playlist created successfully',
      });
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create playlist',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/signage/playlists/:id
   * Get playlist by ID
   */
  async getPlaylistById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const playlist = await this.playlistService.getPlaylistById(id);

      if (!playlist) {
        res.status(404).json({
          success: false,
          message: 'Playlist not found',
        });
        return;
      }

      res.json({
        success: true,
        data: playlist,
      });
    } catch (error: any) {
      console.error('Error fetching playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch playlist',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/signage/playlists
   * List all playlists
   */
  async listPlaylists(req: Request, res: Response): Promise<void> {
    try {
      const playlists = await this.playlistService.listPlaylists();

      res.json({
        success: true,
        data: playlists,
      });
    } catch (error: any) {
      console.error('Error listing playlists:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list playlists',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/signage/playlists/:id
   * Update playlist
   */
  async updatePlaylist(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePlaylistDTO = {
        name: req.body.name,
        description: req.body.description,
        items: req.body.items,
        metadata: req.body.metadata,
      };

      const playlist = await this.playlistService.updatePlaylist(id, dto);

      if (!playlist) {
        res.status(404).json({
          success: false,
          message: 'Playlist not found',
        });
        return;
      }

      res.json({
        success: true,
        data: playlist,
        message: 'Playlist updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update playlist',
        error: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics/signage/playlists/:id
   * Delete playlist
   */
  async deletePlaylist(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deleted = await this.playlistService.deletePlaylist(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Playlist not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Playlist deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete playlist',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/signage/auto-playlist
   * Generate auto playlist based on filters
   */
  async generateAutoPlaylist(req: Request, res: Response): Promise<void> {
    try {
      const filters: AutoPlaylistFilters = {
        brand: req.body.brand,
        category: req.body.category,
        concerns: req.body.concerns,
        skinTypes: req.body.skinTypes,
        includeRoutines: req.body.includeRoutines || false,
        maxItems: req.body.maxItems || 20,
      };

      const items = await this.playlistService.generateAutoPlaylist(filters);

      res.json({
        success: true,
        data: {
          items,
          filters,
          totalItems: items.length,
          totalDuration: items.reduce((sum, item) => sum + item.duration, 0),
        },
        message: 'Auto playlist generated successfully',
      });
    } catch (error: any) {
      console.error('Error generating auto playlist:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate auto playlist',
        error: error.message,
      });
    }
  }
}
