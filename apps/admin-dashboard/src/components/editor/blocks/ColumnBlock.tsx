/**
 * ColumnBlock Component
 * WordPress Gutenberg Column 블록 완전 모방
 * Columns 블록 내부의 개별 컬럼, InnerBlocks로 다른 블록들을 포함
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Percent
} from 'lucide-react';

interface ColumnBlockProps extends BlockProps {
  attributes?: {
    width?: number; // Column width in percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const ColumnBlock: React.FC<ColumnBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
  } = attributes;

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    if (onChange) {
      onChange('', { ...attributes, [key]: value });
    }
  };

  // Handle inner blocks change
  const handleInnerBlocksChange = (newBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks);
    }
  };

  // Get vertical alignment class
  const getAlignmentClass = () => {
    switch (verticalAlignment) {
      case 'center': return 'justify-center';
      case 'bottom': return 'justify-end';
      default: return 'justify-start';
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id || 'column'}
      type="column"
      isSelected={isSelected || false}
      onSelect={onSelect || (() => {})}
      onDelete={onDelete || (() => {})}
      onDuplicate={onDuplicate || (() => {})}
      onMoveUp={onMoveUp || (() => {})}
      onMoveDown={onMoveDown || (() => {})}
      onAddBlock={onAddBlock}
      className="wp-block-column"
      customToolbarContent={(
        <>
          {/* Width indicator */}
          <div className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 bg-gray-50 rounded">
            <Percent className="h-3 w-3" />
            <span>{width}%</span>
          </div>

          <div className="w-px h-4 bg-gray-300 mx-1" />

          {/* Vertical Alignment */}
          <button
            onClick={() => updateAttribute('verticalAlignment', 'top')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              verticalAlignment === 'top' && "bg-blue-100 text-blue-600"
            )}
            title="Align Top"
          >
            <AlignStartVertical className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => updateAttribute('verticalAlignment', 'center')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              verticalAlignment === 'center' && "bg-blue-100 text-blue-600"
            )}
            title="Align Center"
          >
            <AlignCenterVertical className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
          <button
            onClick={() => updateAttribute('verticalAlignment', 'bottom')}
            className={cn(
              "p-1 rounded hover:bg-gray-100",
              verticalAlignment === 'bottom' && "bg-blue-100 text-blue-600"
            )}
            title="Align Bottom"
          >
            <AlignEndVertical className="h-3 w-3 sm:h-4 sm:w-4" />
          </button>
        </>
      )}
    >
      <div
        className={cn(
          'wp-block-column__inner',
          'flex flex-col min-h-[200px] p-4 border-2 border-dashed border-gray-200 rounded',
          getAlignmentClass(),
          isSelected && 'border-blue-400 bg-blue-50'
        )}
        style={{
          width: `${width}%`,
        }}
      >
        {/* InnerBlocks - 이 컬럼 안에 다른 블록들이 들어감 */}
        <InnerBlocks
          parentBlockId={id || 'column'}
          blocks={innerBlocks}
          onBlocksChange={handleInnerBlocksChange}
          selectedBlockId={isSelected ? id : null}
          placeholder="Add blocks to this column..."
          renderAppender={true}
          orientation="vertical"
          className="column-inner-blocks w-full"
          currentDepth={2}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ColumnBlock;
