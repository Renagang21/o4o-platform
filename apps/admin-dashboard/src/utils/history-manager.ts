/**
 * History Manager for Block Editor
 * Phase 2A: Optimized diff-based history with session restoration
 */

import { Block } from '@/types/post.types';

export interface HistoryEntry {
  timestamp: number;
  blocks: Block[];
  // For future diff-based optimization
  // diff?: any;
}

export interface EditorSession {
  history: HistoryEntry[];
  historyIndex: number;
  documentTitle: string;
  timestamp: number;
}

const SESSION_STORAGE_KEY = 'gutenberg_editor_session';
const MAX_HISTORY_SIZE = 100; // Increased from 50
const SESSION_SAVE_DEBOUNCE = 500; // ms

/**
 * Simple diff calculation (for future optimization)
 * Currently stores full blocks, can be enhanced with actual diff algorithm
 */
export function calculateDiff(oldBlocks: Block[], newBlocks: Block[]): any {
  // Placeholder for diff algorithm
  // Can implement JSON diff in future
  return { type: 'full', blocks: newBlocks };
}

/**
 * Apply diff to reconstruct blocks (for future optimization)
 */
export function applyDiff(baseBlocks: Block[], diff: any): Block[] {
  // Placeholder for diff application
  // Currently just returns the blocks from diff
  if (diff.type === 'full') {
    return diff.blocks;
  }
  return baseBlocks;
}

/**
 * Optimize history by removing image content for storage
 */
export function optimizeBlocksForStorage(blocks: Block[]): Block[] {
  return blocks.map(block => {
    // Keep block structure but optimize large content
    if (block.type === 'o4o/image' && block.content && typeof block.content === 'object') {
      return {
        ...block,
        content: {
          ...block.content,
          // Keep URL reference but don't store base64 data
          url: block.content.url,
        }
      };
    }
    return block;
  });
}

/**
 * Save editor session to sessionStorage
 */
let saveTimeout: NodeJS.Timeout | null = null;

export function saveEditorSession(
  history: HistoryEntry[],
  historyIndex: number,
  documentTitle: string
): void {
  // Debounce saves
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    try {
      const session: EditorSession = {
        history: history.slice(-MAX_HISTORY_SIZE), // Keep last 100 entries
        historyIndex: Math.min(historyIndex, MAX_HISTORY_SIZE - 1),
        documentTitle,
        timestamp: Date.now(),
      };

      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
      // Handle quota exceeded or other storage errors
      console.warn('Failed to save editor session:', error);

      // Try saving with smaller history
      try {
        const minimalSession: EditorSession = {
          history: history.slice(-10), // Keep only last 10
          historyIndex: Math.min(historyIndex, 9),
          documentTitle,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimalSession));
      } catch (retryError) {
        console.error('Failed to save minimal session:', retryError);
      }
    }
  }, SESSION_SAVE_DEBOUNCE);
}

/**
 * Load editor session from sessionStorage
 */
export function loadEditorSession(): EditorSession | null {
  try {
    const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) return null;

    const session: EditorSession = JSON.parse(sessionData);

    // Validate session age (don't restore sessions older than 24 hours)
    const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - session.timestamp > MAX_SESSION_AGE) {
      clearEditorSession();
      return null;
    }

    return session;
  } catch (error) {
    console.warn('Failed to load editor session:', error);
    return null;
  }
}

/**
 * Clear editor session from sessionStorage
 */
export function clearEditorSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear editor session:', error);
  }
}

/**
 * Check if there's a stored session available
 */
export function hasStoredSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Create history entry
 */
export function createHistoryEntry(blocks: Block[]): HistoryEntry {
  return {
    timestamp: Date.now(),
    blocks: optimizeBlocksForStorage(blocks),
  };
}

/**
 * Manage history size limit
 */
export function trimHistory(history: HistoryEntry[], maxSize: number = MAX_HISTORY_SIZE): HistoryEntry[] {
  if (history.length <= maxSize) {
    return history;
  }

  // Keep most recent entries
  return history.slice(-maxSize);
}

/**
 * Get memory usage estimate (for debugging)
 */
export function getHistoryMemoryUsage(history: HistoryEntry[]): number {
  try {
    const jsonString = JSON.stringify(history);
    // Rough estimate: each character is ~2 bytes in UTF-16
    return jsonString.length * 2;
  } catch {
    return 0;
  }
}

/**
 * Format memory size for display
 */
export function formatMemorySize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
