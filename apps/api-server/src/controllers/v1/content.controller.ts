import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Post } from '../../entities/Post';
import { Page } from '../../entities/Page';
import { Category } from '../../entities/Category';
import { User, UserStatus } from '../../entities/User';
import { MediaFile } from '../../entities/MediaFile';

export class ContentController {
  private postRepository = AppDataSource.getRepository(Post);
  private pageRepository = AppDataSource.getRepository(Page);
  private categoryRepository = AppDataSource.getRepository(Category);
  private userRepository = AppDataSource.getRepository(User);
  private mediaRepository = AppDataSource.getRepository(MediaFile);

  // Posts Management
  getPosts = async (req: Request, res: Response) => {
    try {
      const { page = 1, pageSize = 20, type = 'post', status, search } = req.query;
      
      // Return mock data if DB not initialized
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: [
            {
              id: '1',
              title: 'Welcome to O4O Platform',
              slug: 'welcome-to-o4o-platform',
              content: { type: 'doc', content: [] },
              excerpt: 'Welcome to our new platform',
              status: 'published',
              author: { id: '1', name: 'Admin', email: 'admin@example.com' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              publishedAt: new Date().toISOString(),
              categories: [],
              tags: [],
              featuredImage: null,
              type: 'post',
              visibility: 'public',
              allowComments: true,
              viewCount: 0,
              likeCount: 0,
              commentsCount: 0
            }
          ],
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            totalItems: 1,
            totalPages: 1
          }
        });
      }

      // Real implementation would query database
      const queryBuilder = this.postRepository.createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags');

      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      }

      if (search) {
        queryBuilder.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
          search: `%${search}%`
        });
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      queryBuilder.skip(skip).take(Number(pageSize));

      const [posts, total] = await queryBuilder.getManyAndCount();

      return res.json({
        status: 'success',
        data: posts,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          totalItems: total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch posts'
      });
    }
  };

  getPost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: {
            id,
            title: 'Sample Post',
            slug: 'sample-post',
            content: { type: 'doc', content: [] },
            excerpt: 'This is a sample post',
            status: 'published',
            author: { id: '1', name: 'Admin', email: 'admin@example.com' },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      const post = await this.postRepository.findOne({
        where: { id },
        relations: ['author', 'categories', 'tags']
      });

      if (!post) {
        return res.status(404).json({
          status: 'error',
          message: 'Post not found'
        });
      }

      return res.json({
        status: 'success',
        data: post
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch post'
      });
    }
  };

  createPost = async (req: Request, res: Response) => {
    try {
      const { title, content, status = 'draft' } = req.body;
      // Use user.id directly instead of userId for UUID compatibility
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          success: true,
          data: {
            id: Date.now().toString(),
            title,
            content,
            status,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      // Ensure userId is available
      if (!userId) {
        return res.status(401).json({
          message: 'User authentication required'
        });
      }

      // Debug: Log the userId to check its format
      if ((global as any).logger) {
        (global as any).logger.info('Creating post with userId:', { 
          userId, 
          userIdType: typeof userId,
          userObj: user,
          userId_direct: user?.userId,
          id_direct: user?.id
        });
      }

      // Prepare content structure
      let postContent;
      if (Array.isArray(content)) {
        // If content is already an array of blocks
        postContent = { blocks: content };
      } else if (content && typeof content === 'object' && 'blocks' in content) {
        // If content already has blocks structure
        postContent = content;
      } else {
        // Default to empty blocks
        postContent = { blocks: [] };
      }

      // Generate unique slug with timestamp to avoid duplicates
      const baseSlug = (title || 'untitled').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const uniqueSuffix = Date.now().toString(36); // Convert timestamp to base36 for shorter string
      const uniqueSlug = `${baseSlug}-${uniqueSuffix}`;

      const post = this.postRepository.create({
        title: title || 'Untitled',
        content: postContent,
        status,
        authorId: userId,
        slug: uniqueSlug,
        type: 'post'
      } as any);
      const savedPost = await this.postRepository.save(post);

      return res.json({
        success: true,
        data: savedPost
      });
    } catch (error: any) {
      // Log the actual error for debugging
      const errorMessage = error.message || 'Failed to create post';
      const errorStack = error.stack;
      
      // Use logger if available, otherwise use console for debugging
      if ((global as any).logger) {
        (global as any).logger.error('Post creation failed:', {
          error: errorMessage,
          stack: errorStack,
          body: req.body,
          userId: (req as any).user?.userId
        });
      }
      
      return res.status(500).json({
        message: 'Failed to create post',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  createDraft = async (req: Request, res: Response) => {
    try {
      const { title, content } = req.body;
      // Use user.id directly instead of userId for UUID compatibility
      const user = (req as any).user;
      const userId = user?.id || user?.userId;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          success: true,
          data: {
            id: Date.now().toString(),
            title,
            content,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      // Prepare content structure
      let postContent;
      if (Array.isArray(content)) {
        // If content is already an array of blocks
        postContent = { blocks: content };
      } else if (content && typeof content === 'object' && 'blocks' in content) {
        // If content already has blocks structure
        postContent = content;
      } else {
        // Default to empty blocks
        postContent = { blocks: [] };
      }

      // Generate unique slug with timestamp to avoid duplicates
      const baseSlug = (title || 'untitled-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const uniqueSuffix = Date.now().toString(36); // Convert timestamp to base36 for shorter string
      const uniqueSlug = `${baseSlug}-${uniqueSuffix}`;

      const post = this.postRepository.create({
        title: title || 'Untitled Draft',
        content: postContent,
        status: 'draft',
        authorId: userId,
        slug: uniqueSlug,
        type: 'post'
      } as any);
      const savedPost = await this.postRepository.save(post);

      return res.json({
        success: true,
        data: savedPost
      });
    } catch (error: any) {
      // Log the actual error for debugging
      const errorMessage = error.message || 'Failed to create draft';
      const errorStack = error.stack;
      
      // Use logger if available, otherwise use console for debugging
      if ((global as any).logger) {
        (global as any).logger.error('Draft save failed:', {
          error: errorMessage,
          stack: errorStack,
          body: req.body,
          userId: (req as any).user?.userId
        });
      }
      
      return res.status(500).json({
        message: 'Failed to create draft',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  };

  publishPost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          success: true,
          data: {
            id,
            status: 'published',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      const post = await this.postRepository.findOne({ where: { id } });
      
      if (!post) {
        return res.status(404).json({
          message: 'Post not found'
        });
      }

      post.status = 'published';
      post.publishedAt = new Date();
      const updatedPost = await this.postRepository.save(post);

      return res.json({
        success: true,
        data: updatedPost
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to publish post'
      });
    }
  };

  updatePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          success: true,
          data: {
            id,
            ...updateData,
            updatedAt: new Date().toISOString()
          }
        });
      }

      await this.postRepository.update(id, updateData);
      const updatedPost = await this.postRepository.findOne({ where: { id } });

      return res.json({
        success: true,
        data: updatedPost
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to update post'
      });
    }
  };

  deletePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          success: true,
          message: 'Post deleted successfully'
        });
      }

      await this.postRepository.delete(id);

      return res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to delete post'
      });
    }
  };

  clonePost = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: {
            id: Date.now().toString(),
            title: 'Cloned Post',
            createdAt: new Date().toISOString()
          }
        });
      }

      const original = await this.postRepository.findOne({ where: { id } });
      if (!original) {
        return res.status(404).json({
          status: 'error',
          message: 'Post not found'
        });
      }

      const cloned = this.postRepository.create({
        ...original,
        id: undefined,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy`,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedPost = await this.postRepository.save(cloned);

      return res.json({
        status: 'success',
        data: savedPost
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to clone post'
      });
    }
  };

  bulkUpdatePosts = async (req: Request, res: Response) => {
    try {
      const { ids, data } = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          message: 'Posts updated successfully'
        });
      }

      await this.postRepository.update(ids, data);

      return res.json({
        status: 'success',
        message: 'Posts updated successfully'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update posts'
      });
    }
  };

  bulkDeletePosts = async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          message: 'Posts deleted successfully'
        });
      }

      await this.postRepository.delete(ids);

      return res.json({
        status: 'success',
        message: 'Posts deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete posts'
      });
    }
  };

  // Categories Management
  getCategories = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: [
            { id: '1', name: 'Technology', slug: 'technology', description: 'Tech related posts', count: 5 },
            { id: '2', name: 'Business', slug: 'business', description: 'Business related posts', count: 3 },
            { id: '3', name: 'Design', slug: 'design', description: 'Design related posts', count: 2 }
          ]
        });
      }

      const categories = await this.categoryRepository.find();

      return res.json({
        status: 'success',
        data: categories
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch categories'
      });
    }
  };

  getCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: { id, name: 'Sample Category', slug: 'sample-category' }
        });
      }

      const category = await this.categoryRepository.findOne({ where: { id } });

      if (!category) {
        return res.status(404).json({
          status: 'error',
          message: 'Category not found'
        });
      }

      return res.json({
        status: 'success',
        data: category
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch category'
      });
    }
  };

  createCategory = async (req: Request, res: Response) => {
    try {
      const categoryData = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: {
            id: Date.now().toString(),
            ...categoryData,
            createdAt: new Date().toISOString()
          }
        });
      }

      const category = this.categoryRepository.create(categoryData);
      const savedCategory = await this.categoryRepository.save(category);

      return res.json({
        status: 'success',
        data: savedCategory
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create category'
      });
    }
  };

  updateCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: { id, ...updateData }
        });
      }

      await this.categoryRepository.update(id, updateData);
      const updatedCategory = await this.categoryRepository.findOne({ where: { id } });

      return res.json({
        status: 'success',
        data: updatedCategory
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update category'
      });
    }
  };

  deleteCategory = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          message: 'Category deleted successfully'
        });
      }

      await this.categoryRepository.delete(id);

      return res.json({
        status: 'success',
        message: 'Category deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete category'
      });
    }
  };

  // Tags Management
  getTags = async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      
      if (!AppDataSource.isInitialized) {
        // Return mock data for development
        return res.json({
          status: 'success',
          data: [
            { id: '1', name: 'JavaScript', slug: 'javascript', description: 'JavaScript programming', postCount: 10 },
            { id: '2', name: 'React', slug: 'react', description: 'React framework', postCount: 8 },
            { id: '3', name: 'Node.js', slug: 'nodejs', description: 'Node.js runtime', postCount: 5 }
          ]
        });
      }

      const tagRepository = AppDataSource.getRepository('PostTag');
      let query = tagRepository.createQueryBuilder('tag')
        .where('tag.isActive = :isActive', { isActive: true })
        .orderBy('tag.name', 'ASC');

      if (search) {
        query = query.andWhere(
          '(tag.name LIKE :search OR tag.description LIKE :search)',
          { search: `%${search}%` }
        );
      }

      const tags = await query.getMany();
      
      // Format response with postCount instead of usageCount for frontend compatibility
      const formattedTags = tags.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description,
        postCount: tag.usageCount || 0,
        createdAt: tag.createdAt,
        updatedAt: tag.updatedAt
      }));

      return res.json({
        status: 'success',
        data: formattedTags,
        tags: formattedTags // Also include in 'tags' key for compatibility
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tags'
      });
    }
  };

  getTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: { id, name: 'Sample Tag', slug: 'sample-tag', description: 'Sample description' }
        });
      }

      const tagRepository = AppDataSource.getRepository('PostTag');
      const tag = await tagRepository.findOne({ where: { id } });

      if (!tag) {
        return res.status(404).json({
          status: 'error',
          message: 'Tag not found'
        });
      }

      return res.json({
        status: 'success',
        data: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          description: tag.description,
          postCount: tag.usageCount || 0,
          createdAt: tag.createdAt,
          updatedAt: tag.updatedAt
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch tag'
      });
    }
  };

  createTag = async (req: Request, res: Response) => {
    try {
      const { name, description, slug } = req.body;
      
      if (!name) {
        return res.status(400).json({
          status: 'error',
          message: 'Tag name is required'
        });
      }

      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: {
            id: Date.now().toString(),
            name,
            slug: slug || name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-'),
            description,
            postCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        });
      }

      const tagRepository = AppDataSource.getRepository('PostTag');
      
      // Check if tag with same slug already exists
      const finalSlug = slug || name.toLowerCase().replace(/[^a-z0-9가-힣]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const existingTag = await tagRepository.findOne({ where: { slug: finalSlug } });
      
      if (existingTag) {
        return res.status(409).json({
          status: 'error',
          message: 'Tag with this slug already exists'
        });
      }

      const newTag = tagRepository.create({
        name,
        slug: finalSlug,
        description,
        isActive: true,
        usageCount: 0
      });

      const savedTag = await tagRepository.save(newTag);

      return res.json({
        status: 'success',
        data: {
          id: savedTag.id,
          name: savedTag.name,
          slug: savedTag.slug,
          description: savedTag.description,
          postCount: 0,
          createdAt: savedTag.createdAt,
          updatedAt: savedTag.updatedAt
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create tag'
      });
    }
  };

  updateTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description, slug } = req.body;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: { id, name, slug, description, updatedAt: new Date().toISOString() }
        });
      }

      const tagRepository = AppDataSource.getRepository('PostTag');
      const tag = await tagRepository.findOne({ where: { id } });

      if (!tag) {
        return res.status(404).json({
          status: 'error',
          message: 'Tag not found'
        });
      }

      // Update tag fields
      if (name) tag.name = name;
      if (description !== undefined) tag.description = description;
      if (slug) tag.slug = slug;

      const updatedTag = await tagRepository.save(tag);

      return res.json({
        status: 'success',
        data: {
          id: updatedTag.id,
          name: updatedTag.name,
          slug: updatedTag.slug,
          description: updatedTag.description,
          postCount: updatedTag.usageCount || 0,
          createdAt: updatedTag.createdAt,
          updatedAt: updatedTag.updatedAt
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to update tag'
      });
    }
  };

  deleteTag = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          message: 'Tag deleted successfully'
        });
      }

      const tagRepository = AppDataSource.getRepository('PostTag');
      const tag = await tagRepository.findOne({ where: { id } });

      if (!tag) {
        return res.status(404).json({
          status: 'error',
          message: 'Tag not found'
        });
      }

      await tagRepository.remove(tag);

      return res.json({
        status: 'success',
        message: 'Tag deleted successfully'
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to delete tag'
      });
    }
  };

  // Pages Management
  getPages = async (req: Request, res: Response) => {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: [
            {
              id: '1',
              title: 'About Us',
              slug: 'about-us',
              content: { type: 'doc', content: [] },
              status: 'published',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ],
          pagination: {
            page: Number(page),
            pageSize: Number(pageSize),
            totalItems: 1,
            totalPages: 1
          }
        });
      }

      const skip = (Number(page) - 1) * Number(pageSize);
      const [pages, total] = await this.pageRepository.findAndCount({
        skip,
        take: Number(pageSize)
      });

      return res.json({
        status: 'success',
        data: pages,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          totalItems: total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch pages'
      });
    }
  };

  getPage = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: {
        id: req.params.id,
        title: 'Sample Page',
        slug: 'sample-page',
        content: { type: 'doc', content: [] }
      }
    });
  };

  createPage = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: { id: Date.now().toString(), ...req.body }
    });
  };

  updatePage = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: { id: req.params.id, ...req.body }
    });
  };

  deletePage = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      message: 'Page deleted successfully'
    });
  };

  // Media Management
  getMediaFiles = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: []
        });
      }

      const media = await this.mediaRepository.find();

      return res.json({
        status: 'success',
        data: media
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch media files'
      });
    }
  };

  getMediaFile = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: { id: req.params.id, filename: 'sample.jpg', url: '/uploads/sample.jpg' }
    });
  };

  uploadMedia = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: {
        id: Date.now().toString(),
        filename: 'uploaded.jpg',
        url: '/uploads/uploaded.jpg'
      }
    });
  };

  updateMedia = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      data: { id: req.params.id, ...req.body }
    });
  };

  deleteMedia = async (req: Request, res: Response) => {
    return res.json({
      status: 'success',
      message: 'Media deleted successfully'
    });
  };

  // Authors
  getAuthors = async (req: Request, res: Response) => {
    try {
      if (!AppDataSource.isInitialized) {
        return res.json({
          status: 'success',
          data: [
            { id: '1', name: 'Admin' },
            { id: '2', name: 'Editor' },
            { id: '3', name: 'Author' }
          ]
        });
      }

      const users = await this.userRepository.find({
        select: ['id', 'name'],
        where: { status: UserStatus.ACTIVE }
      });

      return res.json({
        status: 'success',
        data: users
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch authors'
      });
    }
  };
}