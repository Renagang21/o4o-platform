/**
 * Influencer Routine Controller
 *
 * Phase 9-C: Core v2 정렬
 * - DTO import 정리
 *
 * Handles HTTP requests for influencer routine management
 * API: /api/v1/partner/routines/*
 */

import type { Request, Response } from 'express';
import { InfluencerRoutineService } from '../services/influencer-routine.service.js';
import type { CreateRoutineDto, UpdateRoutineDto } from '../dto/index.js';

export class InfluencerRoutineController {
  private routineService: InfluencerRoutineService;

  constructor(routineService: InfluencerRoutineService) {
    this.routineService = routineService;
  }

  /**
   * POST /api/v1/partner/routines
   * Create a new routine
   */
  async createRoutine(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateRoutineDto = req.body;

      // Validate routine steps
      const validation = this.routineService.validateRoutineSteps(data.routine);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          message: 'Invalid routine steps',
          errors: validation.errors,
        });
        return;
      }

      // TODO: Get user ID and role from auth middleware
      // For now, use partnerId from request body
      const routine = await this.routineService.createRoutine(data);

      res.status(201).json({
        success: true,
        data: routine,
        message: 'Routine created successfully',
      });
    } catch (error) {
      console.error('Error creating routine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create routine',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/partner/routines/:id
   * Get routine by ID
   */
  async getRoutineById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const routine = await this.routineService.getRoutineById(id);

      if (!routine) {
        res.status(404).json({
          success: false,
          message: `Routine '${id}' not found`,
        });
        return;
      }

      // Increment view count
      await this.routineService.incrementViewCount(id);

      res.json({
        success: true,
        data: routine,
      });
    } catch (error) {
      console.error('Error fetching routine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch routine',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/partner/routines
   * Get routines (by partner ID or published)
   */
  async getRoutines(req: Request, res: Response): Promise<void> {
    try {
      const { partnerId, skinType, concerns, timeOfUse, tags } = req.query;

      let routines;

      if (partnerId) {
        // Get routines by partner ID
        routines = await this.routineService.getRoutinesByPartnerId(
          partnerId as string
        );
      } else {
        // Get published routines with filters
        const filters: any = {};

        if (skinType) {
          filters.skinType = Array.isArray(skinType)
            ? skinType
            : [skinType as string];
        }

        if (concerns) {
          filters.concerns = Array.isArray(concerns)
            ? concerns
            : [concerns as string];
        }

        if (timeOfUse) {
          filters.timeOfUse = timeOfUse as 'morning' | 'evening' | 'both';
        }

        if (tags) {
          filters.tags = Array.isArray(tags) ? tags : [tags as string];
        }

        routines = await this.routineService.getPublishedRoutines(filters);
      }

      res.json({
        success: true,
        data: routines,
        total: routines.length,
      });
    } catch (error) {
      console.error('Error fetching routines:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch routines',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/v1/partner/routines/:id
   * Update routine
   */
  async updateRoutine(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates: UpdateRoutineDto = req.body;

      // TODO: Get user ID and role from auth middleware
      const userId = req.body.userId || 'user123'; // Temporary
      const userRole = req.body.userRole || 'partner'; // Temporary

      const updated = await this.routineService.updateRoutine(
        id,
        updates,
        userId,
        userRole
      );

      if (!updated) {
        res.status(404).json({
          success: false,
          message: `Routine '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
        message: 'Routine updated successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error('Error updating routine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update routine',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/v1/partner/routines/:id
   * Delete routine (soft delete)
   */
  async deleteRoutine(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Get user ID and role from auth middleware
      const userId = req.body.userId || 'user123'; // Temporary
      const userRole = req.body.userRole || 'partner'; // Temporary

      const deleted = await this.routineService.deleteRoutine(id, userId, userRole);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: `Routine '${id}' not found`,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Routine deleted successfully',
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        res.status(403).json({
          success: false,
          message: error.message,
        });
        return;
      }

      console.error('Error deleting routine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete routine',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/partner/routines/:id/recommend
   * Increment recommend count
   */
  async recommendRoutine(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.routineService.incrementRecommendCount(id);

      res.json({
        success: true,
        message: 'Routine recommended',
      });
    } catch (error) {
      console.error('Error recommending routine:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to recommend routine',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default InfluencerRoutineController;
