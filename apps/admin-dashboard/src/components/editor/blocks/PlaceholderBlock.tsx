/**
 * PlaceholderBlock Component
 * Phase 1-C: Placeholder block for missing/requested components
 * Phase 2-A: Enabled block generation button
 * Displays a visual placeholder when AI requests a component that doesn't exist yet
 */

import React, { useState } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { AlertCircle, Package, Loader2 } from 'lucide-react';
import { blockCodeGenerator } from '@/services/ai/BlockCodeGenerator';
import { NewBlockRequest } from '@/services/ai/types';
import toast from 'react-hot-toast';

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
  // Phase 2-A: Block generation callback
  onGenerateBlock?: (blockId: string, spec: NewBlockRequest) => Promise<void>;
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
  onGenerateBlock,
}) => {
  const {
    componentName = 'Unknown Component',
    reason = '',
    props = [],
    style = '',
    placeholderId = '',
  } = attributes;

  // Phase 2-A: Block generation state
  const [isGenerating, setIsGenerating] = useState(false);

  // Phase 2-A: Handle block generation
  const handleGenerate = async () => {
    if (!onGenerateBlock) {
      toast.error('블록 생성 기능이 활성화되지 않았습니다');
      return;
    }

    setIsGenerating(true);
    const loadingToast = toast.loading(`${componentName} 블록 생성 중...`);

    try {
      // Create spec from attributes
      const spec: NewBlockRequest = {
        placeholderId,
        componentName,
        reason,
        spec: {
          props,
          style,
          category: 'widgets',
        },
      };

      // Call the generation callback
      await onGenerateBlock(id, spec);

      toast.dismiss(loadingToast);
      toast.success(`${componentName} 블록이 생성되었습니다!`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || '블록 생성 중 오류가 발생했습니다');
    } finally {
      setIsGenerating(false);
    }
  };

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

        {/* Phase 2-A: 블록 생성 버튼 (활성화됨) */}
        <div className="mt-4 pt-3 border-t border-gray-300">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !onGenerateBlock}
            className={cn(
              "w-full px-4 py-2 text-sm font-medium rounded transition-colors",
              isGenerating || !onGenerateBlock
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-500 text-white hover:bg-blue-600"
            )}
            title={onGenerateBlock ? "AI가 이 블록을 자동 생성합니다" : "에디터에서 활성화 필요"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Package className="w-4 h-4 inline mr-2" />
                블록 생성하기
              </>
            )}
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
