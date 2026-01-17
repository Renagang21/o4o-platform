/**
 * FAQAccordion Block Editor Component
 * FAQ 항목을 여러 개 관리하는 컨테이너 블록
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash2, ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export interface FAQItem {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

interface FAQAccordionBlockProps {
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
    items?: FAQItem[];
    borderColor?: string;
    backgroundColor?: string;
    titleColor?: string;
    contentColor?: string;
    spacing?: number;
  };
}

const FAQAccordionBlock: React.FC<FAQAccordionBlockProps> = ({
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
  const borderColor = attributes.borderColor || '#e5e7eb';
  const backgroundColor = attributes.backgroundColor || '#ffffff';
  const titleColor = attributes.titleColor || '#111827';
  const contentColor = attributes.contentColor || '#6b7280';
  const spacing = attributes.spacing || 16;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [openItems, setOpenItems] = useState<Set<number>>(
    new Set(items.map((item, idx) => item.defaultOpen ? idx : -1).filter(idx => idx !== -1))
  );

  const updateAttributes = (newAttrs: Partial<typeof attributes>) => {
    onChange(content, { ...attributes, ...newAttrs });
  };

  const addItem = () => {
    const newItem: FAQItem = {
      question: '새 질문',
      answer: '답변을 입력하세요',
      defaultOpen: false,
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

  const updateItem = (index: number, field: keyof FAQItem, value: string | boolean) => {
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

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (openItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="faq-accordion"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="FAQ Accordion"
    >
      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* Colors */}
          <div>
            <Label className="text-sm font-medium mb-2 block">테두리 색상</Label>
            <Input
              type="color"
              value={borderColor}
              onChange={(e) => updateAttributes({ borderColor: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">배경 색상</Label>
            <Input
              type="color"
              value={backgroundColor}
              onChange={(e) => updateAttributes({ backgroundColor: e.target.value })}
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
            <Label className="text-sm font-medium mb-2 block">내용 색상</Label>
            <Input
              type="color"
              value={contentColor}
              onChange={(e) => updateAttributes({ contentColor: e.target.value })}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">항목 간격 (px)</Label>
            <Input
              type="number"
              value={spacing}
              onChange={(e) => updateAttributes({ spacing: parseInt(e.target.value) || 16 })}
              min={0}
              max={48}
            />
          </div>

          {/* Add Item Button */}
          <Button onClick={addItem} className="w-full" variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            FAQ 항목 추가
          </Button>
        </div>
      </div>

      {/* Block Content */}
      <div className="faq-accordion-content">
        <div style={{ gap: `${spacing}px` }} className="flex flex-col">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                'border rounded-lg transition-all',
                editingIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200',
                'hover:border-gray-300'
              )}
              style={{ borderColor: editingIndex === index ? '#3b82f6' : borderColor }}
            >
              {editingIndex === index ? (
                // Edit Mode
                <div className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs mb-1 block">질문</Label>
                    <Input
                      value={item.question}
                      onChange={(e) => updateItem(index, 'question', e.target.value)}
                      placeholder="질문을 입력하세요"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs mb-1 block">답변</Label>
                    <Textarea
                      value={item.answer}
                      onChange={(e) => updateItem(index, 'answer', e.target.value)}
                      placeholder="답변을 입력하세요"
                      className="text-sm"
                      rows={4}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs">기본 펼침 상태</Label>
                    <Switch
                      checked={item.defaultOpen || false}
                      onCheckedChange={(checked) => updateItem(index, 'defaultOpen', checked)}
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
                    <Button
                      onClick={() => setEditingIndex(null)}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      완료
                    </Button>
                  </div>
                </div>
              ) : (
                // Preview Mode
                <div onClick={() => setEditingIndex(index)} className="cursor-pointer">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                    style={{ backgroundColor }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItem(index);
                    }}
                  >
                    <h3
                      className="font-medium flex-1"
                      style={{ color: titleColor }}
                    >
                      {item.question}
                    </h3>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 transition-transform',
                        openItems.has(index) && 'rotate-180'
                      )}
                      style={{ color: titleColor }}
                    />
                  </div>

                  {/* Content */}
                  {openItems.has(index) && (
                    <div
                      className="p-4 border-t"
                      style={{
                        borderColor,
                        color: contentColor,
                        backgroundColor
                      }}
                    >
                      <p className="whitespace-pre-wrap">{item.answer}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <HelpCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">FAQ 항목을 추가해주세요</p>
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default FAQAccordionBlock;
