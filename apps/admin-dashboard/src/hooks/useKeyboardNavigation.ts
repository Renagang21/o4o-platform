/**
 * Keyboard Navigation Hook
 * Adds keyboard shortcuts and navigation to the editor
 */

import { useEffect, useCallback, useRef } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

interface UseKeyboardNavigationProps {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onSelectAll?: () => void;
  onToggleBlockSettings?: () => void;
  onToggleListView?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation({
  onSave,
  onUndo,
  onRedo,
  onDuplicate,
  onDelete,
  onSelectAll,
  onToggleBlockSettings,
  onToggleListView,
  enabled = true
}: UseKeyboardNavigationProps) {
  const shortcuts = useRef<KeyboardShortcut[]>([]);

  // Define shortcuts
  useEffect(() => {
    shortcuts.current = [
      {
        key: 's',
        ctrlKey: true,
        handler: () => onSave?.(),
        description: 'Save'
      },
      {
        key: 'z',
        ctrlKey: true,
        handler: () => onUndo?.(),
        description: 'Undo'
      },
      {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        handler: () => onRedo?.(),
        description: 'Redo'
      },
      {
        key: 'y',
        ctrlKey: true,
        handler: () => onRedo?.(),
        description: 'Redo (alternative)'
      },
      {
        key: 'd',
        ctrlKey: true,
        shiftKey: true,
        handler: () => onDuplicate?.(),
        description: 'Duplicate block'
      },
      {
        key: 'Delete',
        handler: () => onDelete?.(),
        description: 'Delete block'
      },
      {
        key: 'Backspace',
        handler: () => onDelete?.(),
        description: 'Delete block (alternative)'
      },
      {
        key: 'a',
        ctrlKey: true,
        handler: () => onSelectAll?.(),
        description: 'Select all'
      },
      {
        key: ',',
        ctrlKey: true,
        handler: () => onToggleBlockSettings?.(),
        description: 'Toggle block settings'
      },
      {
        key: 'o',
        ctrlKey: true,
        shiftKey: true,
        handler: () => onToggleListView?.(),
        description: 'Toggle list view'
      }
    ];
  }, [onSave, onUndo, onRedo, onDuplicate, onDelete, onSelectAll, onToggleBlockSettings, onToggleListView]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't handle shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.contentEditable === 'true') {
      return;
    }

    // Check each shortcut
    for (const shortcut of shortcuts.current) {
      const ctrlOrCmd = navigator.platform.includes('Mac') ? event.metaKey : event.ctrlKey;
      
      if (event.key === shortcut.key &&
          (shortcut.ctrlKey ? ctrlOrCmd : true) &&
          (shortcut.shiftKey ? event.shiftKey : !event.shiftKey) &&
          (shortcut.altKey ? event.altKey : !event.altKey)) {
        
        event.preventDefault();
        shortcut.handler();
        break;
      }
    }
  }, [enabled]);

  // Set up event listeners
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);

  // Return list of available shortcuts for display
  return {
    shortcuts: shortcuts.current.map(s => ({
      key: s.key,
      modifiers: [
        s.ctrlKey && (navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'),
        s.shiftKey && 'Shift',
        s.altKey && 'Alt'
      ].filter(Boolean).join('+'),
      description: s.description
    }))
  };
}

/**
 * Block navigation with arrow keys
 */
export function useBlockArrowNavigation() {
  const handleArrowNavigation = useCallback((event: KeyboardEvent) => {
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      return;
    }

    // Get current selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const isAtStart = range.startOffset === 0;
    const isAtEnd = range.endOffset === range.endContainer.textContent?.length;

    // Handle navigation between blocks
    if ((event.key === 'ArrowUp' && isAtStart) || 
        (event.key === 'ArrowDown' && isAtEnd)) {
      
      // Find current block element
      let currentBlock = range.startContainer as Node;
      while (currentBlock && !currentBlock.parentElement?.classList.contains('wp-block')) {
        currentBlock = currentBlock.parentElement as Node;
      }

      if (currentBlock) {
        const blocks = Array.from(document.querySelectorAll('.wp-block'));
        const currentIndex = blocks.indexOf(currentBlock as Element);
        
        let targetBlock: Element | null = null;
        if (event.key === 'ArrowUp' && currentIndex > 0) {
          targetBlock = blocks[currentIndex - 1];
        } else if (event.key === 'ArrowDown' && currentIndex < blocks.length - 1) {
          targetBlock = blocks[currentIndex + 1];
        }

        if (targetBlock) {
          event.preventDefault();
          
          // Focus on the target block's editable area
          const editable = targetBlock.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editable) {
            editable.focus();
            
            // Place cursor at beginning or end
            const newRange = document.createRange();
            const textNode = editable.firstChild || editable;
            
            if (event.key === 'ArrowUp') {
              // Place at end
              newRange.selectNodeContents(textNode);
              newRange.collapse(false);
            } else {
              // Place at beginning
              newRange.setStart(textNode, 0);
              newRange.collapse(true);
            }
            
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleArrowNavigation);
    
    return () => {
      document.removeEventListener('keydown', handleArrowNavigation);
    };
  }, [handleArrowNavigation]);
}

export default useKeyboardNavigation;