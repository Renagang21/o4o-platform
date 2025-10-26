/**
 * Block Navigation Shortcuts
 * Tab, Arrow keys, Slash command
 */

import { Block } from '@/types/post.types';
import { shouldInterceptKey } from './utils';

export interface BlockNavigationOptions {
  blocks: Block[];
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  isBlockInserterOpen: boolean;
  setIsBlockInserterOpen: (open: boolean) => void;
}

export function createBlockNavigationShortcuts(options: BlockNavigationOptions) {
  const {
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
  } = options;

  return (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;

    // Slash command: Toggle block inserter
    // Only trigger if NOT in contentEditable, INPUT, or TEXTAREA
    if (e.key === '/' && shouldInterceptKey(target)) {
      e.preventDefault();
      setIsBlockInserterOpen(!isBlockInserterOpen);
      return true;
    }

    // Tab navigation (only when not in editable context)
    if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && shouldInterceptKey(target)) {
      e.preventDefault();
      const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);

      if (e.shiftKey) {
        // Shift+Tab: Previous block
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : blocks.length - 1;
        setSelectedBlockId(blocks[prevIndex]?.id || null);
      } else {
        // Tab: Next block
        const nextIndex = currentIndex < blocks.length - 1 ? currentIndex + 1 : 0;
        setSelectedBlockId(blocks[nextIndex]?.id || null);
      }
      return true;
    }

    // Arrow key navigation (only when not in editable context)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && shouldInterceptKey(target)) {
      const currentIndex = blocks.findIndex((b) => b.id === selectedBlockId);
      if (currentIndex === -1) return false;

      if (e.key === 'ArrowUp' && currentIndex > 0) {
        e.preventDefault();
        setSelectedBlockId(blocks[currentIndex - 1].id);
        return true;
      }

      if (e.key === 'ArrowDown' && currentIndex < blocks.length - 1) {
        e.preventDefault();
        setSelectedBlockId(blocks[currentIndex + 1].id);
        return true;
      }
    }

    return false;
  };
}
