/**
 * Breadcrumb Generation Utilities
 * Generates breadcrumb items based on different page types and contexts
 */

import { BreadcrumbItem, BreadcrumbsSettings } from '@/types/customizer-types';

export interface PageContext {
  pageId?: string;
  postType?: string;
  categories?: string[];
  userRole?: string;
  subdomain?: string | null;
  path?: string;
  pathPrefix?: string | null;
  title?: string;
  parentPages?: Array<{
    id: string;
    title: string;
    slug: string;
  }>;
}

export interface BreadcrumbGeneratorOptions {
  settings: BreadcrumbsSettings;
  context?: PageContext;
  location: Location;
}

/**
 * Generate breadcrumb items based on page type and context
 */
export function generateBreadcrumbs(options: BreadcrumbGeneratorOptions): BreadcrumbItem[] {
  const { settings, context, location } = options;
  const items: BreadcrumbItem[] = [];
  
  // Always start with home
  items.push({
    label: settings.homeText,
    url: '/',
    isActive: location.pathname === '/',
    icon: settings.showIcons ? '<svg>...</svg>' : undefined // Home icon if enabled
  });

  // If we're on the homepage, return just home
  if (location.pathname === '/') {
    return items;
  }

  const pathSegments = location.pathname.split('/').filter(segment => segment);
  
  // Handle different page types
  if (context?.postType) {
    return generatePostTypeBreadcrumbs(items, context, settings);
  }
  
  if (context?.categories && context.categories.length > 0) {
    return generateCategoryBreadcrumbs(items, context, settings, location);
  }
  
  // Handle special pages
  if (pathSegments.includes('search')) {
    return generateSearchBreadcrumbs(items, settings, location);
  }
  
  if (pathSegments.includes('404') || context?.postType === '404') {
    return generate404Breadcrumbs(items, settings);
  }
  
  // Default hierarchical breadcrumbs
  return generateHierarchicalBreadcrumbs(items, pathSegments, settings);
}

/**
 * Generate breadcrumbs for posts with categories
 */
function generatePostTypeBreadcrumbs(
  items: BreadcrumbItem[],
  context: PageContext,
  settings: BreadcrumbsSettings
): BreadcrumbItem[] {
  const { postType, categories, title, parentPages } = context;
  
  // Add category hierarchy if available
  if (categories && categories.length > 0) {
    const primaryCategory = categories[0];
    items.push({
      label: formatCategoryName(primaryCategory),
      url: `/category/${primaryCategory}`,
      isActive: false
    });
  }
  
  // Add parent pages for hierarchical content
  if (parentPages && parentPages.length > 0) {
    parentPages.forEach(parent => {
      items.push({
        label: parent.title,
        url: `/${parent.slug}`,
        isActive: false
      });
    });
  }
  
  // Add post type archive if not a regular post
  if (postType && postType !== 'post' && postType !== 'page') {
    items.push({
      label: formatPostTypeName(postType),
      url: `/${postType}`,
      isActive: false
    });
  }
  
  // Add current page/post
  if (title) {
    items.push({
      label: title,
      url: undefined, // Current page shouldn't be linked
      isActive: true
    });
  }
  
  return items;
}

/**
 * Generate breadcrumbs for category pages
 */
function generateCategoryBreadcrumbs(
  items: BreadcrumbItem[],
  context: PageContext,
  settings: BreadcrumbsSettings,
  location: Location
): BreadcrumbItem[] {
  const { categories } = context;
  
  if (categories && categories.length > 0) {
    // Handle category hierarchy
    categories.forEach((category, index) => {
      const isLast = index === categories.length - 1;
      items.push({
        label: formatCategoryName(category),
        url: isLast ? undefined : `/category/${category}`,
        isActive: isLast
      });
    });
  }
  
  return items;
}

/**
 * Generate breadcrumbs for search results
 */
function generateSearchBreadcrumbs(
  items: BreadcrumbItem[],
  settings: BreadcrumbsSettings,
  location: Location
): BreadcrumbItem[] {
  const searchParams = new URLSearchParams(location.search);
  const query = searchParams.get('q') || searchParams.get('s') || '';
  
  items.push({
    label: 'Search Results',
    url: '/search',
    isActive: !query
  });
  
  if (query) {
    items.push({
      label: `"${query}"`,
      url: undefined,
      isActive: true
    });
  }
  
  return items;
}

/**
 * Generate breadcrumbs for 404 pages
 */
function generate404Breadcrumbs(
  items: BreadcrumbItem[],
  settings: BreadcrumbsSettings
): BreadcrumbItem[] {
  items.push({
    label: 'Page Not Found',
    url: undefined,
    isActive: true
  });
  
  return items;
}

/**
 * Generate hierarchical breadcrumbs from URL segments
 */
function generateHierarchicalBreadcrumbs(
  items: BreadcrumbItem[],
  pathSegments: string[],
  settings: BreadcrumbsSettings
): BreadcrumbItem[] {
  let currentPath = '';
  
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;
    
    // Format segment to readable label
    const label = formatSegmentLabel(segment);
    
    items.push({
      label,
      url: isLast ? undefined : currentPath,
      isActive: isLast
    });
  });
  
  return items;
}

/**
 * Format URL segment to readable label
 */
function formatSegmentLabel(segment: string): string {
  return segment
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

/**
 * Format category name
 */
function formatCategoryName(category: string): string {
  return category
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Format post type name
 */
function formatPostTypeName(postType: string): string {
  const typeNames: Record<string, string> = {
    'post': 'Blog',
    'page': 'Pages',
    'product': 'Products',
    'event': 'Events',
    'portfolio': 'Portfolio',
    'testimonial': 'Testimonials',
    'faq': 'FAQ',
    'service': 'Services',
    'team': 'Team',
    'case-study': 'Case Studies'
  };
  
  return typeNames[postType] || formatSegmentLabel(postType);
}

/**
 * Generate breadcrumbs for e-commerce product pages
 */
export function generateProductBreadcrumbs(
  homeText: string,
  productCategories: string[],
  productTitle: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [];
  
  // Home
  items.push({
    label: homeText,
    url: '/',
    isActive: false
  });
  
  // Shop/Products
  items.push({
    label: 'Shop',
    url: '/shop',
    isActive: false
  });
  
  // Category hierarchy
  let categoryPath = '/shop';
  productCategories.forEach((category, index) => {
    categoryPath += `/${category}`;
    const isLast = index === productCategories.length - 1;
    
    items.push({
      label: formatCategoryName(category),
      url: isLast ? categoryPath : categoryPath,
      isActive: false
    });
  });
  
  // Product
  items.push({
    label: productTitle,
    url: undefined,
    isActive: true
  });
  
  return items;
}

/**
 * Generate breadcrumbs for blog posts with category
 */
export function generateBlogPostBreadcrumbs(
  homeText: string,
  category: string,
  postTitle: string
): BreadcrumbItem[] {
  return [
    {
      label: homeText,
      url: '/',
      isActive: false
    },
    {
      label: 'Blog',
      url: '/blog',
      isActive: false
    },
    {
      label: formatCategoryName(category),
      url: `/blog/category/${category}`,
      isActive: false
    },
    {
      label: postTitle,
      url: undefined,
      isActive: true
    }
  ];
}

/**
 * Truncate breadcrumb labels if they exceed max length
 */
export function truncateBreadcrumbLabels(
  items: BreadcrumbItem[],
  maxLength: number
): BreadcrumbItem[] {
  return items.map(item => ({
    ...item,
    label: item.label.length > maxLength 
      ? item.label.substring(0, maxLength - 3) + '...'
      : item.label
  }));
}