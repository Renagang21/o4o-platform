/**
 * NotificationListBody — 알림 목록 본문 (loading / empty / list) 공통 View
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1
 *
 * 이전 상태: 같은 목록 마크업(읽지 않음 점 · 제목 · 메시지 · 상대 시각 · empty/loading 문구)이
 *   - packages/account-ui NotificationBell 내부
 *   - services/web-kpa-society MobileBottomNav 알림 시트
 *   - services/web-neture NetureBottomNav 알림 시트
 * 3곳에 복제돼 있었다. 본 컴포넌트가 그 유일한 정본이다.
 *
 * 서비스 분기 금지 원칙(WO §9 · §12):
 *   - serviceKey / notification.type 으로 이 안에서 분기하지 않는다.
 *   - 브랜드 색은 `accentDotClassName` · `unreadRowClassName` 로 주입한다.
 *   - 이동 경로는 호출 측이 onItemClick 에서 결정한다 (여기서 route 를 알지 않는다).
 */

import type { ReactNode } from 'react';
import type { NotificationItem } from './types.js';
import { formatRelativeTime } from './formatRelative.js';

export interface NotificationListBodyProps {
  notifications: NotificationItem[];
  loading?: boolean;
  /** 항목 클릭. 읽음 처리·이동은 호출 측 책임. */
  onItemClick?: (notification: NotificationItem) => void;
  /** 목록이 비었을 때 문구. */
  emptyText?: string;
  /** 로딩 중 문구. */
  loadingText?: string;
  /** 읽지 않음 점 색 (Tailwind class). */
  accentDotClassName?: string;
  /** 읽지 않은 행 배경 (Tailwind class). */
  unreadRowClassName?: string;
  /** 항목 커스텀 렌더러 — 지정하면 기본 행 대신 사용한다. */
  renderItem?: (notification: NotificationItem) => ReactNode;
}

export function NotificationListBody({
  notifications,
  loading = false,
  onItemClick,
  emptyText = '알림이 없습니다.',
  loadingText = '불러오는 중...',
  accentDotClassName = 'bg-blue-500',
  unreadRowClassName = 'bg-blue-50/50',
  renderItem,
}: NotificationListBodyProps) {
  if (loading && notifications.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-500">{loadingText}</div>
    );
  }

  if (notifications.length === 0) {
    return <div className="px-4 py-8 text-center text-sm text-gray-500">{emptyText}</div>;
  }

  return (
    <ul className="divide-y divide-gray-100 list-none m-0 p-0">
      {notifications.map((n) => (
        <li key={n.id}>
          {renderItem ? (
            <div onClick={() => onItemClick?.(n)}>{renderItem(n)}</div>
          ) : (
            <button
              type="button"
              onClick={() => onItemClick?.(n)}
              className={`w-full text-left px-4 py-3 transition hover:bg-gray-50 ${
                n.isRead ? 'bg-white' : unreadRowClassName
              }`}
            >
              <div className="flex items-start gap-2">
                {!n.isRead && (
                  <span
                    className={`mt-1.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${accentDotClassName}`}
                    aria-label="읽지 않음"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {/* 긴 제목은 자르되(desktop), 메시지는 2줄까지 wrap — 모바일 가독성 계약 */}
                  <div className="text-sm font-medium text-gray-900 truncate">{n.title}</div>
                  {n.message && (
                    <div className="mt-0.5 text-xs text-gray-600 line-clamp-2 break-words">
                      {n.message}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-gray-400">
                    {formatRelativeTime(n.createdAt)}
                  </div>
                </div>
              </div>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
