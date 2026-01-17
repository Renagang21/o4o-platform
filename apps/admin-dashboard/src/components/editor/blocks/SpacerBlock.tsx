/**
 * SpacerBlock Component
 *
 * 높이 조절 가능한 공백 블록
 * - 레이아웃 간격 조정용
 * - 픽셀 단위 높이 설정
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { MoveVertical } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';

interface SpacerBlockProps {
  id: string;
  content?: Record<string, unknown>;
  onChange: (content: Record<string, unknown>, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    height?: number; // px
  };
}

const SpacerBlock: React.FC<SpacerBlockProps> = ({
  id,
  content = {},
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
}) => {
  const height = attributes.height || 50;

  const handleHeightChange = (newHeight: number) => {
    onChange(content, { ...attributes, height: newHeight });
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="spacer"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="공백"
    >
      {/* Toolbar */}
      <div className="toolbar-slot">
        {/* 높이 조절 UI는 Inspector에 */}
      </div>

      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">높이 (px)</Label>
            <div className="space-y-3">
              <Slider
                value={[height]}
                onValueChange={([value]) => handleHeightChange(value)}
                min={10}
                max={500}
                step={10}
                className="w-full"
              />
              <Input
                type="number"
                value={height}
                onChange={(e) => handleHeightChange(parseInt(e.target.value) || 50)}
                min={10}
                max={500}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              10px ~ 500px 범위에서 조절 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Block Content */}
      <div className="spacer-block-content">
        <div
          className={cn(
            "w-full border-2 border-dashed rounded",
            isSelected ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50"
          )}
          style={{ height: `${height}px` }}
        >
          <div className="flex items-center justify-center h-full text-gray-400">
            <MoveVertical className="w-5 h-5 mr-2" />
            <span className="text-sm">{height}px</span>
          </div>
        </div>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default SpacerBlock;
