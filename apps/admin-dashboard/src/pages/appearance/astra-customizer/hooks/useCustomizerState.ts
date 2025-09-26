import { useState, useEffect, useCallback, useRef } from 'react';
import { useCustomizer } from '../context/CustomizerContext';
import { 
  AstraCustomizerSettings, 
  SettingSection,
  PreviewDevice,
  DeepPartial,
} from '../types/customizer-types';
import { deepMerge, deepEqual, getNestedValue, setNestedValue } from '../utils/deep-merge';

interface UseCustomizerStateOptions {
  debounceMs?: number;
  autoSave?: boolean;
  autoSaveInterval?: number;
}

interface UseCustomizerStateReturn {
  settings: AstraCustomizerSettings;
  updateSetting: (section: SettingSection, value: any, path?: string[]) => void;
  getSetting: (section: SettingSection, path?: string[]) => any;
  resetSection: (section: SettingSection) => void;
  resetAll: () => void;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  previewDevice: PreviewDevice;
  setPreviewDevice: (device: PreviewDevice) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCustomizerState(
  options: UseCustomizerStateOptions = {}
): UseCustomizerStateReturn {
  const {
    debounceMs = 500,
    autoSave = false,
    autoSaveInterval = 60000, // 1 minute
  } = options;
  
  const {
    state,
    updateSetting: contextUpdateSetting,
    setPreviewDevice: contextSetPreviewDevice,
    saveSettings,
    resetSettings,
    undo: contextUndo,
    redo: contextRedo,
    canUndo,
    canRedo,
  } = useCustomizer();
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const autoSaveTimerRef = useRef<NodeJS.Timeout>();
  const previousSettingsRef = useRef<AstraCustomizerSettings>(state.settings);
  
  // Debounced update setting
  const updateSetting = useCallback(
    (section: SettingSection, value: any, path?: string[]) => {
      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Update immediately in UI
      contextUpdateSetting(section, value, path);
      
      // Debounce the save operation
      if (autoSave) {
        debounceTimerRef.current = setTimeout(async () => {
          setIsSaving(true);
          try {
            await saveSettings();
            setLastSaved(new Date());
          } finally {
            setIsSaving(false);
          }
        }, debounceMs);
      }
    },
    [contextUpdateSetting, saveSettings, autoSave, debounceMs]
  );
  
  // Get setting value
  const getSetting = useCallback(
    (section: SettingSection, path?: string[]) => {
      const sectionSettings = state.settings[section];
      
      if (path && path.length > 0) {
        return getNestedValue(sectionSettings, path);
      }
      
      return sectionSettings;
    },
    [state.settings]
  );
  
  // Reset section to default
  const resetSection = useCallback(
    (section: SettingSection) => {
      import('../utils/default-settings').then(({ getDefaultSettings }) => {
        const defaultSettings = getDefaultSettings();
        contextUpdateSetting(section, defaultSettings[section]);
      });
    },
    [contextUpdateSetting]
  );
  
  // Reset all settings
  const resetAll = useCallback(() => {
    resetSettings();
  }, [resetSettings]);
  
  // Auto-save timer
  useEffect(() => {
    if (autoSave && state.isDirty) {
      // Clear existing timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      // Set new timer
      autoSaveTimerRef.current = setTimeout(async () => {
        if (state.isDirty) {
          setIsSaving(true);
          try {
            await saveSettings();
            setLastSaved(new Date());
          } finally {
            setIsSaving(false);
          }
        }
      }, autoSaveInterval);
      
      return () => {
        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }
      };
    }
  }, [autoSave, autoSaveInterval, state.isDirty, saveSettings]);
  
  // Track changes for debugging
  useEffect(() => {
    if (!deepEqual(previousSettingsRef.current, state.settings)) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Settings changed:', {
          previous: previousSettingsRef.current,
          current: state.settings,
        });
      }
      previousSettingsRef.current = state.settings;
    }
  }, [state.settings]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);
  
  return {
    settings: state.settings,
    updateSetting,
    getSetting,
    resetSection,
    resetAll,
    isDirty: state.isDirty,
    isSaving,
    lastSaved,
    previewDevice: state.previewDevice,
    setPreviewDevice: contextSetPreviewDevice,
    undo: contextUndo,
    redo: contextRedo,
    canUndo,
    canRedo,
  };
}

/**
 * Hook for managing responsive values
 */
export function useResponsiveValue<T>(
  initialValue: T | { desktop: T; tablet: T; mobile: T },
  onChange?: (value: { desktop: T; tablet: T; mobile: T }) => void
) {
  const { state } = useCustomizer();
  const currentDevice = state.previewDevice;
  
  const isResponsive = (v: any): v is { desktop: T; tablet: T; mobile: T } =>
    !!v && typeof v === 'object' && 'desktop' in v && 'tablet' in v && 'mobile' in v;

  const [responsiveValue, setResponsiveValue] = useState<{ desktop: T; tablet: T; mobile: T }>(() => {
    if (isResponsive(initialValue)) {
      return initialValue;
    }
    return {
      desktop: initialValue as T,
      tablet: initialValue as T,
      mobile: initialValue as T,
    };
  });
  
  const updateValue = useCallback(
    (value: T, device?: PreviewDevice) => {
      const targetDevice = device || currentDevice;
      const newValue = {
        ...responsiveValue,
        [targetDevice]: value,
      };
      
      setResponsiveValue(newValue);
      onChange?.(newValue);
    },
    [currentDevice, responsiveValue, onChange]
  );
  
  const getCurrentValue = useCallback(() => {
    return responsiveValue[currentDevice];
  }, [responsiveValue, currentDevice]);
  
  const syncValue = useCallback(
    (value: T) => {
      const newValue = {
        desktop: value,
        tablet: value,
        mobile: value,
      };
      
      setResponsiveValue(newValue);
      onChange?.(newValue);
    },
    [onChange]
  );
  
  return {
    value: responsiveValue,
    currentValue: getCurrentValue(),
    updateValue,
    syncValue,
    device: currentDevice,
  };
}

/**
 * Hook for managing color states (normal/hover)
 */
export function useColorState(
  initialColor: string | { normal: string; hover?: string },
  onChange?: (color: { normal: string; hover?: string }) => void
) {
  const [colorState, setColorState] = useState(() => {
    if (typeof initialColor === 'object') {
      return initialColor;
    }
    return { normal: initialColor, hover: undefined };
  });
  
  const updateNormal = useCallback(
    (color: string) => {
      const newState = { ...colorState, normal: color };
      setColorState(newState);
      onChange?.(newState);
    },
    [colorState, onChange]
  );
  
  const updateHover = useCallback(
    (color: string | undefined) => {
      const newState = { ...colorState, hover: color };
      setColorState(newState);
      onChange?.(newState);
    },
    [colorState, onChange]
  );
  
  const resetHover = useCallback(() => {
    updateHover(undefined);
  }, [updateHover]);
  
  return {
    normal: colorState.normal,
    hover: colorState.hover,
    updateNormal,
    updateHover,
    resetHover,
    hasHover: colorState.hover !== undefined,
  };
}
