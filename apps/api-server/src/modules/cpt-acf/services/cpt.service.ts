import { CustomPost, PostStatus } from '../../../entities/CustomPost.js';
import { CustomPostType } from '../../../entities/CustomPostType.js';
import { cptService as unifiedCPTService } from '../../../services/cpt/cpt.service.js';

/**
 * Legacy CPT Service - Delegates to unified service
 *
 * Phase 2 Migration: This service now delegates all operations to the unified
 * cpt.service.ts to maintain backward compatibility while consolidating logic.
 *
 * DO NOT add new methods here. Use the unified service directly instead.
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