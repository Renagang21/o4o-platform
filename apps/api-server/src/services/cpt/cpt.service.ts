import { AppDataSource } from '../../database/connection.js';
import { CustomPostType } from '../../entities/CustomPostType.js';
import { CustomPost, PostStatus } from '../../entities/CustomPost.js';
import { DEFAULT_CPTS } from '../../config/cpt.constants.js';
import logger from '../../utils/logger.js';

// Import modules
import { postModule } from './modules/post.module.js';
import { metaModule } from './modules/meta.module.js';
import { acfModule } from './modules/acf.module.js';

/**
 * Unified CPT Service - Single entry point for all CPT operations
 * Combines post, meta, and ACF operations in a modular architecture
 *
 * Phase 2 - Service Layer Unification
 * This service consolidates legacy post.service.ts and post-meta.service.ts
 */
export class CPTService {
  // Module instances
  public post = postModule;
  public meta = metaModule;
  public acf = acfModule;

  // Direct repository access
  private get cptRepository() {
    return AppDataSource.getRepository(CustomPostType);
  }

  private get postRepository() {
    return AppDataSource.getRepository(CustomPost);
  }

  // ============================================================================
  // CPT Type Management
  // ============================================================================

  /**
   * Get all Custom Post Types
   * Returns empty array if table doesn't exist (graceful degradation)
   */
  async getAllCPTs(active?: boolean) {
    try {
      const queryBuilder = this.cptRepository.createQueryBuilder('cpt');

      if (active !== undefined) {
        queryBuilder.where('cpt."isActive" = :active', { active });
      }

      queryBuilder.orderBy('cpt.name', 'ASC');

      const cpts = await queryBuilder.getMany();
      return {
        success: true,
        data: cpts,
        total: cpts.length
      };
    } catch (error: any) {
      // Graceful degradation: if table doesn't exist, return empty array
      // This happens when cms-core has not been installed yet
      const errorMessage = error?.message || '';
      if (errorMessage.includes('does not exist') ||
          errorMessage.includes('relation') ||
          error?.code === '42P01') { // PostgreSQL: undefined_table
        logger.warn('CPT table does not exist - cms-core may not be installed. Returning empty array.');
        return {
          success: true,
          data: [],
          total: 0
        };
      }
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
      await this.postRepository.delete({ cptSlug: slug });

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

  // ============================================================================
  // Post Management (Delegated to post module)
  // ============================================================================

  /**
   * Get posts by CPT
   * Delegates to post.module.ts
   */
  async getPostsByCPT(slug: string, options: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    search?: string;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
  } = {}) {
    return this.post.getPostsByCPT(slug, options);
  }

  /**
   * Get posts by CPT with meta data (batch loaded)
   * This method demonstrates the batch loading optimization
   */
  async getPostsByCPTWithMeta(slug: string, options: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    search?: string;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
    fieldIds?: string[];
  } = {}) {
    try {
      // Get posts
      const postsResult = await this.post.getPostsByCPT(slug, options);

      if (!postsResult.success || !postsResult.data) {
        return postsResult;
      }

      const posts = postsResult.data;
      const postIds = posts.map(post => post.id);

      // Batch load meta data (prevents N+1 query problem)
      const metaBatch = await this.meta.getPostMetaBatch(postIds, options.fieldIds);

      // Attach meta data to each post
      const postsWithMeta = posts.map(post => ({
        ...post,
        meta: metaBatch.get(post.id) || {}
      }));

      return {
        success: true,
        data: postsWithMeta,
        pagination: postsResult.pagination
      };
    } catch (error: any) {
      logger.error('Error fetching posts with meta:', error);
      throw new Error('Failed to fetch posts with meta');
    }
  }

  /**
   * Create post for CPT
   * Delegates to post.module.ts
   */
  async createPost(slug: string, data: Partial<CustomPost>, userId: string) {
    return this.post.createPost(slug, data, userId);
  }

  /**
   * Update post
   * Delegates to post.module.ts
   */
  async updatePost(postId: string, data: Partial<CustomPost>) {
    return this.post.updatePost(postId, data);
  }

  /**
   * Delete post
   * Delegates to post.module.ts
   */
  async deletePost(postId: string) {
    return this.post.deletePost(postId);
  }

  /**
   * Get post by ID
   * Delegates to post.module.ts
   */
  async getPostById(postId: string) {
    return this.post.getPostById(postId);
  }

  // ============================================================================
  // Meta Data Management (Delegated to meta module)
  // ============================================================================

  /**
   * Get post meta data
   * Delegates to meta.module.ts
   */
  async getPostMeta(postId: string, fieldIds?: string[]) {
    return this.meta.getPostMeta(postId, fieldIds);
  }

  /**
   * Get post meta batch (N+1 prevention)
   * Delegates to meta.module.ts
   */
  async getPostMetaBatch(postIds: string[], fieldIds?: string[]) {
    return this.meta.getPostMetaBatch(postIds, fieldIds);
  }

  /**
   * Set post meta data
   * Delegates to meta.module.ts
   */
  async setPostMeta(
    postId: string,
    fieldId: string,
    value: string | number | boolean | Date | null | string[] | Record<string, unknown>
  ) {
    return this.meta.setPostMeta(postId, fieldId, value);
  }

  /**
   * Set post meta batch
   * Delegates to meta.module.ts
   */
  async setPostMetaBatch(
    postId: string,
    values: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>
  ) {
    return this.meta.setPostMetaBatch(postId, values);
  }

  /**
   * Delete post meta
   * Delegates to meta.module.ts
   */
  async deletePostMeta(postId: string, fieldId?: string) {
    return this.meta.deletePostMeta(postId, fieldId);
  }

  // ============================================================================
  // ACF Management (Delegated to acf module)
  // ============================================================================

  /**
   * Get field groups
   * Delegates to acf.module.ts
   */
  async getFieldGroups() {
    return this.acf.getFieldGroups();
  }

  /**
   * Get field group by ID
   * Delegates to acf.module.ts
   */
  async getFieldGroup(id: string) {
    return this.acf.getFieldGroup(id);
  }

  /**
   * Create field group
   * Delegates to acf.module.ts
   */
  async createFieldGroup(data: any) {
    return this.acf.createFieldGroup(data);
  }

  /**
   * Update field group
   * Delegates to acf.module.ts
   */
  async updateFieldGroup(id: string, data: any) {
    return this.acf.updateFieldGroup(id, data);
  }

  /**
   * Delete field group
   * Delegates to acf.module.ts
   */
  async deleteFieldGroup(id: string) {
    return this.acf.deleteFieldGroup(id);
  }

  /**
   * Export field groups
   * Delegates to acf.module.ts
   */
  async exportFieldGroups(groupIds?: string[]) {
    return this.acf.exportFieldGroups(groupIds);
  }

  /**
   * Import field groups
   * Delegates to acf.module.ts
   */
  async importFieldGroups(data: any) {
    return this.acf.importFieldGroups(data);
  }
}

// Export singleton instance
export const cptService = new CPTService();
