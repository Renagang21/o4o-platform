/**
 * useKeyboardNavigation - Keyboard shortcuts for slide navigation
 * Phase 2: Advanced editing features
 */

import { useEffect, useCallback } from 'react';

interface UseKeyboardNavigationProps {
  onNext: () => void;
  onPrev: () => void;
  onTogglePlay?: () => void;
  onEscape?: () => void;
  onFullscreen?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  enabled?: boolean;
  isEditing?: boolean;
}

export const useKeyboardNavigation = ({
  onNext,
  onPrev,
  onTogglePlay,
  onEscape,
  onFullscreen,
  onDelete,
  onDuplicate,
  enabled = true,
  isEditing = false
}: UseKeyboardNavigationProps) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't handle if user is typing in an input
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true') {
      return;
    }

    // Navigation shortcuts
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        onPrev();
        break;
      
      case 'ArrowRight':
        event.preventDefault();
        onNext();
        break;
      
      case 'ArrowUp':
        if (event.shiftKey) {
          event.preventDefault();
          onPrev();
        }
        break;
      
      case 'ArrowDown':
        if (event.shiftKey) {
          event.preventDefault();
          onNext();
        }
        break;
      
      case ' ':  // Spacebar
        if (!isEditing) {
          event.preventDefault();
          onTogglePlay?.();
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        onEscape?.();
        break;
      
      case 'f':
      case 'F':
        if (!isEditing) {
          event.preventDefault();
          onFullscreen?.();
        }
        break;
      
      case 'Delete':
      case 'Backspace':
        if (isEditing && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onDelete?.();
        }
        break;
      
      case 'd':
      case 'D':
        if (isEditing && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          onDuplicate?.();
        }
        break;
      
      case 'Home':
        event.preventDefault();
        // Go to first slide - handled by parent
        break;
      
      case 'End':
        event.preventDefault();
        // Go to last slide - handled by parent
        break;
    }

    // Number keys for direct slide navigation (1-9)
    if (event.key >= '1' && event.key <= '9' && !isEditing) {
      event.preventDefault();
      const slideIndex = parseInt(event.key) - 1;
      // This will be handled by parent component
      window.dispatchEvent(new CustomEvent('slideGoTo', { detail: slideIndex }));
    }
  }, [enabled, isEditing, onNext, onPrev, onTogglePlay, onEscape, onFullscreen, onDelete, onDuplicate]);

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: [
      { key: '←/→', description: 'Navigate slides' },
      { key: 'Space', description: 'Play/Pause' },
      { key: 'F', description: 'Fullscreen' },
      { key: 'Esc', description: 'Exit fullscreen' },
      { key: '1-9', description: 'Jump to slide' },
      ...(isEditing ? [
        { key: 'Ctrl+D', description: 'Duplicate slide' },
        { key: 'Ctrl+Delete', description: 'Delete slide' },
      ] : [])
    ]
  };
};

export default useKeyboardNavigation;