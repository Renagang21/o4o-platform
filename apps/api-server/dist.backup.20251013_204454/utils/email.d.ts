interface EmailOptions {
    to: string | string[];
    subject: string;
    text?: string;
    html?: string;
    from?: string;
    replyTo?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
}
export declare function sendEmail(options: EmailOptions): Promise<void>;
export declare function verifyEmailConnection(): Promise<boolean>;
export {};
//# sourceMappingURL=email.d.ts.map