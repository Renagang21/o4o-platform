/**
 * Blog API Service
 * Handles all blog-related API calls
 */

import apiClient from '../client';
import { PostItem, BlogSettings } from '@/types/customizer-types';

// API Response Types
export interface BlogPostsResponse {
  success: boolean;
  data: {
    posts: PostItem[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalPosts: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
  message?: string;
}

export interface BlogSettingsResponse {
  success: boolean;
  data: {
    settings: BlogSettings;
  };
  message?: string;
}

export interface BlogPostResponse {
  success: boolean;
  data: {
    post: PostItem;
  };
  message?: string;
}

// API Request Types
export interface BlogPostsParams {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'title' | 'views' | 'comments';
  order?: 'asc' | 'desc';
  category?: string;
  tag?: string;
  search?: string;
  author?: string;
  status?: 'published' | 'draft' | 'private';
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt?: string;
  featuredImage?: {
    url: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
  };
  categories: string[];
  tags: string[];
  status: 'published' | 'draft' | 'private';
  publishDate?: string;
}

export interface UpdatePostData extends Partial<CreatePostData> {
  id: string;
}

// Blog API
export const blogAPI = {
  // Get blog posts with filtering and pagination
  getPosts: (params?: BlogPostsParams) =>
    apiClient.get<BlogPostsResponse>('/v1/blog/posts', { params }),

  // Get a single blog post by ID or slug
  getPost: (identifier: string) =>
    apiClient.get<BlogPostResponse>(`/v1/blog/posts/${identifier}`),

  // Get blog customizer settings
  getSettings: () =>
    apiClient.get<BlogSettingsResponse>('/v1/blog/settings'),

  // Update blog customizer settings (admin only)
  updateSettings: (settings: BlogSettings) =>
    apiClient.put<BlogSettingsResponse>('/v1/blog/settings', { settings }),

  // Create a new blog post (admin only)
  createPost: (data: CreatePostData) =>
    apiClient.post<BlogPostResponse>('/v1/blog/posts', data),

  // Update an existing blog post (admin only)
  updatePost: (data: UpdatePostData) =>
    apiClient.put<BlogPostResponse>(`/v1/blog/posts/${data.id}`, data),

  // Delete a blog post (admin only)
  deletePost: (id: string) =>
    apiClient.delete(`/v1/blog/posts/${id}`),

  // Get blog categories
  getCategories: () =>
    apiClient.get('/v1/blog/categories'),

  // Get blog tags
  getTags: () =>
    apiClient.get('/v1/blog/tags'),

  // Get popular posts
  getPopularPosts: (limit: number = 5) =>
    apiClient.get<BlogPostsResponse>('/v1/blog/posts/popular', { 
      params: { limit } 
    }),

  // Get recent posts
  getRecentPosts: (limit: number = 5) =>
    apiClient.get<BlogPostsResponse>('/v1/blog/posts/recent', { 
      params: { limit } 
    }),

  // Get related posts for a specific post
  getRelatedPosts: (postId: string, limit: number = 3) =>
    apiClient.get<BlogPostsResponse>(`/v1/blog/posts/${postId}/related`, { 
      params: { limit } 
    }),

  // Search posts
  searchPosts: (query: string, params?: Omit<BlogPostsParams, 'search'>) =>
    apiClient.get<BlogPostsResponse>('/v1/blog/posts/search', { 
      params: { search: query, ...params } 
    }),

  // Get posts by category
  getPostsByCategory: (categorySlug: string, params?: Omit<BlogPostsParams, 'category'>) =>
    apiClient.get<BlogPostsResponse>(`/v1/blog/categories/${categorySlug}/posts`, { 
      params 
    }),

  // Get posts by tag
  getPostsByTag: (tagSlug: string, params?: Omit<BlogPostsParams, 'tag'>) =>
    apiClient.get<BlogPostsResponse>(`/v1/blog/tags/${tagSlug}/posts`, { 
      params 
    }),

  // Get posts by author
  getPostsByAuthor: (authorId: string, params?: Omit<BlogPostsParams, 'author'>) =>
    apiClient.get<BlogPostsResponse>(`/v1/blog/authors/${authorId}/posts`, { 
      params 
    }),

  // Increment post view count
  incrementViewCount: (postId: string) =>
    apiClient.post(`/v1/blog/posts/${postId}/view`),

  // Get blog archive data (posts grouped by date)
  getArchive: () =>
    apiClient.get('/v1/blog/archive'),

  // Get blog statistics (admin only)
  getStats: () =>
    apiClient.get('/v1/blog/stats')
};

// Export default
export default blogAPI;