/// <reference types="node" />
import { Notification } from '../entities/Notification';
import { EventEmitter } from 'events';
export interface NotificationData {
    type: 'email' | 'sms' | 'push' | 'in_app' | 'webhook' | 'tracking';
    recipients: string[];
    template: string;
    data: Record<string, any>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    source: string;
    scheduledAt?: Date;
    retryPolicy?: {
        maxRetries: number;
        backoffMs: number;
    };
    notificationId?: string;
}
export interface NotificationTemplate {
    id: string;
    name: string;
    type: string;
    subject?: string;
    emailBody?: string;
    smsBody?: string;
    pushTitle?: string;
    pushBody?: string;
    webhookPayload?: Record<string, any>;
    variables: string[];
    isActive: boolean;
}
export interface NotificationPreference {
    userId: string;
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
    categories: Record<string, boolean>;
}
export declare class NotificationService extends EventEmitter {
    private notificationRepository;
    private templateRepository;
    private emailService;
    private processingQueue;
    private retryQueue;
    constructor();
    sendNotification(notificationData: NotificationData): Promise<{
        success: boolean;
        notificationId?: string;
        errors?: string[];
    }>;
    sendBulkNotifications(notifications: NotificationData[]): Promise<{
        success: boolean;
        results: Array<{
            notificationId?: string;
            success: boolean;
            errors?: string[];
        }>;
    }>;
    private processNotificationImmediately;
    private sendToRecipient;
    private sendEmail;
    private sendSMS;
    private sendPushNotification;
    private sendInAppNotification;
    private sendWebhook;
    private sendTrackingNotification;
    private compileTemplate;
    private interpolateString;
    private interpolateObject;
    private getNestedValue;
    private resolveRecipients;
    private getCustomerDetails;
    private getVendorDetails;
    private getSupplierDetails;
    private getAdminUsers;
    private getTemplate;
    private validateNotificationData;
    private addToQueue;
    private scheduleNotification;
    private startQueueProcessor;
    private processQueue;
    private getBatchSize;
    private addToRetryQueue;
    private processRetryQueue;
    getNotificationStats(): Promise<{
        totalSent: number;
        totalFailed: number;
        queueSizes: Record<string, number>;
        retryQueueSize: number;
        recentActivity: Array<{
            date: string;
            sent: number;
            failed: number;
        }>;
    }>;
    createTemplate(templateData: Omit<NotificationTemplate, 'id'>): Promise<NotificationTemplate>;
    getNotificationHistory(filters?: {
        type?: string;
        status?: string;
        recipient?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        notifications: Notification[];
        total: number;
    }>;
}
export declare const notificationService: NotificationService;
//# sourceMappingURL=notification.service.d.ts.map