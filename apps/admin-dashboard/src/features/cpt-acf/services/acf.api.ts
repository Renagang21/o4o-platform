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

const API_BASE = '/api/acf';

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

// Export combined API
export default {
  groups: acfGroupApi,
  values: acfValueApi,
  utils: acfUtilsApi
};