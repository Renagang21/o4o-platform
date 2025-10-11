/**
 * Blog Settings Hook
 * Fetches and manages blog/archive customizer settings
 */

import { useState, useEffect } from 'react';
import { BlogSettings } from '@/types/customizer-types';
import { blogAPI } from '../api/blog/blogApi';

// Default blog settings
const defaultBlogSettings: BlogSettings = {
  archive: {
    layout: 'grid',
    showArchiveHeader: true,
    showLayoutSwitcher: true,
    showSortOptions: true,
    cardSpacing: 20,
    featuredImage: {
      enabled: true,
      position: 'top',
      ratio: '16:9',
      customRatio: { width: 16, height: 9 },
      hoverEffect: 'zoom'
    },
    meta: {
      position: 'after-title',
      showIcons: true,
      items: [
        { id: 'date', enabled: true, order: 1 },
        { id: 'author', enabled: true, order: 2 },
        { id: 'category', enabled: true, order: 3 },
        { id: 'comments', enabled: false, order: 4 },
        { id: 'views', enabled: false, order: 5 },
        { id: 'readTime', enabled: false, order: 6 },
        { id: 'tags', enabled: false, order: 7 }
      ],
      colors: {
        text: '#6c757d',
        links: '#0073e6',
        icons: '#6c757d'
      }
    },
    content: {
      showTitle: true,
      showExcerpt: true,
      excerptSource: 'auto',
      excerptLength: 25,
      showReadMoreButton: true,
      readMoreText: 'Read More'
    },
    pagination: {
      enabled: true,
      type: 'numbers',
      postsPerPage: 12,
      showNumbers: true,
      showPrevNext: true,
      maxVisiblePages: 5,
      loadMoreText: 'Load More',
      prevText: 'Previous',
      nextText: 'Next',
      alignment: 'center'
    },
    sorting: {
      enabled: true,
      sortBy: 'date',
      order: 'desc',
      allowUserSort: true
    },
    cardStyle: 'shadow',
    styling: {
      backgroundColor: '#ffffff',
      borderColor: '#e1e5e9',
      borderRadius: 8,
      cardPadding: 20,
      titleColor: '#333333',
      titleHoverColor: '#0073e6',
      excerptColor: '#6c757d',
      typography: {
        titleSize: { desktop: 20, tablet: 18, mobile: 16 },
        titleWeight: 600,
        excerptSize: { desktop: 14, tablet: 13, mobile: 12 },
        metaSize: { desktop: 12, tablet: 11, mobile: 10 }
      }
    }
  }
};

interface UseBlogSettingsReturn {
  settings: BlogSettings | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useBlogSettings = (): UseBlogSettingsReturn => {
  const [settings, setSettings] = useState<BlogSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would fetch from your customizer API
      // For now, we'll simulate an API call and return default settings
      
      // Check if we have settings in localStorage (for development)
      const savedSettings = localStorage.getItem('blog-customizer-settings');
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          return;
        } catch (e) {
          console.warn('Failed to parse saved blog settings, using defaults');
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));

      // Try to fetch from API
      try {
        const response = await blogAPI.getSettings();
        if (response.data.success && response.data.data.settings) {
          setSettings(response.data.data.settings);
          return;
        }
      } catch (apiError) {
        // console.log('Blog settings API not available, using default settings');
      }

      // Fallback to default settings
      setSettings(defaultBlogSettings);

    } catch (err) {
      console.error('Error fetching blog settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load blog settings');
      // Use default settings even on error
      setSettings(defaultBlogSettings);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refetch = async () => {
    await fetchSettings();
  };

  return {
    settings,
    isLoading,
    error,
    refetch
  };
};