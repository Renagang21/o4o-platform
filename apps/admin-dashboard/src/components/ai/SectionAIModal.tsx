/**
 * SectionAIModal Component
 * Phase 2-C Remaining: Section-level AI reconstruction
 *
 * Allows users to refine, restructure, or enhance multiple selected blocks as a cohesive section
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, CheckCircle, AlertCircle, Layers } from 'lucide-react';
import { Block } from '@/types/post.types';
import { cn } from '@/lib/utils';
import { sectionAIGenerator, SectionRefineOptions } from '@/services/ai/SectionAIGenerator';

interface SectionAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  blocks: Block[];
  onApply: (refinedBlocks: Block[]) => void;
}

type SectionRole = 'auto' | 'hero' | 'feature' | 'cta' | 'about' | 'timeline' | 'faq';
type AIActionType = 'restructure' | 'problem-solution-cta' | 'enhance-cta' | 'add-block' | 'custom';

interface SectionAction {
  type: AIActionType;
  label: string;
  description: string;
  prompt: string;
}

const SECTION_ROLES: Array<{ value: SectionRole; label: string; description: string }> = [
  { value: 'auto', label: '자동 감지', description: 'AI가 섹션 역할을 자동으로 판단합니다' },
  { value: 'hero', label: 'Hero 섹션', description: '첫 인상을 결정하는 메인 히어로 영역' },
  { value: 'feature', label: 'Feature 섹션', description: '제품/서비스의 주요 기능 소개' },
  { value: 'cta', label: 'CTA 섹션', description: '행동 유도 (Call-to-Action)' },
  { value: 'about', label: 'About 섹션', description: '회사/제품 소개' },
  { value: 'timeline', label: 'Timeline 섹션', description: '시간순 프로세스/히스토리' },
  { value: 'faq', label: 'FAQ 섹션', description: '자주 묻는 질문' },
];

const SECTION_ACTIONS: SectionAction[] = [
  {
    type: 'restructure',
    label: '섹션 재구성',
    description: '블록 구조와 흐름을 개선합니다',
    prompt: '이 섹션의 블록들을 더 효과적인 구조로 재구성해주세요. 논리적 흐름을 개선하고, 중복을 제거하며, 가독성을 높여주세요.',
  },
  {
    type: 'problem-solution-cta',
    label: '문제→해결→CTA 구조',
    description: '설득력 있는 Problem-Solution-CTA 흐름으로 변환',
    prompt: '이 섹션을 Problem(문제 제기) → Solution(해결책 제시) → CTA(행동 유도) 구조로 재구성해주세요. 각 단계가 명확하게 구분되도록 해주세요.',
  },
  {
    type: 'enhance-cta',
    label: 'CTA 강화',
    description: 'Call-to-Action을 더 강력하게 만듭니다',
    prompt: '이 섹션의 CTA(Call-to-Action)를 더 강력하고 설득력있게 만들어주세요. 명확한 행동 유도와 긴박감을 추가해주세요.',
  },
  {
    type: 'add-block',
    label: '새 블록 추가',
    description: '섹션에 유용한 블록을 추가합니다',
    prompt: '이 섹션에 부족한 요소를 파악하고, 섹션을 완성하는 데 도움이 되는 새로운 블록을 추가해주세요.',
  },
];

export const SectionAIModal: React.FC<SectionAIModalProps> = ({
  isOpen,
  onClose,
  blocks,
  onApply,
}) => {
  const [sectionRole, setSectionRole] = useState<SectionRole>('auto');
  const [selectedAction, setSelectedAction] = useState<AIActionType>('restructure');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSectionRole('auto');
      setSelectedAction('restructure');
      setCustomPrompt('');
      setError(null);
    }
  }, [isOpen]);

  const currentAction = SECTION_ACTIONS.find(a => a.type === selectedAction);

  const handleApply = async () => {
    if (blocks.length < 2) {
      setError('섹션 재구성은 최소 2개 이상의 블록이 필요합니다');
      return;
    }

    if (!currentAction) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Build refine options
      const options: SectionRefineOptions = {
        type: selectedAction,
        sectionRole: sectionRole === 'auto' ? undefined : sectionRole,
        prompt: currentAction.prompt,
        customInstructions: customPrompt || undefined,
      };

      // Call SectionAIGenerator
      const result = await sectionAIGenerator.refineSection(blocks, options);

      if (!result.success || !result.blocks) {
        throw new Error(result.error || 'AI 섹션 재구성에 실패했습니다');
      }

      // Apply refined blocks
      onApply(result.blocks);
      onClose();
    } catch (err: any) {
      setError(err.message || 'AI 처리 중 오류가 발생했습니다');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            섹션 AI 재구성
          </DialogTitle>
          <DialogDescription>
            선택된 블록들을 AI로 개선하거나 재구성합니다
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selected Blocks Summary */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                선택된 블록 ({blocks.length}개)
              </span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {blocks.map((block, index) => {
                const contentPreview = typeof block.content === 'string'
                  ? block.content.substring(0, 100)
                  : JSON.stringify(block.content).substring(0, 100);

                return (
                  <div
                    key={block.id}
                    className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200 text-xs"
                  >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 bg-purple-100 text-purple-700 rounded-full font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-700">
                        <code className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                          {block.type}
                        </code>
                      </div>
                      <p className="text-gray-600 truncate mt-1">
                        {contentPreview}
                        {contentPreview.length >= 100 && '...'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section Role Selection */}
          <div>
            <Label className="text-sm font-semibold mb-2 block">섹션 역할</Label>
            <Select value={sectionRole} onValueChange={(value) => setSectionRole(value as SectionRole)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="섹션 역할 선택" />
              </SelectTrigger>
              <SelectContent>
                {SECTION_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div>
                      <div className="font-medium">{role.label}</div>
                      <div className="text-xs text-gray-500">{role.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-gray-500">
              섹션의 역할을 지정하면 AI가 더 적절한 구조로 재구성합니다
            </p>
          </div>

          {/* AI Action Selection */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">AI 작업 선택</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_ACTIONS.map((action) => (
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
            <Label htmlFor="custom-prompt" className="text-sm font-semibold mb-2 block">
              추가 요청사항 (선택사항)
            </Label>
            <Textarea
              id="custom-prompt"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="예: 타겟 고객은 약사이며, 전문적이면서도 친근한 톤으로 작성해주세요..."
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

export default SectionAIModal;
