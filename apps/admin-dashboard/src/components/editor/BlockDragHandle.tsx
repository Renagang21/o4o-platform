/**
 * BlockDragHandle Component
 * Drag handle for WordPress Gutenberg-style block reordering
 * Phase 2A: Enhanced with drag preview
 */

import React, { useRef } from 'react';

interface BlockDragHandleProps {
  blockId: string;
  blockType?: string;
  multiSelectedCount?: number;
  onDragStart?: (blockId: string, e: React.DragEvent) => void;
  onDragEnd?: (blockId: string, e: React.DragEvent) => void;
  className?: string;
}

export const BlockDragHandle: React.FC<BlockDragHandleProps> = ({
  blockId,
  blockType = 'core/paragraph',
  multiSelectedCount = 0,
  onDragStart,
  onDragEnd,
  className = ''
}) => {
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const createDragPreview = (blockElement: HTMLElement): HTMLElement => {
    // Create drag preview element
    const preview = document.createElement('div');
    preview.className = 'block-drag-preview';
    preview.style.cssText = `
      position: absolute;
      top: -9999px;
      left: -9999px;
      width: ${blockElement.offsetWidth * 0.8}px;
      background: rgba(59, 130, 246, 0.1);
      border: 2px solid #3b82f6;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      padding: 12px;
      pointer-events: none;
      z-index: 9999;
    `;

    // Get block type label
    const blockTypeLabel = blockType.replace('core/', '').replace('o4o/', '');

    // Create preview content
    const content = document.createElement('div');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      color: #3b82f6;
      font-size: 14px;
      font-weight: 500;
    `;

    // Add icon based on block type
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size: 20px;';
    icon.textContent = getBlockIcon(blockType);
    content.appendChild(icon);

    // Add text
    const text = document.createElement('span');
    text.textContent = multiSelectedCount > 0
      ? `${multiSelectedCount} blocks`
      : blockTypeLabel;
    content.appendChild(text);

    // Add badge for multi-selection
    if (multiSelectedCount > 0) {
      const badge = document.createElement('div');
      badge.style.cssText = `
        background: #3b82f6;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        margin-left: auto;
      `;
      badge.textContent = `${multiSelectedCount}`;
      content.appendChild(badge);
    }

    preview.appendChild(content);
    document.body.appendChild(preview);

    return preview;
  };

  const getBlockIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      'core/paragraph': '¶',
      'core/heading': 'H',
      'core/image': '🖼',
      'core/button': '🔘',
      'core/quote': '"',
      'core/list': '•',
      'core/columns': '▦',
      'core/group': '◫',
      'core/gallery': '🖼',
      'core/video': '▶',
    };
    return icons[type] || '□';
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', blockId);
    e.dataTransfer.setData('application/block-id', blockId);

    // Add dragging class to block
    const blockElement = (e.target as HTMLElement).closest('.block-editor-block') as HTMLElement;
    if (blockElement) {
      blockElement.classList.add('is-dragging');

      // Create and set drag preview
      const preview = createDragPreview(blockElement);
      e.dataTransfer.setDragImage(preview, preview.offsetWidth / 2, 20);

      // Remove preview after a short delay
      setTimeout(() => {
        if (preview.parentNode) {
          preview.parentNode.removeChild(preview);
        }
      }, 0);
    }

    onDragStart?.(blockId, e);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();

    // Remove dragging class
    const blockElement = (e.target as HTMLElement).closest('.block-editor-block');
    if (blockElement) {
      blockElement.classList.remove('is-dragging');
    }

    onDragEnd?.(blockId, e);
  };

  return (
    <button
      className={`block-editor-block__drag-handle ${className}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      aria-label="Drag to reorder block"
      title="Drag to reorder"
      type="button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
        focusable="false"
      >
        {/* Six dots icon (⋮⋮) */}
        <path d="M8 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm8-12a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm0 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
      </svg>
    </button>
  );
};

export default BlockDragHandle;
