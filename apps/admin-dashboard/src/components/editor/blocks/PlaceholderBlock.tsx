/**
 * PlaceholderBlock Component
 * Phase 1-C: Placeholder block for missing/requested components
 * Displays a visual placeholder when AI requests a component that doesn't exist yet
 */

import React from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { AlertCircle, Package } from 'lucide-react';

interface PlaceholderBlockProps {
  id: string;
  content?: string | object;
  onChange?: (content: string, attributes?: any) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddBlock?: (position: 'before' | 'after', type?: string) => void;
  isSelected: boolean;
  onSelect: () => void;
  attributes?: {
    componentName?: string;
    reason?: string;
    props?: string[];
    style?: string;
    placeholderId?: string;
  };
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onChangeType?: (newType: string) => void;
}

/**
 * PlaceholderBlock - Visual representation of a missing component
 * Styled with dashed border to distinguish from actual blocks
 */
const PlaceholderBlock: React.FC<PlaceholderBlockProps> = ({
  id,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
  attributes = {},
  canMoveUp = true,
  canMoveDown = true,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onCopy,
  onPaste,
  onChangeType,
}) => {
  const {
    componentName = 'Unknown Component',
    reason = '',
    props = [],
    style = '',
    placeholderId = '',
  } = attributes;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="placeholder"
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onAddBlock={onAddBlock}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
      isDragging={isDragging}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopy={onCopy}
      onPaste={onPaste}
      onChangeType={onChangeType}
      currentType="o4o/placeholder"
      className="wp-block-placeholder"
    >
      <div
        className={cn(
          'border-2 border-dashed border-gray-400 bg-gray-50 rounded-lg p-4',
          'transition-all duration-200',
          isSelected && 'border-blue-500 bg-blue-50'
        )}
        data-placeholder-id={placeholderId}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <h4 className="font-semibold text-gray-900 text-base">
            새 블록 필요: {componentName}
          </h4>
          {placeholderId && (
            <span className="ml-auto px-2 py-1 bg-gray-200 text-gray-700 text-xs font-mono rounded">
              {placeholderId}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-300 mb-3" />

        {/* Details */}
        <div className="space-y-2 text-sm text-gray-700">
          {reason && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[60px]">이유:</span>
              <span className="flex-1">{reason}</span>
            </div>
          )}

          {props && props.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[60px]">Props:</span>
              <span className="flex-1 font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200">
                {props.join(', ')}
              </span>
            </div>
          )}

          {style && (
            <div className="flex items-start gap-2">
              <span className="font-medium text-gray-600 min-w-[60px]">스타일:</span>
              <span className="flex-1">{style}</span>
            </div>
          )}
        </div>

        {/* Phase 2 준비: 블록 생성 버튼 (UI만 존재, 동작 없음) */}
        <div className="mt-4 pt-3 border-t border-gray-300">
          <button
            className="w-full px-4 py-2 bg-gray-200 text-gray-500 text-sm font-medium rounded cursor-not-allowed"
            disabled
            title="Phase 2에서 구현 예정"
          >
            <Package className="w-4 h-4 inline mr-2" />
            블록 생성하기 (준비 중)
          </button>
        </div>

        {/* Info message */}
        <div className="mt-3 text-xs text-gray-500 italic">
          이 블록은 AI가 요청했지만 아직 구현되지 않은 컴포넌트입니다.
        </div>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default PlaceholderBlock;
