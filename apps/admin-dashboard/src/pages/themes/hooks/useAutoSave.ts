/**
 * useAutoSave - Auto-save functionality with debounce
 */

import { useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export const useAutoSave = (
  data: any,
  hasChanges: boolean,
  onStatusChange: (status: SaveStatus) => void,
  delay: number = 500
) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSavingRef = useRef(false);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (isSavingRef.current || !hasChanges) return;

    isSavingRef.current = true;
    onStatusChange('saving');

    try {
      // Save to localStorage as draft
      localStorage.setItem('customizerDraft', JSON.stringify({
        data,
        timestamp: Date.now()
      }));

      // Optional: Save to server as draft
      const response = await fetch('/api/v1/themes/customizer/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        onStatusChange('saved');
      } else {
        throw new Error('Failed to save draft');
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      onStatusChange('error');
    } finally {
      isSavingRef.current = false;
    }
  }, [data, hasChanges, onStatusChange]);

  // Debounced save
  const debouncedSave = useCallback(
    debounce(performAutoSave, delay),
    [performAutoSave, delay]
  );

  // Cancel auto-save
  const cancelAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    debouncedSave.cancel();
  }, [debouncedSave]);

  // Trigger auto-save on changes
  useEffect(() => {
    if (hasChanges) {
      onStatusChange('unsaved');
      debouncedSave();
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [data, hasChanges, debouncedSave, onStatusChange]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem('customizerDraft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        const hourAgo = Date.now() - (60 * 60 * 1000);
        
        // Only use draft if it's less than an hour old
        if (parsed.timestamp > hourAgo) {
          // You might want to prompt user to restore draft
          console.log('Draft available from', new Date(parsed.timestamp));
        }
      } catch (error) {
        console.error('Failed to parse draft:', error);
      }
    }
  }, []);

  return {
    autoSave: performAutoSave,
    cancelAutoSave
  };
};