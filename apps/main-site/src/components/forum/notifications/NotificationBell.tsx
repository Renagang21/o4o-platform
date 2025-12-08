/**
 * NotificationBell - Header Notification Icon with Badge
 * Phase 13: Forum Notification System
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { NotificationPopover } from './NotificationPopover';

interface NotificationBellProps {
  unreadCount?: number;
  onFetch?: () => Promise<number>; // Function to fetch unread count
  pollInterval?: number; // Polling interval in ms (default: 30000)
  className?: string;
}

export function NotificationBell({
  unreadCount: initialCount = 0,
  onFetch,
  pollInterval = 30000,
  className = '',
}: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update count when prop changes
  useEffect(() => {
    setUnreadCount(initialCount);
  }, [initialCount]);

  // Poll for unread count if onFetch is provided
  useEffect(() => {
    if (!onFetch) return;

    const fetchCount = async () => {
      try {
        const count = await onFetch();
        setUnreadCount(count);
      } catch (error) {
        console.error('Failed to fetch notification count:', error);
      }
    };

    // Initial fetch
    fetchCount();

    // Set up polling
    const interval = setInterval(fetchCount, pollInterval);

    return () => clearInterval(interval);
  }, [onFetch, pollInterval]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
      >
        {/* Bell Icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6 text-gray-600"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <NotificationPopover
          onClose={handleClose}
          anchorRef={buttonRef}
          onCountChange={setUnreadCount}
        />
      )}
    </div>
  );
}

export default NotificationBell;
