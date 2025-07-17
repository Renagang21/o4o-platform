import axiosInstance from '../config/axios';

// Content API response types
export interface TemplateBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface TemplateResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    blocks: TemplateBlock[];
    metadata: {
      version: string;
      layoutType: string;
      updatedAt: string;
    };
  };
}

export interface PageResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    content: string;
    blocks: TemplateBlock[] | null;
    metadata: {
      excerpt: string;
      featuredImage: string | null;
      seo: {
        metaTitle: string;
        metaDescription: string;
        metaKeywords: string;
      };
      updatedAt: string;
    };
  };
}

export interface PostResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    content: string;
    customFields: Record<string, unknown>;
    metadata: {
      excerpt: string;
      featuredImage: string | null;
      seo: {
        metaTitle: string;
        metaDescription: string;
        metaKeywords: string;
      };
      updatedAt: string;
    };
  };
}

// Content API client
export const contentApi = {
  // Get homepage template
  getHomepageTemplate: async (): Promise<TemplateResponse> => {
    const response = await axiosInstance.get('/api/public/templates/homepage');
    return response.data;
  },

  // Get page by slug
  getPageBySlug: async (slug: string): Promise<PageResponse> => {
    const response = await axiosInstance.get(`/api/public/pages/${slug}`);
    return response.data;
  },

  // Get template by type
  getTemplateByType: async (type: string): Promise<TemplateResponse> => {
    const response = await axiosInstance.get(`/api/public/templates/${type}`);
    return response.data;
  },

  // Get custom post by type and slug
  getPostByTypeAndSlug: async (type: string, slug: string): Promise<PostResponse> => {
    const response = await axiosInstance.get(`/api/public/posts/${type}/${slug}`);
    return response.data;
  },
};

// React Query hooks
import { useQuery } from '@tanstack/react-query';

export const useHomepageTemplate = () => {
  return useQuery({
    queryKey: ['homepage-template'],
    queryFn: contentApi.getHomepageTemplate,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const usePage = (slug: string) => {
  return useQuery({
    queryKey: ['page', slug],
    queryFn: () => contentApi.getPageBySlug(slug),
    enabled: !!slug,
  });
};

export const useTemplate = (type: string) => {
  return useQuery({
    queryKey: ['template', type],
    queryFn: () => contentApi.getTemplateByType(type),
    enabled: !!type,
  });
};

export const usePost = (type: string, slug: string) => {
  return useQuery({
    queryKey: ['post', type, slug],
    queryFn: () => contentApi.getPostByTypeAndSlug(type, slug),
    enabled: !!type && !!slug,
  });
};