import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import {
  AstraCustomizerSettings,
  PreviewDevice,
  SaveStatus,
  SettingSection,
  DeepPartial,
  CustomizerMessage,
  CustomizerEventHandlers,
} from '../types/customizer-types';
import { getDefaultSettings } from '../utils/default-settings';
import { deepMerge } from '../utils/deep-merge';
import { generateCSS } from '../utils/css-generator';

interface CustomizerState {
  settings: AstraCustomizerSettings;
  previewDevice: PreviewDevice;
  saveStatus: SaveStatus;
  activeSection: SettingSection | null;
  previewUrl: string;
  isDirty: boolean;
  history: AstraCustomizerSettings[];
  historyIndex: number;
}

type CustomizerAction =
  | { type: 'UPDATE_SETTING'; section: SettingSection; value: any; path?: string[] }
  | { type: 'SET_SETTINGS'; settings: AstraCustomizerSettings }
  | { type: 'SET_PREVIEW_DEVICE'; device: PreviewDevice }
  | { type: 'SET_SAVE_STATUS'; status: SaveStatus }
  | { type: 'SET_ACTIVE_SECTION'; section: SettingSection | null }
  | { type: 'SET_PREVIEW_URL'; url: string }
  | { type: 'MARK_DIRTY'; isDirty: boolean }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_TO_HISTORY'; settings: AstraCustomizerSettings }
  | { type: 'RESET_TO_DEFAULT' };

interface CustomizerContextValue {
  state: CustomizerState;
  updateSetting: (section: SettingSection, value: any, path?: string[]) => void;
  setSettings: (settings: AstraCustomizerSettings) => void;
  setPreviewDevice: (device: PreviewDevice) => void;
  setActiveSection: (section: SettingSection | null) => void;
  setPreviewUrl: (url: string) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  publishSettings: () => Promise<void>;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  eventHandlers?: CustomizerEventHandlers;
}

const CustomizerContext = createContext<CustomizerContextValue | undefined>(undefined);

const customizerReducer = (state: CustomizerState, action: CustomizerAction): CustomizerState => {
  switch (action.type) {
    case 'UPDATE_SETTING': {
      const updatedSettings = { ...state.settings };
      
      if (action.path && action.path.length > 0) {
        // Navigate to nested property
        let target: any = updatedSettings[action.section];
        for (let i = 0; i < action.path.length - 1; i++) {
          target = target[action.path[i]];
        }
        target[action.path[action.path.length - 1]] = action.value;
      } else {
        // Direct section update
        updatedSettings[action.section] = deepMerge(
          updatedSettings[action.section] as any,
          action.value as any
        ) as any;
      }
      
      updatedSettings._meta = {
        ...updatedSettings._meta,
        lastModified: new Date().toISOString(),
        isDirty: true,
      };
      
      return {
        ...state,
        settings: updatedSettings,
        isDirty: true,
        saveStatus: 'unsaved',
      };
    }
    
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.settings,
        isDirty: false,
        saveStatus: 'saved',
      };
    
    case 'SET_PREVIEW_DEVICE':
      return {
        ...state,
        previewDevice: action.device,
      };
    
    case 'SET_SAVE_STATUS':
      return {
        ...state,
        saveStatus: action.status,
      };
    
    case 'SET_ACTIVE_SECTION':
      return {
        ...state,
        activeSection: action.section,
      };
    
    case 'SET_PREVIEW_URL':
      return {
        ...state,
        previewUrl: action.url,
      };
    
    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: action.isDirty,
      };
    
    case 'ADD_TO_HISTORY': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.settings);
      
      // Keep only last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }
    
    case 'UNDO': {
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        return {
          ...state,
          settings: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
          saveStatus: 'unsaved',
        };
      }
      return state;
    }
    
    case 'REDO': {
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        return {
          ...state,
          settings: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
          saveStatus: 'unsaved',
        };
      }
      return state;
    }
    
    case 'RESET_TO_DEFAULT': {
      const defaultSettings = getDefaultSettings();
      return {
        ...state,
        settings: defaultSettings,
        isDirty: true,
        saveStatus: 'unsaved',
        history: [defaultSettings],
        historyIndex: 0,
      };
    }
    
    default:
      return state;
  }
};

interface CustomizerProviderProps {
  children: React.ReactNode;
  initialSettings?: DeepPartial<AstraCustomizerSettings>;
  previewUrl?: string;
  eventHandlers?: CustomizerEventHandlers;
}

export const CustomizerProvider: React.FC<CustomizerProviderProps> = ({
  children,
  initialSettings,
  previewUrl = '/',
  eventHandlers,
}) => {
  const defaultSettings = getDefaultSettings();
  const mergedSettings = initialSettings 
    ? deepMerge(defaultSettings, initialSettings as any)
    : defaultSettings;
  
  const [state, dispatch] = useReducer(customizerReducer, {
    settings: mergedSettings,
    previewDevice: 'desktop',
    saveStatus: 'saved',
    activeSection: null,
    previewUrl,
    isDirty: false,
    history: [mergedSettings],
    historyIndex: 0,
  });
  
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastSettingsRef = useRef(state.settings);
  
  // Update setting with history tracking
  const updateSetting = useCallback((section: SettingSection, value: any, path?: string[]) => {
    dispatch({ type: 'UPDATE_SETTING', section, value, path });
    
    // Add to history after a delay (debounced)
    setTimeout(() => {
      if (lastSettingsRef.current !== state.settings) {
        dispatch({ type: 'ADD_TO_HISTORY', settings: state.settings });
        lastSettingsRef.current = state.settings;
      }
    }, 500);
    
    // Special handling for logo updates - force preview refresh
    if (section === 'siteIdentity' && path && path[0] === 'logo') {
      setTimeout(() => {
        const iframe = document.getElementById('customizer-preview-iframe') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              type: 'update-logo',
              settings: state.settings
            },
            '*'
          );
        }
      }, 100);
    }
    
    // Call event handler if provided
    eventHandlers?.onSettingChange?.(section, value);
  }, [state.settings, eventHandlers]);
  
  // PostMessage communication with preview iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent<CustomizerMessage>) => {
      if (event.data.type === 'preview-ready') {
        // Send initial settings to preview
        if (previewIframeRef.current?.contentWindow) {
          const css = generateCSS(state.settings);
          previewIframeRef.current.contentWindow.postMessage(
            {
              type: 'setting-change',
              payload: { settings: state.settings, css },
            },
            '*'
          );
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state.settings]);
  
  // Update preview when settings change
  useEffect(() => {
    if (previewIframeRef.current?.contentWindow) {
      const css = generateCSS(state.settings);
      previewIframeRef.current.contentWindow.postMessage(
        {
          type: 'setting-change',
          payload: { settings: state.settings, css },
        },
        '*'
      );
    }
  }, [state.settings]);
  
  // Save settings to backend
  const saveSettings = useCallback(async () => {
    dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });
    
    try {
      await eventHandlers?.onSave?.(state.settings);

      dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
      dispatch({ type: 'MARK_DIRTY', isDirty: false });
    } catch (error) {
      dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
    }
  }, [state.settings, eventHandlers]);
  
  // Publish settings (save and apply to live site)
  const publishSettings = useCallback(async () => {
    dispatch({ type: 'SET_SAVE_STATUS', status: 'saving' });
    
    try {
      // Save as draft first
      await saveSettings();

      // Then publish - eventHandlers can handle the actual API call
      await eventHandlers?.onPublish?.(state.settings);

      dispatch({ type: 'SET_SAVE_STATUS', status: 'saved' });
      dispatch({ type: 'MARK_DIRTY', isDirty: false });
    } catch (error) {
      dispatch({ type: 'SET_SAVE_STATUS', status: 'error' });
    }
  }, [saveSettings]);
  
  const value: CustomizerContextValue = {
    state,
    updateSetting,
    setSettings: (settings) => dispatch({ type: 'SET_SETTINGS', settings }),
    setPreviewDevice: (device) => {
      dispatch({ type: 'SET_PREVIEW_DEVICE', device });
      eventHandlers?.onDeviceChange?.(device);
    },
    setActiveSection: (section) => dispatch({ type: 'SET_ACTIVE_SECTION', section }),
    setPreviewUrl: (url) => dispatch({ type: 'SET_PREVIEW_URL', url }),
    saveSettings,
    resetSettings: () => {
      dispatch({ type: 'RESET_TO_DEFAULT' });
      eventHandlers?.onReset?.();
    },
    publishSettings,
    undo: () => dispatch({ type: 'UNDO' }),
    redo: () => dispatch({ type: 'REDO' }),
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    eventHandlers,
  };
  
  // Store iframe ref globally for PostMessage
  useEffect(() => {
    const iframe = document.querySelector('#customizer-preview-iframe') as HTMLIFrameElement;
    if (iframe) {
      previewIframeRef.current = iframe;
    }
  }, []);
  
  return (
    <CustomizerContext.Provider value={value}>
      {children}
    </CustomizerContext.Provider>
  );
};

export const useCustomizer = () => {
  const context = useContext(CustomizerContext);
  if (!context) {
    throw new Error('useCustomizer must be used within CustomizerProvider');
  }
  return context;
};
