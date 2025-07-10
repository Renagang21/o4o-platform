interface NotificationData {
    id: string;
    type: 'urgent' | 'approval' | 'success' | 'info';
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionUrl?: string;
}
interface NotificationItemProps {
    notification: NotificationData;
    onMarkRead?: (id: string) => void;
    onDismiss?: (id: string) => void;
    onAction?: (url: string) => void;
}
declare const NotificationItem: React.FC<NotificationItemProps>;
export default NotificationItem;
//# sourceMappingURL=NotificationItem.d.ts.map