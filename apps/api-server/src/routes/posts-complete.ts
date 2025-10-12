import { Router, Request, Response } from 'express';
import AppDataSource from '../database/data-source';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { Category } from '../entities/Category';
import { authenticate } from '../middleware/auth.middleware';
import { In, Like, IsNull, Not } from 'typeorm';
import { validateDto } from '../middleware/validateDto';
import { body, query, param } from 'express-validator';

const router: Router = Router();

// Helper function to safely get repositories
const getRepositories = () => {
  try {
    if (!AppDataSource.isInitialized) {
      return null;
    }
    return {
      postRepository: AppDataSource.getRepository(Post),
      userRepository: AppDataSource.getRepository(User),
      categoryRepository: AppDataSource.getRepository(Category)
    };
  } catch (error) {
    // Error log removed
    return null;
  }
};

// Mock data for when database is not available
// Mock data removed - database should be used instead
const mockPosts: any[] = [];

// Helper to extract content from Gutenberg format
const extractContent = (content: any): string => {
  if (typeof content === 'string') {
    return content;
  }
  if (content && typeof content === 'object') {
    // Handle Gutenberg format: { raw: "...", rendered: "..." }
    return content.raw || content.rendered || '';
  }
  return '';
};

// Helper to extract title from Gutenberg format
const extractTitle = (title: any): string => {
  if (typeof title === 'string') {
    return title;
  }
  if (title && typeof title === 'object') {
    // Handle Gutenberg format: { raw: "...", rendered: "..." }
    return title.raw || title.rendered || '';
  }
  return '';
};

// WordPress-compatible query parameters interface
interface PostQueryParams {
  page?: number;
  per_page?: number;
  search?: string;
  author?: string;
  author_exclude?: string;
  before?: string;
  after?: string;
  exclude?: string;
  include?: string;
  offset?: number;
  order?: 'asc' | 'desc';
  orderby?: 'author' | 'date' | 'id' | 'include' | 'modified' | 'parent' | 'relevance' | 'slug' | 'title';
  slug?: string;
  status?: string;
  categories?: string;
  categories_exclude?: string;
  tags?: string;
  tags_exclude?: string;
  sticky?: boolean;
  format?: string;
}

// GET /api/posts - List posts
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('per_page').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['draft', 'publish', 'private', 'archived', 'scheduled']),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        per_page = 10,
        search,
        author,
        exclude,
        include,
        order = 'desc',
        orderby = 'date',
        status = 'publish',
        categories,
        tags,
        sticky,
        format,
        type = 'post',
        post_type
      } = req.query as PostQueryParams & { type?: string; post_type?: string };

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        // Return mock data when database is not available
        const postType = post_type || type || 'post';
        let filteredPosts = mockPosts.filter(p => p.type === postType);
        
        if (status && status !== 'all') {
          filteredPosts = filteredPosts.filter(p => p.status === status);
        }
        
        if (search) {
          const searchLower = search.toString().toLowerCase();
          filteredPosts = filteredPosts.filter(p => 
            p.title.toLowerCase().includes(searchLower) ||
            p.content.toLowerCase().includes(searchLower)
          );
        }

        const startIndex = ((page as number) - 1) * (per_page as number);
        const endIndex = startIndex + (per_page as number);
        const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

        return res.json({
          data: paginatedPosts,
          total: filteredPosts.length,
          page: page as number,
          per_page: per_page as number,
          total_pages: Math.ceil(filteredPosts.length / (per_page as number))
        });
      }

      const { postRepository } = repos;
      const queryBuilder = postRepository.createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.lastModifier', 'lastModifier');

      // Status filter
      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      }

      // Ordering
      let orderByField = 'post.created_at';
      switch (orderby) {
        case 'date':
          orderByField = 'post.published_at';
          break;
        case 'modified':
          orderByField = 'post.updated_at';
          break;
        case 'title':
          orderByField = 'post.title';
          break;
        case 'id':
          orderByField = 'post.id';
          break;
      }
      queryBuilder.orderBy(orderByField, order.toUpperCase() as 'ASC' | 'DESC');

      // Pagination
      const skip = ((page as number) - 1) * (per_page as number);
      queryBuilder.skip(skip).take(per_page as number);

      const [posts, total] = await queryBuilder.getManyAndCount();

      // Format response to be WordPress-compatible
      const formattedPosts = posts.map(post => ({
        id: post.id,
        date: post.published_at,
        date_gmt: post.published_at,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updated_at,
        modified_gmt: post.updated_at,
        slug: post.slug,
        status: post.status,
        type: 'post',
        link: `/posts/${post.slug}`,
        title: { rendered: post.title },
        content: { 
          rendered: post.content,
          protected: false 
        },
        excerpt: { 
          rendered: post.excerpt || '',
          protected: false 
        },
        author: post.author?.id,
        categories: post.categories?.map(c => c.id) || [],
        tags: post.tags || [],
        sticky: post.sticky || false,
        format: post.meta?.format || 'standard',
        meta: post.meta || {}
      }));

      res.json(formattedPosts);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        error: 'Failed to fetch posts',
        message: error.message 
      });
    }
  }
);

// GET /api/posts/:id - Get single post
router.get('/:id',
  param('id').notEmpty(),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const mockPost = mockPosts.find(p => p.id === id);
        if (!mockPost) {
          return res.status(404).json({ error: 'Post not found' });
        }
        return res.json(mockPost);
      }

      const { postRepository } = repos;
      const post = await postRepository.findOne({
        where: { id },
        relations: ['author', 'categories', 'lastModifier']
      });

      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      // Format response to be WordPress-compatible
      const formattedPost = {
        id: post.id,
        date: post.published_at,
        date_gmt: post.published_at,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updated_at,
        modified_gmt: post.updated_at,
        slug: post.slug,
        status: post.status,
        type: 'post',
        link: `/posts/${post.slug}`,
        title: { rendered: post.title },
        content: { 
          rendered: post.content,
          protected: false 
        },
        excerpt: { 
          rendered: post.excerpt || '',
          protected: false 
        },
        author: post.author?.id,
        categories: post.categories?.map(c => c.id) || [],
        tags: post.tags || [],
        sticky: post.sticky || false,
        format: post.meta?.format || 'standard',
        meta: post.meta || {}
      };

      res.json(formattedPost);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        error: 'Failed to fetch post',
        message: error.message 
      });
    }
  }
);

// POST /api/posts - Create post (Gutenberg compatible)
router.post('/',
  authenticate,
  // Make title and content optional for auto-save support
  body('title').optional(),
  body('content').optional(),
  body('status').optional().isIn(['draft', 'publish', 'publish', 'private', 'archived', 'scheduled', 'auto-draft']),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      
      // Extract title and content from Gutenberg format
      const title = extractTitle(req.body.title) || 'Untitled';
      const content = extractContent(req.body.content) || '';
      
      // Map 'publish' to 'publish' for compatibility
      let status = req.body.status || 'draft';
      if (status === 'publish') {
        status = 'publish';
      }
      if (status === 'auto-draft') {
        status = 'draft';
      }
      
      const { 
        categories: categoryIds, 
        tags, 
        excerpt, 
        slug, 
        format, 
        sticky, 
        meta,
        featured_media,
        comment_status,
        ping_status
      } = req.body;

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const newPost = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          date_gmt: new Date().toISOString(),
          guid: { rendered: `/posts/${Date.now()}` },
          modified: new Date().toISOString(),
          modified_gmt: new Date().toISOString(),
          slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
          status,
          type: req.body.type || 'post',
          link: `/posts/${slug || Date.now()}`,
          title: { 
            raw: title,
            rendered: title 
          },
          content: { 
            raw: content,
            rendered: content,
            protected: false 
          },
          excerpt: { 
            raw: excerpt || '',
            rendered: excerpt || '',
            protected: false 
          },
          author: userId || '1',
          featured_media: featured_media || 0,
          comment_status: comment_status || 'open',
          ping_status: ping_status || 'open',
          sticky: sticky || false,
          template: '',
          format: format || 'standard',
          meta: meta || {},
          categories: categoryIds || [],
          tags: tags || []
        };
        
        mockPosts.push(newPost);
        return res.status(201).json(newPost);
      }

      const { postRepository, categoryRepository } = repos;
      
      let categories = [];
      if (categoryIds && categoryIds.length > 0) {
        categories = await categoryRepository.findBy({ 
          id: In(categoryIds) 
        });
      }

      const post = await postRepository.save({
        title,
        content: content || '',
        status,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        excerpt: extractContent(excerpt),
        tags: tags || [],
        authorId: userId,
        categories,
        published_at: status === 'publish' ? new Date() : null
      });

      // Format response for Gutenberg
      const response = {
        id: post.id,
        date: post.published_at || post.created_at,
        date_gmt: post.published_at || post.created_at,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updated_at,
        modified_gmt: post.updated_at,
        slug: post.slug,
        status: post.status,
        type: 'post',
        link: `/posts/${post.slug}`,
        title: { 
          raw: post.title,
          rendered: post.title 
        },
        content: { 
          raw: post.content,
          rendered: post.content,
          protected: false 
        },
        excerpt: { 
          raw: post.excerpt || '',
          rendered: post.excerpt || '',
          protected: false 
        },
        author: userId,
        featured_media: 0,
        comment_status: 'open',
        ping_status: 'open',
        sticky: post.sticky || false,
        template: '',
        format: post.meta?.format || 'standard',
        meta: post.meta || {},
        categories: post.categories?.map(c => c.id) || [],
        tags: post.tags || []
      };

      res.status(201).json(response);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        code: 'rest_cannot_create',
        message: 'Failed to create post',
        data: { status: 500 }
      });
    }
  }
);

// PUT /api/posts/:id - Update post (Gutenberg compatible)
router.put('/:id',
  authenticate,
  param('id').notEmpty(),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      // Extract title and content from Gutenberg format
      const title = extractTitle(req.body.title);
      const content = extractContent(req.body.content);
      
      // Map 'publish' to 'publish' for compatibility
      let status = req.body.status;
      if (status === 'publish') {
        status = 'publish';
      }
      
      const { 
        categories: categoryIds, 
        tags, 
        excerpt, 
        slug, 
        format, 
        sticky, 
        meta,
        featured_media,
        comment_status,
        ping_status
      } = req.body;

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const postIndex = mockPosts.findIndex(p => p.id === id);
        if (postIndex === -1) {
          return res.status(404).json({ 
            code: 'rest_post_invalid_id',
            message: 'Invalid post ID',
            data: { status: 404 }
          });
        }
        
        const updatedPost = {
          ...mockPosts[postIndex],
          title: { raw: title || mockPosts[postIndex].title, rendered: title || mockPosts[postIndex].title },
          content: { raw: content || mockPosts[postIndex].content, rendered: content || mockPosts[postIndex].content, protected: false },
          status: status || mockPosts[postIndex].status,
          modified: new Date().toISOString(),
          modified_gmt: new Date().toISOString()
        };
        
        mockPosts[postIndex] = updatedPost;
        return res.json(updatedPost);
      }

      const { postRepository, categoryRepository } = repos;
      const existingPost = await postRepository.findOne({
        where: { id },
        relations: ['categories']
      });

      if (!existingPost) {
        return res.status(404).json({ 
          code: 'rest_post_invalid_id',
          message: 'Invalid post ID',
          data: { status: 404 }
        });
      }

      let categories = existingPost.categories;
      if (categoryIds && categoryIds.length > 0) {
        categories = await categoryRepository.findBy({ 
          id: In(categoryIds) 
        });
      }

      const updatedPost = await postRepository.save({
        ...existingPost,
        title: title || existingPost.title,
        content: content || existingPost.content,
        status: status || existingPost.status,
        slug: slug || existingPost.slug,
        excerpt: excerpt !== undefined ? extractContent(excerpt) : existingPost.excerpt,
        tags: tags || existingPost.tags,
        categories,
        lastModifierId: userId,
        published_at: status === 'publish' && !existingPost.published_at ? new Date() : existingPost.published_at
      });

      // Format response for Gutenberg
      const response = {
        id: updatedPost.id,
        date: updatedPost.published_at || updatedPost.created_at,
        date_gmt: updatedPost.published_at || updatedPost.created_at,
        guid: { rendered: `/posts/${updatedPost.id}` },
        modified: updatedPost.updated_at,
        modified_gmt: updatedPost.updated_at,
        slug: updatedPost.slug,
        status: updatedPost.status,
        type: 'post',
        link: `/posts/${updatedPost.slug}`,
        title: { 
          raw: updatedPost.title,
          rendered: updatedPost.title 
        },
        content: { 
          raw: updatedPost.content,
          rendered: updatedPost.content,
          protected: false 
        },
        excerpt: { 
          raw: updatedPost.excerpt || '',
          rendered: updatedPost.excerpt || '',
          protected: false 
        },
        author: userId,
        featured_media: featured_media || 0,
        comment_status: comment_status || 'open',
        ping_status: ping_status || 'open',
        sticky: updatedPost.meta?.sticky || false,
        template: '',
        format: updatedPost.meta?.format || 'standard',
        meta: updatedPost.meta || {},
        categories: updatedPost.categories?.map(c => c.id) || [],
        tags: updatedPost.tags || []
      };

      res.json(response);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        code: 'rest_cannot_update',
        message: 'Failed to update post',
        data: { status: 500 }
      });
    }
  }
);

// DELETE /api/posts/:id - Delete post
router.delete('/:id',
  authenticate,
  param('id').notEmpty(),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const postIndex = mockPosts.findIndex(p => p.id === id);
        if (postIndex === -1) {
          return res.status(404).json({ error: 'Post not found' });
        }
        const deletedPost = mockPosts.splice(postIndex, 1)[0];
        return res.json({ message: 'Post deleted successfully', post: deletedPost });
      }

      const { postRepository } = repos;
      const result = await postRepository.delete(id);

      if (result.affected === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }

      res.json({ message: 'Post deleted successfully' });
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        error: 'Failed to delete post',
        message: error.message 
      });
    }
  }
);

export default router;