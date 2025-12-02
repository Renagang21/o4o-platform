/**
 * Manifest Loader
 *
 * Loads and validates app manifest.json files.
 * Handles dynamic imports and error handling.
 */

import type { AppManifest } from './types';

/**
 * Load manifest from package
 *
 * @param manifestPath - Path to manifest.json (e.g., '@o4o-apps/commerce/manifest.json')
 * @returns Parsed and validated manifest
 */
export async function loadManifest(manifestPath: string): Promise<AppManifest> {
  try {
    // Extract package name from path
    const packageMatch = manifestPath.match(/@o4o-apps\/([^/]+)/);
    if (!packageMatch) {
      throw new Error(`Invalid manifest path: ${manifestPath}`);
    }

    const packageName = packageMatch[1];

    // Map package names to folder names (some packages have different folder names)
    const folderNameMap: Record<string, string> = {
      'forum': 'forum-app',
      'commerce': 'commerce',
      'customer': 'customer',
      'admin': 'admin',
      'forum-neture': 'forum-neture',
      'forum-yaksa': 'forum-yaksa',
    };

    const folderName = folderNameMap[packageName] || packageName;

    // Try to dynamically import the manifest
    try {
      const module = await import(`../../../packages/${folderName}/manifest.json`);
      return validateManifest(module.default || module);
    } catch (importError) {
      console.warn(`Could not import manifest from package, using stub for ${packageName}:`, importError);
      return createStubManifest(packageName);
    }
  } catch (error) {
    console.error(`Failed to load manifest from ${manifestPath}:`, error);
    throw new Error(`Manifest load failed: ${manifestPath}`);
  }
}

/**
 * Validate manifest structure
 */
function validateManifest(data: any): AppManifest {
  if (!data.id || typeof data.id !== 'string') {
    throw new Error('Manifest missing required field: id');
  }
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Manifest missing required field: name');
  }
  if (!data.version || typeof data.version !== 'string') {
    throw new Error('Manifest missing required field: version');
  }

  return {
    id: data.id,
    name: data.name,
    version: data.version,
    description: data.description,
    author: data.author,
    enabled: data.enabled ?? true,
    entrypoint: data.entrypoint,
    components: data.components || {},
    functions: data.functions || {}, // Support 'functions' field
    views: data.views || (Array.isArray(data.views) ? [] : {}), // Support both array and object
    ui: data.ui || {},
    dependencies: data.dependencies || [],
    permissions: data.permissions || [],
    migrations: data.migrations || [],
    category: data.category,
    icon: data.icon,
    thumbnail: data.thumbnail,
    metadata: data.metadata || {},
  };
}

/**
 * Create stub manifest for apps that don't have manifest.json yet
 */
function createStubManifest(packageName: string): AppManifest {
  const manifestStubs: Record<string, Partial<AppManifest>> = {
    commerce: {
      id: 'commerce',
      name: 'E-Commerce',
      version: '1.0.0',
      description: 'E-commerce functionality for O4O Platform',
      category: 'commerce',
      enabled: true,
      components: {
        ProductList: 'functions/productList.ts',
        ProductCard: 'functions/productCard.ts',
        Cart: 'functions/cart.ts',
        Checkout: 'functions/checkout.ts',
      },
      views: [
        'views/product-list.json',
        'views/product-detail.json',
        'views/cart.json',
        'views/checkout.json',
      ],
    },
    customer: {
      id: 'customer',
      name: 'Customer Portal',
      version: '1.0.0',
      description: 'Customer account and profile management',
      category: 'content',
      enabled: true,
      components: {
        CustomerDashboard: 'functions/customerDashboard.ts',
        OrderHistory: 'functions/orderHistory.ts',
        ProfileEdit: 'functions/profileEdit.ts',
      },
      views: [
        'views/customer-dashboard.json',
        'views/order-history.json',
        'views/profile-edit.json',
      ],
    },
    admin: {
      id: 'admin',
      name: 'Admin Dashboard',
      version: '1.0.0',
      description: 'Administrative interface for O4O Platform',
      category: 'utility',
      enabled: true,
      components: {
        AdminDashboard: 'functions/adminDashboard.ts',
        UserManagement: 'functions/userManagement.ts',
        SystemSettings: 'functions/systemSettings.ts',
      },
      views: [
        'views/admin-dashboard.json',
        'views/user-management.json',
        'views/system-settings.json',
      ],
    },
    forum: {
      id: 'forum',
      name: 'Forum',
      version: '1.0.0',
      description: 'Community forum and discussions',
      category: 'content',
      enabled: true,
      components: {
        ForumList: 'functions/forumList.ts',
        ThreadView: 'functions/threadView.ts',
        PostEditor: 'functions/postEditor.ts',
      },
      views: [
        'views/forum-list.json',
        'views/thread-view.json',
        'views/post-editor.json',
      ],
    },
    'forum-neture': {
      id: 'forum-neture',
      name: 'Neture Forum',
      version: '1.0.0',
      description: 'Neture community forum',
      category: 'content',
      enabled: true,
    },
    'forum-yaksa': {
      id: 'forum-yaksa',
      name: 'Yaksa Forum',
      version: '1.0.0',
      description: 'Yaksa community forum',
      category: 'content',
      enabled: true,
    },
  };

  const stub = manifestStubs[packageName];
  if (!stub) {
    throw new Error(`No stub manifest available for package: ${packageName}`);
  }

  return validateManifest(stub);
}

/**
 * Load multiple manifests in parallel
 */
export async function loadManifests(paths: string[]): Promise<AppManifest[]> {
  const promises = paths.map((path) => loadManifest(path));
  return Promise.all(promises);
}

/**
 * Check if manifest exists
 */
export async function manifestExists(manifestPath: string): Promise<boolean> {
  try {
    await loadManifest(manifestPath);
    return true;
  } catch {
    return false;
  }
}
