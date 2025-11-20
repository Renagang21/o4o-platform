/**
 * PlaceholderBlock Component
 * Phase 1-C: Placeholder block for missing/requested components
 * Phase 2-A: Enabled block generation button
 * Phase 1-D: Enhanced UX with better visuals, collapsible details, improved buttons
 * Displays a visual placeholder when AI requests a component that doesn't exist yet
 */

import React, { useState } from 'react';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';
import { cn } from '@/lib/utils';
import { AlertCircle, Package, Loader2, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
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
  // Phase 1-D: Collapsible details state
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

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

  // Phase 1-D: Check if there are details to show
  const hasDetails = reason || (props && props.length > 0) || style;

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
          // Phase 1-D: Enhanced visual design with better colors and softer borders
          'border-2 border-dashed rounded-xl p-5',
          'transition-all duration-300 ease-in-out',
          'bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50',
          'border-amber-400',
          'hover:border-amber-500 hover:shadow-lg',
          isSelected && 'border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 shadow-xl ring-2 ring-blue-200'
        )}
        data-placeholder-id={placeholderId}
      >
        {/* Phase 1-D: AI Suggested Block Badge */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-semibold text-amber-800">
            <Sparkles className="w-3.5 h-3.5" />
            AI Suggested Block
          </div>
          {placeholderId && (
            <span className="ml-auto px-2 py-1 bg-white/80 text-gray-600 text-xs font-mono rounded border border-amber-200">
              {placeholderId}
            </span>
          )}
        </div>

        {/* Phase 1-D: Enhanced Header with larger, more prominent component name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {componentName}
            </h3>
            <p className="text-sm text-gray-600">
              This component is needed but not yet implemented
            </p>
          </div>
        </div>

        {/* Phase 1-D: Collapsible Details Section */}
        {hasDetails && (
          <>
            <button
              onClick={() => setIsDetailsExpanded(!isDetailsExpanded)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 mb-3",
                "bg-white/60 hover:bg-white/80 rounded-lg transition-colors",
                "border border-amber-200 hover:border-amber-300"
              )}
            >
              <span className="text-sm font-medium text-gray-700">
                {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
              </span>
              {isDetailsExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            {/* Details Content (Collapsible) */}
            {isDetailsExpanded && (
              <div className="space-y-3 mb-4 p-3 bg-white/60 rounded-lg border border-amber-200">
                {reason && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reason</span>
                    <p className="text-sm text-gray-800">{reason}</p>
                  </div>
                )}

                {props && props.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Props</span>
                    <div className="flex flex-wrap gap-1.5">
                      {props.map((prop, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-mono rounded border border-blue-200"
                        >
                          {prop}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {style && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Style</span>
                    <p className="text-sm text-gray-800">{style}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Phase 1-D: Improved Action Button */}
        <div className="mt-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !onGenerateBlock}
            className={cn(
              "w-full px-5 py-3 text-sm font-semibold rounded-lg transition-all duration-200",
              "flex items-center justify-center gap-2",
              isGenerating || !onGenerateBlock
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
            )}
            title={onGenerateBlock ? "AI will automatically generate this block" : "Activation required in editor"}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Block...</span>
              </>
            ) : (
              <>
                <Package className="w-5 h-5" />
                <span>AI 블록 생성하기</span>
              </>
            )}
          </button>
        </div>

        {/* Phase 1-D: Enhanced Info Footer */}
        <div className="mt-4 pt-3 border-t border-amber-200">
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="flex-1">
              Click the button above to let AI automatically generate this component for you.
              Once generated, you can save it permanently to Git.
            </p>
          </div>
        </div>
      </div>
    </EnhancedBlockWrapper>
  );
};

export default PlaceholderBlock;
