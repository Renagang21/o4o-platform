/**
 * Text Formatting Shortcuts
 * Bold, Italic, Underline, Strikethrough, Link (in contentEditable only)
 */

import { isEditableTarget } from './utils';

export interface FormattingOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export function createFormattingShortcuts(options: FormattingOptions) {
  const { showToast } = options;

  return (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement;
    const isModKey = e.ctrlKey || e.metaKey;

    // Only work in contentEditable elements
    if (!isModKey || !isEditableTarget(target)) {
      return false;
    }

    // Cmd+B: Bold
    if (e.key === 'b' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('bold', false);
      return true;
    }

    // Cmd+I: Italic
    if (e.key === 'i' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('italic', false);
      return true;
    }

    // Cmd+U: Underline
    if (e.key === 'u' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('underline', false);
      return true;
    }

    // Cmd+Shift+X: Strikethrough
    if (e.key === 'x' && e.shiftKey) {
      e.preventDefault();
      document.execCommand('strikethrough', false);
      return true;
    }

    // Cmd+K: Link
    if (e.key === 'k' && !e.shiftKey) {
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
      return true;
    }

    return false;
  };
}
