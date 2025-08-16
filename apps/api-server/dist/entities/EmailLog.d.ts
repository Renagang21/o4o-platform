export declare class EmailLog {
    id: number;
    recipient: string;
    sender?: string;
    subject: string;
    body?: string;
    htmlBody?: string;
    status: string;
    messageId?: string;
    provider?: string;
    response?: any;
    error?: string;
    retryCount: number;
    sentAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    attachments?: Array<{
        filename: string;
        size: number;
        contentType: string;
    }>;
    emailType?: string;
    userId?: number;
    orderId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
//# sourceMappingURL=EmailLog.d.ts.map