import { AppDataSource } from '../../../database/connection';
import { CustomPostType, FieldGroup, FieldSchema } from '../../../entities/CustomPostType';
import { CustomPost, PostStatus } from '../../../entities/CustomPost';
import { WordPressTransformer } from '../../../utils/wordpress-transformer';
import { metaDataService } from '../../../services/MetaDataService';
import { In } from 'typeorm';
import logger from '../../../utils/logger';
import { CPT_PAGINATION, CPT_QUERY_DEFAULTS, DEFAULT_CPTS } from '../../../config/cpt.constants';

/**
 * CPT Service - Business logic layer for Custom Post Types
 * Follows the pattern from affiliate module
 */
export class CPTService {
  private get cptRepository() {
    return AppDataSource.getRepository(CustomPostType);
  }
  private get postRepository() {
    return AppDataSource.getRepository(CustomPost);
  }

  /**
   * Get all Custom Post Types
   */
  async getAllCPTs(active?: boolean) {
    try {
      const queryBuilder = this.cptRepository.createQueryBuilder('cpt');

      if (active !== undefined) {
        queryBuilder.where('cpt.active = :active', { active });
      }

      queryBuilder.orderBy('cpt.name', 'ASC');

      const cpts = await queryBuilder.getMany();
      return {
        success: true,
        data: cpts,
        total: cpts.length
      };
    } catch (error: any) {
      logger.error('Error fetching CPTs:', error);
      throw new Error('Failed to fetch custom post types');
    }
  }

  /**
   * Get CPT by slug
   */
  async getCPTBySlug(slug: string) {
    try {
      const cpt = await this.cptRepository.findOne({
        where: { slug }
      });

      if (!cpt) {
        return {
          success: false,
          error: 'Custom post type not found'
        };
      }

      return {
        success: true,
        data: cpt
      };
    } catch (error: any) {
      logger.error('Error fetching CPT by slug:', error);
      throw new Error('Failed to fetch custom post type');
    }
  }

  /**
   * Create new CPT
   */
  async createCPT(data: Partial<CustomPostType>) {
    try {
      // Check if slug already exists
      const existing = await this.cptRepository.findOne({
        where: { slug: data.slug }
      });

      if (existing) {
        return {
          success: false,
          error: 'Custom post type with this slug already exists'
        };
      }

      const cpt = this.cptRepository.create(data);
      const savedCPT = await this.cptRepository.save(cpt);

      return {
        success: true,
        data: savedCPT
      };
    } catch (error: any) {
      logger.error('Error creating CPT:', error);
      throw new Error('Failed to create custom post type');
    }
  }

  /**
   * Update CPT by slug
   */
  async updateCPT(slug: string, data: Partial<CustomPostType>) {
    try {
      const cpt = await this.cptRepository.findOne({
        where: { slug }
      });

      if (!cpt) {
        return {
          success: false,
          error: 'Custom post type not found'
        };
      }

      Object.assign(cpt, data);
      const updatedCPT = await this.cptRepository.save(cpt);

      return {
        success: true,
        data: updatedCPT
      };
    } catch (error: any) {
      logger.error('Error updating CPT:', error);
      throw new Error('Failed to update custom post type');
    }
  }

  /**
   * Delete CPT by slug
   */
  async deleteCPT(slug: string) {
    try {
      const cpt = await this.cptRepository.findOne({
        where: { slug }
      });

      if (!cpt) {
        return {
          success: false,
          error: 'Custom post type not found'
        };
      }

      // Delete all posts of this type
      await this.postRepository.delete({ postTypeSlug: slug });

      // Delete the CPT
      await this.cptRepository.remove(cpt);

      return {
        success: true,
        message: 'Custom post type deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting CPT:', error);
      throw new Error('Failed to delete custom post type');
    }
  }

  /**
   * Get posts by CPT
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

      queryBuilder.where('post.postTypeSlug = :postTypeSlug', { postTypeSlug: slug });

      if (status) {
        queryBuilder.andWhere('post.status = :status', { status });
      }

      if (search) {
        queryBuilder.andWhere(
          '(post.title ILIKE :search OR post.content ILIKE :search)',
          { search: `%${search}%` }
        );
      }

      queryBuilder.orderBy(`post.${orderBy}`, order);
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
   * Initialize default CPTs
   */
  async initializeDefaults() {
    try {
      const existingCount = await this.cptRepository.count();

      if (existingCount > 0) {
        return {
          success: true,
          message: 'Default CPTs already initialized'
        };
      }

      const created = [];
      for (const cptData of DEFAULT_CPTS) {
        const cpt = this.cptRepository.create(cptData);
        const saved = await this.cptRepository.save(cpt);
        created.push(saved);
      }

      return {
        success: true,
        data: created,
        message: 'Default CPTs initialized successfully'
      };
    } catch (error: any) {
      logger.error('Error initializing default CPTs:', error);
      throw new Error('Failed to initialize default CPTs');
    }
  }
}

// Export singleton instance
export const cptService = new CPTService();