import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection.js';
import { NetureForumService } from '@o4o-apps/forum-neture';
import { ForumPost } from '@o4o-apps/forum';

export class NetureForumController {
  private netureForumService: NetureForumService;

  constructor() {
    const forumPostRepository = AppDataSource.getRepository(ForumPost);
    this.netureForumService = new NetureForumService(forumPostRepository);
  }

  /**
   * GET /neture/forum/posts
   * List posts with filtering
   */
  async listPosts(req: Request, res: Response): Promise<void> {
    try {
      const { category, skinType, productId, page, limit } = req.query;

      // Parse concerns from query (can be array or single value)
      let concerns: string[] | undefined;
      if (req.query.concerns) {
        concerns = Array.isArray(req.query.concerns)
          ? req.query.concerns as string[]
          : [req.query.concerns as string];
      }

      const posts = await this.netureForumService.listPosts({
        category: category as string,
        skinType: skinType as string,
        concerns,
        productId: productId as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: posts,
        count: posts.length,
      });
    } catch (error: any) {
      console.error('Error listing posts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list posts',
      });
    }
  }

  /**
   * GET /neture/forum/posts/:id
   * Get a single post
   */
  async getPost(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const post = await this.netureForumService.getPost(id);

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
      console.error('Error getting post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get post',
      });
    }
  }

  /**
   * POST /neture/forum/posts
   * Create a new post
   */
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { title, content, categoryId, netureMeta, type, tags } = req.body;

      if (!title || !content || !categoryId) {
        res.status(400).json({
          success: false,
          error: 'Title, content, and categoryId are required',
        });
        return;
      }

      const post = await this.netureForumService.createPost({
        title,
        content,
        categoryId,
        authorId: userId,
        netureMeta,
        type,
        tags,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully',
      });
    } catch (error: any) {
      console.error('Error creating post:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create post',
      });
    }
  }

  /**
   * PUT /neture/forum/posts/:id
   * Update a post
   */
  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { title, content, categoryId, netureMeta, type, tags } = req.body;

      const post = await this.netureForumService.updatePost(id, {
        title,
        content,
        categoryId,
        netureMeta,
        type,
        tags,
      });

      res.json({
        success: true,
        data: post,
        message: 'Post updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating post:', error);

      if (error.message === 'Post not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update post',
      });
    }
  }

  /**
   * DELETE /neture/forum/posts/:id
   * Delete a post (soft delete)
   */
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      await this.netureForumService.deletePost(id);

      res.json({
        success: true,
        message: 'Post deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);

      if (error.message === 'Post not found') {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete post',
      });
    }
  }

  /**
   * GET /neture/forum/products/:productId/posts
   * Get posts for a specific product
   */
  async listProductPosts(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const posts = await this.netureForumService.listProductPosts(productId, {
        limit,
        offset,
      });

      res.json({
        success: true,
        data: posts,
        count: posts.length,
        pagination: {
          limit,
          offset,
          hasMore: posts.length === limit,
        },
      });
    } catch (error: any) {
      console.error('Error listing product posts:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to list product posts',
      });
    }
  }

  /**
   * GET /neture/forum/stats
   * Get forum statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.netureForumService.getStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  }
}
