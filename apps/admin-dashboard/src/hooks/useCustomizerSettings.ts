/**
 * useCustomizerSettings Hook
 * Fetches and manages customizer settings from API
 * Provides container width settings for editor WYSIWYG synchronization
 */

import { useState, useEffect } from 'react';

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

export interface CustomizerSettings {
  container: ContainerSettings;
  // Other customizer settings can be added here
  [key: string]: any;
}

interface ViewportConfig {
  width: number;
  label: string;
  icon: string;
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

interface CachedData {
  data: CustomizerSettings;
  timestamp: number;
}

export const useCustomizerSettings = () => {
  const [settings, setSettings] = useState<CustomizerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [viewportMode, setViewportMode] = useState<ViewportMode>(() => {
    // Load last selected viewport from localStorage
    try {
      const stored = localStorage.getItem('editor-viewport-mode');
      if (stored && (stored === 'desktop' || stored === 'tablet' || stored === 'mobile')) {
        return stored as ViewportMode;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return 'desktop';
  });

  // Save viewport mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('editor-viewport-mode', viewportMode);
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [viewportMode]);

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
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
        const response = await fetch(`${apiUrl}/api/settings/customizer`);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          // Ensure container settings exist, merge with defaults
          const mergedSettings: CustomizerSettings = {
            ...result.data,
            container: {
              ...DEFAULT_CONTAINER_SETTINGS,
              ...result.data.container,
              width: {
                ...DEFAULT_CONTAINER_SETTINGS.width,
                ...result.data.container?.width,
              },
              padding: {
                ...DEFAULT_CONTAINER_SETTINGS.padding,
                ...result.data.container?.padding,
              },
              margin: {
                ...DEFAULT_CONTAINER_SETTINGS.margin,
                ...result.data.container?.margin,
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

  // Get current viewport configuration
  const currentConfig: ViewportConfig = {
    width: settings?.container?.width[viewportMode] || DEFAULT_CONTAINER_SETTINGS.width[viewportMode],
    label: viewportMode.charAt(0).toUpperCase() + viewportMode.slice(1),
    icon: viewportMode === 'desktop' ? '🖥️' : viewportMode === 'tablet' ? '📱' : '📱',
  };

  // Get container settings with fallback
  const containerSettings: ContainerSettings = settings?.container || DEFAULT_CONTAINER_SETTINGS;

  // Switch viewport mode
  const switchViewport = (mode: ViewportMode) => {
    setViewportMode(mode);
  };

  // Force refresh from API (bypass cache)
  const refresh = async () => {
    setIsLoading(true);
    setError(null);

    // Clear cache
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      // Ignore
    }

    // Re-fetch
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';
      const response = await fetch(`${apiUrl}/api/settings/customizer`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const mergedSettings: CustomizerSettings = {
          ...result.data,
          container: {
            ...DEFAULT_CONTAINER_SETTINGS,
            ...result.data.container,
            width: {
              ...DEFAULT_CONTAINER_SETTINGS.width,
              ...result.data.container?.width,
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
          // Ignore
        }
      }
    } catch (err) {
      console.error('Failed to refresh customizer settings:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    containerSettings,
    isLoading,
    error,
    viewportMode,
    currentConfig,
    switchViewport,
    refresh,
  };
};
