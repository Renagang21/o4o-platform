import { metaDataService, ManyMetaResult } from '../../../services/MetaDataService.js';
import logger from '../../../utils/logger.js';

/**
 * Meta Module - Handles meta data operations
 * Part of the unified CPT service architecture
 */
export class MetaModule {
  /**
   * Get meta data for a single post
   */
  async getPostMeta(postId: string, fieldIds?: string[]) {
    try {
      const metaBatch = await metaDataService.getPostMetaBatch([postId], fieldIds);
      return {
        success: true,
        data: metaBatch[postId] || {}
      };
    } catch (error: any) {
      logger.error('Error fetching post meta:', error);
      throw new Error('Failed to fetch post meta');
    }
  }

  /**
   * Get meta data for multiple posts (batch operation to prevent N+1)
   * This is a key optimization for list pages
   */
  async getPostMetaBatch(postIds: string[], fieldIds?: string[]): Promise<Map<string, any>> {
    try {
      if (postIds.length === 0) {
        return new Map();
      }

      // Use the optimized batch loading from MetaDataService
      const metaBatch: ManyMetaResult = await metaDataService.getPostMetaBatch(postIds, fieldIds);

      // Convert to Map for easier access
      const resultMap = new Map<string, any>();
      for (const [postId, meta] of Object.entries(metaBatch)) {
        resultMap.set(postId, meta);
      }

      return resultMap;
    } catch (error: any) {
      logger.error('Error fetching post meta batch:', error);
      throw new Error('Failed to fetch post meta batch');
    }
  }

  /**
   * Set meta data for a post
   */
  async setPostMeta(
    postId: string,
    fieldId: string,
    value: string | number | boolean | Date | null | string[] | Record<string, unknown>
  ) {
    try {
      const success = await metaDataService.setMeta('post', postId, fieldId, value);

      if (!success) {
        return {
          success: false,
          error: 'Failed to set meta value'
        };
      }

      return {
        success: true,
        message: 'Meta value set successfully'
      };
    } catch (error: any) {
      logger.error('Error setting post meta:', error);
      throw new Error('Failed to set post meta');
    }
  }

  /**
   * Set multiple meta values for a post (batch operation)
   */
  async setPostMetaBatch(
    postId: string,
    values: Record<string, string | number | boolean | Date | null | string[] | Record<string, unknown>>
  ) {
    try {
      const success = await metaDataService.setManyMeta('post', postId, values);

      if (!success) {
        return {
          success: false,
          error: 'Failed to set meta values'
        };
      }

      return {
        success: true,
        message: 'Meta values set successfully'
      };
    } catch (error: any) {
      logger.error('Error setting post meta batch:', error);
      throw new Error('Failed to set post meta batch');
    }
  }

  /**
   * Delete meta data for a post
   */
  async deletePostMeta(postId: string, fieldId?: string) {
    try {
      let success: boolean;

      if (fieldId) {
        success = await metaDataService.deleteMetaField('post', postId, fieldId);
      } else {
        success = await metaDataService.deleteMeta('post', postId);
      }

      if (!success) {
        return {
          success: false,
          error: 'Failed to delete meta data'
        };
      }

      return {
        success: true,
        message: 'Meta data deleted successfully'
      };
    } catch (error: any) {
      logger.error('Error deleting post meta:', error);
      throw new Error('Failed to delete post meta');
    }
  }
}

export const metaModule = new MetaModule();
