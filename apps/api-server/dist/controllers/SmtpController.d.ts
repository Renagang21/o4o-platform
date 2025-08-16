import { Request, Response } from 'express';
export declare class SmtpController {
    private smtpRepository;
    private emailLogRepository;
    constructor();
    /**
     * Get SMTP settings
     */
    getSettings: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Update SMTP settings
     */
    updateSettings: (req: Request, res: Response) => Promise<void>;
    /**
     * Test SMTP connection and send test email
     */
    testConnection: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Get email logs
     */
    getEmailLogs: (req: Request, res: Response) => Promise<void>;
    /**
     * Resend failed email
     */
    resendEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
    /**
     * Get email statistics
     */
    getEmailStats: (req: Request, res: Response) => Promise<void>;
}
export declare const smtpController: SmtpController;
//# sourceMappingURL=SmtpController.d.ts.map