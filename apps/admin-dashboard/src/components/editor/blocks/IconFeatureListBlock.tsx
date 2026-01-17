/**
 * IconFeatureList Block Editor Component
 * 여러 개의 기능/특징을 아이콘과 함께 표시하는 블록
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Grid3x3, List, ChevronUp, ChevronDown } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureItem } from '@/blocks/definitions/icon-feature-list';

interface IconFeatureListBlockProps {
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
    items?: FeatureItem[];
    columns?: number;
    layout?: 'grid' | 'list';
    iconPosition?: 'top' | 'left';
    iconSize?: number;
    iconColor?: string;
    titleColor?: string;
    descriptionColor?: string;
    backgroundColor?: string;
    borderColor?: string;
    gap?: number;
  };
}

const ICON_OPTIONS = [
  { value: 'check-circle', label: '✓ Check Circle' },
  { value: 'star', label: '★ Star' },
  { value: 'zap', label: '⚡ Zap' },
  { value: 'heart', label: '♥ Heart' },
  { value: 'shield', label: '🛡 Shield' },
  { value: 'rocket', label: '🚀 Rocket' },
  { value: 'target', label: '🎯 Target' },
  { value: 'award', label: '🏆 Award' },
];

const IconFeatureListBlock: React.FC<IconFeatureListBlockProps> = ({
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
  const items = attributes.items || [];
  const columns = attributes.columns || 3;
  const layout = attributes.layout || 'grid';
  const iconPosition = attributes.iconPosition || 'top';
  const iconSize = attributes.iconSize || 48;
  const iconColor = attributes.iconColor || '#0073aa';
  const titleColor = attributes.titleColor || '#111827';
  const descriptionColor = attributes.descriptionColor || '#6b7280';
  const backgroundColor = attributes.backgroundColor || '#ffffff';
  const borderColor = attributes.borderColor || '#e5e7eb';
  const gap = attributes.gap || 24;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const updateAttributes = (newAttrs: Partial<typeof attributes>) => {
    onChange(content, { ...attributes, ...newAttrs });
  };

  const addItem = () => {
    const newItem: FeatureItem = {
      icon: 'check-circle',
      title: '새 기능',
      description: '기능 설명을 입력하세요',
    };
    updateAttributes({ items: [...items, newItem] });
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    updateAttributes({ items: newItems });
    if (editingIndex === index) {
      setEditingIndex(null);
    }
  };

  const updateItem = (index: number, field: keyof FeatureItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateAttributes({ items: newItems });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    updateAttributes({ items: newItems });
  };

  const getIconEmoji = (iconName: string) => {
    const iconMap: Record<string, string> = {
      'check-circle': '✓',
      'star': '★',
      'zap': '⚡',
      'heart': '♥',
      'shield': '🛡',
      'rocket': '🚀',
      'target': '🎯',
      'award': '🏆',
    };
    return iconMap[iconName] || '●';
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="icon-feature-list"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="Icon Feature List"
    >
      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* Layout Settings */}
          <div>
            <Label className="text-sm font-medium mb-2 block">레이아웃</Label>
            <Select value={layout} onValueChange={(value) => updateAttributes({ layout: value as 'grid' | 'list' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="grid">그리드</SelectItem>
                <SelectItem value="list">리스트</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {layout === 'grid' && (
            <div>
              <Label className="text-sm font-medium mb-2 block">컬럼 수</Label>
              <Select value={String(columns)} onValueChange={(value) => updateAttributes({ columns: parseInt(value) })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">2개</SelectItem>
                  <SelectItem value="3">3개</SelectItem>
                  <SelectItem value="4">4개</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium mb-2 block">아이콘 위치</Label>
            <Select value={iconPosition} onValueChange={(value) => updateAttributes({ iconPosition: value as 'top' | 'left' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">위</SelectItem>
                <SelectItem value="left">왼쪽</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div>
            <Label className="text-sm font-medium mb-2 block">아이콘 색상</Label>
            <Input
              type="color"
              value={iconColor}
              onChange={(e) => updateAttributes({ iconColor: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">제목 색상</Label>
            <Input
              type="color"
              value={titleColor}
              onChange={(e) => updateAttributes({ titleColor: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">설명 색상</Label>
            <Input
              type="color"
              value={descriptionColor}
              onChange={(e) => updateAttributes({ descriptionColor: e.target.value })}
            />
          </div>

          {/* Add Item Button */}
          <Button onClick={addItem} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            항목 추가
          </Button>
        </div>
      </div>

      {/* Block Content */}
      <div className="icon-feature-list-content">
        <div
          className={cn(
            layout === 'grid' ? 'grid' : 'flex flex-col',
            layout === 'grid' && `grid-cols-${columns}`
          )}
          style={{ gap: `${gap}px` }}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'border-2 rounded-lg p-4 transition-all',
                editingIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white',
                'hover:border-gray-300'
              )}
              onClick={() => setEditingIndex(index)}
            >
              {editingIndex === index ? (
                // Edit Mode
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">아이콘</Label>
                    <Select
                      value={item.icon}
                      onValueChange={(value) => updateItem(index, 'icon', value)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ICON_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">제목</Label>
                    <Input
                      value={item.title}
                      onChange={(e) => updateItem(index, 'title', e.target.value)}
                      placeholder="제목"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">설명</Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="설명"
                      className="text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => moveItem(index, 'up')}
                      disabled={index === 0}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => moveItem(index, 'down')}
                      disabled={index === items.length - 1}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </Button>
                    <Button
                      onClick={() => removeItem(index)}
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Preview Mode
                <div
                  className={cn(
                    'flex',
                    iconPosition === 'top' ? 'flex-col items-center text-center' : 'flex-row items-start gap-4'
                  )}
                >
                  <div
                    className={cn(
                      'flex items-center justify-center rounded-full font-bold',
                      iconPosition === 'top' ? 'mb-3' : 'flex-shrink-0'
                    )}
                    style={{
                      width: `${iconSize}px`,
                      height: `${iconSize}px`,
                      backgroundColor: iconColor + '20',
                      color: iconColor,
                      fontSize: `${iconSize * 0.5}px`,
                    }}
                  >
                    {getIconEmoji(item.icon)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2" style={{ color: titleColor }}>
                      {item.title}
                    </h3>
                    <p className="text-sm" style={{ color: descriptionColor }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Grid3x3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">항목을 추가해주세요</p>
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default IconFeatureListBlock;
