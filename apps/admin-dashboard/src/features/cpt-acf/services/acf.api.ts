/**
 * ACF API Service
 * Handles all API calls related to Advanced Custom Fields
 */

import { authClient } from '@o4o/auth-client';
import {
  FieldGroup,
  FieldValue,
  ACFApiResponse,
  CreateFieldGroupDto,
  UpdateFieldGroupDto,
  SaveFieldValuesDto,
  ExportFieldGroupsDto,
  ImportFieldGroupsDto
} from '../types/acf.types';

const API_BASE = '/acf';

/**
 * ACF Field Group Management
 */
export const acfGroupApi = {
  // Get all field groups
  async getAllGroups(): Promise<ACFApiResponse<FieldGroup[]>> {
    const response = await authClient.api.get(`${API_BASE}/custom-field-groups`);
    return response.data;
  },

  // Get single field group
  async getGroup(id: string): Promise<ACFApiResponse<FieldGroup>> {
    const response = await authClient.api.get(`${API_BASE}/custom-field-groups/${id}`);
    return response.data;
  },

  // Create field group
  async createGroup(data: CreateFieldGroupDto): Promise<ACFApiResponse<FieldGroup>> {
    const response = await authClient.api.post(`${API_BASE}/custom-field-groups`, data);
    return response.data;
  },

  // Update field group
  async updateGroup(id: string, data: UpdateFieldGroupDto): Promise<ACFApiResponse<FieldGroup>> {
    const response = await authClient.api.put(`${API_BASE}/custom-field-groups/${id}`, data);
    return response.data;
  },

  // Delete field group
  async deleteGroup(id: string): Promise<ACFApiResponse<void>> {
    const response = await authClient.api.delete(`${API_BASE}/custom-field-groups/${id}`);
    return response.data;
  },

  // Export field groups
  async exportGroups(data?: ExportFieldGroupsDto): Promise<ACFApiResponse<FieldGroup[]>> {
    const response = await authClient.api.post(`${API_BASE}/custom-fields/export`, data || {});
    return response.data;
  },

  // Import field groups
  async importGroups(data: ImportFieldGroupsDto): Promise<ACFApiResponse<FieldGroup[]>> {
    const response = await authClient.api.post(`${API_BASE}/custom-fields/import`, data);
    return response.data;
  }
};

/**
 * ACF Field Value Management
 */
export const acfValueApi = {
  // Get field values for entity
  async getValues(
    entityType: string,
    entityId: string
  ): Promise<ACFApiResponse<Record<string, any>>> {
    const response = await authClient.api.get(
      `${API_BASE}/custom-fields/${entityType}/${entityId}`
    );
    return response.data;
  },

  // Save field values for entity
  async saveValues(
    entityType: string,
    entityId: string,
    values: SaveFieldValuesDto
  ): Promise<ACFApiResponse<Record<string, any>>> {
    const response = await authClient.api.post(
      `${API_BASE}/custom-fields/${entityType}/${entityId}`,
      values
    );
    return response.data;
  },

  // Get single field value
  async getValue(
    entityType: string,
    entityId: string,
    fieldName: string
  ): Promise<ACFApiResponse<any>> {
    const response = await authClient.api.get(
      `${API_BASE}/custom-fields/${entityType}/${entityId}/${fieldName}`
    );
    return response.data;
  },

  // Update single field value
  async updateValue(
    entityType: string,
    entityId: string,
    fieldName: string,
    value: any
  ): Promise<ACFApiResponse<any>> {
    const response = await authClient.api.put(
      `${API_BASE}/custom-fields/${entityType}/${entityId}/${fieldName}`,
      { value }
    );
    return response.data;
  }
};

/**
 * ACF Field Utilities
 */
export const acfUtilsApi = {
  // Get fields by location
  async getFieldsByLocation(
    param: string,
    value: string
  ): Promise<ACFApiResponse<FieldGroup[]>> {
    const response = await authClient.api.get(
      `${API_BASE}/custom-fields/location`,
      {
        params: { param, value }
      }
    );
    return response.data;
  },

  // Validate field value
  async validateValue(
    fieldId: string,
    value: any
  ): Promise<ACFApiResponse<{ valid: boolean; errors?: string[] }>> {
    const response = await authClient.api.post(
      `${API_BASE}/custom-fields/validate`,
      { fieldId, value }
    );
    return response.data;
  },

  // Get field schema
  async getFieldSchema(
    fieldType: string
  ): Promise<ACFApiResponse<any>> {
    const response = await authClient.api.get(
      `${API_BASE}/custom-fields/schema/${fieldType}`
    );
    return response.data;
  }
};

/**
 * ACF Location Management
 */
export const acfLocationApi = {
  // Get available values for a location parameter
  async getLocationValues(
    param: string
  ): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    const response = await authClient.api.get(
      `${API_BASE}/location/values/${param}`
    );
    return response.data;
  },

  // Get user roles for location rules
  async getUserRoles(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    const response = await authClient.api.get('/api/v1/roles');
    // Transform role definitions to value/label pairs
    const roles = response.data?.data || response.data || [];
    return {
      success: true,
      data: roles.map((role: any) => ({
        value: role.name || role.id,
        label: role.displayName || role.name || role.id
      }))
    };
  },

  // Get post types for location rules
  async getPostTypes(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    const response = await authClient.api.get('/cpt/custom-post-types');
    const types = response.data?.data || response.data || [];
    return {
      success: true,
      data: types.map((type: any) => ({
        value: type.name || type.slug,
        label: type.label || type.name || type.slug
      }))
    };
  },

  // Get taxonomies for location rules
  async getTaxonomies(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    const response = await authClient.api.get('/api/v1/taxonomies');
    const taxonomies = response.data?.data || response.data || [];
    return {
      success: true,
      data: taxonomies.map((tax: any) => ({
        value: tax.name || tax.slug,
        label: tax.label || tax.name || tax.slug
      }))
    };
  },

  // Get categories for location rules
  async getCategories(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    const response = await authClient.api.get('/api/v1/posts/categories');
    const categories = response.data?.data || response.data || [];
    return {
      success: true,
      data: categories.map((cat: any) => ({
        value: cat.id || cat.slug,
        label: cat.name || cat.slug
      }))
    };
  },

  // Get page templates for location rules
  async getPageTemplates(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    // This would come from theme or config
    return {
      success: true,
      data: [
        { value: 'default', label: 'Default Template' },
        { value: 'full-width', label: 'Full Width' },
        { value: 'sidebar-left', label: 'Sidebar Left' },
        { value: 'sidebar-right', label: 'Sidebar Right' },
        { value: 'landing-page', label: 'Landing Page' },
      ]
    };
  },

  // Get post templates for location rules
  async getPostTemplates(): Promise<ACFApiResponse<Array<{ value: string; label: string }>>> {
    // This would come from theme or config
    return {
      success: true,
      data: [
        { value: 'default', label: 'Default Template' },
        { value: 'featured', label: 'Featured Post' },
        { value: 'gallery', label: 'Gallery Post' },
        { value: 'video', label: 'Video Post' },
      ]
    };
  }
};

// Export combined API
export default {
  groups: acfGroupApi,
  values: acfValueApi,
  utils: acfUtilsApi,
  location: acfLocationApi
};