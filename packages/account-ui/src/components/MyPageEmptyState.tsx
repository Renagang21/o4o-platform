/**
 * MyPageEmptyState
 *
 * WO-O4O-MYPAGE-EMPTY-LOADING-COMPONENT-EXTRACTION-V1
 * 근거: IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1
 *
 * MyPage / Profile 영역의 empty 상태를 공통 톤으로 표시한다.
 * KPA local EmptyState + 3 서비스 inline 빈 상태 패턴 통합.
 *
 * - icon: emoji string 또는 ReactNode 모두 허용
 * - action: actionHref 또는 onAction 중 하나
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface MyPageEmptyStateProps {
  title?: string;
  description?: string;
  /** emoji 문자열 또는 lucide-react 등 ReactNode */
  icon?: ReactNode;
  actionLabel?: string;
  /** 클릭 시 이동할 경로. onAction 보다 우선 */
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function MyPageEmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionHref,
  onAction,
  className,
}: MyPageEmptyStateProps) {
  const cls = [
    'flex flex-col items-center justify-center text-center py-10 px-5',
    className,
  ].filter(Boolean).join(' ');

  const showAction = Boolean(actionLabel) && Boolean(actionHref || onAction);

  return (
    <div className={cls}>
      {icon && (
        <div className="mb-3 text-4xl text-gray-400">
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}
      {title && (
        <h3 className="text-base font-semibold text-gray-700 m-0">{title}</h3>
      )}
      {description && (
        <p className="mt-1 max-w-xs text-sm text-gray-500">{description}</p>
      )}
      {showAction && (
        <div className="mt-5">
          {actionHref ? (
            <Link
              to={actionHref}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors no-underline"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
