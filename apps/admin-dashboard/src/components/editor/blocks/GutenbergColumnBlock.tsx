/**
 * GutenbergColumnBlock Component
 * WordPress Gutenberg Column 블록 완전 모방
 *
 * 개별 컬럼 블록 - InnerBlocks로 다른 블록들을 포함
 */

import React from 'react';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';
import { BlockProps } from '@/blocks/registry/types';
import { cn } from '@/lib/utils';

interface GutenbergColumnBlockProps extends BlockProps {
  attributes?: {
    width?: number; // Column width in percentage
    verticalAlignment?: 'top' | 'center' | 'bottom';
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const GutenbergColumnBlock: React.FC<GutenbergColumnBlockProps> = ({
  id,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
  isSelected,
  onSelect,
}) => {
  const {
    width = 50,
    verticalAlignment = 'top',
  } = attributes;

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
    <div
      className={cn(
        'wp-block-column',
        'flex flex-col',
        getAlignmentClass(),
        isSelected && 'is-selected'
      )}
      style={{
        flexBasis: `${width}%`,
        flexGrow: 0,
        flexShrink: 0,
      }}
      data-column-id={id}
      onClick={(e) => {
        e.stopPropagation();
        if (onSelect) {
          onSelect();
        }
      }}
    >
      {/* Width indicator (only when selected) */}
      {isSelected && (
        <div className="column-width-indicator text-xs text-gray-500 mb-2 px-2 py-1 bg-gray-100 rounded inline-block self-start">
          {width.toFixed(1)}%
        </div>
      )}

      {/* InnerBlocks - where nested blocks go */}
      <div className="column-inner-content flex-1 min-h-[100px]">
        <InnerBlocks
          blocks={innerBlocks}
          onChange={handleInnerBlocksChange}
          allowedBlocks={[
            'o4o/paragraph',
            'o4o/heading',
            'o4o/image',
            'o4o/list',
            'o4o/quote',
            'o4o/button',
            'o4o/video',
            'o4o/code',
            // ... 모든 블록 허용
          ]}
          placeholder="Add blocks..."
        />
      </div>
    </div>
  );
};

export default GutenbergColumnBlock;
