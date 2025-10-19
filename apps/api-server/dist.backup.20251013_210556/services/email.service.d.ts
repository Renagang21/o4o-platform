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
    sendUserApprovalEmail(to: string, data: {
        userName: string;
        userEmail: string;
        userRole: string;
        approvalDate: string;
        notes?: string;
    }): Promise<void>;
    sendUserRejectionEmail(to: string, data: {
        userName: string;
        rejectReason: string;
    }): Promise<void>;
    sendAccountSuspensionEmail(to: string, data: {
        userName: string;
        suspendReason: string;
        suspendedDate: string;
        suspendDuration?: string;
    }): Promise<void>;
    sendAccountReactivationEmail(to: string, data: {
        userName: string;
        reactivatedDate: string;
        notes?: string;
    }): Promise<void>;
    sendCommissionCalculatedEmail(to: string, data: {
        vendorName: string;
        orderDate: string;
        orderId: string;
        orderAmount: string;
        commissionRate: number;
        commissionAmount: string;
        settlementDate: string;
        pendingAmount: string;
        settlementStatus: string;
    }): Promise<void>;
    sendSettlementRequestEmail(to: string, data: {
        recipientName: string;
        requestId: string;
        requestDate: string;
        settlementPeriod: string;
        transactionCount: number;
        settlementAmount: string;
        bankName: string;
        accountNumber: string;
        accountHolder: string;
        reviewDeadline: string;
        expectedPaymentDate: string;
    }): Promise<void>;
    isServiceAvailable(): boolean;
    getServiceStatus(): {
        enabled: boolean;
        initialized: boolean;
        available: boolean;
    };
}
export declare const emailService: EmailService;
//# sourceMappingURL=email.service.d.ts.map