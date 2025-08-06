/**
 * WordPress Admin URL Routing Configuration
 * Maps WordPress-style URLs to React Router paths
 */

export interface WordPressRoute {
  wpPath: string;
  reactPath: string;
  params?: Record<string, string>;
  title?: string;
}

// WordPress to React route mappings
export const wordpressRoutes: WordPressRoute[] = [
  // Dashboard
  { wpPath: '/wp-admin/', reactPath: '/dashboard', title: 'Dashboard' },
  { wpPath: '/wp-admin/index.php', reactPath: '/dashboard', title: 'Dashboard' },
  
  // Posts
  { wpPath: '/wp-admin/edit.php', reactPath: '/posts', title: 'Posts' },
  { wpPath: '/wp-admin/post-new.php', reactPath: '/posts/new', title: 'Add New Post' },
  { wpPath: '/wp-admin/edit-tags.php?taxonomy=category', reactPath: '/posts/categories', title: 'Categories' },
  { wpPath: '/wp-admin/edit-tags.php?taxonomy=post_tag', reactPath: '/posts/tags', title: 'Tags' },
  
  // Media
  { wpPath: '/wp-admin/upload.php', reactPath: '/media', title: 'Media Library' },
  { wpPath: '/wp-admin/media-new.php', reactPath: '/media/new', title: 'Add New Media' },
  
  // Pages
  { wpPath: '/wp-admin/edit.php?post_type=page', reactPath: '/pages', title: 'Pages' },
  { wpPath: '/wp-admin/post-new.php?post_type=page', reactPath: '/pages/new', title: 'Add New Page' },
  
  // Reusable Blocks
  { wpPath: '/wp-admin/edit.php?post_type=wp_block', reactPath: '/reusable-blocks', title: 'Reusable Blocks' },
  { wpPath: '/wp-admin/post-new.php?post_type=wp_block', reactPath: '/reusable-blocks/new', title: 'Add New Block' },
  
  // Comments
  { wpPath: '/wp-admin/edit-comments.php', reactPath: '/comments', title: 'Comments' },
  
  // Appearance
  { wpPath: '/wp-admin/themes.php', reactPath: '/themes', title: 'Themes' },
  { wpPath: '/wp-admin/customize.php', reactPath: '/themes/customize', title: 'Customize' },
  { wpPath: '/wp-admin/widgets.php', reactPath: '/widgets', title: 'Widgets' },
  { wpPath: '/wp-admin/nav-menus.php', reactPath: '/menus', title: 'Menus' },
  
  // Plugins
  { wpPath: '/wp-admin/plugins.php', reactPath: '/plugins', title: 'Plugins' },
  { wpPath: '/wp-admin/plugin-install.php', reactPath: '/plugins/install', title: 'Add New Plugin' },
  
  // Users
  { wpPath: '/wp-admin/users.php', reactPath: '/users', title: 'Users' },
  { wpPath: '/wp-admin/user-new.php', reactPath: '/users/new', title: 'Add New User' },
  { wpPath: '/wp-admin/profile.php', reactPath: '/profile', title: 'Profile' },
  
  // Tools
  { wpPath: '/wp-admin/tools.php', reactPath: '/tools', title: 'Tools' },
  { wpPath: '/wp-admin/import.php', reactPath: '/tools/import', title: 'Import' },
  { wpPath: '/wp-admin/export.php', reactPath: '/tools/export', title: 'Export' },
  
  // Settings
  { wpPath: '/wp-admin/options-general.php', reactPath: '/settings', title: 'General Settings' },
  { wpPath: '/wp-admin/options-writing.php', reactPath: '/settings/writing', title: 'Writing Settings' },
  { wpPath: '/wp-admin/options-reading.php', reactPath: '/settings/reading', title: 'Reading Settings' },
  { wpPath: '/wp-admin/options-discussion.php', reactPath: '/settings/discussion', title: 'Discussion Settings' },
  { wpPath: '/wp-admin/options-media.php', reactPath: '/settings/media', title: 'Media Settings' },
  { wpPath: '/wp-admin/options-permalink.php', reactPath: '/settings/permalinks', title: 'Permalink Settings' },
  
  // WooCommerce (E-commerce)
  { wpPath: '/wp-admin/edit.php?post_type=product', reactPath: '/products', title: 'Products' },
  { wpPath: '/wp-admin/post-new.php?post_type=product', reactPath: '/products/new', title: 'Add Product' },
  { wpPath: '/wp-admin/edit.php?post_type=shop_order', reactPath: '/orders', title: 'Orders' },
  { wpPath: '/wp-admin/admin.php?page=wc-reports', reactPath: '/reports', title: 'Reports' },
  { wpPath: '/wp-admin/admin.php?page=wc-settings', reactPath: '/ecommerce/settings', title: 'WooCommerce Settings' },
];

// Helper functions
export function getReactPath(wpPath: string): string | null {
  const route = wordpressRoutes.find((r: any) => r.wpPath === wpPath);
  return route ? route.reactPath : null;
}

export function getWordPressPath(reactPath: string): string | null {
  const route = wordpressRoutes.find((r: any) => r.reactPath === reactPath);
  return route ? route.wpPath : null;
}

export function parseWordPressUrl(url: string): { path: string; params: URLSearchParams } {
  const [path, query] = url.split('?');
  const params = new URLSearchParams(query || '');
  return { path, params };
}

// WordPress admin URL patterns
export const wpAdminPatterns = {
  isAdminUrl: (path: string) => path.startsWith('/wp-admin/'),
  isPostEdit: (path: string, params: URLSearchParams) => 
    path === '/wp-admin/post.php' && params.get('action') === 'edit',
  isPostNew: (path: string) => path === '/wp-admin/post-new.php',
  isCustomPostType: (params: URLSearchParams) => params.has('post_type'),
  isTaxonomy: (path: string) => path === '/wp-admin/edit-tags.php',
};

// Route transformation middleware
export function transformWordPressRoute(wpPath: string): string {
  // Handle special cases
  const { path, params } = parseWordPressUrl(wpPath);
  
  // Edit post
  if (wpAdminPatterns.isPostEdit(path, params)) {
    const postId = params.get('post');
    return `/posts/edit/${postId}`;
  }
  
  // Custom post types
  if (wpAdminPatterns.isCustomPostType(params)) {
    const postType = params.get('post_type');
    if (postType === 'page') return getReactPath(wpPath) || '/pages';
    if (postType === 'product') return getReactPath(wpPath) || '/products';
    // Add more custom post types as needed
  }
  
  // Taxonomies
  if (wpAdminPatterns.isTaxonomy(path)) {
    const taxonomy = params.get('taxonomy');
    if (taxonomy === 'category') return '/posts/categories';
    if (taxonomy === 'post_tag') return '/posts/tags';
    if (taxonomy === 'product_cat') return '/products/categories';
    // Add more taxonomies as needed
  }
  
  // Default mapping
  return getReactPath(wpPath) || wpPath;
}

// WordPress menu URL generator
export function generateWordPressMenuUrl(menuId: string): string {
  switch (menuId) {
    case 'dashboard':
      return '/wp-admin/index.php';
    case 'posts':
      return '/wp-admin/edit.php';
    case 'media':
      return '/wp-admin/upload.php';
    case 'pages':
      return '/wp-admin/edit.php?post_type=page';
    case 'comments':
      return '/wp-admin/edit-comments.php';
    case 'themes':
      return '/wp-admin/themes.php';
    case 'plugins':
      return '/wp-admin/plugins.php';
    case 'users':
      return '/wp-admin/users.php';
    case 'tools':
      return '/wp-admin/tools.php';
    case 'settings':
      return '/wp-admin/options-general.php';
    default:
      return '/wp-admin/';
  }
}