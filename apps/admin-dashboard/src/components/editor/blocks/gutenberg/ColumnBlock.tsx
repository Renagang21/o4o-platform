/**
 * ColumnBlock
 *
 * Individual column within Gutenberg Columns block.
 * Clean structure: CleanBlockWrapper + InnerBlocks pattern
 *
 * Features:
 * - Width control
 * - Vertical alignment
 * - Nested blocks support
 */

import React, { useCallback } from 'react';
import { Block } from '@/types/post.types';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';
import EnhancedBlockWrapper from '../EnhancedBlockWrapper';
import { BlockToolbar } from './BlockToolbar';
import { AlignStartVertical, AlignCenterVertical, AlignEndVertical } from 'lucide-react';

interface ColumnBlockProps extends BlockProps {
  attributes?: {
    width?: number; // Percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

export const ColumnBlock: React.FC<ColumnBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
  } = attributes;

  // Update width
  const handleWidthChange = useCallback(
    (newWidth: number) => {
      if (newWidth < 10) newWidth = 10;
      if (newWidth > 100) newWidth = 100;
      onChange?.('', { ...attributes, width: newWidth });
    },
    [attributes, onChange]
  );

  // Update vertical alignment
  const handleVerticalAlignmentChange = useCallback(
    (newAlignment: 'top' | 'center' | 'bottom') => {
      onChange?.('', { ...attributes, verticalAlignment: newAlignment });
    },
    [attributes, onChange]
  );

  const alignmentClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="column"
      isSelected={isSelected}
      onSelect={() => {}}
      className="gutenberg-column-block"
    >
      {/* Gutenberg-style Block Toolbar */}
      {isSelected && (
        <BlockToolbar>
          {/* Vertical Alignment */}
          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300">
            <span className="text-xs text-gray-500 mr-1">Align:</span>
            <button
              onClick={() => handleVerticalAlignmentChange('top')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'top' && 'bg-gray-200'
              )}
              title="Align top"
            >
              <AlignStartVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVerticalAlignmentChange('center')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'center' && 'bg-gray-200'
              )}
              title="Align center"
            >
              <AlignCenterVertical className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleVerticalAlignmentChange('bottom')}
              className={cn(
                'p-1.5 rounded hover:bg-gray-100 transition-colors',
                verticalAlignment === 'bottom' && 'bg-gray-200'
              )}
              title="Align bottom"
            >
              <AlignEndVertical className="w-4 h-4" />
            </button>
          </div>

          {/* Width Control */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Width:</span>
            <input
              type="number"
              min={10}
              max={100}
              value={Math.round(width)}
              onChange={(e) => handleWidthChange(parseInt(e.target.value) || 50)}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </BlockToolbar>
      )}

      {/* Column Content */}
      <div
        className={cn(
          'wp-block-column__content flex flex-col min-h-[100px]',
          alignmentClasses[verticalAlignment]
        )}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
      >
        {innerBlocks && innerBlocks.length > 0 ? (
          <div className="inner-blocks-container">
            {/* Inner blocks will be rendered by parent */}
            {innerBlocks.map((block) => (
              <div key={block.id} className="inner-block p-2 border-b border-gray-100">
                <p className="text-sm text-gray-600">
                  {block.type} block
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-column p-8 text-center border-2 border-dashed border-gray-300 rounded">
            <p className="text-sm text-gray-500">
              Click to add content
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Use the + button to add blocks
            </p>
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ColumnBlock;
