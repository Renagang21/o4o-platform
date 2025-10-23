import { authClient } from '@o4o/auth-client';

// Types
export interface AIReference {
  id: string;
  type: 'blocks' | 'shortcodes' | 'image-prompts';
  name: string;
  description: string;
  content: string;
  format: 'markdown' | 'json';
  version: string;
  schemaVersion: string;
  appSlug: string | null;
  status: 'active' | 'draft' | 'archived';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateReferenceDto {
  type: string;
  name: string;
  description: string;
  content: string;
  format?: string;
  version: string;
  status: string;
  appSlug?: string | null;
}

export interface UpdateReferenceDto {
  name?: string;
  description?: string;
  content?: string;
  version?: string;
  status?: string;
}

class AIReferencesApi {
  /**
   * Get all AI references
   */
  async list(params?: { type?: string; status?: string }): Promise<AIReference[]> {
    try {
      const response = await authClient.api.get('/api/v1/ai/references', { params });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching AI references:', error);
      return [];
    }
  }

  /**
   * Get reference by ID
   */
  async get(id: string): Promise<AIReference | null> {
    try {
      const response = await authClient.api.get(`/api/v1/ai/references/${id}`);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error fetching reference ${id}:`, error);
      return null;
    }
  }

  /**
   * Create a new reference
   */
  async create(data: CreateReferenceDto): Promise<AIReference | null> {
    try {
      const response = await authClient.api.post('/api/v1/ai/references', data);
      return response.data?.data || null;
    } catch (error) {
      console.error('Error creating reference:', error);
      throw error;
    }
  }

  /**
   * Update a reference
   */
  async update(id: string, data: UpdateReferenceDto): Promise<AIReference | null> {
    try {
      const response = await authClient.api.put(`/api/v1/ai/references/${id}`, data);
      return response.data?.data || null;
    } catch (error) {
      console.error(`Error updating reference ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a reference
   */
  async delete(id: string): Promise<void> {
    try {
      await authClient.api.delete(`/api/v1/ai/references/${id}`);
    } catch (error) {
      console.error(`Error deleting reference ${id}:`, error);
      throw error;
    }
  }
}

export const aiReferencesApi = new AIReferencesApi();
