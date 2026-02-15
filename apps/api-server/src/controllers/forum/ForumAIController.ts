/**
 * ForumAIController
 * Phase 16: AI Summary & Auto-Tagging
 *
 * Handles AI-related API requests for forum posts:
 * - Get AI metadata
 * - Regenerate summary/tags
 * - Apply suggested tags
 */

import { Request, Response } from 'express';
import { forumAIService } from '../../services/forum/ForumAIService.js';

export class ForumAIController {
  /**
   * GET /api/v1/forum/posts/:id/ai
   * Get AI metadata for a post
   */
  async getAIMetadata(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const aiMeta = await forumAIService.getAIMetadata(id);

      if (!aiMeta) {
        res.json({
          success: true,
          data: null,
          message: 'No AI data available for this post',
        });
        return;
      }

      res.json({
        success: true,
        data: aiMeta,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/forum/posts/:id/ai/process
   * Process a post (generate summary + tags)
   * Called asynchronously after post creation/update
   */
  async processPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Require auth + operator role
      if (!user?.id) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const userRoles: string[] = user.roles || [];
      if (!userRoles.includes('kpa:admin') && !userRoles.includes('kpa:operator')) {
        res.status(403).json({ success: false, error: 'KPA operator role required' });
        return;
      }

      const { regenerate } = req.body;

      // Start processing (this could be moved to a job queue in production)
      const result = await forumAIService.processPost(id, { regenerate });

      res.json({
        success: true,
        data: result,
        message: 'AI processing completed',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/forum/posts/:id/ai/regenerate
   * Force regenerate AI content for a post
   * Requires authorization (author or moderator)
   */
  async regenerate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Require operator+ role
      const userRoles: string[] = user.roles || [];
      if (!userRoles.includes('kpa:admin') && !userRoles.includes('kpa:operator')) {
        res.status(403).json({ success: false, error: 'KPA operator role required' });
        return;
      }

      const result = await forumAIService.processPost(id, { regenerate: true });

      res.json({
        success: true,
        data: result,
        message: 'AI content regenerated',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * POST /api/v1/forum/posts/:id/ai/apply-tags
   * Apply AI-suggested tags to the post
   * Requires authorization (author for cosmetics, operator+ for yaksa)
   */
  async applyTags(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const { tags } = req.body; // Optional: specific tags to apply

      if (!user?.id) {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
        });
        return;
      }

      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Require operator+ role
      const userRoles: string[] = user.roles || [];
      if (!userRoles.includes('kpa:admin') && !userRoles.includes('kpa:operator')) {
        res.status(403).json({ success: false, error: 'KPA operator role required' });
        return;
      }

      await forumAIService.applyTags(id, user.id, tags);

      res.json({
        success: true,
        message: 'Tags applied successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }

  /**
   * GET /api/v1/forum/ai/status
   * Get AI service status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          provider: forumAIService.getProviderName(),
          status: 'active',
          features: ['summary', 'tagging', 'domain-specific'],
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({
        success: false,
        error: message,
      });
    }
  }
}
