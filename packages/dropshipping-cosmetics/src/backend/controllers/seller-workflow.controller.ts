/**
 * Seller Workflow Controller
 *
 * Phase 9-C: Core v2 정렬
 * - 화장품 오프라인 매장 상담 워크플로우
 * - SellerOps 연동 준비
 *
 * Handles HTTP requests for seller workflow (in-store consultation)
 * API: /api/v1/cosmetics/seller-workflow/*
 */

import { Request, Response } from 'express';
import {
  SellerWorkflowService,
  StartSessionDTO,
  UpdateSessionDTO,
} from '../services/seller-workflow.service.js';
import type { SellerWorkflowSessionDto } from '../dto/index.js';

export class SellerWorkflowController {
  constructor(private workflowService: SellerWorkflowService) {}

  /**
   * POST /api/v1/cosmetics/seller-workflow/start
   * Start a new seller workflow session
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const dto: StartSessionDTO = {
        sellerId: req.body.sellerId || (req as any).user?.id, // Use authenticated user ID if available
        customerProfile: req.body.customerProfile,
        metadata: req.body.metadata,
      };

      // Validate required fields
      if (!dto.sellerId) {
        res.status(400).json({
          success: false,
          message: 'Seller ID is required',
        });
        return;
      }

      if (!dto.customerProfile || Object.keys(dto.customerProfile).length === 0) {
        res.status(400).json({
          success: false,
          message: 'Customer profile is required',
        });
        return;
      }

      const session = await this.workflowService.startSession(dto);

      res.status(201).json({
        success: true,
        data: session,
        message: 'Seller workflow session started successfully',
      });
    } catch (error: any) {
      console.error('Error starting seller workflow session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start seller workflow session',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/seller-workflow/:id
   * Get session by ID
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const session = await this.workflowService.getSession(id);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      res.json({
        success: true,
        data: session,
      });
    } catch (error: any) {
      console.error('Error fetching session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/seller-workflow/seller/:sellerId
   * List sessions for a specific seller
   */
  async listSessionsBySeller(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const sessions = await this.workflowService.listSessionsBySeller(sellerId, {
        status,
        limit,
      });

      res.json({
        success: true,
        data: sessions,
      });
    } catch (error: any) {
      console.error('Error listing sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to list sessions',
        error: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/seller-workflow/:id
   * Update session
   */
  async updateSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateSessionDTO = {
        customerProfile: req.body.customerProfile,
        recommendedProducts: req.body.recommendedProducts,
        recommendedRoutines: req.body.recommendedRoutines,
        metadata: req.body.metadata,
      };

      const session = await this.workflowService.updateSession(id, dto);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      res.json({
        success: true,
        data: session,
        message: 'Session updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session',
        error: error.message,
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/seller-workflow/:id/complete
   * Complete session
   */
  async completeSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const purchasedProducts = req.body.purchasedProducts;

      const session = await this.workflowService.completeSession(id, purchasedProducts);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      res.json({
        success: true,
        data: session,
        message: 'Session completed successfully',
      });
    } catch (error: any) {
      console.error('Error completing session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete session',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/seller-workflow/seller/:sellerId/stats
   * Get seller statistics
   */
  async getSellerStats(req: Request, res: Response): Promise<void> {
    try {
      const { sellerId } = req.params;

      const stats = await this.workflowService.getSellerStats(sellerId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error fetching seller stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller stats',
        error: error.message,
      });
    }
  }
}
