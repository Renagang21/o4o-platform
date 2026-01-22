/**
 * CornerAiButton
 *
 * Phase 1: 코너 디스플레이용 AI 버튼
 * - 실제 동작하는 AI 진입 포인트
 * - 키오스크/태블릿에 최적화된 터치 친화적 UI
 */

import React, { useState, useCallback } from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface CornerAiButtonProps {
  /** AI 요청 핸들러 */
  onAiRequest?: (query: string) => void | Promise<void>;
  /** 버튼 라벨 */
  label?: string;
  /** 버튼 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 버튼 변형 */
  variant?: 'default' | 'floating' | 'inline';
  /** 비활성화 상태 */
  disabled?: boolean;
  /** 로딩 상태 */
  isLoading?: boolean;
  /** 추가 클래스 */
  className?: string;
}

const sizeClasses = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

const iconSizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const variantClasses = {
  default: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:from-blue-700 hover:to-indigo-700',
  floating: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xl hover:from-purple-700 hover:to-pink-700 fixed bottom-6 right-6 z-50 rounded-full',
  inline: 'bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-300',
};

export const CornerAiButton: React.FC<CornerAiButtonProps> = ({
  onAiRequest,
  label = 'AI에게 물어보기',
  size = 'md',
  variant = 'default',
  disabled = false,
  isLoading = false,
  className,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleButtonClick = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!query.trim() || !onAiRequest) return;

    setIsProcessing(true);
    try {
      await onAiRequest(query);
      setQuery('');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('AI request failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [query, onAiRequest]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const isButtonDisabled = disabled || isLoading;

  return (
    <>
      {/* AI Button */}
      <button
        type="button"
        onClick={handleButtonClick}
        disabled={isButtonDisabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-medium rounded-xl',
          'transition-all duration-200 transform',
          'hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
        aria-label={label}
      >
        {isLoading ? (
          <svg
            className={cn('animate-spin', iconSizeClasses[size])}
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className={iconSizeClasses[size]}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        )}
        <span>{label}</span>
      </button>

      {/* AI Dialog */}
      {isDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsDialogOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-xl font-semibold text-white">AI 상담</h2>
                </div>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                무엇이 궁금하신가요?
              </label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="예: 이 제품의 특징이 뭐예요? / 추천 상품 알려주세요"
                className={cn(
                  'w-full px-4 py-3 rounded-xl border border-gray-300',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'resize-none transition-shadow',
                  'text-base'
                )}
                rows={4}
                autoFocus
              />
              <p className="mt-2 text-sm text-gray-500">
                Enter를 눌러 전송하거나 아래 버튼을 클릭하세요
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsDialogOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSubmit}
                disabled={!query.trim() || isProcessing}
                className={cn(
                  'px-6 py-2 text-white rounded-lg transition-all',
                  'bg-gradient-to-r from-blue-600 to-indigo-600',
                  'hover:from-blue-700 hover:to-indigo-700',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isProcessing ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    처리 중...
                  </span>
                ) : (
                  '질문하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

CornerAiButton.displayName = 'CornerAiButton';
