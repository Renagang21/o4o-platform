/**
 * Hook to retrieve scroll to top settings
 */

import { useState, useEffect } from 'react';

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
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.neture.co.kr/api/v1';
        const response = await fetch(`${apiUrl}/customizer/scroll-to-top`);

        if (response.ok) {
          const result = await response.json();

          // Extract data from API response (format: { success: true, data: {...} })
          if (result.success && result.data) {
            setSettings({
              ...defaultSettings,
              ...result.data
            });
          } else {
            setSettings(defaultSettings);
          }
        } else {
          // API error - use default settings
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