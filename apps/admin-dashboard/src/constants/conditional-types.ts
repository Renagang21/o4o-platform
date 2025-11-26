/**
 * Conditional Block Type Definitions
 * UI에서 사용할 조건 타입 정의
 */

import {
  ConditionType,
  ConditionTypeDefinition,
  UserRoleValue,
  DeviceTypeValue,
  BrowserTypeValue,
} from '../types/conditional-block.types';

/**
 * 모든 조건 타입 정의
 */
export const CONDITION_TYPE_DEFINITIONS: Record<ConditionType, ConditionTypeDefinition> = {
  // ============================================
  // User Conditions
  // ============================================
  user_logged_in: {
    type: 'user_logged_in',
    label: 'User Login Status',
    category: 'user',
    availableOperators: ['is'],
    valueType: 'select',
    valueOptions: [
      { value: true, label: 'Logged In' },
      { value: false, label: 'Not Logged In' },
    ],
    description: 'Show/hide content based on user login status',
  },

  user_role: {
    type: 'user_role',
    label: 'User Role',
    category: 'user',
    availableOperators: ['is', 'is_not'],
    valueType: 'select',
    valueOptions: [
      { value: 'admin', label: 'Administrator' },
      { value: 'editor', label: 'Editor' },
      { value: 'author', label: 'Author' },
      { value: 'contributor', label: 'Contributor' },
      { value: 'subscriber', label: 'Subscriber' },
      { value: 'user', label: 'User' },
      { value: 'supplier', label: 'Supplier' },
      { value: 'retailer', label: 'Retailer' },
    ],
    description: 'Show/hide content based on user role',
  },

  user_id: {
    type: 'user_id',
    label: 'User ID',
    category: 'user',
    availableOperators: ['is', 'is_not'],
    valueType: 'string',
    description: 'Show/hide content for specific user ID',
  },

  // ============================================
  // Content Conditions
  // ============================================
  post_type: {
    type: 'post_type',
    label: 'Post Type',
    category: 'content',
    availableOperators: ['is', 'is_not'],
    valueType: 'select',
    valueOptions: [
      { value: 'post', label: 'Post' },
      { value: 'page', label: 'Page' },
      { value: 'product', label: 'Product' },
      { value: 'project', label: 'Project' },
    ],
    description: 'Show/hide content based on post type',
  },

  post_category: {
    type: 'post_category',
    label: 'Post Category',
    category: 'content',
    availableOperators: ['contains', 'not_contains'],
    valueType: 'string',
    description: 'Show/hide content based on post category',
  },

  post_id: {
    type: 'post_id',
    label: 'Post ID',
    category: 'content',
    availableOperators: ['is', 'is_not'],
    valueType: 'string',
    description: 'Show/hide content for specific post ID',
  },

  // ============================================
  // URL Conditions
  // ============================================
  url_parameter: {
    type: 'url_parameter',
    label: 'URL Parameter',
    category: 'url',
    availableOperators: ['exists', 'not_exists', 'is', 'contains'],
    valueType: 'string',
    description: 'Show/hide content based on URL parameter (e.g., ?ref=email)',
  },

  current_path: {
    type: 'current_path',
    label: 'Current Path',
    category: 'url',
    availableOperators: ['is', 'contains', 'not_contains'],
    valueType: 'string',
    description: 'Show/hide content based on current URL path',
  },

  subdomain: {
    type: 'subdomain',
    label: 'Subdomain',
    category: 'url',
    availableOperators: ['is', 'is_not'],
    valueType: 'string',
    description: 'Show/hide content based on subdomain',
  },

  // ============================================
  // Time Conditions
  // ============================================
  date_range: {
    type: 'date_range',
    label: 'Date Range',
    category: 'time',
    availableOperators: ['between'],
    valueType: 'daterange',
    description: 'Show/hide content within specific date range',
  },

  time_range: {
    type: 'time_range',
    label: 'Time Range',
    category: 'time',
    availableOperators: ['between'],
    valueType: 'timerange',
    description: 'Show/hide content during specific time range',
  },

  day_of_week: {
    type: 'day_of_week',
    label: 'Day of Week',
    category: 'time',
    availableOperators: ['is', 'is_not'],
    valueType: 'select',
    valueOptions: [
      { value: 0, label: 'Sunday' },
      { value: 1, label: 'Monday' },
      { value: 2, label: 'Tuesday' },
      { value: 3, label: 'Wednesday' },
      { value: 4, label: 'Thursday' },
      { value: 5, label: 'Friday' },
      { value: 6, label: 'Saturday' },
    ],
    description: 'Show/hide content on specific days',
  },

  // ============================================
  // Device/Browser Conditions
  // ============================================
  device_type: {
    type: 'device_type',
    label: 'Device Type',
    category: 'device',
    availableOperators: ['is', 'is_not'],
    valueType: 'select',
    valueOptions: [
      { value: 'mobile', label: 'Mobile' },
      { value: 'tablet', label: 'Tablet' },
      { value: 'desktop', label: 'Desktop' },
    ],
    description: 'Show/hide content based on device type',
  },

  browser_type: {
    type: 'browser_type',
    label: 'Browser Type',
    category: 'device',
    availableOperators: ['is', 'is_not'],
    valueType: 'select',
    valueOptions: [
      { value: 'chrome', label: 'Chrome' },
      { value: 'firefox', label: 'Firefox' },
      { value: 'safari', label: 'Safari' },
      { value: 'edge', label: 'Edge' },
      { value: 'other', label: 'Other' },
    ],
    description: 'Show/hide content based on browser type',
  },
};

/**
 * 카테고리별로 그룹화된 조건 타입
 */
export const CONDITION_TYPES_BY_CATEGORY = {
  user: [
    CONDITION_TYPE_DEFINITIONS.user_logged_in,
    CONDITION_TYPE_DEFINITIONS.user_role,
    CONDITION_TYPE_DEFINITIONS.user_id,
  ],
  content: [
    CONDITION_TYPE_DEFINITIONS.post_type,
    CONDITION_TYPE_DEFINITIONS.post_category,
    CONDITION_TYPE_DEFINITIONS.post_id,
  ],
  url: [
    CONDITION_TYPE_DEFINITIONS.url_parameter,
    CONDITION_TYPE_DEFINITIONS.current_path,
    CONDITION_TYPE_DEFINITIONS.subdomain,
  ],
  time: [
    CONDITION_TYPE_DEFINITIONS.date_range,
    CONDITION_TYPE_DEFINITIONS.time_range,
    CONDITION_TYPE_DEFINITIONS.day_of_week,
  ],
  device: [
    CONDITION_TYPE_DEFINITIONS.device_type,
    CONDITION_TYPE_DEFINITIONS.browser_type,
  ],
};

/**
 * 연산자 레이블
 */
export const OPERATOR_LABELS: Record<string, string> = {
  is: 'is',
  is_not: 'is not',
  contains: 'contains',
  not_contains: 'does not contain',
  greater_than: 'greater than',
  less_than: 'less than',
  between: 'between',
  exists: 'exists',
  not_exists: 'does not exist',
};

/**
 * 카테고리 레이블
 */
export const CATEGORY_LABELS = {
  user: 'User Conditions',
  content: 'Content Conditions',
  url: 'URL Conditions',
  time: 'Time Conditions',
  device: 'Device Conditions',
};
