import { authClient } from '@o4o/auth-client';
import type {
  FormPreset,
  ViewPreset,
  TemplatePreset,
  CreateFormPresetRequest,
  CreateViewPresetRequest,
  CreateTemplatePresetRequest,
  UpdateFormPresetRequest,
  UpdateViewPresetRequest,
  UpdateTemplatePresetRequest,
  PresetListResponse,
  PresetResponse,
  PresetQueryOptions
} from '@o4o/types';

/**
 * API client for CPT/ACF Presets
 * Uses authClient for authenticated requests
 */

// ==================== Form Presets ====================

export const formPresetsApi = {
  /**
   * Get all form presets
   */
  list: async (options?: PresetQueryOptions): Promise<PresetListResponse<FormPreset>> => {
    const params = new URLSearchParams();
    if (options?.cptSlug) params.append('cptSlug', options.cptSlug);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.orderBy) params.append('orderBy', options.orderBy);
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = `/presets/forms${queryString ? `?${queryString}` : ''}`;

    const response = await authClient.api.get(url);
    return response.data;
  },

  /**
   * Get a single form preset by ID
   */
  get: async (id: string): Promise<PresetResponse<FormPreset>> => {
    const response = await authClient.api.get(`/presets/forms/${id}`);
    return response.data;
  },

  /**
   * Create a new form preset
   */
  create: async (data: CreateFormPresetRequest): Promise<PresetResponse<FormPreset>> => {
    const response = await authClient.api.post('/presets/forms', data);
    return response.data;
  },

  /**
   * Update an existing form preset
   */
  update: async (id: string, data: UpdateFormPresetRequest): Promise<PresetResponse<FormPreset>> => {
    const response = await authClient.api.put(`/presets/forms/${id}`, data);
    return response.data;
  },

  /**
   * Delete a form preset
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await authClient.api.delete(`/presets/forms/${id}`);
    return response.data;
  }
};

// ==================== View Presets ====================

export const viewPresetsApi = {
  /**
   * Get all view presets
   */
  list: async (options?: PresetQueryOptions): Promise<PresetListResponse<ViewPreset>> => {
    const params = new URLSearchParams();
    if (options?.cptSlug) params.append('cptSlug', options.cptSlug);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.orderBy) params.append('orderBy', options.orderBy);
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = `/presets/views${queryString ? `?${queryString}` : ''}`;

    const response = await authClient.api.get(url);
    return response.data;
  },

  /**
   * Get a single view preset by ID
   */
  get: async (id: string): Promise<PresetResponse<ViewPreset>> => {
    const response = await authClient.api.get(`/presets/views/${id}`);
    return response.data;
  },

  /**
   * Create a new view preset
   */
  create: async (data: CreateViewPresetRequest): Promise<PresetResponse<ViewPreset>> => {
    const response = await authClient.api.post('/presets/views', data);
    return response.data;
  },

  /**
   * Update an existing view preset
   */
  update: async (id: string, data: UpdateViewPresetRequest): Promise<PresetResponse<ViewPreset>> => {
    const response = await authClient.api.put(`/presets/views/${id}`, data);
    return response.data;
  },

  /**
   * Delete a view preset
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await authClient.api.delete(`/presets/views/${id}`);
    return response.data;
  }
};

// ==================== Template Presets ====================

export const templatePresetsApi = {
  /**
   * Get all template presets
   */
  list: async (options?: PresetQueryOptions): Promise<PresetListResponse<TemplatePreset>> => {
    const params = new URLSearchParams();
    if (options?.cptSlug) params.append('cptSlug', options.cptSlug);
    if (options?.isActive !== undefined) params.append('isActive', String(options.isActive));
    if (options?.page) params.append('page', String(options.page));
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.orderBy) params.append('orderBy', options.orderBy);
    if (options?.order) params.append('order', options.order);

    const queryString = params.toString();
    const url = `/presets/templates${queryString ? `?${queryString}` : ''}`;

    const response = await authClient.api.get(url);
    return response.data;
  },

  /**
   * Get a single template preset by ID
   */
  get: async (id: string): Promise<PresetResponse<TemplatePreset>> => {
    const response = await authClient.api.get(`/presets/templates/${id}`);
    return response.data;
  },

  /**
   * Create a new template preset
   */
  create: async (data: CreateTemplatePresetRequest): Promise<PresetResponse<TemplatePreset>> => {
    const response = await authClient.api.post('/presets/templates', data);
    return response.data;
  },

  /**
   * Update an existing template preset
   */
  update: async (id: string, data: UpdateTemplatePresetRequest): Promise<PresetResponse<TemplatePreset>> => {
    const response = await authClient.api.put(`/presets/templates/${id}`, data);
    return response.data;
  },

  /**
   * Delete a template preset
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    const response = await authClient.api.delete(`/presets/templates/${id}`);
    return response.data;
  }
};
