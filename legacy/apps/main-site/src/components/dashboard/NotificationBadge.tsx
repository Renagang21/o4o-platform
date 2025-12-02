/**
 * Notification Badge Component
 * Phase PD-6 Part 2: Simple badge/notification system
 *
 * Features:
 * - "New" indicator for recent items
 * - Count badge for numeric values
 * - Customizable colors
 */

import React from 'react';

interface NotificationBadgeProps {
  count?: number;
  isNew?: boolean;
  variant?: 'count' | 'dot' | 'new';
  color?: 'red' | 'blue' | 'green' | 'orange' | 'purple';
  className?: string;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  count,
  isNew = false,
  variant = 'count',
  color = 'red',
  className = '',
}) => {
  const colorClasses = {
    red: 'bg-red-500 text-white',
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    orange: 'bg-orange-500 text-white',
    purple: 'bg-purple-500 text-white',
  };

  // Don't render if no count and not new
  if (!count && !isNew && variant === 'count') {
    return null;
  }

  // Dot variant - small indicator
  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${colorClasses[color]} ${className}`}
        aria-label="New notification"
      />
    );
  }

  // New variant - "New" text badge
  if (variant === 'new' || isNew) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses[color]} ${className}`}
      >
        New
      </span>
    );
  }

  // Count variant - numeric badge
  if (count && count > 0) {
    return (
      <span
        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold ${colorClasses[color]} min-w-[1.25rem] ${className}`}
        aria-label={`${count} notifications`}
      >
        {count > 99 ? '99+' : count}
      </span>
    );
  }

  return null;
};

/**
 * Helper function to check if an item is "new" (within last 24 hours)
 */
export const isItemNew = (createdAt: string | Date): boolean => {
  const itemDate = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
  return diffInHours < 24;
};

/**
 * Helper function to check if an item is recent (within specified hours)
 */
export const isItemRecent = (createdAt: string | Date, hours: number = 24): boolean => {
  const itemDate = new Date(createdAt);
  const now = new Date();
  const diffInHours = (now.getTime() - itemDate.getTime()) / (1000 * 60 * 60);
  return diffInHours < hours;
};

export default NotificationBadge;
