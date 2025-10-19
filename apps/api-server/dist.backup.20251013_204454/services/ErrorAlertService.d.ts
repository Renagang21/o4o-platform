/// <reference types="node" />
import { EventEmitter } from 'events';
export interface ErrorAlert {
    id: string;
    timestamp: Date;
    level: 'critical' | 'error' | 'warning' | 'info';
    category: string;
    message: string;
    details?: any;
    stack?: string;
    affectedUsers?: number;
    resolved?: boolean;
    resolvedAt?: Date;
    notificationsSent?: string[];
}
export interface ErrorAlertConfig {
    enabled: boolean;
    emailNotifications: {
        enabled: boolean;
        recipients: string[];
        minLevel: 'critical' | 'error' | 'warning' | 'info';
        throttleMinutes: number;
    };
    webhookNotifications: {
        enabled: boolean;
        url: string;
        minLevel: 'critical' | 'error' | 'warning' | 'info';
    };
    slackNotifications?: {
        enabled: boolean;
        webhookUrl: string;
        channel: string;
        minLevel: 'critical' | 'error' | 'warning' | 'info';
    };
    errorThresholds: {
        database: {
            count: number;
            timeWindow: number;
        };
        api: {
            count: number;
            timeWindow: number;
        };
        auth: {
            count: number;
            timeWindow: number;
        };
        payment: {
            count: number;
            timeWindow: number;
        };
        file: {
            count: number;
            timeWindow: number;
        };
    };
    autoResolveMinutes: number;
}
export interface ErrorStats {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    byCategory: Record<string, number>;
    recent: ErrorAlert[];
    topErrors: Array<{
        message: string;
        count: number;
    }>;
}
declare class ErrorAlertService extends EventEmitter {
    private alerts;
    private config;
    private lastNotification;
    private errorCounts;
    private isInitialized;
    constructor();
    private loadConfig;
    initialize(): Promise<void>;
    private setupGlobalErrorHandlers;
    captureError(error: Error | string, options?: {
        category?: string;
        level?: 'critical' | 'error' | 'warning' | 'info';
        details?: any;
        affectedUsers?: number;
        skipNotification?: boolean;
    }): Promise<ErrorAlert>;
    private checkThresholds;
    private shouldNotify;
    private sendNotifications;
    private sendEmailNotification;
    private sendWebhookNotification;
    private sendSlackNotification;
    private autoResolveAlerts;
    getAlerts(options?: {
        limit?: number;
        category?: string;
        level?: string;
        resolved?: boolean;
        startDate?: Date;
        endDate?: Date;
    }): ErrorAlert[];
    getStats(): ErrorStats;
    resolveAlert(alertId: string): boolean;
    clearAlerts(options?: {
        category?: string;
        olderThan?: Date;
    }): number;
    private loadAlerts;
    private saveAlerts;
}
export declare const errorAlertService: ErrorAlertService;
export declare function captureError(error: Error | string, options?: Parameters<typeof errorAlertService.captureError>[1]): Promise<ErrorAlert>;
export {};
//# sourceMappingURL=ErrorAlertService.d.ts.map