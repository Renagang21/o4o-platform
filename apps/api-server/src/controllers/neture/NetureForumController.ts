import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { CosmeticsForumService } from '@o4o-apps/forum-cosmetics';
import { ForumPost } from '@o4o-apps/forum';

export class NetureForumController {
  private forumService: CosmeticsForumService;

  constructor() {
    const forumPostRepository = AppDataSource.getRepository(ForumPost);
    this.forumService = new CosmeticsForumService(forumPostRepository);
  }

  /**
   * GET /neture/forum/health
   * Health check endpoint
   */
  async health(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      service: 'neture-forum',
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * GET /neture/forum/posts
   * List posts with Neture-specific filtering
   */
  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const filter = {
        category: req.query.category as string,
        skinType: req.query.skinType as string,
        concerns: req.query.concerns ? (req.query.concerns as string).split(',') : undefined,
        productId: req.query.productId as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const posts = await this.forumService.listPosts(filter);

      res.json({
        success: true,
        data: posts,
        count: posts.length,
        pagination: {
          page: filter.page,
          limit: filter.limit,
        },
      });
    } catch (error: any) {
      console.error('Error listing Neture forum posts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list posts',
      });
    }
  }

  /**
   * GET /neture/forum/posts/:id
   * Get post details
   */
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const post = await this.forumService.getPost(id);

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found',
        });
        return;
      }

      res.json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      console.error('Error getting Neture forum post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get post',
      });
    }
  }

  /**
   * POST /neture/forum/posts
   * Create new post with Neture metadata
   */
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const postData = {
        ...req.body,
        authorId: userId,
      };

      const post = await this.forumService.createPost(postData);

      res.status(201).json({
        success: true,
        data: post,
      });
    } catch (error: any) {
      console.error('Error creating Neture forum post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create post',
      });
    }
  }

  /**
   * GET /neture/forum/posts/product/:productId
   * Get posts related to a specific product
   */
  async getProductPosts(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;

      const posts = await this.forumService.listProductPosts(productId, { limit });

      res.json({
        success: true,
        data: posts,
        count: posts.length,
      });
    } catch (error: any) {
      console.error('Error getting product posts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get product posts',
      });
    }
  }
}
