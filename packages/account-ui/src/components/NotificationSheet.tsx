/**
 * NotificationSheet — 모바일 하단 알림 시트 공통 컴포넌트
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-NOTIFICATIONS-COMMONIZATION-V1
 *
 * 데스크톱은 NotificationBell(헤더 utilitySlot), 모바일은 이 시트를 쓴다.
 * 공통 GlobalHeader 의 utilitySlot 은 `hidden md:flex` 안에 있어 모바일에서
 * 종이 렌더되지 않기 때문이다 — 모바일 알림 진입은 하단 nav 가 담당한다.
 *
 * 이전 상태: KPA MobileBottomNav 와 Neture NetureBottomNav 가 거의 동일한
 * 시트 마크업을 각각 들고 있었고(브랜드 색만 상이), GlycoPharm·K-Cosmetics 는
 * 알림 탭이 `/mypage` 로 가는 dead link 였다. 본 컴포넌트가 4서비스의 정본이다.
 *
 * 계약:
 *   - backdrop 은 호출 측이 렌더한다(프로필 시트와 backdrop 을 공유하기 때문).
 *   - 데이터는 useNotifications 결과를 props 로 주입한다(fetch 하지 않는다).
 *   - 서비스 route / serviceKey 분기 없음. 이동은 onItemClick 이 결정한다.
 */

import { X } from 'lucide-react';
import type { NotificationItem } from '../notifications/types.js';
import { NotificationListBody } from '../notifications/NotificationListBody.js';

export interface NotificationSheetProps {
  notifications: NotificationItem[];
  unreadCount: number;
  loading?: boolean;
  /** 닫기(백드롭 클릭 / X 버튼). */
  onClose: () => void;
  /** 항목 클릭 — 읽음 처리 + 이동은 호출 측 책임. */
  onItemClick?: (notification: NotificationItem) => void;
  /** 전체 읽음. 없으면 버튼을 숨긴다. */
  onMarkAllAsRead?: () => void;
  /** '모두 읽음' 버튼 색 (Tailwind class). */
  markAllClassName?: string;
  /** 읽지 않음 점 색 (Tailwind class). */
  accentDotClassName?: string;
  /** 읽지 않은 행 배경 (Tailwind class). */
  unreadRowClassName?: string;
  /** 시트 제목 (기본 '알림'). */
  title?: string;
  emptyText?: string;
}

export function NotificationSheet({
  notifications,
  unreadCount,
  loading = false,
  onClose,
  onItemClick,
  onMarkAllAsRead,
  markAllClassName = 'text-blue-600 hover:bg-blue-50',
  accentDotClassName = 'bg-blue-500',
  unreadRowClassName = 'bg-blue-50/50',
  title = '알림',
  emptyText = '알림이 없습니다.',
}: NotificationSheetProps) {
  return (
    <div
      role="dialog"
      aria-label="알림 목록"
      className="md:hidden fixed left-0 right-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)' }}
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-900 m-0">{title}</p>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && onMarkAllAsRead && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className={`text-xs rounded px-2 py-1 ${markAllClassName}`}
            >
              모두 읽음
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="overflow-y-auto">
        <NotificationListBody
          notifications={notifications}
          loading={loading}
          onItemClick={onItemClick}
          emptyText={emptyText}
          accentDotClassName={accentDotClassName}
          unreadRowClassName={unreadRowClassName}
        />
      </div>
    </div>
  );
}

/**
 * NotificationTabBadge — 하단 nav 알림 탭의 unread 배지 (0이면 렌더 안 함, 99 초과는 '99+').
 * NotificationBell 배지와 같은 상한 규칙을 쓴다.
 */
export function NotificationTabBadge({
  unreadCount,
  style,
}: {
  unreadCount: number;
  style?: React.CSSProperties;
}) {
  if (unreadCount <= 0) return null;
  return (
    <span aria-label={`읽지 않은 알림 ${unreadCount}건`} style={style}>
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  );
}
