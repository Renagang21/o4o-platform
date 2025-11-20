/**
 * BlockAIModal Component
 * Phase 2-C: Block-level AI editing
 *
 * Allows users to refine, improve, or translate individual blocks using AI
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, FileText, Globe, Zap, AlertCircle } from 'lucide-react';
import { Block } from '@/types/post.types';
import { cn } from '@/lib/utils';
import { blockAIGenerator, BlockRefineOptions } from '@/services/ai/BlockAIGenerator';

interface BlockAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  block: Block | null;
  onApply: (updatedBlock: Block) => void;
  initialAction?: AIActionType;
}

type AIActionType = 'refine' | 'improve' | 'translate-ko' | 'translate-en' | 'cta' | 'seo' | 'custom';

interface AIAction {
  type: AIActionType;
  label: string;
  icon: React.ReactNode;
  description: string;
  prompt: string;
}

const AI_ACTIONS: AIAction[] = [
  {
    type: 'refine',
    label: '간결하게',
    icon: <Zap className="w-4 h-4" />,
    description: '내용을 더 간결하고 명확하게 만듭니다',
    prompt: '이 블록의 내용을 더 간결하고 명확하게 다시 작성해주세요. 핵심 메시지는 유지하되, 불필요한 단어나 문장을 제거해주세요.',
  },
  {
    type: 'improve',
    label: '상세하게',
    icon: <FileText className="w-4 h-4" />,
    description: '내용을 더 설명적이고 자세하게 만듭니다',
    prompt: '이 블록의 내용을 더 설명적이고 자세하게 확장해주세요. 독자가 이해하기 쉽도록 예시나 세부사항을 추가해주세요.',
  },
  {
    type: 'translate-ko',
    label: '한국어로',
    icon: <Globe className="w-4 h-4" />,
    description: '영어를 한국어로 번역합니다',
    prompt: '이 블록의 내용을 자연스러운 한국어로 번역해주세요. 문화적 맥락을 고려하여 번역해주세요.',
  },
  {
    type: 'translate-en',
    label: 'English',
    icon: <Globe className="w-4 h-4" />,
    description: '한국어를 영어로 번역합니다',
    prompt: 'Translate this block\'s content to natural English. Consider cultural context when translating.',
  },
  {
    type: 'cta',
    label: 'CTA 강화',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'Call-to-Action을 더 강력하게 만듭니다',
    prompt: '이 블록의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 행동을 유도하는 명확한 메시지로 개선해주세요.',
  },
  {
    type: 'seo',
    label: 'SEO 최적화',
    icon: <Zap className="w-4 h-4" />,
    description: 'SEO에 최적화된 내용으로 개선합니다',
    prompt: '이 블록의 내용을 SEO에 최적화된 형태로 개선해주세요. 키워드를 자연스럽게 포함하고, 검색엔진 친화적인 구조로 만들어주세요.',
  },
];

export const BlockAIModal: React.FC<BlockAIModalProps> = ({
  isOpen,
  onClose,
  block,
  onApply,
  initialAction = 'refine',
}) => {
  const [selectedAction, setSelectedAction] = useState<AIActionType>(initialAction);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update selected action when initialAction changes (when modal opens)
  React.useEffect(() => {
    if (isOpen) {
      setSelectedAction(initialAction);
      setCustomPrompt('');
      setError(null);
    }
  }, [isOpen, initialAction]);

  const currentAction = AI_ACTIONS.find(a => a.type === selectedAction);

  const handleApply = async () => {
    if (!block || !currentAction) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Build refine options
      const options: BlockRefineOptions = {
        type: selectedAction,
        prompt: currentAction.prompt,
        customInstructions: customPrompt || undefined,
      };

      // Call BlockAIGenerator
      const result = await blockAIGenerator.refineBlock(block, options);

      if (!result.success || !result.block) {
        throw new Error(result.error || 'AI 처리에 실패했습니다');
      }

      // Apply refined block
      onApply(result.block);
      onClose();
    } catch (err: any) {
      setError(err.message || 'AI 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!block) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            블록 AI 편집
          </DialogTitle>
          <DialogDescription>
            AI를 사용하여 이 블록의 내용을 개선하거나 변환합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Block Info */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
              현재 블록
            </div>
            <div className="text-sm text-gray-700">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">타입:</span>
                <code className="px-2 py-0.5 bg-white rounded border border-gray-300 text-xs">
                  {block.type}
                </code>
              </div>
              <div className="mt-2">
                <span className="font-medium">내용:</span>
                <div className="mt-1 p-2 bg-white rounded border border-gray-300 text-xs max-h-32 overflow-y-auto">
                  {typeof block.content === 'string'
                    ? block.content.substring(0, 200) + (block.content.length > 200 ? '...' : '')
                    : JSON.stringify(block.content, null, 2).substring(0, 200) + '...'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* AI Actions */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">AI 작업 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {AI_ACTIONS.map((action) => (
                <button
                  key={action.type}
                  onClick={() => setSelectedAction(action.type)}
                  className={cn(
                    "p-3 rounded-lg border-2 transition-all duration-200 text-left",
                    "hover:shadow-md",
                    selectedAction === action.type
                      ? "border-purple-500 bg-purple-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-purple-300"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {action.icon}
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
            <Label htmlFor="custom-prompt" className="text-sm font-semibold mb-2 block">
              추가 요청사항 (선택사항)
            </Label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="예: 타겟은 약사이며, 친근하지만 전문적인 톤으로..."
              className="min-h-[100px] text-sm"
              disabled={isProcessing}
            />
            <p className="mt-2 text-xs text-gray-500">
              AI에게 추가로 전달할 지침을 입력하세요
            </p>
          </div>

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
            <Button
              onClick={handleApply}
              disabled={isProcessing}
              className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 처리 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  적용하기
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockAIModal;
