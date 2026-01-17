/**
 * SeparatorBlock Component
 *
 * 구분선 블록
 * - 스타일 (실선, 점선, 이중선)
 * - 색상, 두께, 너비 조절
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Minus } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SeparatorBlockProps {
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
    style?: 'solid' | 'dashed' | 'dotted' | 'double';
    color?: string;
    thickness?: number; // px
    width?: number; // percentage
    align?: 'left' | 'center' | 'right';
    marginTop?: number; // px
    marginBottom?: number; // px
  };
}

const SeparatorBlock: React.FC<SeparatorBlockProps> = ({
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
  const style = attributes.style || 'solid';
  const color = attributes.color || '#dddddd';
  const thickness = attributes.thickness || 1;
  const width = attributes.width || 100;
  const align = attributes.align || 'center';
  const marginTop = attributes.marginTop || 20;
  const marginBottom = attributes.marginBottom || 20;

  const handleAttributeChange = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  const getAlignClass = () => {
    switch (align) {
      case 'left': return 'mr-auto';
      case 'right': return 'ml-auto';
      case 'center':
      default: return 'mx-auto';
    }
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="separator"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="구분선"
    >
      {/* Toolbar */}
      <div className="toolbar-slot">
        {/* 기본 설정은 Inspector에 */}
      </div>

      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* 스타일 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">선 스타일</Label>
            <Select value={style} onValueChange={(value) => handleAttributeChange('style', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">실선</SelectItem>
                <SelectItem value="dashed">점선</SelectItem>
                <SelectItem value="dotted">점</SelectItem>
                <SelectItem value="double">이중선</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 색상 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">색상</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={color}
                onChange={(e) => handleAttributeChange('color', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={color}
                onChange={(e) => handleAttributeChange('color', e.target.value)}
                className="flex-1"
                placeholder="#dddddd"
              />
            </div>
          </div>

          {/* 두께 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">두께 (px)</Label>
            <div className="space-y-3">
              <Slider
                value={[thickness]}
                onValueChange={([value]) => handleAttributeChange('thickness', value)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <Input
                type="number"
                value={thickness}
                onChange={(e) => handleAttributeChange('thickness', parseInt(e.target.value) || 1)}
                min={1}
                max={10}
                className="w-full"
              />
            </div>
          </div>

          {/* 너비 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">너비 (%)</Label>
            <div className="space-y-3">
              <Slider
                value={[width]}
                onValueChange={([value]) => handleAttributeChange('width', value)}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
              <Input
                type="number"
                value={width}
                onChange={(e) => handleAttributeChange('width', parseInt(e.target.value) || 100)}
                min={10}
                max={100}
                className="w-full"
              />
            </div>
          </div>

          {/* 정렬 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">정렬</Label>
            <Select value={align} onValueChange={(value) => handleAttributeChange('align', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">왼쪽</SelectItem>
                <SelectItem value="center">중앙</SelectItem>
                <SelectItem value="right">오른쪽</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 여백 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">상단 여백 (px)</Label>
            <Input
              type="number"
              value={marginTop}
              onChange={(e) => handleAttributeChange('marginTop', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">하단 여백 (px)</Label>
            <Input
              type="number"
              value={marginBottom}
              onChange={(e) => handleAttributeChange('marginBottom', parseInt(e.target.value) || 0)}
              min={0}
              max={100}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Block Content */}
      <div
        className="separator-block-content w-full"
        style={{
          marginTop: `${marginTop}px`,
          marginBottom: `${marginBottom}px`,
        }}
      >
        <hr
          className={cn("border-0", getAlignClass())}
          style={{
            borderTopStyle: style,
            borderTopColor: color,
            borderTopWidth: `${thickness}px`,
            width: `${width}%`,
          }}
        />
      </div>
    </EnhancedBlockWrapper>
  );
};

export default SeparatorBlock;
