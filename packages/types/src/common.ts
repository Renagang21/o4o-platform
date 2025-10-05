// Common types used across the platform
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Category type moved to ecommerce.ts to avoid conflicts

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Theme types
export type Theme = 'light' | 'dark' | 'system' | 'evening' | 'noon' | 'dusk' | 'afternoon' | 'twilight';

// Bulk actions types
export interface UseBulkActionsProps {
  onDelete?: (ids: string[]) => void;
  onStatusChange?: (ids: string[], status: string) => void;
  onBulkEdit?: (ids: string[]) => void;
}

// Contact info types
export interface ContactInfo {
  name: string;
  title: string;
  phone?: string;
  email?: string;
}

// API response types are now in api.ts to avoid duplicates

// Permission types
export interface PermissionObject {
  id: string;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: PermissionObject[];
  isSystem?: boolean;
  createdAt: Date;
  updatedAt: Date;
}