/**
 * useBlockToolbar Hook
 *
 * Manages block toolbar visibility and positioning
 * Extracted from EnhancedBlockWrapper to reduce complexity
 */

import { useState, useEffect, RefObject } from 'react';

export interface UseBlockToolbarOptions {
  /** Block element reference */
  blockRef: RefObject<HTMLElement>;
  /** Whether block is selected */
  isSelected: boolean;
  /** Whether block is hovered */
  isHovered: boolean;
}

export interface UseBlockToolbarResult {
  /** Whether to show the toolbar */
  showToolbar: boolean;
  /** Toolbar position ('top' or 'bottom') */
  toolbarPosition: 'top' | 'bottom';
}

/**
 * Smart toolbar positioning hook
 *
 * Features:
 * - Shows toolbar when block is selected or hovered
 * - Automatically positions toolbar above or below block to avoid screen edges
 * - Updates position on scroll and resize
 *
 * @param options - Hook configuration
 * @returns Toolbar visibility and position state
 *
 * @example
 * ```typescript
 * const blockRef = useRef<HTMLDivElement>(null);
 * const { showToolbar, toolbarPosition } = useBlockToolbar({
 *   blockRef,
 *   isSelected,
 *   isHovered,
 * });
 * ```
 */
export function useBlockToolbar({
  blockRef,
  isSelected,
  isHovered,
}: UseBlockToolbarOptions): UseBlockToolbarResult {
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<'top' | 'bottom'>('top');

  // Show toolbar when selected or hovered
  useEffect(() => {
    setShowToolbar(isSelected || isHovered);
  }, [isSelected, isHovered]);

  // Smart toolbar positioning: avoid screen edges
  useEffect(() => {
    if (!showToolbar || !blockRef.current) return;

    const updateToolbarPosition = () => {
      const blockRect = blockRef.current?.getBoundingClientRect();
      if (!blockRect) return;

      const TOOLBAR_HEIGHT = 45; // Approximate toolbar height
      const SPACING = 8; // Spacing from block edge
      const HEADER_HEIGHT = 60; // Editor header height

      // Check if there's enough space above the block
      const spaceAbove = blockRect.top - HEADER_HEIGHT;

      // Position toolbar below if not enough space above
      if (spaceAbove < TOOLBAR_HEIGHT + SPACING) {
        setToolbarPosition('bottom');
      } else {
        setToolbarPosition('top');
      }
    };

    updateToolbarPosition();

    // Update on scroll and resize
    window.addEventListener('scroll', updateToolbarPosition, true);
    window.addEventListener('resize', updateToolbarPosition);

    return () => {
      window.removeEventListener('scroll', updateToolbarPosition, true);
      window.removeEventListener('resize', updateToolbarPosition);
    };
  }, [showToolbar, blockRef]);

  return {
    showToolbar,
    toolbarPosition,
  };
}
