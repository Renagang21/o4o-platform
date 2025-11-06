/**
 * useCustomizerSettings Hook (Frontend)
 * Fetches and manages customizer settings from API
 * Provides container width settings for frontend rendering
 * Auto-detects viewport mode based on window size
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export interface ContainerSettings {
  layout: 'boxed' | 'full-width' | 'fluid';
  width: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  padding: {
    desktop: { top: number; right: number; bottom: number; left: number };
    tablet: { top: number; right: number; bottom: number; left: number };
    mobile: { top: number; right: number; bottom: number; left: number };
  };
  margin: {
    desktop: { top: number; bottom: number };
    tablet: { top: number; bottom: number };
    mobile: { top: number; bottom: number };
  };
}

export interface SiteIdentitySettings {
  logo?: {
    desktop?: string;
    mobile?: string;
    width?: {
      desktop?: number;
      tablet?: number;
      mobile?: number;
    };
  };
  siteTitle?: {
    text?: string;
    display?: boolean;
  };
  tagline?: {
    text?: string;
    display?: boolean;
  };
  favicon?: string;
}

export interface CustomizerSettings {
  siteIdentity?: SiteIdentitySettings;
  container: ContainerSettings;
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    [key: string]: any;
  };
  typography?: {
    fontFamily?: string;
    [key: string]: any;
  };
  header?: any;
  footer?: any;
  blog?: any;
  customCSS?: string;
  [key: string]: any;
}

// Default values (fallback when API fails)
const DEFAULT_CONTAINER_SETTINGS: ContainerSettings = {
  layout: 'boxed',
  width: {
    desktop: 1200,
    tablet: 992,
    mobile: 544,
  },
  padding: {
    desktop: { top: 0, right: 20, bottom: 0, left: 20 },
    tablet: { top: 0, right: 20, bottom: 0, left: 20 },
    mobile: { top: 0, right: 15, bottom: 0, left: 15 },
  },
  margin: {
    desktop: { top: 0, bottom: 0 },
    tablet: { top: 0, bottom: 0 },
    mobile: { top: 0, bottom: 0 },
  },
};

const STORAGE_KEY = 'customizer-settings-cache';
const CACHE_DURATION = 5 * 1000; // 5 seconds (fast refresh for immediate updates)

// Breakpoints matching Tailwind defaults
const BREAKPOINTS = {
  mobile: 640,   // sm
  tablet: 1024,  // lg
};

interface CachedData {
  data: CustomizerSettings;
  timestamp: number;
  version?: number;
}

// Detect viewport mode based on window width
const getViewportMode = (): ViewportMode => {
  if (typeof window === 'undefined') return 'desktop';

  const width = window.innerWidth;
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  return 'desktop';
};

export const useCustomizerSettings = () => {
  const [settings, setSettings] = useState<CustomizerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>(getViewportMode);

  // Update viewport mode on window resize
  useEffect(() => {
    const handleResize = () => {
      setViewportMode(getViewportMode());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch settings from API with cache
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Check for forceRefresh query parameter (debug mode)
        const urlParams = new URLSearchParams(window.location.search);
        const forceRefresh = urlParams.get('forceRefresh') === '1';

        if (forceRefresh) {
          // Force refresh: clear cache immediately
          localStorage.removeItem(STORAGE_KEY);
          console.log('[useCustomizerSettings] Force refresh mode - cache cleared');
        }

        // Check cache first
        const cached = !forceRefresh ? localStorage.getItem(STORAGE_KEY) : null;
        let cachedVersion: number | undefined;

        if (cached) {
          try {
            const cachedData: CachedData = JSON.parse(cached);
            const now = Date.now();
            cachedVersion = cachedData.version;

            // Use cache if still valid (time-based)
            if (now - cachedData.timestamp < CACHE_DURATION) {
              setSettings(cachedData.data);
              setIsLoading(false);
              // Still fetch in background to check version
              // Will update if version changed
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        // Fetch from API
        const response = await authClient.api.get('/settings/customizer');

        if (response.data.success && response.data.data) {
          // API returns full customizer settings
          // Extract version for cache invalidation
          const apiData = response.data.data;
          const apiVersion = (apiData as any)?._version;

          // Check if version changed - ALWAYS update if version differs
          const versionChanged = cachedVersion !== undefined && apiVersion !== undefined && apiVersion !== cachedVersion;

          if (versionChanged) {
            console.log('[useCustomizerSettings] Version changed, force updating...', {
              cached: cachedVersion,
              api: apiVersion
            });
          }

          // Only skip update if version is same AND cache is still valid
          if (!versionChanged && cachedVersion !== undefined && cachedVersion === apiVersion) {
            // Cache is valid and version hasn't changed, no need to update
            setIsLoading(false);
            return;
          }

          // Merge with defaults for container only (preserve all other settings)
          const mergedSettings: CustomizerSettings = {
            ...apiData, // Preserve all API data (siteIdentity, colors, typography, header, footer, etc.)
            container: {
              ...DEFAULT_CONTAINER_SETTINGS,
              ...apiData.container,
              width: {
                ...DEFAULT_CONTAINER_SETTINGS.width,
                ...apiData.container?.width,
              },
              padding: {
                ...DEFAULT_CONTAINER_SETTINGS.padding,
                ...apiData.container?.padding,
              },
              margin: {
                ...DEFAULT_CONTAINER_SETTINGS.margin,
                ...apiData.container?.margin,
              },
            },
          };

          setSettings(mergedSettings);

          // Update cache with version
          try {
            const cacheData: CachedData = {
              data: mergedSettings,
              timestamp: Date.now(),
              version: apiVersion,
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cacheData));
          } catch (e) {
            // Ignore cache write errors
          }
        } else {
          throw new Error('Invalid API response');
        }
      } catch (err) {
        console.error('Failed to fetch customizer settings:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));

        // Use default settings on error
        setSettings({
          container: DEFAULT_CONTAINER_SETTINGS,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Get container settings with fallback
  const containerSettings: ContainerSettings = settings?.container || DEFAULT_CONTAINER_SETTINGS;

  // Get current viewport width
  const currentWidth = containerSettings.width[viewportMode];

  // Get current viewport padding
  const currentPadding = containerSettings.padding[viewportMode];

  return {
    settings,
    containerSettings,
    isLoading,
    error,
    viewportMode,
    currentWidth,
    currentPadding,
  };
};
