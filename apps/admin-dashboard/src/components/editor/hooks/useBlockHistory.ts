/**
 * useBlockHistory Hook
 *
 * Manages undo/redo history for block editor
 * Extracted from GutenbergBlockEditor to reduce complexity
 */

import { useState, useCallback } from 'react';
import { Block } from '@/types/post.types';
import {
  saveEditorSession,
  createHistoryEntry,
  trimHistory,
  type HistoryEntry,
} from '@/utils/history-manager';

interface UseBlockHistoryProps {
  initialBlocks: Block[];
  documentTitle: string;
}

export function useBlockHistory({ initialBlocks, documentTitle }: UseBlockHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([createHistoryEntry(initialBlocks)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Add to history
  const addToHistory = useCallback(
    (newBlocks: Block[]) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(createHistoryEntry(newBlocks));

      const trimmedHistory = trimHistory(newHistory);
      setHistory(trimmedHistory);
      setHistoryIndex(trimmedHistory.length - 1);

      saveEditorSession(trimmedHistory, trimmedHistory.length - 1, documentTitle);
    },
    [history, historyIndex, documentTitle]
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      saveEditorSession(history, newIndex, documentTitle);
      return history[newIndex].blocks;
    }
    return null;
  }, [history, historyIndex, documentTitle]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      saveEditorSession(history, newIndex, documentTitle);
      return history[newIndex].blocks;
    }
    return null;
  }, [history, historyIndex, documentTitle]);

  // Reset history (for initialization)
  const resetHistory = useCallback((blocks: Block[]) => {
    const newHistory = [createHistoryEntry(blocks)];
    setHistory(newHistory);
    setHistoryIndex(0);
  }, []);

  // Set history (for session restoration)
  const setHistoryState = useCallback((newHistory: HistoryEntry[], newIndex: number) => {
    setHistory(newHistory);
    setHistoryIndex(newIndex);
  }, []);

  return {
    history,
    historyIndex,
    addToHistory,
    handleUndo,
    handleRedo,
    resetHistory,
    setHistoryState,
  };
}
