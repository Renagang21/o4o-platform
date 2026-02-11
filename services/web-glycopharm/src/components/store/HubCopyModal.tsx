/**
 * HubCopyModal - 허브 상품 복사 옵션 모달
 *
 * WO-APP-DATA-HUB-PHASE2-B
 *
 * 1-step 모달: 템플릿 선택 + 노출 방식 + 카테고리 오버라이드
 * - "시작 방식 선택" 느낌, 10초 이내 결정 가능
 * - LIMITED 조건 시 배너 표시 + 옵션 비활성화
 */

import { useState } from 'react';
import { X, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { COPY_TEMPLATE_OPTIONS, COPY_VISIBILITY_OPTIONS } from '@/config/store-catalog';
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

  if (!isOpen || !item) return null;

  const isLimited = item.policy === 'LIMITED';
  const hasLimitedConditions = isLimited && item.limitedConditions && item.limitedConditions.length > 0;

  const handleConfirm = () => {
    if (loading) return;
    onConfirm({ templateType, visibility });
  };

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
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTemplateType(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
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
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
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
