/**
 * useCustomizerSettings Hook (Frontend)
 * Fetches and manages customizer settings from API
 * Provides container width settings for frontend rendering
 * Auto-detects viewport mode based on window size
 */

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Breakpoints matching Tailwind defaults
const BREAKPOINTS = {
  mobile: 640,   // sm
  tablet: 1024,  // lg
};

interface CachedData {
  data: CustomizerSettings;
  timestamp: number;
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
        // Check cache first
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const cachedData: CachedData = JSON.parse(cached);
            const now = Date.now();

            // Use cache if still valid
            if (now - cachedData.timestamp < CACHE_DURATION) {
              setSettings(cachedData.data);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // Invalid cache, continue to fetch
          }
        }

        // Fetch from API
        const response = await fetch(`${API_BASE_URL}/settings/customizer`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // API returns full customizer settings
          // Merge with defaults for container only (preserve all other settings)
          const apiData = result.data;

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

          // Update cache
          try {
            const cacheData: CachedData = {
              data: mergedSettings,
              timestamp: Date.now(),
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
