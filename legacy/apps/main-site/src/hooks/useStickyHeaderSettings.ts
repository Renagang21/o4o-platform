/**
 * Hook to retrieve sticky header settings
 */

import { useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';

interface StickyHeaderSettings {
  enabled: boolean;
  triggerHeight: number;
  stickyOn: ('above' | 'primary' | 'below')[];
  shrinkEffect: boolean;
  shrinkHeight: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  backgroundColor?: string;
  backgroundOpacity: number;
  boxShadow: boolean;
  shadowIntensity: 'light' | 'medium' | 'strong';
  animationDuration: number;
  hideOnScrollDown?: boolean;
  zIndex: number;
}

const defaultSettings: StickyHeaderSettings = {
  enabled: false,
  triggerHeight: 100,
  stickyOn: ['primary'],
  shrinkEffect: false,
  shrinkHeight: {
    desktop: 60,
    tablet: 55,
    mobile: 50
  },
  backgroundColor: '#ffffff',
  backgroundOpacity: 1,
  boxShadow: true,
  shadowIntensity: 'medium',
  animationDuration: 300,
  hideOnScrollDown: false,
  zIndex: 999
};

export const useStickyHeaderSettings = () => {
  const [settings, setSettings] = useState<StickyHeaderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Try to get settings from API
        const response = await authClient.api.get('/customizer/settings/header/sticky');

        setSettings({
          ...defaultSettings,
          ...response.data
        });
      } catch (error) {
        // console.log('Using default sticky header settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};