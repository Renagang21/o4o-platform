import { EmailOptions } from '../types/email-auth';
export declare class EmailService {
    private transporter;
    private isInitialized;
    private isEnabled;
    constructor();
    private createTransport;
    initialize(): Promise<void>;
    sendEmail(options: EmailOptions): Promise<{
        success: boolean;
        error?: string;
    }>;
    private renderTemplate;
    private verificationEmailTemplate;
    private passwordResetTemplate;
    private welcomeEmailTemplate;
    private accountLockedTemplate;
    private htmlToText;
    isServiceAvailable(): boolean;
    getServiceStatus(): {
        enabled: boolean;
        initialized: boolean;
        available: boolean;
    };
}
export declare const emailService: EmailService;
//# sourceMappingURL=email.service.d.ts.map