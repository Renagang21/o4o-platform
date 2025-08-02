import { FC, ReactNode, useState } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

export type NoticeType = 'success' | 'error' | 'warning' | 'info';

export interface AdminNoticeProps {
  id?: string;
  type: NoticeType;
  message: string;
  dismissible?: boolean;
  persistent?: boolean;
  onDismiss?: (id?: string) => void;
  children?: ReactNode;
}

/**
 * WordPress-style Admin Notice Component
 */
export const AdminNotice: FC<AdminNoticeProps> = ({
  id,
  type,
  message,
  dismissible = true,
  persistent = false,
  onDismiss,
  children
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.(id);
    
    // If persistent, save dismissal to localStorage
    if (persistent && id) {
      const dismissedNotices = JSON.parse(
        localStorage.getItem('dismissed_notices') || '[]'
      );
      dismissedNotices.push(id);
      localStorage.setItem('dismissed_notices', JSON.stringify(dismissedNotices));
    }
  };

  // Check if notice was previously dismissed
  if (persistent && id) {
    const dismissedNotices = JSON.parse(
      localStorage.getItem('dismissed_notices') || '[]'
    );
    if (dismissedNotices.includes(id)) {
      return null;
    }
  }

  if (!isVisible) return null;

  const noticeClasses = clsx(
    'notice',
    `notice-${type}`,
    dismissible && 'is-dismissible',
    'wp-admin-notice'
  );

  return (
    <div className={noticeClasses}>
      <p dangerouslySetInnerHTML={{ __html: message }} />
      {children}
      {dismissible && (
        <button
          type="button"
          className="notice-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss this notice"
        >
          <X className="w-4 h-4" />
          <span className="screen-reader-text">Dismiss this notice.</span>
        </button>
      )}
    </div>
  );
};