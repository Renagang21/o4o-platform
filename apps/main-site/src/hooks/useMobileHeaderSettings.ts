/**
 * Hook to retrieve mobile header settings
 */

import { useState, useEffect } from 'react';
import { MobileHeaderSettings } from '@/pages/appearance/astra-customizer/types/customizer-types';
import { authClient } from '@o4o/auth-client';

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
        const response = await authClient.api.get('/customizer/mobile-header-settings');

        // Merge with defaults to ensure all properties exist
        setSettings({
          ...defaultSettings,
          ...response.data
        });
      } catch (err: any) {
        // Silently use default settings if API endpoint doesn't exist yet
        // console.log('Using default mobile header settings');
        setError(err.response?.data?.message || err.message || 'Unknown error');
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