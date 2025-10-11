/**
 * BlockToolbar Component
 * Floating toolbar that appears above selected blocks
 */

import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import CommonTools from './CommonTools';
import TextBlockToolbar from './TextBlockToolbar';
import ImageBlockToolbar from './ImageBlockToolbar';
import ButtonBlockToolbar from './ButtonBlockToolbar';

interface BlockToolbarProps {
  blockId: string;
  blockType: string;
  blockElement: HTMLElement | null;
  onUpdate?: (updates: any) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onChangeType?: (newType: string) => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

const TOOLBAR_HEIGHT = 44;
const TOOLBAR_OFFSET = 8;
const THROTTLE_MS = 16; // ~60fps

// Throttle utility for scroll events
const throttle = (func: Function, delay: number) => {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: any[]) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    // Clear any pending timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (timeSinceLastCall >= delay) {
      lastCall = now;
      func(...args);
    } else {
      // Schedule a call for the remaining time
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, delay - timeSinceLastCall);
    }
  };
};

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  blockId,
  blockType,
  blockElement,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onChangeType,
  canMoveUp,
  canMoveDown,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const throttledUpdateRef = useRef<Function | null>(null);

  // Calculate toolbar position with improved boundary handling
  const updatePosition = () => {
    if (!blockElement) return;

    const rect = blockElement.getBoundingClientRect();
    const scrollTop = window.scrollY;
    const scrollLeft = window.scrollX;
    const viewportHeight = window.innerHeight;

    let top = rect.top + scrollTop - TOOLBAR_HEIGHT - TOOLBAR_OFFSET;
    const left = rect.left + scrollLeft;
    const width = rect.width;

    // Improved boundary handling
    const headerOffset = 60; // Typical header height
    const minTopSpace = TOOLBAR_HEIGHT + TOOLBAR_OFFSET + headerOffset;
    const maxBottomSpace = viewportHeight - TOOLBAR_OFFSET;

    // Check if toolbar would go off-screen at top
    if (rect.top < minTopSpace) {
      // Position below block instead
      top = rect.bottom + scrollTop + TOOLBAR_OFFSET;

      // If positioning below would also go off-screen at bottom
      if (rect.bottom + TOOLBAR_HEIGHT + TOOLBAR_OFFSET > maxBottomSpace) {
        // Keep it above but clip to minimum visible position
        top = scrollTop + headerOffset;
      }
    }

    // Check if block is completely off-screen
    const isBlockVisible = rect.bottom > 0 && rect.top < viewportHeight;

    setPosition({ top, left, width });
    setIsVisible(isBlockVisible);
  };

  // Update position on mount and when block element changes
  useEffect(() => {
    if (blockElement) {
      updatePosition();
    }
  }, [blockElement, blockId]);

  // Update position on scroll with throttle
  useEffect(() => {
    // Create throttled version on mount
    if (!throttledUpdateRef.current) {
      throttledUpdateRef.current = throttle(updatePosition, THROTTLE_MS);
    }

    const handleScroll = () => {
      throttledUpdateRef.current?.();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [blockElement]);

  // Determine which toolbar to show based on block type
  const isTextBlock = [
    'core/paragraph',
    'core/heading',
    'core/quote',
    'core/list',
  ].includes(blockType);

  const isImageBlock = blockType === 'core/image';
  const isButtonBlock = blockType === 'core/button';

  if (!blockElement) return null;

  const toolbarContent = (
    <div
      ref={toolbarRef}
      className={`block-toolbar ${isVisible ? 'is-visible' : ''}`}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 1000,
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent losing selection
    >
      <div className="block-toolbar-inner">
        {/* Common tools (always visible) */}
        <CommonTools
          blockId={blockId}
          blockType={blockType}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onChangeType={onChangeType}
          canMoveUp={canMoveUp}
          canMoveDown={canMoveDown}
        />

        {/* Block-specific tools */}
        {isTextBlock && (
          <TextBlockToolbar
            blockId={blockId}
            blockType={blockType}
            onUpdate={onUpdate}
          />
        )}

        {isImageBlock && (
          <ImageBlockToolbar
            blockId={blockId}
            blockType={blockType}
            onUpdate={onUpdate}
          />
        )}

        {isButtonBlock && (
          <ButtonBlockToolbar
            blockId={blockId}
            blockType={blockType}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  );

  // Render toolbar in portal at document body
  return createPortal(toolbarContent, document.body);
};

export default BlockToolbar;
