import { AppDataSource } from '../../../database/connection';
import { Post } from '../../../entities/Post';
import { CustomPost } from '../../../entities/CustomPost';
import { metaDataService } from '../../../services/MetaDataService';
import { cptService } from './cpt.service';
import { acfService } from './acf.service';
import logger from '../../../utils/logger';

/**
 * Block Data Service - Optimized data service for block editor
 * Provides unified API for blocks to access CPT and ACF data
 */
export class BlockDataService {
  private postRepo = AppDataSource.getRepository(Post);
  private customPostRepo = AppDataSource.getRepository(CustomPost);

  // Cache configuration
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all block data for a post (optimized single query)
   */
  async getBlockData(postId: string, postType: 'post' | 'page' | 'custom' = 'post') {
    try {
      const cacheKey = `block-data:${postId}:${postType}`;

      // Check cache
      const cached = this.getCached(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: 'cache'
        };
      }

      let post: any;
      let featuredImage: string | null = null;
      let customFields: any = {};

      if (postType === 'custom') {
        // Custom post type
        post = await this.customPostRepo.findOne({
          where: { id: postId },
          relations: ['author']
        });

        if (post) {
          customFields = post.meta || {};
          featuredImage = customFields.featuredImage || null;
        }
      } else {
        // Regular post or page
        post = await this.postRepo.findOne({
          where: { id: postId, type: postType },
          relations: ['author']
        });

        if (post) {
          featuredImage = post.featured_media || null;
          customFields = post.meta || {};
        }
      }

      if (!post) {
        return {
          success: false,
          error: 'Post not found'
        };
      }

      // Get ACF field values
      const acfFields = {}; // TODO: Implement getAllMeta method in MetaDataService

      const blockData = {
        id: post.id,
        title: post.title,
        content: post.content,
        excerpt: post.excerpt,
        featuredImage,
        customFields: {
          ...(customFields || {}),
          ...acfFields
        },
        author: post.author,
        status: post.status,
        template: post.template,
        meta: post.meta,
        dynamicSources: this.extractDynamicSources(customFields, acfFields)
      };

      // Cache the result
      this.setCache(cacheKey, blockData);

      return {
        success: true,
        data: blockData,
        source: 'database'
      };
    } catch (error: any) {
      logger.error('Error fetching block data:', error);
      throw new Error('Failed to fetch block data');
    }
  }

  /**
   * Get featured image for a post
   */
  async getFeaturedImage(postId: string, postType: 'post' | 'page' | 'custom' = 'post') {
    try {
      const cacheKey = `featured-image:${postId}:${postType}`;

      // Check cache
      const cached = this.getCached(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          source: 'cache'
        };
      }

      let featuredImage: string | null = null;

      if (postType === 'custom') {
        const post = await this.customPostRepo.findOne({
          where: { id: postId },
          select: ['id', 'meta']
        });

        if (post?.meta && 'featuredImage' in post.meta) {
          featuredImage = post.meta.featuredImage as string;
        }
      } else {
        const post = await this.postRepo.findOne({
          where: { id: postId, type: postType },
          select: ['id', 'featured_media']
        });

        if (post?.featured_media) {
          featuredImage = post.featured_media;
        }
      }

      // Cache the result
      if (featuredImage) {
        this.setCache(cacheKey, featuredImage);
      }

      return {
        success: true,
        data: featuredImage,
        source: featuredImage ? 'database' : 'not-found'
      };
    } catch (error: any) {
      logger.error('Error fetching featured image:', error);
      throw new Error('Failed to fetch featured image');
    }
  }

  /**
   * Get specific ACF field value
   */
  async getACFField(postId: string, fieldName: string, entityType: string = 'post') {
    try {
      const cacheKey = `acf-field:${postId}:${fieldName}`;

      // Check cache
      const cached = this.getCached(cacheKey);
      if (cached !== null) {
        return {
          success: true,
          data: cached,
          source: 'cache'
        };
      }

      const value = await metaDataService.getMeta(entityType, postId, fieldName);

      // Cache the result
      if (value !== undefined) {
        this.setCache(cacheKey, value);
      }

      return {
        success: true,
        data: value,
        source: value !== undefined ? 'database' : 'not-found'
      };
    } catch (error: any) {
      logger.error('Error fetching ACF field:', error);
      throw new Error('Failed to fetch ACF field');
    }
  }

  /**
   * Get dynamic content for blocks
   */
  async getDynamicContent(request: {
    postId?: string;
    postType?: string;
    fields?: string[];
    includeACF?: boolean;
    includeMeta?: boolean;
  }) {
    try {
      const {
        postId,
        postType = 'post',
        fields = [],
        includeACF = true,
        includeMeta = true
      } = request;

      if (!postId) {
        return {
          success: false,
          error: 'Post ID is required'
        };
      }

      const result: any = {
        postId,
        postType
      };

      // Get specific fields if requested
      if (fields.length > 0) {
        for (const field of fields) {
          if (field === 'featuredImage') {
            const imageResult = await this.getFeaturedImage(postId, postType as any);
            result.featuredImage = imageResult.data;
          } else if (includeACF) {
            const fieldResult = await this.getACFField(postId, field, postType);
            result[field] = fieldResult.data;
          }
        }
      } else {
        // Get all data
        const blockDataResult = await this.getBlockData(postId, postType as any);
        if (blockDataResult.success) {
          result.data = blockDataResult.data;
        }
      }

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      logger.error('Error fetching dynamic content:', error);
      throw new Error('Failed to fetch dynamic content');
    }
  }

  /**
   * Clear cache for a specific post
   */
  clearCache(postId?: string) {
    if (postId) {
      // Clear all cache entries for this post
      for (const key of this.cache.keys()) {
        if (key.includes(postId)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }

    return {
      success: true,
      message: postId ? `Cache cleared for post ${postId}` : 'All cache cleared'
    };
  }

  /**
   * Private helper: Extract dynamic sources from fields
   */
  private extractDynamicSources(customFields: any, acfFields: any) {
    const sources: Record<string, any> = {};

    // Extract image sources
    const imageFields = ['featuredImage', 'backgroundImage', 'coverImage'];
    for (const field of imageFields) {
      if (customFields[field]) {
        sources[field] = customFields[field];
      }
      if (acfFields[field]) {
        sources[field] = acfFields[field];
      }
    }

    // Extract text sources
    const textFields = ['subtitle', 'tagline', 'description'];
    for (const field of textFields) {
      if (customFields[field]) {
        sources[field] = customFields[field];
      }
      if (acfFields[field]) {
        sources[field] = acfFields[field];
      }
    }

    return sources;
  }

  /**
   * Private helper: Get cached data
   */
  private getCached(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTTL) {
        return cached.data;
      }
      // Remove expired cache
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Private helper: Set cache
   */
  private setCache(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

// Export singleton instance
export const blockDataService = new BlockDataService();