import { cptService as unifiedCPTService } from '../../../services/cpt/cpt.service.js';
import { metaDataService } from '../../../services/MetaDataService.js';

/**
 * ⚠️ DEPRECATED - Legacy ACF Service
 *
 * **DO NOT USE THIS SERVICE IN NEW CODE**
 *
 * This service is deprecated and maintained only for backward compatibility.
 * All methods delegate to the unified CPT service (cptService.acf or cptService methods).
 *
 * **Migration Path:**
 * Instead of:
 *   import { acfService } from './modules/cpt-acf/services/acf.service.js';
 *   acfService.getFieldGroups();
 *
 * Use:
 *   import { cptService } from './services/cpt/cpt.service.js';
 *   cptService.getFieldGroups();  // or cptService.acf.method()
 *
 * The unified service provides the same API with better performance and maintainability.
 *
 * **Removal Timeline:** This service will be removed in Phase P2.
 *
 * @deprecated Use unified CPT service from services/cpt/cpt.service.ts instead
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