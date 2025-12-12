import { Request, Response } from 'express';
import {
  CosmeticsForumService,
  CosmeticsForumQueryOptions,
  CreateCosmeticsMetaDto,
  UpdateCosmeticsMetaDto,
} from '../services/CosmeticsForumService.js';
import { CosmeticsSkinType, CosmeticsConcern, CosmeticsPostType } from '../entities/CosmeticsForumMeta.js';

/**
 * CosmeticsForumController
 *
 * Handles HTTP requests for cosmetics forum operations.
 */
export class CosmeticsForumController {
  private service: CosmeticsForumService;

  constructor(service: CosmeticsForumService) {
    this.service = service;
  }

  /**
   * GET /api/v1/cosmetics/forum/posts
   * List cosmetics forum posts with optional filters
   */
  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const {
        skinType,
        concerns,
        brand,
        productId,
        postType,
        minRating,
        ingredients,
        isFeatured,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = req.query;

      const options: CosmeticsForumQueryOptions = {
        skinType: skinType as CosmeticsSkinType | undefined,
        concerns: concerns ? (concerns as string).split(',') as CosmeticsConcern[] : undefined,
        brand: brand as string | undefined,
        productId: productId as string | undefined,
        postType: postType as CosmeticsPostType | undefined,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        ingredients: ingredients ? (ingredients as string).split(',') : undefined,
        isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
        limit: parseInt(limit as string, 10),
        offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
        sortBy: sortBy as 'createdAt' | 'rating' | 'viewCount',
        sortOrder: sortOrder as 'ASC' | 'DESC',
      };

      const result = await this.service.listPosts(options);

      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error listing posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/posts/:id
   * Get a single post with cosmetics metadata
   */
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const meta = await this.service.getMetaByPostId(id);

      if (!meta) {
        res.status(404).json({
          success: false,
          error: 'Post not found or has no cosmetics metadata',
        });
        return;
      }

      res.json({
        success: true,
        data: meta,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get post',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/forum/posts/:id/meta
   * Create cosmetics metadata for a post
   */
  async createMeta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: CreateCosmeticsMetaDto = {
        ...req.body,
        postId: id,
      };

      // Check if meta already exists
      const existing = await this.service.getMetaByPostId(id);
      if (existing) {
        res.status(409).json({
          success: false,
          error: 'Cosmetics metadata already exists for this post',
        });
        return;
      }

      const meta = await this.service.createMeta(data);

      res.status(201).json({
        success: true,
        data: meta,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error creating meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create cosmetics metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * PUT /api/v1/cosmetics/forum/posts/:id/meta
   * Update cosmetics metadata for a post
   */
  async updateMeta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateCosmeticsMetaDto = req.body;

      const meta = await this.service.updateMeta(id, data);

      if (!meta) {
        res.status(404).json({
          success: false,
          error: 'Cosmetics metadata not found for this post',
        });
        return;
      }

      res.json({
        success: true,
        data: meta,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error updating meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update cosmetics metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics/forum/posts/:id/meta
   * Delete cosmetics metadata for a post
   */
  async deleteMeta(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const success = await this.service.deleteMeta(id);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Cosmetics metadata not found for this post',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Cosmetics metadata deleted successfully',
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error deleting meta:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete cosmetics metadata',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/categories
   * Get default cosmetics categories
   */
  async getCategories(_req: Request, res: Response): Promise<void> {
    try {
      // Return default cosmetics categories
      const categories = [
        { name: '제품 리뷰', slug: 'product-reviews', color: '#EC4899' },
        { name: '스킨케어 루틴', slug: 'skincare-routine', color: '#F472B6' },
        { name: '성분 분석', slug: 'ingredient-analysis', color: '#F9A8D4' },
        { name: '피부 고민 상담', slug: 'skin-concerns', color: '#FBCFE8' },
        { name: '브랜드 추천', slug: 'brand-recommendations', color: '#FDF2F8' },
      ];

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/skin-types
   * Get available skin types
   */
  async getSkinTypes(_req: Request, res: Response): Promise<void> {
    try {
      const skinTypes = [
        { value: CosmeticsSkinType.DRY, label: '건성' },
        { value: CosmeticsSkinType.OILY, label: '지성' },
        { value: CosmeticsSkinType.COMBINATION, label: '복합성' },
        { value: CosmeticsSkinType.SENSITIVE, label: '민감성' },
        { value: CosmeticsSkinType.NORMAL, label: '중성' },
      ];

      res.json({
        success: true,
        data: skinTypes,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting skin types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get skin types',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/concerns
   * Get available skin concerns
   */
  async getConcerns(_req: Request, res: Response): Promise<void> {
    try {
      const concerns = [
        { value: CosmeticsConcern.PORES, label: '모공' },
        { value: CosmeticsConcern.WHITENING, label: '미백' },
        { value: CosmeticsConcern.WRINKLES, label: '주름' },
        { value: CosmeticsConcern.ELASTICITY, label: '탄력' },
        { value: CosmeticsConcern.ACNE, label: '여드름' },
        { value: CosmeticsConcern.REDNESS, label: '홍조' },
        { value: CosmeticsConcern.DEAD_SKIN, label: '각질' },
        { value: CosmeticsConcern.SPOTS, label: '잡티' },
        { value: CosmeticsConcern.DARK_CIRCLES, label: '다크서클' },
      ];

      res.json({
        success: true,
        data: concerns,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting concerns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get concerns',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/featured
   * Get featured cosmetics posts
   */
  async getFeaturedPosts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '5' } = req.query;
      const posts = await this.service.getFeaturedPosts(parseInt(limit as string, 10));

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting featured posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get featured posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/top-rated
   * Get top-rated cosmetics posts
   */
  async getTopRatedPosts(req: Request, res: Response): Promise<void> {
    try {
      const { limit = '10', minRating = '4' } = req.query;
      const posts = await this.service.getTopRatedPosts({
        limit: parseInt(limit as string, 10),
        minRating: parseFloat(minRating as string),
      });

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting top-rated posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get top-rated posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/statistics
   * Get cosmetics forum statistics
   */
  async getStatistics(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.service.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/search
   * Search cosmetics posts
   */
  async searchPosts(req: Request, res: Response): Promise<void> {
    try {
      const { q, page = '1', limit = '20' } = req.query;

      if (!q || (q as string).trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const posts = await this.service.searchPosts(q as string, {
        limit: parseInt(limit as string, 10),
        offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      });

      res.json({
        success: true,
        data: posts,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error searching posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/v1/cosmetics/forum/posts/:id/feature
   * Feature a post
   */
  async featurePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const meta = await this.service.featurePost(id);

      if (!meta) {
        res.status(404).json({
          success: false,
          error: 'Cosmetics metadata not found for this post',
        });
        return;
      }

      res.json({
        success: true,
        data: meta,
        message: 'Post featured successfully',
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error featuring post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to feature post',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/v1/cosmetics/forum/posts/:id/feature
   * Unfeature a post
   */
  async unfeaturePost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const meta = await this.service.unfeaturePost(id);

      if (!meta) {
        res.status(404).json({
          success: false,
          error: 'Cosmetics metadata not found for this post',
        });
        return;
      }

      res.json({
        success: true,
        data: meta,
        message: 'Post unfeatured successfully',
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error unfeaturing post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unfeature post',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ============================================
  // Phase 14-2: Product Integration Endpoints
  // ============================================

  /**
   * GET /api/v1/cosmetics/forum/product/:productId/posts
   * Get forum posts for a specific product
   */
  async getProductPosts(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { page = '1', limit = '20' } = req.query;

      const result = await this.service.getPostsByProduct(productId, {
        limit: parseInt(limit as string, 10),
        offset: (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10),
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting product posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product posts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/product/:productId/summary
   * Get forum summary for a specific product (rating, reviews, etc.)
   */
  async getProductSummary(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      const summary = await this.service.getForumStatsForProduct(productId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting product summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/product/:productId/rating
   * Get aggregated rating for a specific product
   */
  async getProductRating(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;

      const rating = await this.service.getAggregatedRatingByProduct(productId);

      res.json({
        success: true,
        data: rating,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting product rating:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get product rating',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/v1/cosmetics/forum/brand/:brand/stats
   * Get forum stats for a specific brand
   */
  async getBrandStats(req: Request, res: Response): Promise<void> {
    try {
      const { brand } = req.params;

      const stats = await this.service.getProductBrandStats(brand);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('[CosmeticsForumController] Error getting brand stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get brand stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
