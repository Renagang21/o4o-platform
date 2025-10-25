/**
 * useSlashCommands Hook
 *
 * Manages slash command functionality in the block editor
 * Extracted from GutenbergBlockEditor to reduce complexity
 */

import { useState, useCallback, useRef } from 'react';
import { Block } from '@/types/post.types';

interface UseSlashCommandsProps {
  blocksRef: React.RefObject<Block[]>;
  updateBlocks: (blocks: Block[]) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
}

export function useSlashCommands({
  blocksRef,
  updateBlocks,
  selectedBlockId,
  setSelectedBlockId,
}: UseSlashCommandsProps) {
  const [isSlashMenuOpen, setIsSlashMenuOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashTriggerBlockId, setSlashTriggerBlockId] = useState<string | null>(null);
  const [recentBlocks, setRecentBlocks] = useState<string[]>([]);
  const slashMenuRef = useRef<{ query: string; blockId: string | null }>({ query: '', blockId: null });

  // Handle slash command block selection
  const handleSlashCommandSelect = useCallback(
    (blockType: string) => {
      const triggerBlockId = slashTriggerBlockId || selectedBlockId;

      if (!triggerBlockId) return;

      const blockIndex = blocksRef.current!.findIndex(b => b.id === triggerBlockId);
      if (blockIndex === -1) return;

      const triggerBlock = blocksRef.current![blockIndex];

      // Remove "/" and query text from the trigger block
      let cleanedText = '';
      if (triggerBlock.content && typeof triggerBlock.content === 'object' && 'text' in triggerBlock.content) {
        const text = triggerBlock.content.text as string || '';
        const slashIndex = text.lastIndexOf('/');
        if (slashIndex !== -1) {
          cleanedText = text.substring(0, slashIndex);
        } else {
          cleanedText = text;
        }
      }

      // Create new block
      const newBlock: Block = {
        id: `block-${Date.now()}`,
        type: blockType,
        content: blockType.includes('heading') ? { text: '', level: 2 } : { text: '' },
        attributes: {},
      };

      const newBlocks = [...blocksRef.current!];

      // If trigger block is empty (only had "/"), replace it
      if (!cleanedText.trim()) {
        newBlocks[blockIndex] = newBlock;
      } else {
        // Update trigger block and insert new block after
        newBlocks[blockIndex] = {
          ...triggerBlock,
          content: { ...triggerBlock.content, text: cleanedText }
        };
        newBlocks.splice(blockIndex + 1, 0, newBlock);
      }

      updateBlocks(newBlocks);
      setSelectedBlockId(newBlock.id);

      // Update recent blocks
      setRecentBlocks(prev => {
        const updated = [blockType, ...prev.filter(t => t !== blockType)];
        return updated.slice(0, 5);
      });

      // Close slash menu
      setIsSlashMenuOpen(false);
      setSlashQuery('');
      setSlashTriggerBlockId(null);

      // Focus new block
      setTimeout(() => {
        const newBlockElement = document.querySelector(`[data-block-id="${newBlock.id}"]`);
        if (newBlockElement) {
          const editableElement = newBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
          if (editableElement) {
            editableElement.focus();
          }
        }
      }, 50);
    },
    [selectedBlockId, slashTriggerBlockId, blocksRef, updateBlocks, setSelectedBlockId]
  );

  // Close slash menu
  const closeSlashMenu = useCallback(() => {
    setIsSlashMenuOpen(false);
    setSlashQuery('');
    setSlashTriggerBlockId(null);
  }, []);

  // Open slash menu
  const openSlashMenu = useCallback((query: string, blockId: string, position: { top: number; left: number }) => {
    setSlashQuery(query);
    setSlashTriggerBlockId(blockId);
    setSlashMenuPosition(position);
    setIsSlashMenuOpen(true);
    slashMenuRef.current = { query, blockId };
  }, []);

  return {
    isSlashMenuOpen,
    slashQuery,
    slashMenuPosition,
    slashTriggerBlockId,
    recentBlocks,
    slashMenuRef,
    handleSlashCommandSelect,
    closeSlashMenu,
    openSlashMenu,
    setIsSlashMenuOpen,
    setSlashQuery,
    setSlashTriggerBlockId,
  };
}
