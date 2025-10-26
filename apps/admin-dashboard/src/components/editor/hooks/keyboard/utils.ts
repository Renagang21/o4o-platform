/**
 * Keyboard Shortcuts Utilities
 *
 * Common utility functions for keyboard event handling
 */

/**
 * Check if target is a contentEditable element
 */
export function isEditableTarget(target: HTMLElement): boolean {
  return target.isContentEditable || target.getAttribute('contenteditable') === 'true';
}

/**
 * Check if target is an input element
 */
export function isInputTarget(target: HTMLElement): boolean {
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
}

/**
 * Check if we should intercept this keyboard event
 * Returns true if the event is NOT in an editable context
 */
export function shouldInterceptKey(target: HTMLElement): boolean {
  return !isEditableTarget(target) && !isInputTarget(target);
}

/**
 * Check if block is empty
 */
export function isBlockEmpty(block: any): boolean {
  if (!block) return true;

  if (typeof block.content === 'string') {
    return block.content.trim().length === 0;
  }

  if (typeof block.content === 'object' && block.content !== null) {
    const text = (block.content as any).text || '';
    const cleanText = text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Convert nbsp to space
      .trim();
    return cleanText.length === 0;
  }

  return true;
}
