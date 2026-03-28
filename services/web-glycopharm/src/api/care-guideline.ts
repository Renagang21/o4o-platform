/**
 * Care Guideline API Client — GlycoPharm
 * WO-O4O-CARE-GUIDELINE-SEARCH-V1
 */

import { api } from '@/lib/apiClient';

export interface GuidelineItem {
  id: string;
  title: string;
  summary: string | null;
  metadata: Record<string, any>;
  imageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string | null;
  isPinned: boolean;
  sortOrder: number;
}

export interface GuidelineDetail extends GuidelineItem {
  body: string | null;
  bodyBlocks: Record<string, unknown> | null;
  attachments: any[] | null;
}

export const careGuidelineApi = {
  async search(params?: {
    q?: string;
    target?: 'patient' | 'pharmacist';
    tags?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: GuidelineItem[]; pagination: { total: number; limit: number; offset: number } }> {
    const sp = new URLSearchParams();
    if (params?.q) sp.set('q', params.q);
    if (params?.target) sp.set('target', params.target);
    if (params?.tags) sp.set('tags', params.tags);
    if (params?.limit) sp.set('limit', String(params.limit));
    if (params?.offset) sp.set('offset', String(params.offset));
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get(`/care/guidelines${qs}`);
    return res.data;
  },

  async getById(id: string): Promise<{ data: GuidelineDetail }> {
    const res = await api.get(`/care/guidelines/${id}`);
    return res.data;
  },
};
