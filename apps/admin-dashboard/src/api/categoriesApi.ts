import { apiClient } from './client';
import { Category, Tag } from '@o4o/types';
import { ApiResponse } from '@/types';

// Categories API
export const categoriesApi = {
  // Get all categories
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<ApiResponse<Category[]>>('/api/categories');
    return response.data.data || [];
  },

  // Get single category
  getCategory: async (id: string): Promise<Category> => {
    const response = await apiClient.get<ApiResponse<Category>>(`/api/categories/${id}`);
    return response.data.data!;
  },

  // Create category
  createCategory: async (data: Partial<Category>): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>('/api/categories', data);
    return response.data.data!;
  },

  // Update category
  updateCategory: async (id: string, data: Partial<Category>): Promise<Category> => {
    const response = await apiClient.put<ApiResponse<Category>>(`/api/categories/${id}`, data);
    return response.data.data!;
  },

  // Delete category
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/categories/${id}`);
  }
};

// Tags API
export const tagsApi = {
  // Get all tags
  getTags: async (): Promise<Tag[]> => {
    const response = await apiClient.get<ApiResponse<Tag[]>>('/api/tags');
    return response.data.data || [];
  },

  // Get single tag
  getTag: async (id: string): Promise<Tag> => {
    const response = await apiClient.get<ApiResponse<Tag>>(`/api/tags/${id}`);
    return response.data.data!;
  },

  // Create tag
  createTag: async (data: Partial<Tag>): Promise<Tag> => {
    const response = await apiClient.post<ApiResponse<Tag>>('/api/tags', data);
    return response.data.data!;
  },

  // Update tag
  updateTag: async (id: string, data: Partial<Tag>): Promise<Tag> => {
    const response = await apiClient.put<ApiResponse<Tag>>(`/api/tags/${id}`, data);
    return response.data.data!;
  },

  // Delete tag
  deleteTag: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/tags/${id}`);
  },

  // Search tags (for autocomplete)
  searchTags: async (query: string): Promise<Tag[]> => {
    const response = await apiClient.get<ApiResponse<Tag[]>>('/api/tags/search', {
      params: { q: query }
    });
    return response.data.data || [];
  }
};