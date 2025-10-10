/**
 * Hook to retrieve breadcrumbs settings
 */

import { useState, useEffect } from 'react';
import { BreadcrumbsSettings } from '@/types/customizer-types';

// Default breadcrumbs settings
const defaultSettings: BreadcrumbsSettings = {
  enabled: true,
  position: 'above-content',
  homeText: 'Home',
  separator: '>',
  showCurrentPage: true,
  showOnHomepage: false,
  linkColor: '#0073e6',
  currentPageColor: '#333333',
  separatorColor: '#999999',
  hoverColor: '#005bb5',
  fontSize: { desktop: 14, tablet: 13, mobile: 12 },
  fontWeight: 400,
  textTransform: 'none',
  itemSpacing: 8,
  marginTop: 0,
  marginBottom: 16,
  maxLength: 30,
  showIcons: false,
  mobileHidden: false
};

export const useBreadcrumbsSettings = () => {
  const [settings, setSettings] = useState<BreadcrumbsSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from API
        const response = await fetch('/api/customizer/breadcrumbs-settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch breadcrumbs settings');
        }
        
        const data = await response.json();
        
        // Merge with defaults to ensure all properties exist
        setSettings({
          ...defaultSettings,
          ...data
        });
      } catch (err) {
        console.error('Error fetching breadcrumbs settings:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        // Use default settings on error
        setSettings(defaultSettings);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return {
    settings,
    isLoading,
    error
  };
};