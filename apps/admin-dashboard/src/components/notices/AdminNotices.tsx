import { FC } from 'react';
import { AdminNotice } from './AdminNotice';
import { useAdminNotices } from '@/hooks/useAdminNotices';

/**
 * WordPress-style Admin Notices Container
 * Renders all active admin notices
 */
export const AdminNotices: FC = () => {
  const { notices, dismissNotice } = useAdminNotices();

  if (notices.length === 0) return null;

  return (
    <div className="wp-admin-notices">
      {notices.map((notice) => (
        <AdminNotice
          key={notice.id}
          {...notice}
          onDismiss={() => dismissNotice(notice.id)}
        />
      ))}
    </div>
  );
};