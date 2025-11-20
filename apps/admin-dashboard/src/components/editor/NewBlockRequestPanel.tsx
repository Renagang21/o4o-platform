/**
 * NewBlockRequestPanel Component
 * Phase 1-C: Display AI-requested new blocks
 * Phase 2-A: Enabled block generation buttons
 * Phase 2-B: Added "영구 저장하기" button for server save + Git
 * Phase 1-D: Enhanced UX with accordion, thumbnails, improved animations
 * Shows list of new_blocks_request from AI generation results
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Package, ArrowRight, Loader2, Save, HardDrive, ChevronDown, ChevronUp, Sparkles, Code2, Palette, Layers } from 'lucide-react';
import { NewBlockRequest } from '@/services/ai/types';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { blockCodeGenerator, BlockGenerationError } from '@/services/ai/BlockCodeGenerator';

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
  /** Phase 2-B: Callback when block should be saved to server (optional) */
  onSaveToServer?: (spec: NewBlockRequest, componentCode: string, definitionCode: string) => Promise<void>;
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
  onSaveToServer,
}) => {
  // Phase 2-A: Track generating states for each request
  const [generatingStates, setGeneratingStates] = useState<Record<string, boolean>>({});
  // Phase 2-B: Track saving states for each request
  const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
  // Phase 2-B: Track which blocks have been generated (to enable save button)
  const [generatedBlocks, setGeneratedBlocks] = useState<Record<string, {
    componentCode: string;
    definitionCode: string;
  }>>({});
  // Phase 1-D: Track accordion expand/collapse state for each request
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({});

  // Phase 1-D: Get thumbnail icon based on category
  const getThumbnailIcon = (category?: string) => {
    switch (category) {
      case 'widgets':
        return <Layers className="w-5 h-5 text-purple-600" />;
      case 'layout':
        return <Palette className="w-5 h-5 text-blue-600" />;
      case 'content':
        return <Code2 className="w-5 h-5 text-green-600" />;
      default:
        return <Package className="w-5 h-5 text-amber-600" />;
    }
  };

  // If no requests, show empty state
  if (newBlocksRequest.length === 0) {
    return null;
  }

  // Phase 1-D: Enhanced placeholder click with better ring animation
  const handlePlaceholderClick = (placeholderId: string) => {
    if (onScrollToPlaceholder) {
      onScrollToPlaceholder(placeholderId);
    } else {
      // Fallback: Direct DOM scroll
      const element = document.querySelector(`[data-placeholder-id="${placeholderId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Phase 1-D: Enhanced highlight effect with animation
        element.classList.add(
          'ring-4',
          'ring-blue-500',
          'ring-offset-2',
          'transition-all',
          'duration-300',
          'scale-[1.02]'
        );

        // Pulse effect
        setTimeout(() => {
          element.classList.remove('scale-[1.02]');
          element.classList.add('scale-100');
        }, 300);

        // Remove ring after 3 seconds
        setTimeout(() => {
          element.classList.remove(
            'ring-4',
            'ring-blue-500',
            'ring-offset-2',
            'transition-all',
            'duration-300',
            'scale-100'
          );
        }, 3000);
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
      // Generate the block code first
      const generatedCode = await blockCodeGenerator.generate(spec);

      // Store generated code for later server save
      setGeneratedBlocks(prev => ({
        ...prev,
        [key]: {
          componentCode: generatedCode.componentCode,
          definitionCode: generatedCode.definitionCode,
        },
      }));

      // Call parent callback to register block in runtime
      await onGenerateBlock(spec);

      toast.dismiss(loadingToast);
      toast.success(`${spec.componentName} 블록이 생성되었습니다!`);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      // Phase 1-D: Enhanced error message with type
      if (error instanceof BlockGenerationError) {
        toast.error(`${error.type}: ${error.message}`);
      } else {
        toast.error(error.message || '블록 생성 중 오류가 발생했습니다');
      }
    } finally {
      setGeneratingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  // Phase 2-B: Handle save to server
  const handleSaveToServer = async (spec: NewBlockRequest) => {
    const key = spec.placeholderId || spec.componentName;
    const generatedCode = generatedBlocks[key];

    if (!generatedCode) {
      toast.error('먼저 블록을 생성해주세요');
      return;
    }

    setSavingStates(prev => ({ ...prev, [key]: true }));
    const loadingToast = toast.loading(`${spec.componentName} 서버에 저장 중...`);

    try {
      const result = await blockCodeGenerator.saveToServer(
        spec.componentName,
        generatedCode.componentCode,
        generatedCode.definitionCode
      );

      if (!result.success) {
        throw new Error(result.error || 'Server save failed');
      }

      toast.dismiss(loadingToast);

      // Show detailed success message
      const savedName = result.renamedTo || spec.componentName;
      toast.success(
        `✅ ${savedName} 블록이 저장되었습니다!\n` +
        `📂 파일: ${result.files?.component}\n` +
        `🌿 Git 브랜치: ${result.git?.branch}`,
        { duration: 8000 }
      );

      // Call parent callback if provided
      if (onSaveToServer) {
        await onSaveToServer(spec, generatedCode.componentCode, generatedCode.definitionCode);
      }

    } catch (error: any) {
      toast.dismiss(loadingToast);
      toast.error(error.message || '서버 저장 중 오류가 발생했습니다');
    } finally {
      setSavingStates(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <Card className={cn(
      'border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 shadow-md',
      variant === 'sidebar' && 'w-full',
      variant === 'bottom' && 'w-full mx-auto max-w-4xl',
      className
    )}>
      <CardHeader className="pb-3 border-b border-amber-200">
        <CardTitle className="flex items-center gap-2 text-lg font-bold text-amber-900">
          <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span>AI 제안 블록</span>
          <span className="ml-auto px-2.5 py-1 bg-amber-200 text-amber-900 text-sm font-bold rounded-full">
            {newBlocksRequest.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-100 px-3 py-2 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>AI가 다음 컴포넌트들이 필요하다고 판단했습니다</span>
        </div>

        {/* Divider */}
        <div className="border-t border-amber-200" />

        {/* Request List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {newBlocksRequest.map((request, index) => {
            const key = request.placeholderId || request.componentName;
            const isExpanded = expandedStates[key];
            const hasSpecDetails = request.spec && (
              (request.spec.props && request.spec.props.length > 0) ||
              request.spec.style ||
              request.spec.category
            );

            return (
              <div
                key={key}
                className={cn(
                  "bg-white rounded-xl p-4 transition-all duration-200",
                  "border-2 border-amber-200 hover:border-amber-400",
                  "hover:shadow-md"
                )}
              >
                {/* Phase 1-D: AI Suggested Badge */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gradient-to-r from-amber-100 to-orange-100 border border-amber-300 rounded-full text-xs font-semibold text-amber-800">
                    <Sparkles className="w-3 h-3" />
                    AI Suggested
                  </div>
                  {request.placeholderId && (
                    <button
                      onClick={() => handlePlaceholderClick(request.placeholderId)}
                      className="ml-auto px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-mono rounded-md transition-all duration-200 flex items-center gap-1 hover:shadow-sm"
                      title="해당 Placeholder로 스크롤"
                    >
                      {request.placeholderId}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Phase 1-D: Header with Thumbnail Icon */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Thumbnail Icon */}
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                    {getThumbnailIcon(request.spec?.category)}
                  </div>

                  {/* Component Name and Reason */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-bold text-gray-900 mb-1">
                      {request.componentName}
                    </h4>
                    {request.reason && (
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {request.reason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Phase 1-D: Accordion for Spec Details */}
                {hasSpecDetails && (
                  <>
                    <button
                      onClick={() => setExpandedStates(prev => ({ ...prev, [key]: !prev[key] }))}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 mb-2",
                        "bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors",
                        "border border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <span className="text-xs font-medium text-gray-700">
                        {isExpanded ? 'Hide Details' : 'Show Details'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )}
                    </button>

                    {/* Spec Details (Collapsible) */}
                    {isExpanded && request.spec && (
                      <div className="space-y-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        {request.spec.props && request.spec.props.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Props</span>
                            <div className="flex flex-wrap gap-1.5">
                              {request.spec.props.map((prop, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-mono rounded border border-blue-200"
                                >
                                  {prop}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {request.spec.style && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Style</span>
                            <p className="text-xs text-gray-800">{request.spec.style}</p>
                          </div>
                        )}

                        {request.spec.category && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Category</span>
                            <span className="inline-block bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                              {request.spec.category}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Phase 1-D: Enhanced Action Buttons */}
                <div className="space-y-2">
                  {/* Phase 2-A: 블록 생성 버튼 */}
                  <button
                    onClick={() => handleGenerateBlock(request)}
                    disabled={!onGenerateBlock || generatingStates[key]}
                    className={cn(
                      "w-full px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200",
                      "flex items-center justify-center gap-2",
                      !onGenerateBlock || generatingStates[key]
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-sm hover:shadow-md transform hover:scale-[1.01]"
                    )}
                    title={onGenerateBlock ? "AI가 이 블록을 자동 생성합니다 (런타임 등록)" : "에디터에서 활성화 필요"}
                  >
                    {generatingStates[key] ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>생성 중...</span>
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        <span>AI 블록 생성하기</span>
                      </>
                    )}
                  </button>

                  {/* Phase 2-B: 영구 저장 버튼 */}
                  {generatedBlocks[key] && (
                    <button
                      onClick={() => handleSaveToServer(request)}
                      disabled={savingStates[key]}
                      className={cn(
                        "w-full px-4 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200",
                        "flex items-center justify-center gap-2",
                        savingStates[key]
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-sm hover:shadow-md transform hover:scale-[1.01]"
                      )}
                      title="서버에 영구 저장하고 Git에 자동 커밋/푸시합니다"
                    >
                      {savingStates[key] ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>저장 중...</span>
                        </>
                      ) : (
                        <>
                          <HardDrive className="w-4 h-4" />
                          <span>영구 저장하기 (Git)</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Phase 1-D: Enhanced Info Footer */}
        <div className="pt-3 border-t border-amber-200">
          <div className="flex items-start gap-2 text-xs text-amber-700">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">AI 블록 생성 & 영구 저장</p>
              <p>1️⃣ <strong>블록 생성하기:</strong> 런타임에 즉시 사용 가능한 블록 생성</p>
              <p>2️⃣ <strong>영구 저장하기:</strong> 서버 파일 시스템 저장 + Git 자동 커밋/푸시</p>
              <p>🌿 Git 브랜치: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900">ai-generated/blocks</code></p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NewBlockRequestPanel;
