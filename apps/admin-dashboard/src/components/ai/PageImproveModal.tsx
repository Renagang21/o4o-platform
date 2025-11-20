/**
 * PageImproveModal Component
 * Phase 2-C Remaining: Page-level AI improvement with Diff Preview
 *
 * Allows users to improve the entire page structure, flow, and quality
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, CheckCircle, AlertCircle, FileText, ArrowRight, ArrowDown } from 'lucide-react';
import { Block } from '@/types/post.types';
import { cn } from '@/lib/utils';
import { pageAIImprover, PageImproveOptions } from '@/services/ai/PageAIImprover';

interface PageImproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: Block[];
  documentTitle: string;
  onApply: (improvedBlocks: Block[]) => void;
}

type AIActionType = 'optimize-order' | 'remove-duplicates' | 'improve-flow' | 'enhance-cta' | 'overall-quality';

interface PageAction {
  type: AIActionType;
  label: string;
  description: string;
  prompt: string;
}

const PAGE_ACTIONS: PageAction[] = [
  {
    type: 'optimize-order',
    label: '섹션 순서 최적화',
    description: '섹션을 더 논리적인 순서로 재배치합니다',
    prompt: '이 페이지의 섹션 순서를 사용자 여정을 고려하여 최적화해주세요. 논리적 흐름을 개선하고, 각 섹션이 자연스럽게 연결되도록 재배치해주세요.',
  },
  {
    type: 'remove-duplicates',
    label: '중복 제거',
    description: '중복되거나 불필요한 내용을 제거합니다',
    prompt: '이 페이지에서 중복되는 내용이나 불필요한 섹션을 찾아 제거하거나 통합해주세요. 핵심 메시지는 유지하되, 군더더기를 없애주세요.',
  },
  {
    type: 'improve-flow',
    label: '논리적 흐름 개선',
    description: '페이지 전체의 논리적 흐름을 개선합니다',
    prompt: '페이지 전체의 논리적 흐름을 개선해주세요. 각 섹션이 자연스럽게 이어지고, 사용자가 페이지를 읽으면서 자연스럽게 다음 단계로 이동할 수 있도록 만들어주세요.',
  },
  {
    type: 'enhance-cta',
    label: 'CTA 강화',
    description: 'Call-to-Action을 페이지 전체에서 강화합니다',
    prompt: '페이지 전체의 CTA(Call-to-Action)를 강화해주세요. 각 섹션에서 사용자의 행동을 유도하고, 최종 전환으로 이어질 수 있도록 개선해주세요.',
  },
  {
    type: 'overall-quality',
    label: '전체 품질 향상',
    description: '페이지의 전반적인 품질을 종합적으로 개선합니다',
    prompt: '페이지의 전반적인 품질을 종합적으로 개선해주세요. 내용의 명확성, 설득력, 가독성을 높이고, 사용자 경험을 향상시켜주세요.',
  },
];

export const PageImproveModal: React.FC<PageImproveModalProps> = ({
  isOpen,
  onClose,
  blocks,
  documentTitle,
  onApply,
}) => {
  const [selectedAction, setSelectedAction] = useState<AIActionType>('overall-quality');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [improvedBlocks, setImprovedBlocks] = useState<Block[] | null>(null);
  const [diffPreview, setDiffPreview] = useState<{
    originalCount: number;
    improvedCount: number;
    summary: string;
  } | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAction('overall-quality');
      setCustomPrompt('');
      setError(null);
      setImprovedBlocks(null);
      setDiffPreview(null);
    }
  }, [isOpen]);

  const currentAction = PAGE_ACTIONS.find(a => a.type === selectedAction);

  const handleGenerate = async () => {
    if (blocks.length === 0) {
      setError('페이지에 블록이 없습니다');
      return;
    }

    if (!currentAction) return;

    setIsProcessing(true);
    setError(null);
    setImprovedBlocks(null);
    setDiffPreview(null);

    try {
      // Build improve options
      const options: PageImproveOptions = {
        type: selectedAction,
        prompt: currentAction.prompt,
        customInstructions: customPrompt || undefined,
        documentTitle,
      };

      // Call PageAIImprover
      const result = await pageAIImprover.improvePage(blocks, options);

      if (!result.success || !result.blocks) {
        throw new Error(result.error || 'AI 페이지 개선에 실패했습니다');
      }

      // Store improved blocks
      setImprovedBlocks(result.blocks);

      // Generate diff preview
      setDiffPreview({
        originalCount: blocks.length,
        improvedCount: result.blocks.length,
        summary: generateDiffSummary(blocks, result.blocks),
      });
    } catch (err: any) {
      setError(err.message || 'AI 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (improvedBlocks) {
      onApply(improvedBlocks);
      onClose();
    }
  };

  const generateDiffSummary = (original: Block[], improved: Block[]): string => {
    const originalTypes = original.map(b => b.type);
    const improvedTypes = improved.map(b => b.type);

    const added = improved.length - original.length;
    const removed = original.length - improved.length;

    let summary = '';

    if (added > 0) {
      summary += `✅ ${added}개 블록 추가\n`;
    } else if (removed > 0) {
      summary += `🗑️ ${removed}개 블록 제거\n`;
    } else {
      summary += `🔄 블록 수 변경 없음 (${original.length}개)\n`;
    }

    // Check for block type changes
    const typeChanges = improvedTypes.filter((type, i) => originalTypes[i] !== type).length;
    if (typeChanges > 0) {
      summary += `🔀 ${typeChanges}개 블록 타입 변경\n`;
    }

    return summary.trim();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            페이지 전체 AI 개선
          </DialogTitle>
          <DialogDescription>
            AI로 페이지 전체 구조와 내용을 분석하고 개선합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Page Info */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                현재 페이지
              </span>
            </div>
            <div className="text-sm">
              <div className="font-semibold text-gray-800">{documentTitle || '(제목 없음)'}</div>
              <div className="text-gray-600 mt-1">
                총 {blocks.length}개 블록
              </div>
            </div>
          </div>

          {/* AI Action Selection */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">개선 작업 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAGE_ACTIONS.map((action) => (
                <button
                  key={action.type}
                  onClick={() => setSelectedAction(action.type)}
                  disabled={isProcessing}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                    "hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed",
                    selectedAction === action.type
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className={cn(
                      "w-4 h-4",
                      selectedAction === action.type ? "text-purple-600" : "text-gray-400"
                    )} />
                    <span className="font-semibold text-sm">{action.label}</span>
                  </div>
                  <p className="text-xs text-gray-600">{action.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Action Prompt */}
          {currentAction && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-2">
                선택된 작업
              </div>
              <p className="text-sm text-purple-800">{currentAction.prompt}</p>
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <Label htmlFor="page-custom-prompt" className="text-sm font-semibold mb-2 block">
              추가 요청사항 (선택사항)
            </Label>
            <Textarea
              id="page-custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="예: B2B SaaS 제품 페이지로, 기업 고객을 타겟으로 전문적이고 신뢰감 있는 톤으로..."
              className="min-h-[100px] text-sm"
              disabled={isProcessing}
            />
            <p className="mt-2 text-xs text-gray-500">
              AI에게 추가로 전달할 지침을 입력하세요
            </p>
          </div>

          {/* Diff Preview */}
          {diffPreview && improvedBlocks && (
            <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
              <div className="flex items-center gap-2 mb-3">
                <ArrowRight className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">변경 사항 미리보기</span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-white rounded border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">현재</div>
                  <div className="text-2xl font-bold text-gray-800">{diffPreview.originalCount}</div>
                  <div className="text-xs text-gray-500">블록</div>
                </div>
                <div className="p-3 bg-white rounded border border-blue-200">
                  <div className="text-xs text-gray-600 mb-1">개선 후</div>
                  <div className="text-2xl font-bold text-purple-600">{diffPreview.improvedCount}</div>
                  <div className="text-xs text-gray-500">블록</div>
                </div>
              </div>

              <div className="p-3 bg-white rounded border border-blue-200">
                <div className="text-xs font-semibold text-gray-700 mb-2">요약</div>
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                  {diffPreview.summary}
                </pre>
              </div>

              <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs text-yellow-800">
                  ⚠️ "적용하기"를 클릭하면 현재 페이지가 개선된 버전으로 완전히 대체됩니다.
                  필요한 경우 미리 저장해두세요.
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-900 mb-1">오류 발생</div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              취소
            </Button>

            {!improvedBlocks ? (
              <Button
                onClick={handleGenerate}
                disabled={isProcessing}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 분석 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    개선안 생성
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleApply}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                적용하기
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PageImproveModal;
