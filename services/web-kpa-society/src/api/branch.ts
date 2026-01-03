/**
 * Branch API - 분회 전용 API 서비스
 */

import { apiClient } from './client';
import type { Notice, ForumPost, Comment, Groupbuy, Resource, Officer } from '../types';

// API 응답 타입
interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

interface BranchInfo {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  memberCount?: number;
  establishedDate?: string;
  region?: string;
}

interface ContactInfo {
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
  workingHours?: string;
}

interface ForumPostDetail {
  post: ForumPost;
  comments: Comment[];
}

// Helper to build query string
const buildQueryString = (params: Record<string, string | number | undefined>): string => {
  const parts: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  });
  return parts.length > 0 ? `?${parts.join('&')}` : '';
};

export const branchApi = {
  // Branch Info
  getBranchInfo: (branchId: string) =>
    apiClient.get<{ data: BranchInfo }>(`/branches/${branchId}`),

  // News
  getNews: (branchId: string, params: { category?: string; page?: number; limit?: number }) =>
    apiClient.get<{ data: PaginatedResult<Notice> }>(`/branches/${branchId}/news${buildQueryString(params)}`),

  getNewsDetail: (branchId: string, id: string) =>
    apiClient.get<{ data: Notice }>(`/branches/${branchId}/news/${id}`),

  // Forum
  getForumPosts: (branchId: string, params: { page?: number; limit?: number }) =>
    apiClient.get<{ data: PaginatedResult<ForumPost> }>(`/branches/${branchId}/forum/posts${buildQueryString(params)}`),

  getForumPostDetail: (branchId: string, id: string) =>
    apiClient.get<{ data: ForumPostDetail }>(`/branches/${branchId}/forum/posts/${id}`),

  createForumPost: (branchId: string, data: { title: string; content: string; categoryId: string }) =>
    apiClient.post<{ data: { id: string } }>(`/branches/${branchId}/forum/posts`, data),

  updateForumPost: (branchId: string, id: string, data: { title: string; content: string; categoryId: string }) =>
    apiClient.put<{ success: boolean }>(`/branches/${branchId}/forum/posts/${id}`, data),

  deleteForumPost: (branchId: string, id: string) =>
    apiClient.delete<{ success: boolean }>(`/branches/${branchId}/forum/posts/${id}`),

  createComment: (branchId: string, postId: string, data: { content: string }) =>
    apiClient.post<{ success: boolean }>(`/branches/${branchId}/forum/posts/${postId}/comments`, data),

  // Groupbuy
  getGroupbuys: (branchId: string, params: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ data: PaginatedResult<Groupbuy> }>(`/branches/${branchId}/groupbuys${buildQueryString(params)}`),

  getGroupbuyDetail: (branchId: string, id: string) =>
    apiClient.get<{ data: Groupbuy }>(`/branches/${branchId}/groupbuys/${id}`),

  participateGroupbuy: (branchId: string, id: string, data: { quantity: number }) =>
    apiClient.post<{ success: boolean }>(`/branches/${branchId}/groupbuys/${id}/participate`, data),

  getGroupbuyHistory: (branchId: string, params: { page?: number; limit?: number }) =>
    apiClient.get<{ data: PaginatedResult<Groupbuy> }>(`/branches/${branchId}/groupbuys/history${buildQueryString(params)}`),

  // Resources (Docs)
  getResources: (branchId: string, params: { page?: number; limit?: number; category?: string }) =>
    apiClient.get<{ data: PaginatedResult<Resource> }>(`/branches/${branchId}/resources${buildQueryString(params)}`),

  // Officers
  getOfficers: (branchId: string) =>
    apiClient.get<{ data: Officer[] }>(`/branches/${branchId}/officers`),

  // Contact
  getContactInfo: (branchId: string) =>
    apiClient.get<{ data: ContactInfo }>(`/branches/${branchId}/contact`),

  sendContactMessage: (branchId: string, data: { name: string; email: string; phone?: string; message: string }) =>
    apiClient.post<{ success: boolean }>(`/branches/${branchId}/contact`, data),
};
