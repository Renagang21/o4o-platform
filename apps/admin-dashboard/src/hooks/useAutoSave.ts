/**
 * Auto-save Hook with Data Loss Prevention
 * Automatically saves content and prevents data loss
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce as useDebounceHook } from './useDebounce';
import toast from 'react-hot-toast';

interface AutoSaveConfig {
  saveInterval?: number; // milliseconds
  debounceDelay?: number; // milliseconds
  enableLocalStorage?: boolean;
  enableCloudSave?: boolean;
  onSave?: (data: any) => Promise<void>;
  onRestore?: () => Promise<any>;
  storageKey?: string;
  postId?: string;
  postType?: string;
  interval?: number; // alias for saveInterval
  onSaveSuccess?: () => void;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasUnsavedChanges: boolean;
  error: string | null;
  backupExists: boolean;
}

export function useAutoSave(initialContent?: any, config: AutoSaveConfig = {}) {
  const {
    saveInterval = config.interval || 30000, // 30 seconds
    debounceDelay = 1000, // 1 second
    enableLocalStorage = true,
    enableCloudSave = true,
    onSave,
    onRestore,
    storageKey = config.postId 
      ? `wordpress-editor-autosave-${config.postType || 'post'}-${config.postId}`
      : 'wordpress-editor-autosave',
    onSaveSuccess
  } = config;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSavedAt: null,
    hasUnsavedChanges: false,
    error: null,
    backupExists: false
  });

  const [content, setContent] = useState<any>(initialContent || null);
  const debouncedContent = useDebounceHook(content, debounceDelay);
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isRestoringRef = useRef(false);

  // Check for existing backup
  useEffect(() => {
    if (enableLocalStorage) {
      const backup = localStorage.getItem(storageKey);
      setState(prev => ({ ...prev, backupExists: !!backup }));
    }
  }, [enableLocalStorage, storageKey]);

  // Save to local storage
  const saveToLocalStorage = useCallback((data: any) => {
    if (!enableLocalStorage) return;

    try {
      const saveData = {
        content: data,
        timestamp: new Date().toISOString(),
        version: '1.0'
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      // console.log('Content saved to local storage');
    } catch (error) {
      console.error('Failed to save to local storage:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Clear old data if storage is full
        try {
          localStorage.removeItem(storageKey + '-old');
          localStorage.setItem(storageKey + '-old', localStorage.getItem(storageKey) || '');
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch (e) {
          console.error('Storage cleanup failed:', e);
        }
      }
    }
  }, [enableLocalStorage, storageKey]);

  // Save to cloud
  const saveToCloud = useCallback(async (data: any) => {
    if (!enableCloudSave || !onSave) return;

    setState(prev => ({ ...prev, isSaving: true, error: null }));

    try {
      await onSave(data);
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSavedAt: new Date(),
        hasUnsavedChanges: false
      }));
      
      // Call onSaveSuccess if provided
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      
      // Clear local backup after successful cloud save
      if (enableLocalStorage) {
        localStorage.removeItem(storageKey);
        setState(prev => ({ ...prev, backupExists: false }));
      }
      
      // console.log('Content saved to cloud');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: errorMessage
      }));
      
      // Keep local backup on cloud save failure
      saveToLocalStorage(data);
      
      toast.error('Failed to save to cloud. Local backup created.');
    }
  }, [enableCloudSave, onSave, enableLocalStorage, storageKey, saveToLocalStorage, onSaveSuccess]);

  // Main save function
  const save = useCallback(async (data: any = content, force: boolean = false) => {
    if (!data || isRestoringRef.current) return;

    // Save to local storage immediately
    saveToLocalStorage(data);

    // Save to cloud (with debouncing unless forced)
    if (force || !saveTimeoutRef.current) {
      await saveToCloud(data);
    }
  }, [content, saveToLocalStorage, saveToCloud]);

  // Track content changes
  const updateContent = useCallback((newContent: any) => {
    if (isRestoringRef.current) return;
    
    setContent(newContent);
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
  }, []);

  // Auto-save on content change
  useEffect(() => {
    if (!debouncedContent || isRestoringRef.current) return;

    save(debouncedContent);
  }, [debouncedContent, save]);

  // Periodic auto-save
  useEffect(() => {
    if (!enableCloudSave || !state.hasUnsavedChanges) return;

    const intervalId = setInterval(() => {
      if (state.hasUnsavedChanges && content) {
        save(content, true);
      }
    }, saveInterval);

    return () => clearInterval(intervalId);
  }, [enableCloudSave, state.hasUnsavedChanges, content, save, saveInterval]);

  // Restore from backup
  const restoreFromBackup = useCallback(async () => {
    isRestoringRef.current = true;
    
    try {
      // Try to restore from cloud first
      if (onRestore) {
        const cloudData = await onRestore();
        if (cloudData) {
          setContent(cloudData);
          setState(prev => ({ 
            ...prev, 
            hasUnsavedChanges: false,
            lastSavedAt: new Date()
          }));
          isRestoringRef.current = false;
          return cloudData;
        }
      }

      // Fall back to local storage
      if (enableLocalStorage) {
        const backup = localStorage.getItem(storageKey);
        if (backup) {
          const { content: savedContent, timestamp } = JSON.parse(backup);
          setContent(savedContent);
          
          toast.success(`Restored from backup (${new Date(timestamp).toLocaleString()})`);
          
          isRestoringRef.current = false;
          return savedContent;
        }
      }
    } catch (error) {
      console.error('Failed to restore backup:', error);
      toast.error('Failed to restore backup');
    } finally {
      isRestoringRef.current = false;
    }

    return null;
  }, [onRestore, enableLocalStorage, storageKey]);

  // Clear backup
  const clearBackup = useCallback(() => {
    if (enableLocalStorage) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(storageKey + '-old');
      setState(prev => ({ ...prev, backupExists: false }));
      toast.success('Backup cleared');
    }
  }, [enableLocalStorage, storageKey]);

  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        const message = 'You have unsaved changes. Are you sure you want to leave?';
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.hasUnsavedChanges]);

  // Handle visibility change (save when tab becomes hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && state.hasUnsavedChanges && content) {
        save(content, true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state.hasUnsavedChanges, content, save]);

  return {
    ...state,
    updateContent,
    save: () => save(content, true),
    restoreFromBackup,
    clearBackup,
    // Compatibility aliases for existing forms
    lastSaved: state.lastSavedAt,
    savedInLocalStorage: state.backupExists,
    recoverFromLocalStorage: restoreFromBackup,
    clearLocalStorage: clearBackup
  };
}

