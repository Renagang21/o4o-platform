/**
 * HubCopyModal - 허브 상품 복사 옵션 모달
 *
 * WO-APP-DATA-HUB-PHASE2-B + PHASE3-A
 *
 * 1-step 모달: 템플릿 선택 + 노출 방식
 * - "시작 방식 선택" 느낌, 10초 이내 결정 가능
 * - LIMITED 조건 시 배너 표시
 *
 * Phase 3-A:
 * - AI 추천 배너 (Non-blocking advisor)
 * - 추천 근거 토글 표시
 * - "적용" 클릭 시에만 추천값 반영
 *
 * Phase 3-B:
 * - 조건 충족 시 모달 열릴 때 AI 추천을 초기 기본값으로 적용
 * - 사용자 수동 변경 시 auto-default 즉시 해제
 * - "기본값 적용됨" 상태 표시
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Copy, Loader2, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { COPY_TEMPLATE_OPTIONS, COPY_VISIBILITY_OPTIONS } from '@/config/store-catalog';
import { generateCopyRecommendation, shouldAutoApply } from '@/utils/store-ai-recommend';
import type { StoreCatalogItem, CopyTemplateType, CopyVisibility, CopyOptions } from '@/types/store-main';

interface HubCopyModalProps {
  isOpen: boolean;
  item: StoreCatalogItem | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (options: CopyOptions) => void;
}

export default function HubCopyModal({ isOpen, item, loading, onClose, onConfirm }: HubCopyModalProps) {
  const [templateType, setTemplateType] = useState<CopyTemplateType>('default');
  const [visibility, setVisibility] = useState<CopyVisibility>('private');
  const [showReasons, setShowReasons] = useState(false);
  // Phase 3-B: auto-default state
  const [isAutoDefaultApplied, setIsAutoDefaultApplied] = useState(false);
  const appliedItemRef = useRef<string | null>(null);

  // Phase 3-A: AI recommendation (rule-based, computed once per item)
  const recommendation = useMemo(() => {
    if (!item) return null;
    return generateCopyRecommendation(item);
  }, [item]);

  // Phase 3-B: Auto-apply recommendation as initial default (once per item)
  useEffect(() => {
    if (!isOpen || !item || !recommendation) return;
    // Only apply once per item open
    if (appliedItemRef.current === item.id) return;
    appliedItemRef.current = item.id;

    if (shouldAutoApply(item)) {
      setTemplateType(recommendation.recommendedTemplate);
      setVisibility(recommendation.recommendedVisibility);
      setIsAutoDefaultApplied(true);
    } else {
      // Reset to hardcoded defaults for non-auto items
      setTemplateType('default');
      setVisibility('private');
      setIsAutoDefaultApplied(false);
    }
    setShowReasons(false);
  }, [isOpen, item, recommendation]);

  if (!isOpen || !item) return null;

  const isLimited = item.policy === 'LIMITED';
  const hasLimitedConditions = isLimited && item.limitedConditions && item.limitedConditions.length > 0;

  // Check if current selection matches recommendation
  const isFollowingRecommendation = recommendation
    && templateType === recommendation.recommendedTemplate
    && visibility === recommendation.recommendedVisibility;

  // Phase 3-B: User manual change clears auto-default
  const handleTemplateChange = (value: CopyTemplateType) => {
    setTemplateType(value);
    setIsAutoDefaultApplied(false);
  };

  const handleVisibilityChange = (value: CopyVisibility) => {
    setVisibility(value);
    setIsAutoDefaultApplied(false);
  };

  const handleApplyRecommendation = () => {
    if (!recommendation) return;
    setTemplateType(recommendation.recommendedTemplate);
    setVisibility(recommendation.recommendedVisibility);
    setIsAutoDefaultApplied(true);
  };

  const handleConfirm = () => {
    if (loading) return;
    onConfirm({ templateType, visibility });
  };

  // Build recommendation summary text
  const recommendationLabel = recommendation
    ? `${COPY_TEMPLATE_OPTIONS.find((o) => o.value === recommendation.recommendedTemplate)?.label || ''} + ${COPY_VISIBILITY_OPTIONS.find((o) => o.value === recommendation.recommendedVisibility)?.label || ''}`
    : '';

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
              <Copy className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">내 매장에 추가</h2>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Phase 3-A: AI 추천 배너 */}
          {recommendation && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                  <p className="text-sm text-indigo-800 truncate">
                    <span className="font-medium">{recommendationLabel}</span>
                    <span className="text-indigo-600"> 추천</span>
                    {isAutoDefaultApplied && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-200 text-indigo-700 text-[10px] font-medium rounded leading-none">
                        기본값 적용됨
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {!isFollowingRecommendation && (
                    <button
                      type="button"
                      onClick={handleApplyRecommendation}
                      className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg hover:bg-indigo-200 transition-colors"
                    >
                      적용
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowReasons(!showReasons)}
                    className="p-1 text-indigo-400 hover:text-indigo-600 transition-colors"
                    title={showReasons ? '이유 닫기' : '이유 보기'}
                  >
                    {showReasons ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {showReasons && recommendation.reasons.length > 0 && (
                <ul className="mt-2 space-y-0.5 pl-6">
                  {recommendation.reasons.map((reason, idx) => (
                    <li key={idx} className="text-xs text-indigo-600 list-disc">{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* LIMITED 조건 배너 */}
          {hasLimitedConditions && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">한정 판매 상품</p>
                  <ul className="mt-1 space-y-0.5">
                    {item.limitedConditions!.map((cond, idx) => (
                      <li key={idx} className="text-xs text-amber-700">
                        {cond.label}: {cond.description}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 시작 방식 (Template Type) */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">시작 방식</p>
            <div className="grid grid-cols-2 gap-3">
              {COPY_TEMPLATE_OPTIONS.map((opt) => {
                const isSelected = templateType === opt.value;
                const isRecommended = recommendation?.recommendedTemplate === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleTemplateChange(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-medium rounded-full leading-none">
                        추천
                      </span>
                    )}
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 노출 방식 (Visibility) */}
          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">노출 설정</p>
            <div className="grid grid-cols-2 gap-3">
              {COPY_VISIBILITY_OPTIONS.map((opt) => {
                const isSelected = visibility === opt.value;
                const isRecommended = recommendation?.recommendedVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleVisibilityChange(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all relative ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 bg-indigo-500 text-white text-[10px] font-medium rounded-full leading-none">
                        추천
                      </span>
                    )}
                    <p className={`text-sm font-medium ${isSelected ? 'text-primary-700' : 'text-slate-700'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-600/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                복사 중...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                내 매장에 추가
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
