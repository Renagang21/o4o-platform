import React from 'react';
interface NotificationData {
    id: string;
    type: 'urgent' | 'approval' | 'success' | 'info';
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionUrl?: string;
}
interface NotificationsProps {
    notifications: NotificationData[];
    isLoading?: boolean;
}
declare const Notifications: React.FC<NotificationsProps>;
export default Notifications;
//# sourceMappingURL=index.d.ts.map