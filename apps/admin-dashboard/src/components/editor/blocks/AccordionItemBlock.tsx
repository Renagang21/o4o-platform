/**
 * AccordionItemBlock Component
 *
 * FAQ, 접었다 펼치는 콘텐츠
 * - 제목 클릭 시 내용 토글
 * - 기본 펼침 여부 설정
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

interface AccordionItemBlockProps {
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
    title?: string;
    content?: string;
    defaultOpen?: boolean;
    borderColor?: string;
    backgroundColor?: string;
    titleColor?: string;
    contentColor?: string;
  };
}

const AccordionItemBlock: React.FC<AccordionItemBlockProps> = ({
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
  const title = attributes.title || '질문을 입력하세요';
  const itemContent = attributes.content || '답변을 입력하세요';
  const defaultOpen = attributes.defaultOpen ?? false;
  const borderColor = attributes.borderColor || '#e5e7eb';
  const backgroundColor = attributes.backgroundColor || '#ffffff';
  const titleColor = attributes.titleColor || '#111827';
  const contentColor = attributes.contentColor || '#6b7280';

  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleAttributeChange = (key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  };

  return (
    <EnhancedBlockWrapper
      id={id}
      type="accordion-item"
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      isSelected={isSelected}
      onSelect={onSelect}
      label="아코디언"
    >
      {/* Inspector Controls */}
      <div className="inspector-slot">
        <div className="space-y-4">
          {/* 제목 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">제목</Label>
            <Input
              value={title}
              onChange={(e) => handleAttributeChange('title', e.target.value)}
              placeholder="질문을 입력하세요"
            />
          </div>

          {/* 내용 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">내용</Label>
            <Textarea
              value={itemContent}
              onChange={(e) => handleAttributeChange('content', e.target.value)}
              placeholder="답변을 입력하세요"
              rows={4}
            />
          </div>

          {/* 기본 펼침 */}
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">기본 펼침 상태</Label>
            <Switch
              checked={defaultOpen}
              onCheckedChange={(checked) => handleAttributeChange('defaultOpen', checked)}
            />
          </div>

          {/* 색상 설정 */}
          <div>
            <Label className="text-sm font-medium mb-2 block">테두리 색상</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={borderColor}
                onChange={(e) => handleAttributeChange('borderColor', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={borderColor}
                onChange={(e) => handleAttributeChange('borderColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">배경 색상</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => handleAttributeChange('backgroundColor', e.target.value)}
                className="w-16 h-10"
              />
              <Input
                type="text"
                value={backgroundColor}
                onChange={(e) => handleAttributeChange('backgroundColor', e.target.value)}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Block Content */}
      <div
        className="accordion-item-block-content border rounded-lg overflow-hidden"
        style={{ borderColor }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
          style={{ backgroundColor }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <h3
            className="font-medium flex-1"
            style={{ color: titleColor }}
          >
            {title}
          </h3>
          <ChevronDown
            className={cn(
              "w-5 h-5 transition-transform",
              isOpen && "transform rotate-180"
            )}
            style={{ color: titleColor }}
          />
        </div>

        {/* Content */}
        {isOpen && (
          <div
            className="p-4 border-t"
            style={{
              borderColor,
              color: contentColor,
              backgroundColor
            }}
          >
            <p className="whitespace-pre-wrap">{itemContent}</p>
          </div>
        )}
      </div>
    </EnhancedBlockWrapper>
  );
};

export default AccordionItemBlock;
