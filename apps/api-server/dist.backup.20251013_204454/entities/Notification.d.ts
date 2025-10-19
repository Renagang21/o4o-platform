import { User } from './User';
export interface NotificationData {
    title: string;
    message: string;
    type: string;
    recipientId: string;
    data?: any;
}
export declare class Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    recipientId: string;
    data?: any;
    read: boolean;
    readAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    recipient: User;
}
//# sourceMappingURL=Notification.d.ts.map