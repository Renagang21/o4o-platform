/**
 * Seller Workflow Controller
 *
 * Phase 9-C: Core v2 정렬
 * - 화장품 오프라인 매장 상담 워크플로우
 * - SellerOps 연동 준비
 *
 * Phase 10: Security hardening
 * - sellerId extracted from authenticated user (req.user.id)
 * - Ownership verification for session access
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
import type { AuthenticatedRequest } from '../middleware/permissions.middleware.js';

export class SellerWorkflowController {
  constructor(private workflowService: SellerWorkflowService) {}

  /**
   * POST /api/v1/cosmetics/seller-workflow/start
   * Start a new seller workflow session
   * - sellerId is extracted from authenticated user (req.user.id)
   */
  async startSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Phase 10: Security - sellerId must come from authenticated user, not body
      const sellerId = req.user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const dto: StartSessionDTO = {
        sellerId,
        customerProfile: req.body.customerProfile,
        metadata: req.body.metadata,
      };

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
   * - Ownership verified: session must belong to authenticated user
   */
  async getSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      const session = await this.workflowService.getSession(id);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      // Phase 10: Ownership verification (admin can access any session)
      if (!isAdmin && session.sellerId !== sellerId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only access your own sessions',
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
   * GET /api/v1/cosmetics/seller-workflow/sessions
   * List sessions for the authenticated seller
   * - CHANGED: sellerId from req.user.id, not URL param
   */
  async listSessionsBySeller(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Phase 10: Security - sellerId from authenticated user
      const sellerId = req.user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

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
   * - Ownership verified: session must belong to authenticated user
   */
  async updateSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      // First check ownership
      const existingSession = await this.workflowService.getSession(id);

      if (!existingSession) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      // Phase 10: Ownership verification
      if (!isAdmin && existingSession.sellerId !== sellerId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only update your own sessions',
        });
        return;
      }

      const dto: UpdateSessionDTO = {
        customerProfile: req.body.customerProfile,
        recommendedProducts: req.body.recommendedProducts,
        recommendedRoutines: req.body.recommendedRoutines,
        metadata: req.body.metadata,
      };

      const session = await this.workflowService.updateSession(id, dto);

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
   * - Ownership verified: session must belong to authenticated user
   */
  async completeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const sellerId = req.user?.id;
      const isAdmin = req.user?.role === 'admin';
      const purchasedProducts = req.body.purchasedProducts;

      // First check ownership
      const existingSession = await this.workflowService.getSession(id);

      if (!existingSession) {
        res.status(404).json({
          success: false,
          message: 'Session not found',
        });
        return;
      }

      // Phase 10: Ownership verification
      if (!isAdmin && existingSession.sellerId !== sellerId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You can only complete your own sessions',
        });
        return;
      }

      const session = await this.workflowService.completeSession(id, purchasedProducts);

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
   * GET /api/v1/cosmetics/seller-workflow/stats
   * Get seller statistics
   * - CHANGED: sellerId from req.user.id, not URL param
   */
  async getSellerStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Phase 10: Security - sellerId from authenticated user
      const sellerId = req.user?.id;

      if (!sellerId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

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
