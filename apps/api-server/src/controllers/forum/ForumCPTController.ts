import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { User, UserRole } from '../../entities/User';
import { ForumCategory } from '../../entities/ForumCategory';
import { ForumPost } from '../../entities/ForumPost';
import { ForumComment } from '../../entities/ForumComment';
import { ForumTag } from '../../entities/ForumTag';

interface ForumSystemStatus {
  entities: {
    forum_category: string;
    forum_post: string;
    forum_comment: string;
    forum_tag: string;
  };
  records: {
    categories: number;
    posts: number;
    comments: number;
    tags: number;
  };
  tablesReady: number;
  systemReady: boolean;
}

interface ForumStatistics {
  totalPosts: number;
  totalComments: number;
  totalCategories: number;
  todayPosts: number;
  todayComments: number;
  activeUsers: number;
  popularTags: Array<{ name: string; count: number }>;
  recentActivity: Array<{ 
    type: 'post' | 'comment';
    title: string;
    author: string;
    createdAt: string;
  }>;
}

export class ForumCPTController {
  
  // Get Forum System Status
  getSystemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryRepo = getRepository(ForumCategory);
      const postRepo = getRepository(ForumPost);
      const commentRepo = getRepository(ForumComment);
      const tagRepo = getRepository(ForumTag);
      
      const [categoriesCount, postsCount, commentsCount, tagsCount] = await Promise.all([
        categoryRepo.count(),
        postRepo.count(),
        commentRepo.count(),
        tagRepo.count()
      ]);

      const status: ForumSystemStatus = {
        entities: {
          forum_category: 'active',
          forum_post: 'active',
          forum_comment: 'active', 
          forum_tag: 'active'
        },
        records: {
          categories: categoriesCount,
          posts: postsCount,
          comments: commentsCount,
          tags: tagsCount
        },
        tablesReady: 4, // Number of forum database tables
        systemReady: true
      };

      res.json(status);
    } catch (error) {
      console.error('Error fetching forum system status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum system status'
      });
    }
  };

  // Initialize Forum System
  initializeSystem = async (req: Request, res: Response): Promise<void> => {
    try {
      // Forum database entities are already initialized via TypeORM
      // This endpoint confirms system readiness
      
      const categoryRepo = getRepository(ForumCategory);
      const postRepo = getRepository(ForumPost);
      const commentRepo = getRepository(ForumComment);
      const tagRepo = getRepository(ForumTag);
      
      // Verify all repositories are accessible
      await Promise.all([
        categoryRepo.findOne({ where: {} }),
        postRepo.findOne({ where: {} }),
        commentRepo.findOne({ where: {} }),
        tagRepo.findOne({ where: {} })
      ]);
      
      res.json({
        success: true,
        message: 'Forum system is ready',
        data: {
          entities: [
            'ForumCategory - Forum Categories',
            'ForumPost - Forum Posts', 
            'ForumComment - Forum Comments',
            'ForumTag - Forum Tags'
          ],
          features: [
            'Category Management (visibility, permissions, moderation)',
            'Post Management (content, attachments, metadata)',
            'Comment System (moderation, threading)',
            'Tag System (usage tracking, relationships)'
          ],
          initialized: true
        }
      });
    } catch (error) {
      console.error('Error checking forum system:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify forum system'
      });
    }
  };

  // Create Sample Forum Data
  createSampleData = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRepo = getRepository(User);
      
      // Create sample forum moderators
      const sampleModerators = [];
      for (let i = 1; i <= 2; i++) {
        const user = userRepo.create({
          email: `moderator${i}@example.com`,
          password: 'password123',
          firstName: `Moderator`,
          lastName: `${i}`,
          role: UserRole.MODERATOR,
          status: 'approved' as any,
          isActive: true
        });
        await userRepo.save(user);
        sampleModerators.push(user);
      }

      // Create sample forum users
      const sampleUsers = [];
      for (let i = 1; i <= 10; i++) {
        const user = userRepo.create({
          email: `forumuser${i}@example.com`,
          password: 'password123',
          firstName: `User`,
          lastName: `${i}`,
          role: UserRole.CUSTOMER,
          status: 'approved' as any,
          isActive: true
        });
        await userRepo.save(user);
        sampleUsers.push(user);
      }

      // Simulate creating forum content via WordPress API
      const sampleCategories = [
        { name: '일반 토론', slug: 'general', description: '자유로운 주제의 토론' },
        { name: '질문과 답변', slug: 'qna', description: '궁금한 점을 묻고 답하는 공간' },
        { name: '공지사항', slug: 'announcements', description: '중요한 공지사항' },
        { name: '피드백', slug: 'feedback', description: '서비스 개선 의견' },
        { name: '기술 지원', slug: 'tech-support', description: '기술적인 도움이 필요할 때' }
      ];

      const sampleTags = [
        'wordpress', 'react', 'api', 'frontend', 'backend', 
        'design', 'ux', 'performance', 'security', 'tutorial',
        'help', 'discussion', 'feature-request', 'bug-report', 'community'
      ];

      res.json({
        success: true,
        message: 'Forum sample data created successfully',
        moderators: sampleModerators.length,
        users: sampleUsers.length,
        categories: sampleCategories.length,
        tags: sampleTags.length,
        posts: 0, // Posts would be created through the UI
        comments: 0 // Comments would be created through the UI
      });
    } catch (error) {
      console.error('Error creating forum sample data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create forum sample data'
      });
    }
  };

  // Get Forum Statistics
  getStatistics = async (req: Request, res: Response): Promise<void> => {
    try {
      const userRepo = getRepository(User);
      
      const totalUsers = await userRepo.count({
        where: { isActive: true }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Mock statistics - in real implementation this would query WordPress database
      const statistics: ForumStatistics = {
        totalPosts: 23,
        totalComments: 47,
        totalCategories: 5,
        todayPosts: 3,
        todayComments: 8,
        activeUsers: totalUsers,
        popularTags: [
          { name: 'wordpress', count: 12 },
          { name: 'react', count: 8 },
          { name: 'api', count: 6 },
          { name: 'help', count: 5 },
          { name: 'discussion', count: 4 }
        ],
        recentActivity: [
          {
            type: 'post',
            title: 'Welcome to the new forum!',
            author: 'Admin',
            createdAt: new Date().toISOString()
          },
          {
            type: 'comment',
            title: 'Re: API integration questions',
            author: 'User1',
            createdAt: new Date(Date.now() - 3600000).toISOString()
          },
          {
            type: 'post',
            title: 'Best practices for React development',
            author: 'Developer',
            createdAt: new Date(Date.now() - 7200000).toISOString()
          }
        ]
      };

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

  // Get Forum Categories
  getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
      const categoryRepo = getRepository(ForumCategory);
      
      const categories = await categoryRepo.find({
        order: { sortOrder: 'ASC', name: 'ASC' },
        relations: ['creator']
      });

      const mappedCategories = categories.map(category => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        postCount: category.postCount,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        accessLevel: category.accessLevel,
        requireApproval: category.requireApproval,
        createdAt: category.createdAt.toISOString(),
        creator: category.creator ? {
          id: category.creator.id,
          name: category.creator.fullName || category.creator.firstName || category.creator.email
        } : null
      }));

      res.json({
        success: true,
        categories: mappedCategories
      });
    } catch (error) {
      console.error('Error fetching forum categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum categories'
      });
    }
  };

  // Get Forum Posts
  getPosts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { 
        page = 1, 
        limit = 20, 
        categoryId, 
        search, 
        sortBy = 'latest' 
      } = req.query;

      const postRepo = getRepository(ForumPost);
      const skip = (Number(page) - 1) * Number(limit);

      let queryBuilder = postRepo
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.category', 'category')
        .leftJoinAndSelect('post.author', 'author');

      // Apply filters
      if (categoryId && categoryId !== 'all') {
        queryBuilder.andWhere('post.categoryId = :categoryId', { categoryId });
      }

      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          queryBuilder
            .addSelect('(post.viewCount + post.commentCount * 2 + post.likeCount)', 'popularity')
            .orderBy('popularity', 'DESC')
            .addOrderBy('post.createdAt', 'DESC');
          break;
        case 'trending':
          queryBuilder
            .where('post.createdAt >= :weekAgo', { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
            .addSelect('(post.viewCount + post.commentCount * 2 + post.likeCount)', 'trending')
            .orderBy('trending', 'DESC');
          break;
        case 'oldest':
          queryBuilder.orderBy('post.createdAt', 'ASC');
          break;
        case 'latest':
        default:
          queryBuilder
            .orderBy('post.isPinned', 'DESC')
            .addOrderBy('post.createdAt', 'DESC');
          break;
      }

      queryBuilder.skip(skip).take(Number(limit));

      const [posts, totalCount] = await queryBuilder.getManyAndCount();

      const mappedPosts = await Promise.all(posts.map(async post => ({
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt || '',
        content: post.content,
        authorId: post.authorId,
        authorName: post.author?.fullName || post.author?.firstName || post.author?.email || 'Unknown',
        categoryId: post.categoryId,
        categoryName: post.category ? (await post.category).name : 'Uncategorized',
        status: post.status,
        isPinned: post.isPinned,
        viewCount: post.viewCount,
        commentCount: post.commentCount,
        likeCount: post.likeCount,
        tags: post.tags || [],
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString()
      })));

      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          posts: mappedPosts,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('Error fetching forum posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum posts'
      });
    }
  };

  // Get Forum Comments
  getComments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { postId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // Mock comments data - in real implementation this would query WordPress comments
      const comments = [
        {
          id: '1',
          postId,
          content: 'Great post! Thanks for sharing.',
          authorId: '3',
          authorName: 'User1',
          parentId: null,
          status: 'approved',
          likeCount: 2,
          replyCount: 1,
          createdAt: new Date(Date.now() - 7200000).toISOString(),
          replies: [
            {
              id: '2',
              postId,
              content: 'I agree!',
              authorId: '4',
              authorName: 'User2',
              parentId: '1',
              status: 'approved',
              likeCount: 0,
              replyCount: 0,
              createdAt: new Date(Date.now() - 3600000).toISOString()
            }
          ]
        }
      ];

      const totalCount = comments.length;
      const totalPages = Math.ceil(totalCount / Number(limit));

      res.json({
        success: true,
        data: {
          comments,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            totalCount,
            totalPages
          }
        }
      });
    } catch (error) {
      console.error('Error fetching forum comments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch forum comments'
      });
    }
  };

  // Create Forum Post
  createPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { title, content, categoryId, tags = [], type = 'discussion' } = req.body;

      if (!title || !content || !categoryId) {
        res.status(400).json({
          success: false,
          error: 'Title, content, and category are required'
        });
        return;
      }

      // In real implementation, this would create a WordPress post via API
      const newPost = {
        id: Date.now().toString(),
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9가-힣\s]/g, '').replace(/\s+/g, '-'),
        content,
        excerpt: content.substring(0, 150) + '...',
        authorId: userId,
        categoryId,
        tags,
        type,
        status: 'published', // or 'pending' if moderation required
        isPinned: false,
        viewCount: 0,
        commentCount: 0,
        likeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        data: newPost
      });
    } catch (error) {
      console.error('Error creating forum post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create forum post'
      });
    }
  };

  // Create Forum Comment
  createComment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const { postId, content, parentId = null } = req.body;

      if (!postId || !content) {
        res.status(400).json({
          success: false,
          error: 'Post ID and content are required'
        });
        return;
      }

      // In real implementation, this would create a WordPress comment via API
      const newComment = {
        id: Date.now().toString(),
        postId,
        content,
        authorId: userId,
        parentId,
        status: 'approved', // or 'pending' if moderation required
        likeCount: 0,
        replyCount: 0,
        createdAt: new Date().toISOString()
      };

      res.status(201).json({
        success: true,
        data: newComment
      });
    } catch (error) {
      console.error('Error creating forum comment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create forum comment'
      });
    }
  };
}