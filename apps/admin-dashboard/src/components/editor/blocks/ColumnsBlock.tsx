/**
 * ColumnsBlock Component
 * WordPress Gutenberg Columns 블록 완전 모방
 * 여러 Column을 포함하는 컨테이너
 */

import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical
} from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../InnerBlocks';

interface ColumnsBlockProps {
  id: string;
  onChange: (content: any, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    verticalAlignment?: 'top' | 'center' | 'bottom';
    isStackedOnMobile?: boolean;
    backgroundColor?: string;
  };
  innerBlocks?: Block[];
  onInnerBlocksChange?: (blocks: Block[]) => void;
}

const ColumnsBlock: React.FC<ColumnsBlockProps> = ({
  id,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  innerBlocks = [],
  onInnerBlocksChange,
}) => {
  const {
    verticalAlignment = 'top',
    isStackedOnMobile = true,
    backgroundColor = '',
  } = attributes;

  // Initialize with 2 columns if empty
  useEffect(() => {
    if (innerBlocks.length === 0 && onInnerBlocksChange) {
      const defaultColumns: Block[] = [
        {
          id: `col-${Date.now()}-1`,
          type: 'column',
          content: '',
          attributes: { width: 50 },
          innerBlocks: [],
        },
        {
          id: `col-${Date.now()}-2`,
          type: 'column',
          content: '',
          attributes: { width: 50 },
          innerBlocks: [],
        },
      ];
      onInnerBlocksChange(defaultColumns);
    }
  }, []);

  // Update attribute
  const updateAttribute = (key: string, value: any) => {
    onChange('', { ...attributes, [key]: value });
  };

  // Get vertical alignment style
  const getAlignmentStyle = () => {
    switch (verticalAlignment) {
      case 'center': return 'items-center';
      case 'bottom': return 'items-end';
      default: return 'items-start';
    }
  };

  // Handle inner blocks change
  const handleInnerBlocksChange = (newBlocks: Block[]) => {
    if (onInnerBlocksChange) {
      onInnerBlocksChange(newBlocks);
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="columns"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      className="wp-block wp-block-columns"
      customToolbarButtons={(
        <>
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
          'wp-block-columns__inner',
          'flex gap-4',
          isStackedOnMobile && 'flex-col md:flex-row',
          getAlignmentStyle()
        )}
        style={{
          backgroundColor: backgroundColor || undefined,
        }}
      >
        {/* InnerBlocks - 각 Column이 여기에 렌더링됨 */}
        <InnerBlocks
          parentBlockId={id}
          blocks={innerBlocks}
          onBlocksChange={handleInnerBlocksChange}
          selectedBlockId={isSelected ? id : null}
          placeholder="Add columns..."
          renderAppender={true}
          orientation="horizontal"
          allowedBlocks={['column']}
          className="columns-inner-blocks w-full"
          currentDepth={1}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

export default ColumnsBlock;
