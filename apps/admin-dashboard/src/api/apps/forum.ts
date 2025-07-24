import { api } from '../base';
import { apiEndpoints } from '@/config/apps.config';

export interface ForumStats {
  totalPosts: number;
  totalComments: number;
  activeUsers: number;
  todayPosts: number;
  pendingModeration: number;
}

export interface ForumPost {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  viewCount: number;
  commentCount: number;
  isPinned: boolean;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  order: number;
  parentId?: string;
}

export interface ForumModerationItem {
  id: string;
  type: 'post' | 'comment' | 'user';
  reason: string;
  reportedBy: {
    id: string;
    name: string;
  };
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

class ForumService {
  async getStats(): Promise<ForumStats> {
    const response = await api.get<ForumStats>(apiEndpoints.forum.stats);
    return response.data;
  }

  async getPosts(params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    status?: 'published' | 'draft' | 'archived';
  }) {
    const response = await api.get(apiEndpoints.forum.posts, { params });
    return response.data;
  }

  async getPost(id: string): Promise<ForumPost> {
    const response = await api.get<ForumPost>(`${apiEndpoints.forum.posts}/${id}`);
    return response.data;
  }

  async createPost(data: {
    title: string;
    content: string;
    categoryId: string;
    tags?: string[];
  }): Promise<ForumPost> {
    const response = await api.post<ForumPost>(apiEndpoints.forum.posts, data);
    return response.data;
  }

  async updatePost(id: string, data: Partial<ForumPost>): Promise<ForumPost> {
    const response = await api.put<ForumPost>(`${apiEndpoints.forum.posts}/${id}`, data);
    return response.data;
  }

  async deletePost(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.forum.posts}/${id}`);
  }

  async getCategories(): Promise<ForumCategory[]> {
    const response = await api.get<ForumCategory[]>(apiEndpoints.forum.categories);
    return response.data;
  }

  async createCategory(data: {
    name: string;
    slug: string;
    description?: string;
    parentId?: string;
  }): Promise<ForumCategory> {
    const response = await api.post<ForumCategory>(apiEndpoints.forum.categories, data);
    return response.data;
  }

  async updateCategory(id: string, data: Partial<ForumCategory>): Promise<ForumCategory> {
    const response = await api.put<ForumCategory>(`${apiEndpoints.forum.categories}/${id}`, data);
    return response.data;
  }

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.forum.categories}/${id}`);
  }

  async getModerationQueue(params?: {
    page?: number;
    limit?: number;
    type?: 'post' | 'comment' | 'user';
    status?: 'pending' | 'approved' | 'rejected';
  }) {
    const response = await api.get(apiEndpoints.forum.moderation, { params });
    return response.data;
  }

  async moderateContent(id: string, action: 'approve' | 'reject', reason?: string) {
    const response = await api.post(`${apiEndpoints.forum.moderation}/${id}`, {
      action,
      reason,
    });
    return response.data;
  }

  // Bulk operations
  async bulkDeletePosts(ids: string[]): Promise<void> {
    await api.post(`${apiEndpoints.forum.posts}/bulk/delete`, { ids });
  }

  async bulkMovePostsToCategory(postIds: string[], categoryId: string): Promise<void> {
    await api.post(`${apiEndpoints.forum.posts}/bulk/move`, {
      postIds,
      categoryId,
    });
  }
}

export const forumService = new ForumService();