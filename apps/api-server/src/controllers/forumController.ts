import { Request, Response } from 'express';
import { forumService, ForumSearchOptions } from '../services/forumService';
import { AuthRequest } from '../types/auth';
import { PostType, PostStatus } from '../entities/ForumPost';

export class ForumController {
  // Category endpoints
  getCategories = async (req: Request, res: Response) => {
    try {
      const { includeInactive = false } = req.query;
      
      const categories = await forumService.getCategories(includeInactive === 'true');
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching forum categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum categories'
      });
    }
  };

  getCategoryBySlug = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      
      const category = await forumService.getCategoryBySlug(slug);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error fetching category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch category'
      });
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const userRole = (req as AuthRequest).user?.role;

      if (!userId || !['admin', 'manager'].includes(userRole || '')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const categoryData = req.body;
      const category = await forumService.createCategory(categoryData, userId);
      
      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error creating category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create category'
      });
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const userRole = (req as AuthRequest).user?.role;
      const { categoryId } = req.params;

      if (!userId || !['admin', 'manager'].includes(userRole || '')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      const updateData = req.body;
      const category = await forumService.updateCategory(categoryId, updateData);
      
      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found'
        });
      }
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update category'
      });
    }
  };

  // Post endpoints
  getPosts = async (req: Request, res: Response) => {
    try {
      const userRole = (req as AuthRequest).user?.role || 'customer';
      
      const searchOptions: ForumSearchOptions = {
        query: req.query.q as string,
        categoryId: req.query.categoryId as string,
        authorId: req.query.authorId as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        type: req.query.type as PostType,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as 'latest' | 'popular' | 'trending' | 'oldest') || 'latest'
      };

      if (req.query.startDate || req.query.endDate) {
        searchOptions.dateRange = {
          start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          end: req.query.endDate ? new Date(req.query.endDate as string) : undefined
        };
      }

      const result = await forumService.searchPosts(searchOptions, userRole);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch posts'
      });
    }
  };

  getPostById = async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const userId = (req as AuthRequest).user?.id;
      
      const post = await forumService.getPost(postId, userId);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      // 접근 권한 확인
      if (!post.canUserView((req as AuthRequest).user?.role || '')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch post'
      });
    }
  };

  getPostBySlug = async (req: Request, res: Response) => {
    try {
      const { slug } = req.params;
      const userId = (req as AuthRequest).user?.id;
      
      const post = await forumService.getPostBySlug(slug, userId);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      // 접근 권한 확인
      if (!post.canUserView((req as AuthRequest).user?.role || '')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error fetching post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch post'
      });
    }
  };

  createPost = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const userRole = (req as AuthRequest).user?.role;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const postData = req.body;
      
      // 카테고리 접근 권한 확인은 서비스에서 처리
      const post = await forumService.createPost(postData, userId);
      
      res.status(201).json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error creating post:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to create post'
      });
    }
  };

  updatePost = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;
      const userRole = (req as AuthRequest).user?.role || '';
      const { postId } = req.params;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const updateData = req.body;
      const post = await forumService.updatePost(postId, updateData, userId, userRole);
      
      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }
      
      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      console.error('Error updating post:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to update post'
      });
    }
  };

  // Comment endpoints
  getComments = async (req: Request, res: Response) => {
    try {
      const { postId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await forumService.getComments(postId, page, limit);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch comments'
      });
    }
  };

  createComment = async (req: Request, res: Response) => {
    try {
      const userId = (req as AuthRequest).user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const commentData = req.body;
      const comment = await forumService.createComment(commentData, userId);
      
      res.status(201).json({
        success: true,
        data: comment
      });
    } catch (error) {
      console.error('Error creating comment:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: (error as Error).message || 'Failed to create comment'
      });
    }
  };

  // Statistics endpoint
  getStatistics = async (req: Request, res: Response) => {
    try {
      const userRole = (req as AuthRequest).user?.role;

      // 통계는 로그인된 사용자만 조회 가능
      if (!userRole) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const statistics = await forumService.getForumStatistics();
      
      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      console.error('Error fetching forum statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum statistics'
      });
    }
  };

  // Search endpoint
  searchPosts = async (req: Request, res: Response) => {
    try {
      const userRole = (req as AuthRequest).user?.role || 'customer';
      
      const searchOptions: ForumSearchOptions = {
        query: req.query.q as string,
        categoryId: req.query.categoryId as string,
        authorId: req.query.authorId as string,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        type: req.query.type as PostType,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: (req.query.sortBy as 'latest' | 'popular' | 'trending' | 'oldest') || 'latest'
      };

      if (req.query.startDate || req.query.endDate) {
        searchOptions.dateRange = {
          start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          end: req.query.endDate ? new Date(req.query.endDate as string) : undefined
        };
      }

      const result = await forumService.searchPosts(searchOptions, userRole);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error searching posts:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'Failed to search posts'
      });
    }
  };

  // Trending posts endpoint
  getTrendingPosts = async (req: Request, res: Response) => {
    try {
      const userRole = (req as AuthRequest).user?.role || 'customer';
      
      const searchOptions: ForumSearchOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: 'trending',
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 최근 1주일
        }
      };

      const result = await forumService.searchPosts(searchOptions, userRole);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching trending posts:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trending posts'
      });
    }
  };

  // Popular posts endpoint
  getPopularPosts = async (req: Request, res: Response) => {
    try {
      const userRole = (req as AuthRequest).user?.role || 'customer';
      
      const searchOptions: ForumSearchOptions = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: 'popular'
      };

      const result = await forumService.searchPosts(searchOptions, userRole);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error fetching popular posts:', (error as Error).message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch popular posts'
      });
    }
  };
}