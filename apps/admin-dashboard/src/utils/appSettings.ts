// App settings management utility
export interface AppSettings {
  [appId: string]: {
    enabled: boolean;
    settings?: any;
  };
}

const STORAGE_KEY = 'o4o_apps_settings';

// Default app settings
const defaultSettings: AppSettings = {
  ecommerce: { enabled: true },
  users: { enabled: true },
  content: { enabled: true },
  forum: { enabled: false },
  crowdfunding: { enabled: false },
  signage: { enabled: false },
  affiliate: { enabled: false }
};

export function getAppSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (error: any) {
    console.error('Error loading app settings:', error);
  }
  return defaultSettings;
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error: any) {
    console.error('Error saving app settings:', error);
  }
}

export function isAppEnabled(appId: string): boolean {
  const settings = getAppSettings();
  return settings[appId]?.enabled ?? false;
}

export function toggleApp(appId: string, enabled: boolean): void {
  const settings = getAppSettings();
  settings[appId] = { ...(settings as any)[appId], enabled };
  saveAppSettings(settings);
}

// Map menu items to app IDs
export const menuToAppMapping: Record<string, string> = {
  'ecommerce': 'ecommerce',
  'ecommerce-products': 'ecommerce',
  'ecommerce-orders': 'ecommerce',
  'ecommerce-reports': 'ecommerce',
  'users': 'users',
  'users-all': 'users',
  'users-add': 'users',
  'users-profile': 'users',
  'users-roles': 'users',
  'posts': 'content',
  'posts-all': 'content',
  'posts-add': 'content',
  'posts-categories': 'content',
  'posts-tags': 'content',
  'pages': 'content',
  'pages-all': 'content',
  'pages-add': 'content',
  'media': 'content',
  'media-library': 'content',
  'media-add': 'content',
  'forum': 'forum',
  'signage': 'signage',
  'crowdfunding': 'crowdfunding',
  'affiliate': 'affiliate',
  'affiliate-partners': 'affiliate',
  'affiliate-links': 'affiliate',
  'affiliate-commission': 'affiliate',
  'affiliate-analytics': 'affiliate',
  'vendors': 'ecommerce',
  'vendors-all': 'ecommerce',
  'vendors-pending': 'ecommerce',
  'vendors-commission': 'ecommerce',
  'vendors-reports': 'ecommerce'
};

export function isMenuItemEnabled(menuItemId: string): boolean {
  const appId = menuToAppMapping[menuItemId];
  if (!appId) {
    // If no mapping found, always show (for core features like dashboard, settings)
    return true;
  }
  return isAppEnabled(appId);
}