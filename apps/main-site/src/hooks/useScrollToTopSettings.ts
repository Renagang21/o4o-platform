/**
 * Hook to retrieve scroll to top settings
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface ScrollToTopSettings {
  enabled: boolean;
  displayType: 'desktop' | 'mobile' | 'both';
  threshold?: number;
  backgroundColor?: string;
  iconColor?: string;
  position?: 'left' | 'right';
}

const defaultSettings: ScrollToTopSettings = {
  enabled: false,
  displayType: 'both',
  threshold: 300,
  backgroundColor: '#333333',
  iconColor: '#ffffff',
  position: 'right'
};

export const useScrollToTopSettings = () => {
  const [settings, setSettings] = useState<ScrollToTopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // Get settings from new API endpoint
        const response = await apiClient.get('/customizer/scroll-to-top');

        // Extract data from API response (format: { success: true, data: {...} })
        if (response.data?.success && response.data?.data) {
          setSettings({
            ...defaultSettings,
            ...response.data.data
          });
        } else {
          setSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Failed to fetch scroll-to-top settings:', error);
        setSettings(defaultSettings);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};