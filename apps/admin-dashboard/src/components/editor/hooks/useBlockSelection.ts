/**
 * useBlockSelection Hook
 * Manages block selection state for multi-select and section operations
 */

import { useState, useCallback } from 'react';
import { Block } from '@/types/post.types';

interface UseBlockSelectionOptions {
  blocks: Block[];
}

export function useBlockSelection({ blocks }: UseBlockSelectionOptions) {
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set());

  // Toggle block selection
  const handleToggleBlockSelection = useCallback((blockId: string) => {
    setSelectedBlockIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blockId)) {
        newSet.delete(blockId);
      } else {
        newSet.add(blockId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedBlockIds(new Set());
  }, []);

  // Check if selected blocks are continuous
  const areSelectedBlocksContinuous = useCallback((): boolean => {
    if (selectedBlockIds.size < 2) return true;

    const selectedIndices = Array.from(selectedBlockIds)
      .map(id => blocks.findIndex(b => b.id === id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i - 1] + 1) {
        return false;
      }
    }
    return true;
  }, [selectedBlockIds, blocks]);

  // Get selected blocks in order
  const getSelectedBlocksInOrder = useCallback((): Block[] => {
    return blocks.filter(b => selectedBlockIds.has(b.id));
  }, [blocks, selectedBlockIds]);

  // Check if a block is selected
  const isBlockSelected = useCallback((blockId: string): boolean => {
    return selectedBlockIds.has(blockId);
  }, [selectedBlockIds]);

  return {
    selectedBlockIds,
    setSelectedBlockIds,
    handleToggleBlockSelection,
    clearSelection,
    areSelectedBlocksContinuous,
    getSelectedBlocksInOrder,
    isBlockSelected,
  };
}
