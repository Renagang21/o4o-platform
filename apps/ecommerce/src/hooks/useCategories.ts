import { useQuery } from '@tanstack/react-query';
import { Category } from '@o4o/types';
import { api } from '@/lib/api';

// Fetch all categories
export const useCategories = (parentId?: string) => {
  return useQuery<Category[]>({
    queryKey: ['categories', parentId],
    queryFn: () => api.categories.getCategories(parentId)
  });
};

// Fetch single category
export const useCategory = (id: string) => {
  return useQuery<Category>({
    queryKey: ['category', id],
    queryFn: () => api.categories.getCategory(id),
    enabled: !!id
  });
};

// Fetch category by slug
export const useCategoryBySlug = (slug: string) => {
  return useQuery<Category>({
    queryKey: ['category', 'slug', slug],
    queryFn: () => api.categories.getCategoryBySlug(slug),
    enabled: !!slug
  });
};

// Fetch category tree
export const useCategoryTree = () => {
  return useQuery<Category[]>({
    queryKey: ['category-tree'],
    queryFn: api.categories.getCategoryTree
  });
};

// Fetch popular categories
export const usePopularCategories = (limit: number = 8) => {
  return useQuery<Category[]>({
    queryKey: ['popular-categories', limit],
    queryFn: () => api.categories.getPopularCategories(limit)
  });
};