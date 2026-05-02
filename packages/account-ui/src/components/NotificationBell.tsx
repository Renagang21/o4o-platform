/**
 * NotificationBell — Header 알림 종 공통 컴포넌트
 *
 * WO-O4O-NOTIFICATION-UI-CORE-V1
 *
 * UI/동작만 담당. 데이터 fetch는 호출 측의 useNotifications 훅에서
 * 가져와 props로 주입한다 — GlobalUserProfileDropdown와 같은
 * 분리 패턴.
 *
 * 동작:
 *   - bell 아이콘 + unread count badge (>0일 때)
 *   - 클릭 시 dropdown 패널 열기 → onOpen() 콜백 (목록 refetch 트리거)
 *   - 항목 클릭 → onItemClick (선택), onMarkAsRead로 읽음 처리
 *   - 패널 footer: "모두 읽음 처리" 버튼
 *   - 비로그인이면 호출 측에서 렌더 자체를 생략하는 것을 권장 (또는 hidden)
 *   - 외부 클릭 / ESC / 라우트 변경 시 자동 닫힘
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Bell } from 'lucide-react';
import type { NotificationItem } from '../notifications/types.js';

export interface NotificationBellProps {
  unreadCount: number;
  notifications: NotificationItem[];
  loading?: boolean;
  /** Called when the dropdown opens — use to refetch the list. */
  onOpen?: () => void;
  /** Called when a single item is clicked. Receives the item id. */
  onItemClick?: (notification: NotificationItem) => void;
  /** Called to mark a single notification as read. */
  onMarkAsRead?: (notificationId: string) => void;
  /** Called to mark all unread notifications as read. */
  onMarkAllAsRead?: () => void;
  /** Optional empty-state text (default: '알림이 없습니다.'). */
  emptyText?: string;
  /** Optional aria-label for the bell button (default: '알림'). */
  ariaLabel?: string;
  /** Custom renderer for an item — overrides the default row. */
  renderItem?: (notification: NotificationItem) => ReactNode;
}

function formatRelative(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return '방금 전';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return d.toLocaleDateString('ko-KR');
}

export function NotificationBell(props: NotificationBellProps) {
  const {
    unreadCount,
    notifications,
    loading = false,
    onOpen,
    onItemClick,
    onMarkAsRead,
    onMarkAllAsRead,
    emptyText = '알림이 없습니다.',
    ariaLabel = '알림',
    renderItem,
  } = props;

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (next && onOpen) onOpen();
      return next;
    });
  }, [onOpen]);

  // outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleItem = useCallback(
    (n: NotificationItem) => {
      if (!n.isRead && onMarkAsRead) onMarkAsRead(n.id);
      if (onItemClick) onItemClick(n);
    },
    [onItemClick, onMarkAsRead]
  );

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-full text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 transition"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold leading-[18px] text-center"
            aria-label={`읽지 않은 알림 ${unreadCount}건`}
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="알림 목록"
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl z-50 flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-900">알림</span>
            {unreadCount > 0 && onMarkAllAsRead && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="text-xs text-gray-600 hover:text-gray-900 underline"
              >
                모두 읽음
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                불러오는 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyText}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    {renderItem ? (
                      <div onClick={() => handleItem(n)}>{renderItem(n)}</div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleItem(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition ${
                          n.isRead ? 'bg-white' : 'bg-blue-50/50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.isRead && (
                            <span
                              className="mt-1.5 inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
                              aria-label="읽지 않음"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {n.title}
                            </div>
                            {n.message && (
                              <div className="mt-0.5 text-xs text-gray-600 line-clamp-2">
                                {n.message}
                              </div>
                            )}
                            <div className="mt-1 text-[11px] text-gray-400">
                              {formatRelative(n.createdAt)}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
