import Mail from 'nodemailer/lib/mailer';
interface EmailOptions {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    template?: string;
    templateData?: Record<string, any>;
    attachments?: Mail.Attachment[];
}
export declare class EmailService {
    private static instance;
    private transporter;
    private config;
    private templatesPath;
    private isEnabled;
    private constructor();
    static getInstance(): EmailService;
    private initializeTransporter;
    /**
     * Send email with options
     */
    sendEmail(options: EmailOptions): Promise<boolean>;
    /**
     * Send password reset email
     */
    sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean>;
    /**
     * Send email verification
     */
    sendEmailVerification(email: string, verificationToken: string): Promise<boolean>;
    /**
     * Send security alert email
     */
    sendSecurityAlert(email: string, alertData: {
        type: 'suspicious_login_attempts' | 'account_locked' | 'password_changed' | 'new_device_login';
        details: {
            message: string;
            recommendation?: string;
            ipAddress?: string;
            deviceInfo?: string;
            timestamp?: Date;
        };
    }): Promise<boolean>;
    /**
     * Send welcome email
     */
    sendWelcomeEmail(email: string, name: string): Promise<boolean>;
    /**
     * Send account approval notification
     */
    sendAccountApprovalEmail(email: string, name: string, approved: boolean): Promise<boolean>;
    /**
     * Send order confirmation email
     */
    sendOrderConfirmation(email: string, orderData: any): Promise<boolean>;
    /**
     * Load and process email template
     */
    private loadTemplate;
    /**
     * Generate simple template as fallback
     */
    private generateSimpleTemplate;
    /**
     * Convert HTML to plain text
     */
    private htmlToText;
    /**
     * Test email configuration
     */
    testConnection(): Promise<boolean>;
    /**
     * Check if email service is available
     */
    isServiceAvailable(): boolean;
    /**
     * Get service status
     */
    getServiceStatus(): {
        enabled: boolean;
        configured: boolean;
        connected: boolean;
    };
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map