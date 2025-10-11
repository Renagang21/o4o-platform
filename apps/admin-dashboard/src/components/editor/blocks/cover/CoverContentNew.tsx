/**
 * CoverContentNew Component
 * Manages inner content blocks using the unified InnerBlocks system
 */

import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  MousePointer,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LayoutGrid, CoverPosition, getPositionClassName } from '../shared/LayoutGrid';
import { CoverLayoutSettings } from './types';
import { Block } from '@/types/post.types';
import { InnerBlocks } from '../../InnerBlocks';

interface CoverContentNewProps {
  innerBlocks: Block[];
  layout: CoverLayoutSettings;
  onInnerBlocksChange: (blocks: Block[]) => void;
  onLayoutChange: (layout: CoverLayoutSettings) => void;
  isSelected: boolean;
  placeholder?: string;
  className?: string;
}

const CoverContentNew: React.FC<CoverContentNewProps> = ({
  innerBlocks,
  layout,
  onInnerBlocksChange,
  onLayoutChange,
  isSelected,
  placeholder = 'Write title...',
  className
}) => {
  const [showPositionGrid, setShowPositionGrid] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle position change
  const handlePositionChange = (position: CoverPosition) => {
    onLayoutChange({ ...layout, contentPosition: position });
  };

  // Position controls
  const PositionControls = () => {
    if (!isSelected) return null;

    return (
      <div className="absolute bottom-4 right-4 z-30">
        <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPositionGrid(!showPositionGrid)}
            className="flex items-center gap-2 h-10 px-3 rounded-lg"
          >
            <MousePointer className="h-4 w-4" />
            Position
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform",
              showPositionGrid && "rotate-180"
            )} />
          </Button>

          {showPositionGrid && (
            <div className="p-4 border-t border-gray-200 min-w-64">
              <LayoutGrid
                mode="cover-position"
                currentPosition={layout.contentPosition}
                onPositionChange={handlePositionChange}
                showGrid={true}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('cover-content relative h-full', className)}>
      {/* Content container */}
      <div
        ref={contentRef}
        className={cn(
          'absolute inset-0 z-20 p-8',
          getPositionClassName(layout.contentPosition)
        )}
        style={{
          minHeight: `${layout.minHeight}px`
        }}
      >
        {/* Inner blocks using unified system */}
        <div className="max-w-4xl mx-auto">
          <div className="cover-inner-blocks-wrapper">
            <InnerBlocks
              parentBlockId="cover-content"
              blocks={innerBlocks}
              onBlocksChange={onInnerBlocksChange}
              selectedBlockId={isSelected ? undefined : null}
              placeholder={placeholder}
              renderAppender={isSelected}
              orientation="vertical"
              className="cover-inner-blocks"
              currentDepth={2}
              maxDepth={4}
            />
          </div>
        </div>
      </div>

      {/* Position controls */}
      <PositionControls />
    </div>
  );
};

export default CoverContentNew;
