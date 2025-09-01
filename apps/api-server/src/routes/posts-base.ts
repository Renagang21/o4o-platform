import { Router, Request, Response } from 'express';
import AppDataSource from '../database/data-source';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { Category } from '../entities/Category';
import { authenticateToken } from '../middleware/auth';
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
const mockPosts = [
  {
    id: '1',
    title: 'Welcome to Neture Platform',
    slug: 'welcome-to-neture',
    content: '<p>Welcome to the Neture O4O platform.</p>',
    excerpt: 'Welcome to the Neture O4O platform.',
    status: 'published',
    type: 'post',
    author: {
      id: '1',
      name: 'Admin',
      email: 'admin@neture.co.kr'
    },
    categories: [{ id: '1', name: '공지사항', slug: 'notice' }],
    tags: [],
    featuredImage: null,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Getting Started Guide',
    slug: 'getting-started',
    content: '<p>Learn how to use the platform effectively.</p>',
    excerpt: 'Learn how to use the platform effectively.',
    status: 'published',
    type: 'post',
    author: {
      id: '1',
      name: 'Admin',
      email: 'admin@neture.co.kr'
    },
    categories: [{ id: '2', name: '가이드', slug: 'guide' }],
    tags: [],
    featuredImage: null,
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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

// GET /api/posts - List posts (WordPress REST API compatible)
router.get('/', 
  query('page').optional().isInt({ min: 1 }),
  query('per_page').optional().isInt({ min: 1, max: 100 }),
  query('search').optional().isString(),
  query('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']),
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
        status = 'published',
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

      // Search
      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content::text ILIKE :search OR post.excerpt ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Author filter
      if (author) {
        const authorIds = author.split(',');
        queryBuilder.andWhere('post.authorId IN (:...authorIds)', { authorIds });
      }

      // Categories filter
      if (categories) {
        const categoryIds = categories.split(',');
        queryBuilder.andWhere('categories.id IN (:...categoryIds)', { categoryIds });
      }

      // Tags filter
      if (tags) {
        const tagList = tags.split(',');
        queryBuilder.andWhere('post.tags && :tags', { tags: tagList });
      }

      // Format filter
      if (format) {
        queryBuilder.andWhere('post.format = :format', { format });
      }

      // Sticky filter
      if (sticky !== undefined) {
        queryBuilder.andWhere('post.sticky = :sticky', { sticky });
      }

      // Include/Exclude specific posts
      if (include) {
        const includeIds = include.split(',');
        queryBuilder.andWhere('post.id IN (:...includeIds)', { includeIds });
      }

      if (exclude) {
        const excludeIds = exclude.split(',');
        queryBuilder.andWhere('post.id NOT IN (:...excludeIds)', { excludeIds });
      }

      // Ordering
      let orderByField = 'post.createdAt';
      switch (orderby) {
        case 'date':
          orderByField = 'post.publishedAt';
          break;
        case 'modified':
          orderByField = 'post.updatedAt';
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
        date: post.publishedAt,
        date_gmt: post.publishedAt,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updatedAt,
        modified_gmt: post.updatedAt,
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
        format: post.format || 'standard',
        meta: post.postMeta || {},
        _embedded: {
          author: post.author ? [{
            id: post.author.id,
            name: post.author.name,
            link: `/users/${post.author.id}`
          }] : [],
          'wp:term': [
            post.categories?.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              taxonomy: 'category'
            })) || []
          ]
        }
      }));

      // Set pagination headers
      res.setHeader('X-WP-Total', total.toString());
      res.setHeader('X-WP-TotalPages', Math.ceil(total / (per_page as number)).toString());

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
        date: post.publishedAt,
        date_gmt: post.publishedAt,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updatedAt,
        modified_gmt: post.updatedAt,
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
        format: post.format || 'standard',
        meta: post.postMeta || {},
        _embedded: {
          author: post.author ? [{
            id: post.author.id,
            name: post.author.name,
            link: `/users/${post.author.id}`
          }] : [],
          'wp:term': [
            post.categories?.map(c => ({
              id: c.id,
              name: c.name,
              slug: c.slug,
              taxonomy: 'category'
            })) || []
          ]
        }
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

// POST /api/posts - Create post
router.post('/',
  authenticateToken,
  body('title').notEmpty().withMessage('Title is required'),
  body('content').notEmpty().withMessage('Content is required'),
  body('status').optional().isIn(['draft', 'published', 'private', 'archived', 'scheduled']),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { title, content, status, categories: categoryIds, tags, excerpt, slug, format, sticky, meta } = req.body;
      const userId = (req as any).user?.id;

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const newPost = {
          id: Date.now().toString(),
          title,
          slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
          content,
          excerpt: excerpt || '',
          status: status || 'draft',
          type: 'post',
          author: {
            id: userId || '1',
            name: 'User',
            email: 'user@neture.co.kr'
          },
          categories: [],
          tags: tags || [],
          featuredImage: null,
          publishedAt: status === 'published' ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
        content: { blocks: [] }, // TODO: Parse content into blocks format
        status: status || 'draft',
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        excerpt,
        tags: tags || [],
        format: format || 'standard',
        sticky: sticky || false,
        postMeta: meta || {},
        authorId: userId,
        categories,
        publishedAt: status === 'published' ? new Date() : null
      });

      res.status(201).json(post);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        error: 'Failed to create post',
        message: error.message 
      });
    }
  }
);

// PUT /api/posts/:id - Update post
router.put('/:id',
  authenticateToken,
  param('id').notEmpty(),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { title, content, status, categories: categoryIds, tags, excerpt, slug, format, sticky, meta } = req.body;
      const userId = (req as any).user?.id;

      // Check if database is available
      const repos = getRepositories();
      if (!repos) {
        const postIndex = mockPosts.findIndex(p => p.id === id);
        if (postIndex === -1) {
          return res.status(404).json({ error: 'Post not found' });
        }
        mockPosts[postIndex] = {
          ...mockPosts[postIndex],
          title: title || mockPosts[postIndex].title,
          content: content || mockPosts[postIndex].content,
          status: status || mockPosts[postIndex].status,
          updatedAt: new Date().toISOString()
        };
        return res.json(mockPosts[postIndex]);
      }

      const { postRepository, categoryRepository } = repos;
      const existingPost = await postRepository.findOne({
        where: { id },
        relations: ['categories']
      });

      if (!existingPost) {
        return res.status(404).json({ error: 'Post not found' });
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
        content: content ? { blocks: [] } : existingPost.content, // TODO: Parse content into blocks format
        status: status || existingPost.status,
        slug: slug || existingPost.slug,
        excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
        tags: tags || existingPost.tags,
        format: format || existingPost.format,
        sticky: sticky !== undefined ? sticky : existingPost.sticky,
        postMeta: meta || existingPost.postMeta,
        categories,
        lastModifierId: userId,
        publishedAt: status === 'published' && !existingPost.publishedAt ? new Date() : existingPost.publishedAt
      });

      res.json(updatedPost);
    } catch (error: any) {
      // Error log removed
      res.status(500).json({ 
        error: 'Failed to update post',
        message: error.message 
      });
    }
  }
);

// DELETE /api/posts/:id - Delete post
router.delete('/:id',
  authenticateToken,
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