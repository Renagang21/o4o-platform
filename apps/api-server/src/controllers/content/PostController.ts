import { Request, Response } from 'express';
import { AppDataSource } from '../../database/connection';
import { Post } from '../../entities/Post';
import { Tag } from '../../entities/Tag';
import { Category } from '../../entities/Category';
import { User } from '../../entities/User';
import { slugService } from '../../services/slug.service';
import { revisionService } from '../../services/revision.service';
import logger from '../../utils/logger';
import { In, Like } from 'typeorm';

export class PostController {
  private postRepository = AppDataSource.getRepository(Post);
  private tagRepository = AppDataSource.getRepository(Tag);
  private categoryRepository = AppDataSource.getRepository(Category);
  private userRepository = AppDataSource.getRepository(User);

  // GET /api/posts - 게시글 목록 조회
  getPosts = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        search,
        authorId,
        categoryId,
        tag,
        orderBy = 'createdAt',
        order = 'DESC',
        includeDrafts = false
      } = req.query;

      const queryBuilder = this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .leftJoinAndSelect('post.lastModifier', 'lastModifier');

      // Type filter
      if (type) {
        queryBuilder.andWhere('post.type = :type', { type });
      }

      // Status filter
      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      } else if (!includeDrafts) {
        queryBuilder.andWhere('post.status != :status', { status: 'draft' });
      }

      // Search
      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.excerpt ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Author filter
      if (authorId) {
        queryBuilder.andWhere('post.authorId = :authorId', { authorId });
      }

      // Category filter
      if (categoryId) {
        queryBuilder.andWhere('categories.id = :categoryId', { categoryId });
      }

      // Tag filter
      if (tag) {
        queryBuilder.andWhere('tags.slug = :tag', { tag });
      }

      // Ordering
      const allowedOrderBy = ['createdAt', 'updatedAt', 'publishedAt', 'title', 'views'];
      const orderByField = allowedOrderBy.includes(orderBy as string) ? orderBy : 'createdAt';
      const orderDirection = order === 'ASC' ? 'ASC' : 'DESC';
      
      queryBuilder.orderBy(`post.${orderByField}`, orderDirection);

      // Pagination
      const skip = (Number(page) - 1) * Number(limit);
      queryBuilder.skip(skip).take(Number(limit));

      const [posts, total] = await queryBuilder.getManyAndCount();

      res.json({
        success: true,
        data: {
          posts: posts.map(this.formatPostResponse),
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        }
      });
    } catch (error) {
      logger.error('Error getting posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      });
    }
  };

  // GET /api/posts/:id - 게시글 상세 조회
  getPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { includeRevisions = false } = req.query;

      const post = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .leftJoinAndSelect('post.lastModifier', 'lastModifier')
        .where('post.id = :id', { id })
        .getOne();

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      let revisions = [];
      if (includeRevisions === 'true') {
        revisions = await revisionService.getPostRevisions(id, 10);
      }

      // Increment view count
      await this.postRepository.increment({ id }, 'views', 1);

      const responseData = {
        success: true,
        data: {
          post: this.formatPostResponse(post),
          revisions: includeRevisions === 'true' ? revisions : undefined
        }
      };
      
      // Debug log for development
      if (process.env.NODE_ENV === 'development') {
        logger.info('API Response Structure:', {
          hasSuccess: 'success' in responseData,
          hasData: 'data' in responseData,
          hasPost: responseData.data && 'post' in responseData.data,
          slugValue: responseData.data?.post?.slug
        });
      }
      
      res.json(responseData);
    } catch (error) {
      logger.error('Error getting post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve post'
      });
    }
  };

  // POST /api/posts - 게시글 생성
  createPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        title,
        slug,
        content,
        excerpt,
        status = 'draft',
        type = 'post',
        format = 'standard',
        template,
        categoryIds = [],
        tagNames = [],
        seo = {},
        customFields = {},
        postMeta = {},
        publishedAt,
        scheduledAt,
        password,
        allowComments = true,
        featured = false,
        sticky = false,
        featuredImage
      } = req.body;

      const authorId = req.user?.id; // From auth middleware

      if (!authorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Validate slug is provided
      if (!slug || slug.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'slug is required. Please provide a URL-friendly slug.'
        });
        return;
      }

      // Check if slug is already taken
      const isSlugTaken = await this.postRepository
        .createQueryBuilder('post')
        .where('post.slug = :slug', { slug })
        .getCount() > 0;

      if (isSlugTaken) {
        res.status(400).json({
          success: false,
          error: 'This slug is already taken. Please choose a different slug.'
        });
        return;
      }

      // Handle categories
      let categories = [];
      if (categoryIds.length > 0) {
        categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
      }

      // Handle tags
      let tags = [];
      if (tagNames.length > 0) {
        tags = await this.getOrCreateTags(tagNames);
      }

      // Create post
      const post = this.postRepository.create({
        title,
        slug,
        content,
        excerpt,
        status,
        type,
        template,
        categories,
        tags,
        seo,
        meta: {
          ...postMeta,
          featured,
          ...customFields
        },
        published_at: status === 'publish' ? (publishedAt ? new Date(publishedAt) : new Date()) : null,
        author_id: authorId,
        comment_status: allowComments ? 'open' : 'closed',
        sticky,
        featured_media: featuredImage
      });

      const savedPost = await this.postRepository.save(post);

      // Create initial revision
      await revisionService.createPostRevision(savedPost, {
        entityId: savedPost.id,
        entityType: 'post',
        authorId,
        revisionType: 'manual',
        changeDescription: 'Initial creation',
        isRestorePoint: true
      });

      // Load complete post with relations
      const completePost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.id = :id', { id: savedPost.id })
        .getOne();

      res.status(201).json({
        success: true,
        data: {
          post: this.formatPostResponse(completePost!)
        }
      });
    } catch (error) {
      logger.error('Error creating post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create post'
      });
    }
  };

  // PUT /api/posts/:id - 게시글 수정
  updatePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const post = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.id = :id', { id })
        .getOne();

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      // Create revision before updating
      await revisionService.createPostRevision(post, {
        entityId: id,
        entityType: 'post',
        authorId: userId,
        revisionType: 'manual',
        changeDescription: updates.changeDescription || 'Post updated'
      });

      // Handle slug update
      if (updates.slug && updates.slug !== post.slug) {
        // Check if new slug is already taken
        const isSlugTaken = await this.postRepository
          .createQueryBuilder('post')
          .where('post.slug = :slug', { slug: updates.slug })
          .andWhere('post.id != :id', { id })
          .getCount() > 0;

        if (isSlugTaken) {
          res.status(400).json({
            success: false,
            error: 'This slug is already taken. Please choose a different slug.'
          });
          return;
        }
      }

      // Handle categories
      if (updates.categoryIds) {
        const categories = await this.categoryRepository.findBy({ id: In(updates.categoryIds) });
        post.categories = categories;
      }

      // Handle tags
      if (updates.tagNames) {
        const tags = await this.getOrCreateTags(updates.tagNames);
        post.tags = tags;
      }

      // Handle publication status changes
      if (updates.status === 'publish' && post.status !== 'publish' && !post.published_at) {
        updates.published_at = new Date();
      }

      // Update post
      Object.assign(post, {
        ...updates,
        updated_at: new Date()
      });

      const savedPost = await this.postRepository.save(post);

      // Load complete post with relations
      const completePost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .leftJoinAndSelect('post.lastModifier', 'lastModifier')
        .where('post.id = :id', { id: savedPost.id })
        .getOne();

      res.json({
        success: true,
        data: {
          post: this.formatPostResponse(completePost!)
        }
      });
    } catch (error) {
      logger.error('Error updating post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update post'
      });
    }
  };

  // DELETE /api/posts/:id - 게시글 삭제
  deletePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const post = await this.postRepository.findOne({ where: { id } });

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      if (permanent === 'true') {
        // Permanent deletion
        await this.postRepository.remove(post);
        res.json({
          success: true,
          message: 'Post permanently deleted'
        });
      } else {
        // Move to trash
        post.status = 'trash';
        // lastModifiedBy property not available on Post entity
        await this.postRepository.save(post);
        
        res.json({
          success: true,
          message: 'Post moved to trash'
        });
      }
    } catch (error) {
      logger.error('Error deleting post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete post'
      });
    }
  };

  // POST /api/posts/:id/restore - 휴지통 복원
  restorePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const post = await this.postRepository.findOne({ where: { id } });

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      if (post.status !== 'trash') {
        res.status(400).json({
          success: false,
          error: 'Post is not in trash'
        });
        return;
      }

      post.status = 'draft';
      // lastModifiedBy property not available on Post entity
      await this.postRepository.save(post);

      res.json({
        success: true,
        message: 'Post restored from trash'
      });
    } catch (error) {
      logger.error('Error restoring post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore post'
      });
    }
  };

  // POST /api/posts/bulk - 일괄 작업
  bulkAction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { action, postIds } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      if (!Array.isArray(postIds) || postIds.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Post IDs are required'
        });
        return;
      }

      const posts = await this.postRepository.findBy({ id: In(postIds) });

      if (posts.length === 0) {
        res.status(404).json({
          success: false,
          error: 'No posts found'
        });
        return;
      }

      let updatedCount = 0;

      switch (action) {
        case 'publish':
          for (const post of posts) {
            if (post.status === 'draft') {
              post.status = 'publish';
              post.published_at = post.published_at || new Date();
              // lastModifiedBy property not available on Post entity
              await this.postRepository.save(post);
              updatedCount++;
            }
          }
          break;

        case 'draft':
          for (const post of posts) {
            if (post.status === 'publish') {
              post.status = 'draft';
              // lastModifiedBy property not available on Post entity
              await this.postRepository.save(post);
              updatedCount++;
            }
          }
          break;

        case 'trash':
          for (const post of posts) {
            if (post.status !== 'trash') {
              post.status = 'trash';
              // lastModifiedBy property not available on Post entity
              await this.postRepository.save(post);
              updatedCount++;
            }
          }
          break;

        case 'delete':
          await this.postRepository.remove(posts);
          updatedCount = posts.length;
          break;

        default:
          res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
          return;
      }

      res.json({
        success: true,
        message: `${updatedCount} posts ${action}ed successfully`,
        data: { updatedCount }
      });
    } catch (error) {
      logger.error('Error in bulk action:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk action'
      });
    }
  };

  // GET /api/posts/:id/revisions - 수정 이력
  getRevisions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;

      const post = await this.postRepository.findOne({ where: { id } });

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      const revisions = await revisionService.getPostRevisions(id, Number(limit));

      res.json({
        success: true,
        data: { revisions }
      });
    } catch (error) {
      logger.error('Error getting revisions:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get revisions'
      });
    }
  };

  // POST /api/posts/:id/revisions/:revisionId - 리비전 복원
  restoreRevision = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, revisionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const restoredPost = await revisionService.restorePostRevision(id, revisionId, userId);

      // Load complete post with relations
      const completePost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .leftJoinAndSelect('post.lastModifier', 'lastModifier')
        .where('post.id = :id', { id: restoredPost.id })
        .getOne();

      res.json({
        success: true,
        message: 'Post restored from revision',
        data: {
          post: this.formatPostResponse(completePost!)
        }
      });
    } catch (error) {
      logger.error('Error restoring revision:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restore revision'
      });
    }
  };

  // POST /api/posts/:id/autosave - 자동 저장
  autoSave = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const result = await revisionService.autoSaveContent(id, 'post', content, userId);

      res.json({
        success: result.success,
        message: result.success ? 'Content auto-saved' : 'Auto-save failed',
        data: result.revisionId ? { revisionId: result.revisionId } : undefined
      });
    } catch (error) {
      logger.error('Error auto-saving:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to auto-save content'
      });
    }
  };

  // GET /api/posts/:id/preview - 미리보기
  getPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { revisionId } = req.query;

      let post;

      if (revisionId) {
        // Preview specific revision
        const revisionRepository = AppDataSource.getRepository('PostRevision');
        const revision = await revisionRepository.findOne({
          where: { id: revisionId, postId: id }
        });

        if (!revision) {
          res.status(404).json({
            success: false,
            error: 'Revision not found'
          });
          return;
        }

        // Create a post-like object from revision data
        post = {
          id: revision.postId,
          title: revision.title,
          content: revision.content,
          excerpt: revision.excerpt,
          status: revision.status,
          seo: revision.seo,
          customFields: revision.customFields,
          tags: revision.tags,
          postMeta: revision.postMeta,
          createdAt: revision.createdAt,
          updatedAt: revision.createdAt
        };
      } else {
        // Preview current post
        post = await this.postRepository
          .createQueryBuilder('post')
          .leftJoinAndSelect('post.author', 'author')
          .leftJoinAndSelect('post.categories', 'categories')
          .leftJoinAndSelect('post.tags', 'tags')
          .where('post.id = :id', { id })
          .getOne();
      }

      if (!post) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          post: this.formatPostResponse(post),
          isPreview: true,
          revisionId: revisionId || null
        }
      });
    } catch (error) {
      logger.error('Error getting preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get preview'
      });
    }
  };

  // POST /api/posts/:id/duplicate - 게시글 복제
  duplicatePost = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      const originalPost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.id = :id', { id })
        .getOne();

      if (!originalPost) {
        res.status(404).json({
          success: false,
          error: 'Post not found'
        });
        return;
      }

      const duplicateTitle = title || `${originalPost.title} (Copy)`;
      const slug = await slugService.ensureUniquePostSlug(duplicateTitle);

      const duplicatedPost = this.postRepository.create({
        ...originalPost,
        id: undefined, // Let TypeORM generate new ID
        title: duplicateTitle,
        slug,
        status: 'draft',
        author_id: userId,
        published_at: null,
        created_at: undefined,
        updated_at: undefined
      });

      const savedPost = await this.postRepository.save(duplicatedPost);

      // Load complete post with relations
      const completePost = await this.postRepository
        .createQueryBuilder('post')
        .leftJoinAndSelect('post.author', 'author')
        .leftJoinAndSelect('post.categories', 'categories')
        .leftJoinAndSelect('post.tags', 'tags')
        .where('post.id = :id', { id: savedPost.id })
        .getOne();

      res.status(201).json({
        success: true,
        message: 'Post duplicated successfully',
        data: {
          post: this.formatPostResponse(completePost!)
        }
      });
    } catch (error) {
      logger.error('Error duplicating post:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to duplicate post'
      });
    }
  };

  // Private helper methods

  private formatPostResponse(post: any): any {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      status: post.status,
      type: post.type,
      format: post.format,
      template: post.template,
      categories: post.categories?.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description
      })) || [],
      tags: post.tags?.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        color: tag.color
      })) || [],
      seo: post.seo,
      customFields: post.customFields,
      postMeta: post.postMeta,
      publishedAt: post.publishedAt,
      scheduledAt: post.scheduledAt,
      author: post.author ? {
        id: post.author.id,
        name: post.author.name,
        email: post.author.email
      } : null,
      lastModifiedBy: post.lastModifier ? {
        id: post.lastModifier.id,
        name: post.lastModifier.name,
        email: post.lastModifier.email
      } : null,
      views: post.views,
      passwordProtected: post.passwordProtected,
      allowComments: post.allowComments,
      commentStatus: post.commentStatus,
      featured: post.featured,
      sticky: post.sticky,
      featuredImage: post.featuredImage,
      readingTime: post.readingTime,
      layoutSettings: post.layoutSettings,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    };
  }

  private async getOrCreateTags(tagNames: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const tagName of tagNames) {
      let tag = await this.tagRepository.findOne({ where: { name: tagName } });

      if (!tag) {
        const slug = await slugService.ensureUniqueTagSlug(tagName);
        tag = this.tagRepository.create({
          name: tagName,
          slug,
          count: 0
        });
        await this.tagRepository.save(tag);
      }

      tag.incrementUsage();
      await this.tagRepository.save(tag);
      tags.push(tag);
    }

    return tags;
  }
}
