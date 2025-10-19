import { Form } from './Form';
import { User } from './User';
export declare class FormSubmission {
    id: string;
    formId: string;
    form: Form;
    formName: string;
    data: Record<string, any>;
    userId: string;
    user: User;
    userEmail: string;
    userName: string;
    ipAddress: string;
    userAgent: string;
    status: 'pending' | 'approved' | 'spam' | 'trash';
    submittedAt: Date;
    updatedAt: Date;
    referrer: string;
    source: string;
    notes: string;
    starred: boolean;
    read: boolean;
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    paymentAmount: number;
    paymentId: string;
    files: {
        fieldId: string;
        filename: string;
        url: string;
        size: number;
        mimeType: string;
    }[];
    completionTime: number;
    fieldTimings: Record<string, number>;
    geoLocation: {
        country?: string;
        region?: string;
        city?: string;
        lat?: number;
        lng?: number;
    };
    deviceType: string;
    browser: string;
    os: string;
    spamScore: number;
    spamReasons: string[];
    reviewedBy: string;
    reviewedAt: Date;
    adminNotes: {
        userId: string;
        note: string;
        timestamp: Date;
    }[];
}
//# sourceMappingURL=FormSubmission.d.ts.map