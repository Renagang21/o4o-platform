/**
 * Hook to retrieve mobile header settings
 */

import { useState, useEffect } from 'react';
import { MobileHeaderSettings } from '@/pages/appearance/astra-customizer/types/customizer-types';

// Default mobile header settings
const defaultSettings: MobileHeaderSettings = {
  enabled: true,
  breakpoint: 768,
  mobileLogoUrl: '',
  mobileLogoWidth: 120,
  hamburgerStyle: 'default',
  menuPosition: 'left',
  menuAnimation: 'slide',
  overlayEnabled: true,
  overlayColor: '#000000',
  overlayOpacity: 0.5,
  backgroundColor: '#ffffff',
  textColor: '#000000',
  showAccountIcon: true,
  showCartIcon: true,
  showSearchIcon: false,
  submenuStyle: 'accordion',
  closeOnItemClick: false,
  swipeToClose: true
};

export const useMobileHeaderSettings = () => {
  const [settings, setSettings] = useState<MobileHeaderSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        
        // Fetch from API
        const response = await fetch('/api/customizer/mobile-header-settings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch mobile header settings');
        }
        
        const data = await response.json();
        
        // Merge with defaults to ensure all properties exist
        setSettings({
          ...defaultSettings,
          ...data
        });
      } catch (err) {
        console.error('Error fetching mobile header settings:', err);
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