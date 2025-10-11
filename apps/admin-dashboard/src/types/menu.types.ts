import type React from 'react';

/**
 * Menu system type definitions
 * Provides comprehensive type safety for the entire menu management system
 */

// Role system types
export interface Role {
  value: string;
  label: string;
}

export interface RoleOption extends Role {}

// Content item types (for menu item selection)
export interface ContentItem {
  id: string;
  title: string;
  type: 'page' | 'post' | 'category' | 'tag' | 'custom' | 'archive';
  url: string;
}

export interface Page extends ContentItem {
  type: 'page';
  slug: string;
}

export interface Post extends ContentItem {
  type: 'post';
  slug: string;
}

export interface Category extends ContentItem {
  type: 'category';
  slug: string;
  name: string;
}

export interface TagItem extends ContentItem {
  type: 'tag';
  slug: string;
  name: string;
}

// Menu location types
export type MenuLocationKey = 'primary' | 'footer' | 'mobile' | 'social';
export type MenuLocationColor = 'blue' | 'gray' | 'green' | 'purple';

export interface MenuLocationConfig {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: MenuLocationColor;
}

export type MenuLocations = Record<MenuLocationKey, MenuLocationConfig>;

// Menu item types (matching backend enum)
export type MenuItemType = 'custom' | 'page' | 'post' | 'category' | 'tag' | 'archive';
export type MenuItemTarget = '_self' | '_blank' | '_parent' | '_top';

// API response types
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  status: 'success' | 'error';
  data: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface ContentApiResponse<T> {
  data: ApiResponse<T[]>;
}

// Menu item save data (for API calls)
export interface MenuItemSaveData {
  menu_id: string;
  parent_id?: string;
  title: string;
  url?: string;
  target: MenuItemTarget;
  type: MenuItemType;
  object_id?: string;
  object_type?: string;
  description?: string;
  css_classes?: string;
  order_num: number;
  is_active: boolean;
  target_audience?: string[];
  metadata?: Record<string, unknown>;
}

// Menu item tree structure (for drag and drop)
export interface MenuItemTree {
  id: string;
  title: string;
  url?: string;
  type: MenuItemType;
  target?: MenuItemTarget;
  target_audience?: string[];
  children?: MenuItemTree[];
  object_id?: string;
  object_type?: string;
  description?: string;
  css_classes?: string;
  order_num: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
}

// Unified API client type extension (for type safety with raw API calls)
export interface UnifiedApiRaw {
  get: <T = unknown>(url: string, config?: { params?: Record<string, unknown> }) => Promise<{ data: T }>;
  post: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T }>;
  put: <T = unknown>(url: string, data?: unknown) => Promise<{ data: T }>;
  delete: <T = unknown>(url: string) => Promise<{ data: T }>;
}

export interface UnifiedApiClient {
  raw: UnifiedApiRaw;
}
