/**
 * ForumRecommendationController
 * Phase 17: AI-powered Personalized Recommendations
 *
 * Provides REST endpoints for forum recommendations.
 */

import { Request, Response } from 'express';
import {
  forumRecommendationService,
  type UserContext,
  type RecommendationOptions,
} from '../../services/forum/index.js';

export class ForumRecommendationController {
  /**
   * GET /api/v1/forum/recommendations
   * Get personalized recommendations for the current user
   */
  async getRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      const options = this.extractOptions(req);

      const recommendations = await forumRecommendationService.getPersonalizedRecommendations(
        userContext,
        options
      );

      res.json({
        success: true,
        data: {
          recommendations,
          meta: {
            count: recommendations.length,
            scope: options.scope || 'personal',
          },
        },
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendations',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/recommendations
   * Get cosmetics-domain specific recommendations
   */
  async getCosmeticsRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      const options = this.extractOptions(req);

      const recommendations = await forumRecommendationService.getCosmeticsRecommendations(
        userContext,
        options
      );

      res.json({
        success: true,
        data: {
          recommendations,
          meta: {
            count: recommendations.length,
            domain: 'cosmetics',
          },
        },
      });
    } catch (error) {
      console.error('Error getting cosmetics recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cosmetics recommendations',
      });
    }
  }

  /**
   * GET /api/v1/yaksa/forum/recommendations
   * Get yaksa-domain specific recommendations
   */
  async getYaksaRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const userContext = this.extractUserContext(req);
      const options = this.extractOptions(req);

      const recommendations = await forumRecommendationService.getYaksaRecommendations(
        userContext,
        options
      );

      res.json({
        success: true,
        data: {
          recommendations,
          meta: {
            count: recommendations.length,
            domain: 'yaksa',
          },
        },
      });
    } catch (error) {
      console.error('Error getting yaksa recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get yaksa recommendations',
      });
    }
  }

  /**
   * GET /api/v1/forum/recommendations/trending
   * Get trending posts
   */
  async getTrending(req: Request, res: Response): Promise<void> {
    try {
      const options = this.extractOptions(req);

      const recommendations = await forumRecommendationService.getTrendingPosts(options);

      res.json({
        success: true,
        data: {
          recommendations,
          meta: {
            count: recommendations.length,
            scope: 'trending',
          },
        },
      });
    } catch (error) {
      console.error('Error getting trending posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trending posts',
      });
    }
  }

  /**
   * GET /api/v1/forum/recommendations/related/:postId
   * Get related posts for a specific post
   */
  async getRelated(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;
      const options = this.extractOptions(req);

      if (!postId) {
        res.status(400).json({
          success: false,
          error: 'Post ID is required',
        });
        return;
      }

      const recommendations = await forumRecommendationService.getRelatedPosts(postId, options);

      res.json({
        success: true,
        data: {
          recommendations,
          meta: {
            count: recommendations.length,
            scope: 'related',
            relatedToPostId: postId,
          },
        },
      });
    } catch (error) {
      console.error('Error getting related posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get related posts',
      });
    }
  }

  /**
   * GET /api/v1/forum/recommendations/config
   * Get current recommendation configuration (admin only)
   */
  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Policy config → Admin only
      const user = (req as any).user;
      const userRoles: string[] = user?.roles || [];
      if (!userRoles.includes('kpa:admin')) {
        res.status(403).json({ success: false, error: 'KPA admin role required' });
        return;
      }

      const weights = forumRecommendationService.getWeights();

      res.json({
        success: true,
        data: {
          weights,
        },
      });
    } catch (error) {
      console.error('Error getting config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
      });
    }
  }

  /**
   * PUT /api/v1/forum/recommendations/config
   * Update recommendation configuration (admin only)
   */
  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      // WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Policy config → Admin only
      const user = (req as any).user;
      const userRoles: string[] = user?.roles || [];
      if (!userRoles.includes('kpa:admin')) {
        res.status(403).json({ success: false, error: 'KPA admin role required' });
        return;
      }

      const { weights } = req.body;

      if (weights) {
        forumRecommendationService.setWeights(weights);
      }

      res.json({
        success: true,
        data: {
          weights: forumRecommendationService.getWeights(),
        },
        message: 'Configuration updated successfully',
      });
    } catch (error) {
      console.error('Error updating config:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  /**
   * Extract user context from request
   */
  private extractUserContext(req: Request): UserContext {
    const user = (req as any).user;

    // Build user context from authenticated user and query params
    const context: UserContext = {
      userId: user?.id,
      role: user?.role,
      organizationId: user?.organizationId || (req.query.organizationId as string),
    };

    // Recently viewed posts from query or session
    if (req.query.recentlyViewed) {
      context.recentlyViewedPosts = (req.query.recentlyViewed as string).split(',');
    }

    // Preferred tags from query or user profile
    if (req.query.preferredTags) {
      context.preferredTags = (req.query.preferredTags as string).split(',');
    }

    // Cosmetics-specific context
    if (req.query.skinType) {
      context.skinType = req.query.skinType as string;
    }
    if (req.query.concerns) {
      context.concerns = (req.query.concerns as string).split(',');
    }

    // Yaksa-specific context
    if (req.query.isPharmacist === 'true' || user?.role === 'pharmacist') {
      context.isPharmacist = true;
    }

    // Recent searches
    if (req.query.recentSearches) {
      context.recentSearches = (req.query.recentSearches as string).split(',');
    }

    return context;
  }

  /**
   * Extract recommendation options from query params
   */
  private extractOptions(req: Request): RecommendationOptions {
    return {
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
      scope: (req.query.scope as RecommendationOptions['scope']) || 'personal',
      categoryId: req.query.categoryId as string,
      excludeViewed: req.query.excludeViewed !== 'false',
      includeBreakdown: req.query.includeBreakdown === 'true',
    };
  }
}

// Singleton export
export const forumRecommendationController = new ForumRecommendationController();
export default ForumRecommendationController;
