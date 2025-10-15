/**
 * Hook to retrieve button settings
 */

import { useState, useEffect } from 'react';
import { ButtonVariants, ButtonStyleSettings } from '@/types/customizer-types';
import { apiClient } from '../services/api';

// Default button style
const defaultButtonStyle: ButtonStyleSettings = {
  backgroundColor: '#0073e6',
  textColor: '#ffffff',
  borderWidth: 0,
  borderColor: '#0073e6',
  borderStyle: 'solid',
  borderRadius: 4,
  paddingVertical: 12,
  paddingHorizontal: 24,
  hoverBackgroundColor: '#005bb5',
  hoverTextColor: '#ffffff',
  hoverBorderColor: '#005bb5',
  hoverTransform: 'none',
  transitionDuration: 300,
  fontSize: { desktop: 16, tablet: 15, mobile: 14 },
  fontWeight: 500,
  textTransform: 'none',
  letterSpacing: 0,
  boxShadow: 'none',
  hoverBoxShadow: 'small'
};

// Default settings for all button variants
const defaultSettings: ButtonVariants = {
  primary: defaultButtonStyle,
  secondary: {
    backgroundColor: '#6c757d',
    hoverBackgroundColor: '#5a6268'
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 2,
    hoverBackgroundColor: '#0073e6',
    hoverTextColor: '#ffffff'
  },
  text: {
    backgroundColor: 'transparent',
    textColor: '#0073e6',
    borderWidth: 0,
    hoverBackgroundColor: 'rgba(0, 115, 230, 0.1)',
    boxShadow: 'none'
  },
  global: {
    minHeight: 40,
    displayType: 'inline-block',
    iconSpacing: 8
  }
};

export const useButtonSettings = () => {
  const [settings, setSettings] = useState<ButtonVariants>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);

        // Fetch from new API endpoint
        const response = await apiClient.get('/customizer/button-settings');

        // Extract data from API response (format: { success: true, data: {...} })
        if (!response.data?.success || !response.data?.data) {
          throw new Error('Invalid API response format');
        }

        const data = response.data.data;

        // Merge with defaults to ensure all properties exist
        const mergedSettings: ButtonVariants = {
          primary: { ...defaultButtonStyle, ...data.primary },
          secondary: data.secondary ? { ...defaultButtonStyle, ...defaultSettings.secondary, ...data.secondary } : defaultSettings.secondary,
          outline: data.outline ? { ...defaultButtonStyle, ...defaultSettings.outline, ...data.outline } : defaultSettings.outline,
          text: data.text ? { ...defaultButtonStyle, ...defaultSettings.text, ...data.text } : defaultSettings.text,
          global: { ...defaultSettings.global, ...data.global }
        };

        setSettings(mergedSettings);
      } catch (err) {
        console.error('Error fetching button settings:', err);
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