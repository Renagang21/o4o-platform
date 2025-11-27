import { AppDataSource } from '../../../database/connection.js';
import { CustomPost, PostStatus } from '../../../entities/CustomPost.js';
import { CustomPostType } from '../../../entities/CustomPostType.js';
import { CPT_PAGINATION, CPT_QUERY_DEFAULTS } from '../../../config/cpt.constants.js';
import logger from '../../../utils/logger.js';

/**
 * Post Module - Handles post-related operations
 * Part of the unified CPT service architecture
 */
export class PostModule {
  private get postRepository() {
    return AppDataSource.getRepository(CustomPost);
  }

  private get cptRepository() {
    return AppDataSource.getRepository(CustomPostType);
  }

  /**
   * Get posts by CPT with pagination and filtering
   */
  async getPostsByCPT(slug: string, options: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    search?: string;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
  } = {}) {
    try {
      const {
        page = CPT_PAGINATION.DEFAULT_PAGE,
        limit = CPT_PAGINATION.DEFAULT_LIMIT,
        status,
        search,
        orderBy = CPT_QUERY_DEFAULTS.ORDER_BY,
        order = CPT_QUERY_DEFAULTS.ORDER
      } = options;

      const queryBuilder = this.postRepository.createQueryBuilder('post');

      queryBuilder.where('post.cptSlug = :cptSlug', { cptSlug: slug });

      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      }

      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      queryBuilder.orderBy(`post.${orderBy}`, order.toUpperCase() as 'ASC' | 'DESC');
      queryBuilder.skip((page - 1) * limit);
      queryBuilder.take(limit);

      const [posts, total] = await queryBuilder.getManyAndCount();

      return {
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      logger.error('Error fetching posts by CPT:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  /**
   * Get post by ID
   */
  async getPostById(postId: string) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId }
      });

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      return {
        success: true,
        data: post
      };
    } catch (error: any) {
      logger.error('Error fetching post by ID:', error);
      throw new Error('Failed to fetch post');
    }
  }

  /**
   * Get multiple posts by IDs (batch operation)
   */
  async getPostsByIds(postIds: string[]) {
    try {
      if (postIds.length === 0) {
        return {
          success: true,
          data: []
        };
      }

      const posts = await this.postRepository
        .createQueryBuilder('post')
        .where('post.id IN (:...postIds)', { postIds })
        .getMany();

      return {
        success: true,
        data: posts
      };
    } catch (error: any) {
      logger.error('Error fetching posts by IDs:', error);
      throw new Error('Failed to fetch posts');
    }
  }

  /**
   * Create post for CPT
   */
  async createPost(slug: string, data: Partial<CustomPost>, userId: string) {
    try {
      // Verify CPT exists
      const cpt = await this.cptRepository.findOne({
        where: { slug }
      });

      if (!cpt) {
        return {
          success: false,
          error: 'Custom post type not found'
        };
      }

      const post = this.postRepository.create({
        ...data,
        cptSlug: slug,
        postTypeSlug: slug,
        authorId: userId
      });

      const savedPost = await this.postRepository.save(post);

      return {
        success: true,
        data: savedPost
      };
    } catch (error: any) {
      logger.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  /**
   * Update post
   */
  async updatePost(postId: string, data: Partial<CustomPost>) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId }
      });

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      Object.assign(post, data);
      const updatedPost = await this.postRepository.save(post);

      return {
        success: true,
        data: updatedPost
      };
    } catch (error: any) {
      logger.error('Error updating post:', error);
      throw new Error('Failed to update post');
    }
  }

  /**
   * Delete post
   */
  async deletePost(postId: string) {
    try {
      const post = await this.postRepository.findOne({
        where: { id: postId }
      });

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      await this.postRepository.remove(post);

      return {
        success: true,
        message: 'Post deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting post:', error);
      throw new Error('Failed to delete post');
    }
  }

  /**
   * Get all posts with meta data (supports batch loading)
   */
  async getPostsWithMeta(postIds: string[]) {
    try {
      const posts = await this.getPostsByIds(postIds);

      if (!posts.success) {
        return posts;
      }

      return {
        success: true,
        data: posts.data,
        // Meta data should be attached by the caller using meta.module
        meta: {
          total: posts.data.length
        }
      };
    } catch (error: any) {
      logger.error('Error fetching posts with meta:', error);
      throw new Error('Failed to fetch posts with meta');
    }
  }
}

export const postModule = new PostModule();
