/**
 * NewBlockRequestPanel Component
 * Phase 1-C: Display AI-requested new blocks
 * Phase 2-A: Enabled block generation buttons
 * Shows list of new_blocks_request from AI generation results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package, ArrowRight, Loader2 } from 'lucide-react';
import { NewBlockRequest } from '@/services/ai/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface NewBlockRequestPanelProps {
  /** List of new block requests from AI */
  newBlocksRequest: NewBlockRequest[];
  /** Callback when placeholder ID is clicked to scroll to block */
  onScrollToPlaceholder?: (placeholderId: string) => void;
  /** Panel style variant */
  variant?: 'sidebar' | 'bottom';
  /** Custom class name */
  className?: string;
  /** Phase 2-A: Callback when block generation is requested */
  onGenerateBlock?: (spec: NewBlockRequest) => Promise<void>;
}

/**
 * NewBlockRequestPanel
 * Displays AI-requested blocks that are not yet implemented
 */
export const NewBlockRequestPanel: React.FC<NewBlockRequestPanelProps> = ({
  newBlocksRequest,
  onScrollToPlaceholder,
  variant = 'sidebar',
  className,
  onGenerateBlock,
}) => {
  // Phase 2-A: Track generating states for each request
  const [generatingStates, setGeneratingStates] = useState<Record<string, boolean>>({});

  // If no requests, show empty state
  if (newBlocksRequest.length === 0) {
    return null;
  }

  const handlePlaceholderClick = (placeholderId: string) => {
    if (onScrollToPlaceholder) {
      onScrollToPlaceholder(placeholderId);
    } else {
      // Fallback: Direct DOM scroll
      const element = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Flash highlight effect
        element.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
        }, 2000);
      }
    }
  };

  // Phase 2-A: Handle block generation
  const handleGenerateBlock = async (spec: NewBlockRequest) => {
    if (!onGenerateBlock) {
      toast.error('블록 생성 기능이 활성화되지 않았습니다');
      return;
    }

    const key = spec.placeholderId || spec.componentName;
    setGeneratingStates(prev => ({ ...prev, [key]: true }));
    const loadingToast = toast.loading(`${spec.componentName} 블록 생성 중...`);

    try {
      await onGenerateBlock(spec);

      toast.dismiss(loadingToast);
      toast.success(`${spec.componentName} 블록이 생성되었습니다!`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || '블록 생성 중 오류가 발생했습니다');
    } finally {
      setGeneratingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Card className={cn(
      'border-amber-200 bg-amber-50',
      variant === 'sidebar' && 'w-full',
      variant === 'bottom' && 'w-full mx-auto max-w-4xl',
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-amber-900">
          <AlertCircle className="w-5 h-5" />
          새 블록 요청 ({newBlocksRequest.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-amber-800 mb-3">
          AI가 다음 컴포넌트들이 필요하다고 판단했습니다:
        </div>

        {/* Divider */}
        <div className="border-t border-amber-200" />

        {/* Request List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {newBlocksRequest.map((request, index) => (
            <div
              key={request.placeholderId || index}
              className="bg-white border border-amber-200 rounded-lg p-3 hover:border-amber-400 transition-colors"
            >
              {/* Header: Component Name + Placeholder ID */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">
                    {index + 1}. {request.componentName}
                  </span>
                </div>
                {request.placeholderId && (
                  <button
                    onClick={() => handlePlaceholderClick(request.placeholderId)}
                    className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-mono rounded transition-colors flex items-center gap-1"
                    title="해당 Placeholder로 스크롤"
                  >
                    {request.placeholderId}
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Reason */}
              {request.reason && (
                <div className="text-sm text-gray-700 mb-2">
                  <span className="text-gray-500">이유:</span> {request.reason}
                </div>
              )}

              {/* Spec Details */}
              {request.spec && (
                <div className="text-xs text-gray-600 space-y-1">
                  {request.spec.props && request.spec.props.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[50px]">Props:</span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {request.spec.props.join(', ')}
                      </span>
                    </div>
                  )}

                  {request.spec.style && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[50px]">Style:</span>
                      <span>{request.spec.style}</span>
                    </div>
                  )}

                  {request.spec.category && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 min-w-[50px]">Category:</span>
                      <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs">
                        {request.spec.category}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 2-A: 블록 생성 버튼 (활성화됨) */}
              <div className="mt-3 pt-2 border-t border-gray-200">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full text-xs",
                    onGenerateBlock && "hover:bg-blue-500 hover:text-white hover:border-blue-500"
                  )}
                  disabled={!onGenerateBlock || generatingStates[request.placeholderId || request.componentName]}
                  onClick={() => handleGenerateBlock(request)}
                  title={onGenerateBlock ? "AI가 이 블록을 자동 생성합니다" : "에디터에서 활성화 필요"}
                >
                  {generatingStates[request.placeholderId || request.componentName] ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Package className="w-3 h-3 mr-2" />
                      블록 생성하기
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <div className="pt-3 border-t border-amber-200">
          <div className="text-xs text-amber-700 space-y-1">
            <p>💡 Phase 1-C: 시각화 단계</p>
            <p>이 패널은 AI가 요청한 새로운 블록들을 보여줍니다.</p>
            <p>Phase 2에서 자동 생성 기능이 추가될 예정입니다.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewBlockRequestPanel;
