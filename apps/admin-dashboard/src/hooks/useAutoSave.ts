import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { CreatePostDto, UpdatePostDto } from '@o4o/types';

export interface AutoSaveOptions {
  postId?: string;
  postType: 'post' | 'page';
  interval?: number; // in milliseconds, default 30000 (30 seconds)
  storageKey?: string;
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (error: any) => void;
}

export interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  savedInLocalStorage: boolean;
}

export const useAutoSave = (
  formData: CreatePostDto | UpdatePostDto,
  options: AutoSaveOptions
) => {
  const {
    postId,
    postType,
    interval = 30000, // 30 seconds
    storageKey = `autosave_${postType}_${postId || 'new'}`,
    onSaveStart,
    onSaveSuccess,
    onSaveError
  } = options;

  const [state, setState] = useState({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    savedInLocalStorage: false
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedDataRef = useRef<string>('');

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async (data: CreatePostDto | UpdatePostDto) => {
      if (postId) {
        // Update existing post
        const response = await authClient.api.put(`/posts/${postId}`, {
          ...data,
          status: 'draft' // Always save as draft during auto-save
        });
        return response.data;
      } else {
        // Create new post
        const response = await authClient.api.post('/posts', {
          ...data,
          status: 'draft',
          type: postType
        });
        return response.data;
      }
    },
    onMutate: () => {
      setState((prev: any) => ({ ...prev, isSaving: true }));
      onSaveStart?.();
    },
    onSuccess: () => {
      setState((prev: any) => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false
      }));
      onSaveSuccess?.();
      
      // Clear local storage after successful save
      localStorage.removeItem(storageKey);
    },
    onError: (error) => {
      setState((prev: any) => ({ ...prev, isSaving: false }));
      onSaveError?.(error);
    }
  });

  // Save to local storage
  const saveToLocalStorage = useCallback((data: any) => {
    try {
      const saveData = {
        data,
        timestamp: new Date().toISOString(),
        postType,
        postId
      };
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      setState((prev: any) => ({ ...prev, savedInLocalStorage: true }));
    } catch (error: any) {
      console.error('Failed to save to local storage:', error);
    }
  }, [storageKey, postType, postId]);

  // Check for unsaved changes
  useEffect(() => {
    const currentData = JSON.stringify(formData);
    if (currentData !== lastSavedDataRef.current && lastSavedDataRef.current !== '') {
      setState((prev: any) => ({ ...prev, hasUnsavedChanges: true }));
    }
  }, [formData]);

  // Auto-save effect
  useEffect(() => {
    const performAutoSave = () => {
      const currentData = JSON.stringify(formData);
      
      // Only save if data has changed
      if (currentData !== lastSavedDataRef.current) {
        // Save to local storage immediately
        saveToLocalStorage(formData);
        
        // Save to server
        autoSaveMutation.mutate(formData as any);
        lastSavedDataRef.current = currentData;
      }
    };

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Set up new timer
    timerRef.current = setInterval(performAutoSave, interval);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [formData, interval, saveToLocalStorage, autoSaveMutation]);

  // Save on window unload
  useEffect(() => {
    const handleBeforeUnload = (e: globalThis.BeforeUnloadEvent) => {
      if (state.hasUnsavedChanges) {
        saveToLocalStorage(formData);
        e.preventDefault();
        e.returnValue = '변경사항이 저장되지 않았습니다. 페이지를 나가시겠습니까?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.hasUnsavedChanges, formData, saveToLocalStorage]);

  // Recover from local storage
  const recoverFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        return { data, timestamp: new Date(timestamp) };
      }
    } catch (error: any) {
      console.error('Failed to recover from local storage:', error);
    }
    return null;
  }, [storageKey]);

  // Clear local storage
  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState((prev: any) => ({ ...prev, savedInLocalStorage: false }));
  }, [storageKey]);

  // Manual save
  const manualSave = useCallback(() => {
    const currentData = JSON.stringify(formData);
    saveToLocalStorage(formData);
    autoSaveMutation.mutate(formData as any);
    lastSavedDataRef.current = currentData;
  }, [formData, saveToLocalStorage, autoSaveMutation]);

  return {
    ...state,
    recoverFromLocalStorage,
    clearLocalStorage,
    manualSave,
    isAutoSaving: autoSaveMutation.isPending
  };
};