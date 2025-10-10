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
        // Try to get settings from API
        const response = await fetch('/api/customizer/settings/scrollToTop');
        
        if (response.ok) {
          const data = await response.json();
          setSettings({
            ...defaultSettings,
            ...data
          });
        }
      } catch (error) {
        // console.log('Using default scroll to top settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { settings, loading };
};