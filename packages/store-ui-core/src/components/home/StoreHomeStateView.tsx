/**
 * StoreHomeStateView — 내 매장 홈 전면 상태 화면 (로딩 / 오류 / 빈 상태) canonical
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1
 *
 * 4서비스 홈이 각자 다른 마크업으로 렌더하던 3상태를 하나의 구조로 통일한다.
 *  - loading : 안내 문구 (기본 '불러오는 중...')
 *  - error   : 제목 + 메시지 + 재시도 버튼 — 실패를 빈 목록으로 삼키지 않는다
 *  - empty   : 제목 + 안내 + (선택) 진입 CTA
 *
 * 문구·아이콘·CTA 는 서비스가 주입한다 (약국/매장 등 도메인 용어를 고정하지 않는다).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type StoreHomeViewState = 'loading' | 'error' | 'empty';

export interface StoreHomeStateViewProps {
  state: StoreHomeViewState;
  icon?: ReactNode;
  title?: string;
  description?: ReactNode;
  /** error 재시도 */
  onRetry?: () => void;
  retryLabel?: string;
  /** empty CTA */
  actionLabel?: string;
  actionTo?: string;
  className?: string;
}

export function StoreHomeStateView({
  state,
  icon,
  title,
  description,
  onRetry,
  retryLabel = '다시 시도',
  actionLabel,
  actionTo,
  className,
}: StoreHomeStateViewProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className ?? ''}`}
      role={state === 'error' ? 'alert' : undefined}
      aria-busy={state === 'loading' || undefined}
    >
      {icon}
      {state === 'loading' ? (
        <p className="text-sm text-slate-500 m-0">{title ?? '불러오는 중...'}</p>
      ) : (
        <>
          {title ? (
            <p
              className={`text-base font-semibold m-0 ${
                state === 'error' ? 'text-red-700' : 'text-slate-700'
              }`}
            >
              {title}
            </p>
          ) : null}
          {description ? <p className="text-sm text-slate-500 m-0">{description}</p> : null}
          {state === 'error' && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium cursor-pointer hover:bg-primary-dark transition"
            >
              {retryLabel}
            </button>
          ) : null}
          {state === 'empty' && actionTo && actionLabel ? (
            <Link
              to={actionTo}
              className="mt-1 inline-flex items-center px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium no-underline hover:bg-primary-dark transition"
            >
              {actionLabel}
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}
