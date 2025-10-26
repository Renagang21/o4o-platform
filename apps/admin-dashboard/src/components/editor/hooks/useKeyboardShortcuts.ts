/**
 * Keyboard Shortcuts Hook
 * Handles all keyboard shortcuts for the editor
 *
 * Extracted from GutenbergBlockEditor to reduce file complexity
 */

import { useEffect } from 'react';
import { Block } from '@/types/post.types';

export interface KeyboardShortcutsOptions {
  handleSave: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  isBlockInserterOpen: boolean;
  setIsBlockInserterOpen: (open: boolean) => void;
  selectedBlockId: string | null;
  setSelectedBlockId: (id: string | null) => void;
  blocks: Block[];
  handleBlockDelete: (blockId: string) => void;
  handleDuplicate: (blockId: string) => void;
  handleBlockCopy: (blockId: string) => void;
  handleBlockPaste: (afterBlockId?: string) => void;
  handleBlockTypeChange: (blockId: string, newType: string) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    handleSave,
    handleUndo,
    handleRedo,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
    selectedBlockId,
    setSelectedBlockId,
    blocks,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    handleBlockTypeChange,
    showToast,
  } = options;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;

      // Save: Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Redo: Ctrl/Cmd + Shift + Z
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedo();
      }
      // Toggle block inserter: /
      // Only trigger if NOT in contentEditable, INPUT, or TEXTAREA
      if (e.key === '/' &&
          !target.isContentEditable &&
          target.getAttribute('contenteditable') !== 'true' &&
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsBlockInserterOpen(!isBlockInserterOpen);
      }
      // Delete key for block deletion
      if (e.key === 'Delete' && selectedBlockId && !e.shiftKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleBlockDelete(selectedBlockId);
        }
      }
      // Tab navigation between blocks
      if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (selectedBlockId) {
            const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
            if (e.shiftKey) {
              // Previous block
              if (currentIndex > 0) {
                setSelectedBlockId(blocks[currentIndex - 1].id);
              }
            } else {
              // Next block
              if (currentIndex < blocks.length - 1) {
                setSelectedBlockId(blocks[currentIndex + 1].id);
              }
            }
          } else if (blocks.length > 0) {
            setSelectedBlockId(blocks[0].id);
          }
        }
      }
      // Arrow key navigation
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (!target.isContentEditable && target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (selectedBlockId) {
            const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
            if (e.key === 'ArrowUp' && currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
            } else if (e.key === 'ArrowDown' && currentIndex < blocks.length - 1) {
              setSelectedBlockId(blocks[currentIndex + 1].id);
            }
          } else if (blocks.length > 0) {
            setSelectedBlockId(blocks[0].id);
          }
        }
      }
      // Enter key to add new block after selected
      // Support both Shift+Enter (forced) and regular Enter (when content is empty)
      if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;

        // Skip if in input or textarea
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }

        // Enter key handling is now delegated to individual block components
        // (e.g., ParagraphBlock handles Enter to create new blocks via onAddBlock)
        // This global handler is kept for blocks that don't handle Enter themselves
      }
      // Backspace to delete empty selected block
      if (e.key === 'Backspace' && selectedBlockId) {
        const target = e.target as HTMLElement;

        // Check if we should delete the block
        const shouldDeleteBlock = () => {
          const block = blocks.find(b => b.id === selectedBlockId);
          if (!block) return false;

          const isEmpty = !block.content ||
                         (typeof block.content === 'string' && !block.content.trim()) ||
                         (typeof block.content === 'object' && 'text' in block.content && !block.content.text?.trim());

          if (!isEmpty) return false;

          // If in contentEditable, check cursor position
          if (target.isContentEditable) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              // Only delete if cursor is at the start (offset 0)
              return range.startOffset === 0 && range.endOffset === 0;
            }
            return false;
          }

          // Outside contentEditable, allow deletion
          return target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA';
        };

        if (shouldDeleteBlock()) {
          e.preventDefault();
          const currentIndex = blocks.findIndex(b => b.id === selectedBlockId);
          handleBlockDelete(selectedBlockId);

          // Select previous block if available, otherwise next
          setTimeout(() => {
            if (currentIndex > 0) {
              setSelectedBlockId(blocks[currentIndex - 1].id);
              // Focus the previous block
              const prevBlockElement = document.querySelector(`[data-block-id="${blocks[currentIndex - 1].id}"]`);
              if (prevBlockElement) {
                const editableElement = prevBlockElement.querySelector('[contenteditable="true"]') as HTMLElement;
                if (editableElement) {
                  editableElement.focus();
                  // Move cursor to end
                  try {
                    const range = document.createRange();
                    const sel = window.getSelection();
                    range.selectNodeContents(editableElement);
                    range.collapse(false);
                    sel?.removeAllRanges();
                    sel?.addRange(range);
                  } catch (error) {
                    console.debug('Range positioning error in useKeyboardShortcuts:', error);
                  }
                }
              }
            } else if (blocks.length > 1) {
              setSelectedBlockId(blocks[1].id);
            }
          }, 10);
        }
      }
      // Ctrl/Cmd + D to duplicate block
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedBlockId) {
        e.preventDefault();
        handleDuplicate(selectedBlockId);
      }
      // Ctrl/Cmd + Y for redo (alternative to Ctrl+Shift+Z)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Text formatting shortcuts (Cmd+B/I/U/K/Shift+X)
      // Only work in contentEditable elements (text blocks)
      if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
        // Cmd+B for Bold
        if ((e.ctrlKey || e.metaKey) && e.key === 'b' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('bold', false);
        }

        // Cmd+I for Italic
        if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('italic', false);
        }

        // Cmd+U for Underline
        if ((e.ctrlKey || e.metaKey) && e.key === 'u' && !e.shiftKey) {
          e.preventDefault();
          document.execCommand('underline', false);
        }

        // Cmd+Shift+X for Strikethrough
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          document.execCommand('strikeThrough', false);
        }

        // Cmd+K for Link
        if ((e.ctrlKey || e.metaKey) && e.key === 'k' && !e.shiftKey) {
          e.preventDefault();
          const selection = window.getSelection();
          if (selection && selection.toString()) {
            const url = prompt('Enter URL:', 'https://');
            if (url) {
              document.execCommand('createLink', false, url);
            }
          } else {
            showToast('Please select text to create a link', 'info');
          }
        }
      }

      // Copy/Paste shortcuts (Cmd+C/V)
      // Cmd+C to copy selected block
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedBlockId) {
        // Only intercept if not in contentEditable (allow native copy in text)
        if (!target.isContentEditable && target.getAttribute('contenteditable') !== 'true') {
          e.preventDefault();
          handleBlockCopy(selectedBlockId);
        }
      }

      // Cmd+V to paste block
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Only intercept if not in contentEditable (allow native paste in text)
        if (!target.isContentEditable && target.getAttribute('contenteditable') !== 'true') {
          e.preventDefault();
          handleBlockPaste(selectedBlockId || undefined);
        }
      }

      // Cmd+/ to trigger slash command
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        if (selectedBlockId && target.isContentEditable) {
          // Insert "/" at cursor position to trigger slash menu
          document.execCommand('insertText', false, '/');
        } else {
          showToast('Slash commands work in text blocks. Try typing "/" in a paragraph.', 'info');
        }
      }

      // Cmd+Opt+I to open Block Inserter
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 'i') {
        e.preventDefault();
        setIsBlockInserterOpen(prev => !prev);
      }

      // Ctrl+Opt+T or Cmd+Opt+T to show block type converter
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key === 't') {
        e.preventDefault();
        if (selectedBlockId) {
          const block = blocks.find(b => b.id === selectedBlockId);
          if (block && (block.type === 'o4o/paragraph' || block.type === 'o4o/heading')) {
            // Cycle through: paragraph → h2 → h3 → h4 → paragraph
            if (block.type === 'o4o/paragraph') {
              handleBlockTypeChange(selectedBlockId, 'o4o/heading-h2');
              showToast('Changed to Heading 2', 'success');
            } else if (block.type === 'o4o/heading') {
              const level = (block.content as any)?.level || 2;
              if (level === 2) {
                handleBlockTypeChange(selectedBlockId, 'o4o/heading-h3');
                showToast('Changed to Heading 3', 'success');
              } else if (level === 3) {
                handleBlockTypeChange(selectedBlockId, 'o4o/heading-h4');
                showToast('Changed to Heading 4', 'success');
              } else {
                handleBlockTypeChange(selectedBlockId, 'o4o/paragraph');
                showToast('Changed to Paragraph', 'success');
              }
            }
          } else {
            showToast('Block type conversion works for text blocks only', 'info');
          }
        }
      }

      // Shift+Alt+H to show keyboard shortcuts help
      if (e.shiftKey && e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        showToast('Keyboard Shortcuts: Cmd+K (Link), Cmd+Shift+X (Strikethrough), Cmd+/ (Slash menu), Cmd+Opt+I (Inserter), Ctrl+Opt+T (Block type), Cmd+B/I/U (Format)', 'info');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSave,
    handleUndo,
    handleRedo,
    isBlockInserterOpen,
    setIsBlockInserterOpen,
    selectedBlockId,
    setSelectedBlockId,
    blocks,
    handleBlockDelete,
    handleDuplicate,
    handleBlockCopy,
    handleBlockPaste,
    handleBlockTypeChange,
    showToast,
  ]);
}
