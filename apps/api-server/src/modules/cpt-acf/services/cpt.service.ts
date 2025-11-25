import { CustomPost, PostStatus } from '../../../entities/CustomPost.js';
import { CustomPostType } from '../../../entities/CustomPostType.js';
import { cptService as unifiedCPTService } from '../../../services/cpt/cpt.service.js';

/**
 * ⚠️ DEPRECATED - Legacy CPT Service
 *
 * **DO NOT USE THIS SERVICE IN NEW CODE**
 *
 * This service is deprecated and maintained only for backward compatibility.
 * All methods delegate to the unified CPT service.
 *
 * **Migration Path:**
 * Instead of:
 *   import { cptService } from './modules/cpt-acf/services/cpt.service.js';
 *
 * Use:
 *   import { cptService } from './services/cpt/cpt.service.js';
 *
 * The unified service provides the same API with better performance and maintainability.
 *
 * **Removal Timeline:** This service will be removed in Phase P2.
 *
 * @deprecated Use unified CPT service from services/cpt/cpt.service.ts instead
 */
export class CPTService {
  /**
   * Get all Custom Post Types
   * @deprecated Use unifiedCPTService directly
   */
  async getAllCPTs(active?: boolean) {
    return unifiedCPTService.getAllCPTs(active);
  }

  /**
   * Get CPT by slug
   * @deprecated Use unifiedCPTService directly
   */
  async getCPTBySlug(slug: string) {
    return unifiedCPTService.getCPTBySlug(slug);
  }

  /**
   * Create new CPT
   * @deprecated Use unifiedCPTService directly
   */
  async createCPT(data: Partial<CustomPostType>) {
    return unifiedCPTService.createCPT(data);
  }

  /**
   * Update CPT by slug
   * @deprecated Use unifiedCPTService directly
   */
  async updateCPT(slug: string, data: Partial<CustomPostType>) {
    return unifiedCPTService.updateCPT(slug, data);
  }

  /**
   * Delete CPT by slug
   * @deprecated Use unifiedCPTService directly
   */
  async deleteCPT(slug: string) {
    return unifiedCPTService.deleteCPT(slug);
  }

  /**
   * Get posts by CPT
   * @deprecated Use unifiedCPTService directly
   */
  async getPostsByCPT(slug: string, options: {
    page?: number;
    limit?: number;
    status?: PostStatus;
    search?: string;
    orderBy?: string;
    order?: 'ASC' | 'DESC';
  } = {}) {
    return unifiedCPTService.getPostsByCPT(slug, options);
  }

  /**
   * Create post for CPT
   * @deprecated Use unifiedCPTService directly
   */
  async createPost(slug: string, data: Partial<CustomPost>, userId: string) {
    return unifiedCPTService.createPost(slug, data, userId);
  }

  /**
   * Update post
   * @deprecated Use unifiedCPTService directly
   */
  async updatePost(postId: string, data: Partial<CustomPost>) {
    return unifiedCPTService.updatePost(postId, data);
  }

  /**
   * Delete post
   * @deprecated Use unifiedCPTService directly
   */
  async deletePost(postId: string) {
    return unifiedCPTService.deletePost(postId);
  }

  /**
   * Initialize default CPTs
   * @deprecated Use unifiedCPTService directly
   */
  async initializeDefaults() {
    return unifiedCPTService.initializeDefaults();
  }
}

// Export singleton instance (maintains backward compatibility)
export const cptService = new CPTService();