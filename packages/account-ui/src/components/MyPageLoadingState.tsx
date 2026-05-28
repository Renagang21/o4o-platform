/**
 * MyPageLoadingState
 *
 * WO-O4O-MYPAGE-EMPTY-LOADING-COMPONENT-EXTRACTION-V1
 * 근거: IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1
 *
 * MyPage / Profile 영역의 loading 상태를 공통 톤으로 표시한다.
 * KPA local LoadingSpinner + 3 서비스 inline "불러오는 중..." 패턴 통합.
 */

import { Loader2 } from 'lucide-react';

export type MyPageLoadingStateSize = 'sm' | 'md' | 'lg';

export interface MyPageLoadingStateProps {
  /** 로딩 메시지. 기본 "불러오는 중..." */
  message?: string;
  /** 스피너 크기. 기본 md */
  size?: MyPageLoadingStateSize;
  className?: string;
}

const SPINNER_CLS: Record<MyPageLoadingStateSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const PADDING_CLS: Record<MyPageLoadingStateSize, string> = {
  sm: 'py-4',
  md: 'py-10',
  lg: 'py-16',
};

export function MyPageLoadingState({
  message = '불러오는 중...',
  size = 'md',
  className,
}: MyPageLoadingStateProps) {
  const cls = [
    'flex flex-col items-center justify-center text-center',
    PADDING_CLS[size],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={cls}>
      <Loader2 className={`${SPINNER_CLS[size]} animate-spin text-gray-400`} />
      {message && (
        <p className="mt-3 text-sm text-gray-500">{message}</p>
      )}
    </div>
  );
}
