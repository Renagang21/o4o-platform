import { FormSubmission } from './FormSubmission';
import { User } from './User';
import type { FormField, FormSettings, FormNotification, FormConfirmation, FormStyling } from '../types';
export declare class Form {
    id: string;
    name: string;
    title: string;
    description: string;
    fields: FormField[];
    settings: FormSettings;
    notifications: FormNotification[];
    confirmations: FormConfirmation[];
    styling: FormStyling;
    status: 'active' | 'inactive' | 'draft';
    createdBy: string;
    creator: User;
    createdAt: Date;
    updatedAt: Date;
    submissionCount: number;
    lastSubmission: Date;
    submissions: FormSubmission[];
    fieldIndex: Record<string, number>;
    shortcode: string;
    metadata: Record<string, any>;
}
//# sourceMappingURL=Form.d.ts.map