/**
 * Editor Configuration Constants
 * Centralized configuration for pages, posts, and reusable blocks
 */

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGES_PER_PAGE: parseInt(process.env.DEFAULT_PAGES_PER_PAGE || '10', 10),
  BLOCKS_PER_PAGE: parseInt(process.env.DEFAULT_BLOCKS_PER_PAGE || '20', 10),
  PATTERNS_PER_PAGE: parseInt(process.env.DEFAULT_PATTERNS_PER_PAGE || '20', 10),
  MAX_PER_PAGE: parseInt(process.env.MAX_ITEMS_PER_PAGE || '100', 10)
};

// Revision management
export const REVISION_LIMITS = {
  MAX_REVISIONS: parseInt(process.env.MAX_BLOCK_REVISIONS || '10', 10)
};

// Block duplication
export const BLOCK_DUPLICATE = {
  SUFFIX: process.env.BLOCK_DUPLICATE_SUFFIX || '(Copy)'
};

// Valid sorting fields
export const SORT_FIELDS = {
  PAGES: ['createdAt', 'updatedAt', 'title', 'menuOrder', 'publishedAt'],
  BLOCKS: ['createdAt', 'updatedAt', 'title', 'usageCount']
};

// Cache configuration
export const CACHE_CONFIG = {
  TTL: parseInt(process.env.CACHE_TTL_SECONDS || '300', 10) * 1000, // Default 5 minutes
  MAX_AGE: parseInt(process.env.CACHE_MAX_AGE_SECONDS || '300', 10) // For HTTP Cache-Control header
};

// Block data dynamic fields
export const BLOCK_DYNAMIC_FIELDS = {
  IMAGE_FIELDS: (process.env.BLOCK_IMAGE_FIELDS || 'featuredImage,backgroundImage,coverImage').split(','),
  TEXT_FIELDS: (process.env.BLOCK_TEXT_FIELDS || 'subtitle,tagline,description').split(',')
};

// Block pattern categories
export const BLOCK_PATTERN_CATEGORIES = [
  { id: 'header', name: 'Headers', description: 'Site headers and navigation' },
  { id: 'footer', name: 'Footers', description: 'Site footers' },
  { id: 'hero', name: 'Hero Sections', description: 'Hero banners and introductions' },
  { id: 'cta', name: 'Call to Action', description: 'CTA sections and buttons' },
  { id: 'features', name: 'Features', description: 'Feature lists and showcases' },
  { id: 'testimonials', name: 'Testimonials', description: 'Customer testimonials and reviews' },
  { id: 'pricing', name: 'Pricing', description: 'Pricing tables and plans' },
  { id: 'contact', name: 'Contact', description: 'Contact forms and information' },
  { id: 'about', name: 'About', description: 'About sections and team' },
  { id: 'gallery', name: 'Gallery', description: 'Image and media galleries' },
  { id: 'posts', name: 'Posts', description: 'Blog post layouts' },
  { id: 'general', name: 'General', description: 'General purpose patterns' }
];
