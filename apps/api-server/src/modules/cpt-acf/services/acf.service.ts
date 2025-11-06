import { cptService as unifiedCPTService } from '../../../services/cpt/cpt.service.js';
import { metaDataService } from '../../../services/MetaDataService.js';

/**
 * Legacy ACF Service - Delegates to unified service
 *
 * Phase 2 Migration: This service now delegates all operations to the unified
 * cpt.service.ts (acf module) to maintain backward compatibility while consolidating logic.
 *
 * DO NOT add new methods here. Use the unified service directly instead.
 */
export class ACFService {
  /**
   * Get all field groups
   * @deprecated Use unifiedCPTService.acf directly
   */
  async getFieldGroups() {
    return unifiedCPTService.getFieldGroups();
  }

  /**
   * Get field group by ID
   * @deprecated Use unifiedCPTService.acf directly
   */
  async getFieldGroup(id: string) {
    return unifiedCPTService.getFieldGroup(id);
  }

  /**
   * Create field group
   * @deprecated Use unifiedCPTService.acf directly
   */
  async createFieldGroup(data: any) {
    return unifiedCPTService.createFieldGroup(data);
  }

  /**
   * Update field group
   * @deprecated Use unifiedCPTService.acf directly
   */
  async updateFieldGroup(id: string, data: any) {
    return unifiedCPTService.updateFieldGroup(id, data);
  }

  /**
   * Delete field group
   * @deprecated Use unifiedCPTService.acf directly
   */
  async deleteFieldGroup(id: string) {
    return unifiedCPTService.deleteFieldGroup(id);
  }

  /**
   * Get field values for an entity
   * @deprecated Use metaDataService or unifiedCPTService.meta directly
   */
  async getFieldValues(entityType: string, entityId: string) {
    try {
      const values = {}; // TODO: Implement getAllMeta method in MetaDataService

      return {
        success: true,
        data: values
      };
    } catch (error: any) {
      throw new Error('Failed to fetch field values');
    }
  }

  /**
   * Save field values for an entity
   * @deprecated Use metaDataService or unifiedCPTService.meta directly
   */
  async saveFieldValues(entityType: string, entityId: string, values: any) {
    try {
      const results = [];

      for (const [fieldName, value] of Object.entries(values)) {
        const saved = await metaDataService.setMeta(
          entityType,
          entityId,
          fieldName,
          value as string | number | boolean | Date | string[] | Record<string, unknown>
        );
        results.push({ fieldName, success: true });
      }

      return {
        success: true,
        data: results,
        message: 'Field values saved successfully'
      };
    } catch (error: any) {
      throw new Error('Failed to save field values');
    }
  }

  /**
   * Export field groups
   * @deprecated Use unifiedCPTService.acf directly
   */
  async exportFieldGroups(groupIds?: string[]) {
    return unifiedCPTService.exportFieldGroups(groupIds);
  }

  /**
   * Import field groups
   * @deprecated Use unifiedCPTService.acf directly
   */
  async importFieldGroups(data: any) {
    return unifiedCPTService.importFieldGroups(data);
  }
}

// Export singleton instance (maintains backward compatibility)
export const acfService = new ACFService();