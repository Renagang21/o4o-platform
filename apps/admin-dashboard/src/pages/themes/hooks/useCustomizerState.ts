/**
 * useCustomizerState - State management for WordPress customizer
 */

import { useState, useCallback, useEffect } from 'react';
import { CustomizerSettings } from '../WordPressCustomizer';

const defaultSettings: CustomizerSettings = {
  siteIdentity: {
    siteTitle: 'My Website',
    tagline: 'Just another website',
    logo: undefined,
    favicon: undefined
  },
  colors: {
    backgroundColor: '#ffffff',
    textColor: '#333333',
    linkColor: '#0073aa',
    accentColor: '#0073aa',
    headerBackgroundColor: '#23282d',
    headerTextColor: '#ffffff',
    darkMode: false
  },
  menus: {
    primaryMenu: undefined,
    footerMenu: undefined,
    socialMenu: undefined
  },
  backgroundImage: {
    url: undefined,
    preset: 'default',
    position: 'center center',
    size: 'auto',
    repeat: 'repeat',
    attachment: 'scroll'
  },
  additionalCss: '',
  homepage: {
    showOnFront: 'posts',
    pageOnFront: undefined,
    pageForPosts: undefined
  }
};

export const useCustomizerState = () => {
  const [settings, setSettings] = useState<CustomizerSettings>(defaultSettings);
  const [originalSettings, setOriginalSettings] = useState<CustomizerSettings>(defaultSettings);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from API or localStorage
  const loadSettings = useCallback(async () => {
    try {
      // Try to load from API
      const response = await fetch('/api/v1/themes/customizer/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setOriginalSettings(data);
      } else {
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('customizerSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setSettings(parsed);
          setOriginalSettings(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      // Use defaults
    }
  }, []);

  // Update specific section
  const updateSettings = useCallback((
    section: keyof CustomizerSettings,
    updates: any
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      
      if (typeof updates === 'object' && !Array.isArray(updates)) {
        // Merge updates for object sections
        newSettings[section] = {
          ...prev[section] as any,
          ...updates
        };
      } else {
        // Direct assignment for primitive values
        newSettings[section] = updates;
      }
      
      // Save to localStorage for persistence
      localStorage.setItem('customizerSettings', JSON.stringify(newSettings));
      
      return newSettings;
    });
  }, []);

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem('customizerSettings');
  }, []);

  // Reset to original (saved) settings
  const resetToOriginal = useCallback(() => {
    setSettings(originalSettings);
  }, [originalSettings]);

  // Check for changes
  useEffect(() => {
    const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(hasChanges);
  }, [settings, originalSettings]);

  // Save settings
  const saveSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/themes/customizer/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        setOriginalSettings(settings);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }, [settings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    resetToOriginal,
    loadSettings,
    saveSettings,
    hasChanges
  };
};