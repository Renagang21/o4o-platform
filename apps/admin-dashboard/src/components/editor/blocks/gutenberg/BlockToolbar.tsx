/**
 * BlockToolbar
 *
 * WordPress Gutenberg-style block toolbar.
 * Appears above the selected block with quick controls.
 *
 * Inspired by WordPress BlockControls component.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Link,
  Type,
} from 'lucide-react';

interface BlockToolbarProps {
  // Alignment
  align?: 'left' | 'center' | 'right' | 'justify';
  onAlignChange?: (align: 'left' | 'center' | 'right' | 'justify') => void;

  // Formatting (for text blocks)
  isBold?: boolean;
  isItalic?: boolean;
  onToggleBold?: () => void;
  onToggleItalic?: () => void;
  onToggleLink?: () => void;

  // Heading level (for heading blocks)
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  onHeadingLevelChange?: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;

  // Custom content
  children?: React.ReactNode;
}

export const BlockToolbar: React.FC<BlockToolbarProps> = ({
  align,
  onAlignChange,
  isBold,
  isItalic,
  onToggleBold,
  onToggleItalic,
  onToggleLink,
  headingLevel,
  onHeadingLevelChange,
  children,
}) => {
  return (
    <div
      className={cn(
        'block-toolbar',
        'absolute -top-11 left-0',
        'flex items-center gap-1',
        'bg-white border border-gray-300 rounded shadow-md',
        'px-2 py-1',
        'z-50'
      )}
      onClick={(e) => {
        // Prevent toolbar clicks from bubbling
        e.stopPropagation();
      }}
    >
      {/* Heading Level Selector */}
      {headingLevel !== undefined && onHeadingLevelChange && (
        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
          <Type className="w-4 h-4 text-gray-500" />
          <select
            value={headingLevel}
            onChange={(e) => onHeadingLevelChange(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6)}
            className="text-sm border-0 bg-transparent focus:outline-none cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
            <option value={4}>H4</option>
            <option value={5}>H5</option>
            <option value={6}>H6</option>
          </select>
        </div>
      )}

      {/* Alignment Controls */}
      {onAlignChange && (
        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
          <button
            onClick={() => onAlignChange('left')}
            className={cn(
              'p-1.5 rounded hover:bg-gray-100 transition-colors',
              align === 'left' && 'bg-gray-200'
            )}
            title="Align left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignChange('center')}
            className={cn(
              'p-1.5 rounded hover:bg-gray-100 transition-colors',
              align === 'center' && 'bg-gray-200'
            )}
            title="Align center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignChange('right')}
            className={cn(
              'p-1.5 rounded hover:bg-gray-100 transition-colors',
              align === 'right' && 'bg-gray-200'
            )}
            title="Align right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onAlignChange('justify')}
            className={cn(
              'p-1.5 rounded hover:bg-gray-100 transition-colors',
              align === 'justify' && 'bg-gray-200'
            )}
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Text Formatting */}
      {(onToggleBold || onToggleItalic || onToggleLink) && (
        <div className="flex items-center gap-1">
          {onToggleBold && (
            <button
              onClick={onToggleBold}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors font-bold',
                isBold && 'bg-gray-200'
              )}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
          )}
          {onToggleItalic && (
            <button
              onClick={onToggleItalic}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors italic',
                isItalic && 'bg-gray-200'
              )}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
          )}
          {onToggleLink && (
            <button
              onClick={onToggleLink}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Link (Ctrl+K)"
            >
              <Link className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Custom content */}
      {children}
    </div>
  );
};

export default BlockToolbar;
