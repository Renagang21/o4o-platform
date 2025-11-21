/**
 * useEditorUI Hook
 * Manages all UI-related state (modals, panels, toggles)
 */

import { useState, useCallback } from 'react';
import { Block } from '@/types/post.types';
import { NewBlockRequest } from '@/services/ai/types';

export function useEditorUI() {
  // Modal/Panel states
  const [isBlockInserterOpen, setIsBlockInserterOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCodeView, setIsCodeView] = useState(false);
  const [isDesignLibraryOpen, setIsDesignLibraryOpen] = useState(false);
  const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'document' | 'block'>('document');

  // AI Modal states
  const [isBlockAIModalOpen, setIsBlockAIModalOpen] = useState(false);
  const [blockToEdit, setBlockToEdit] = useState<Block | null>(null);
  const [initialAIAction, setInitialAIAction] = useState<'refine' | 'improve' | 'translate-ko'>('refine');
  const [isSectionAIModalOpen, setIsSectionAIModalOpen] = useState(false);
  const [isPageImproveModalOpen, setIsPageImproveModalOpen] = useState(false);

  // New Block Request Panel state
  const [newBlocksRequest, setNewBlocksRequest] = useState<NewBlockRequest[]>([]);

  // Block copy state
  const [copiedBlock, setCopiedBlock] = useState<Block | null>(null);

  // Toggle handlers
  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => {
      const newState = !prev;
      if (newState) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      return newState;
    });
  }, []);

  const handleToggleCodeView = useCallback(() => {
    setIsCodeView(prev => !prev);
  }, []);

  // Block AI Modal handlers
  const handleOpenBlockAIModal = useCallback((
    block: Block,
    actionType: 'edit' | 'improve' | 'translate' = 'edit'
  ) => {
    setBlockToEdit(block);

    const actionMap: Record<'edit' | 'improve' | 'translate', 'refine' | 'improve' | 'translate-ko'> = {
      'edit': 'refine',
      'improve': 'improve',
      'translate': 'translate-ko',
    };
    setInitialAIAction(actionMap[actionType]);

    setIsBlockAIModalOpen(true);
  }, []);

  const handleCloseBlockAIModal = useCallback(() => {
    setIsBlockAIModalOpen(false);
    setBlockToEdit(null);
  }, []);

  return {
    // States
    isBlockInserterOpen,
    isFullscreen,
    isCodeView,
    isDesignLibraryOpen,
    isAIGeneratorOpen,
    isAIChatOpen,
    sidebarOpen,
    activeTab,
    isBlockAIModalOpen,
    isSectionAIModalOpen,
    isPageImproveModalOpen,
    blockToEdit,
    initialAIAction,
    newBlocksRequest,
    copiedBlock,

    // Setters
    setIsBlockInserterOpen,
    setIsFullscreen,
    setIsCodeView,
    setIsDesignLibraryOpen,
    setIsAIGeneratorOpen,
    setIsAIChatOpen,
    setSidebarOpen,
    setActiveTab,
    setIsBlockAIModalOpen,
    setIsSectionAIModalOpen,
    setIsPageImproveModalOpen,
    setBlockToEdit,
    setInitialAIAction,
    setNewBlocksRequest,
    setCopiedBlock,

    // Handlers
    handleToggleFullscreen,
    handleToggleCodeView,
    handleOpenBlockAIModal,
    handleCloseBlockAIModal,
  };
}
