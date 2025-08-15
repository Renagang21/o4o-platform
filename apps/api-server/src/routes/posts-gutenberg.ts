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
    console.error('Failed to get repositories:', error);
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
  }
];

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

// POST /api/posts - Create post (Gutenberg compatible)
router.post('/',
  authenticateToken,
  // Make title and content optional for auto-save support
  body('title').optional(),
  body('content').optional(),
  body('status').optional().isIn(['draft', 'publish', 'published', 'private', 'archived', 'scheduled', 'auto-draft']),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      
      // Extract title and content from Gutenberg format
      const title = extractTitle(req.body.title) || 'Untitled';
      const content = extractContent(req.body.content) || '';
      
      // Map 'publish' to 'published' for compatibility
      let status = req.body.status || 'draft';
      if (status === 'publish') {
        status = 'published';
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
        
        mockPosts.push(newPost as any);
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
        status,
        slug: slug || title.toLowerCase().replace(/\s+/g, '-'),
        excerpt: extractContent(excerpt),
        tags: tags || [],
        format: format || 'standard',
        sticky: sticky || false,
        postMeta: meta || {},
        authorId: userId,
        categories,
        publishedAt: status === 'published' ? new Date() : null
      });

      // Format response for Gutenberg
      const response = {
        id: post.id,
        date: post.publishedAt || post.createdAt,
        date_gmt: post.publishedAt || post.createdAt,
        guid: { rendered: `/posts/${post.id}` },
        modified: post.updatedAt,
        modified_gmt: post.updatedAt,
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
        format: post.format || 'standard',
        meta: post.postMeta || {},
        categories: post.categories?.map(c => c.id) || [],
        tags: post.tags || []
      };

      res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating post:', error);
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
  authenticateToken,
  param('id').notEmpty(),
  validateDto,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      
      // Extract title and content from Gutenberg format
      const title = extractTitle(req.body.title);
      const content = extractContent(req.body.content);
      
      // Map 'publish' to 'published' for compatibility
      let status = req.body.status;
      if (status === 'publish') {
        status = 'published';
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
        
        mockPosts[postIndex] = updatedPost as any;
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
        content: content ? { blocks: [] } : existingPost.content, // TODO: Parse content into blocks format
        status: status || existingPost.status,
        slug: slug || existingPost.slug,
        excerpt: excerpt !== undefined ? extractContent(excerpt) : existingPost.excerpt,
        tags: tags || existingPost.tags,
        format: format || existingPost.format,
        sticky: sticky !== undefined ? sticky : existingPost.sticky,
        postMeta: meta || existingPost.postMeta,
        categories,
        lastModifierId: userId,
        publishedAt: status === 'published' && !existingPost.publishedAt ? new Date() : existingPost.publishedAt
      });

      // Format response for Gutenberg
      const response = {
        id: updatedPost.id,
        date: updatedPost.publishedAt || updatedPost.createdAt,
        date_gmt: updatedPost.publishedAt || updatedPost.createdAt,
        guid: { rendered: `/posts/${updatedPost.id}` },
        modified: updatedPost.updatedAt,
        modified_gmt: updatedPost.updatedAt,
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
        sticky: updatedPost.sticky || false,
        template: '',
        format: updatedPost.format || 'standard',
        meta: updatedPost.postMeta || {},
        categories: updatedPost.categories?.map(c => c.id) || [],
        tags: updatedPost.tags || []
      };

      res.json(response);
    } catch (error: any) {
      console.error('Error updating post:', error);
      res.status(500).json({ 
        code: 'rest_cannot_update',
        message: 'Failed to update post',
        data: { status: 500 }
      });
    }
  }
);

// GET routes (reuse from existing posts.ts)
router.get('/', require('./posts').default);
router.get('/:id', require('./posts').default);
router.delete('/:id', require('./posts').default);

export default router;