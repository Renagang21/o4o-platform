import { User } from './User';
export type ApprovalAction = 'approved' | 'rejected' | 'status_changed' | 'pending';
export declare class ApprovalLog {
    id: string;
    user_id: string;
    admin_id: string;
    action: ApprovalAction;
    previous_status: string;
    new_status: string;
    notes: string;
    metadata: {
        ip_address?: string;
        user_agent?: string;
        [key: string]: any;
    };
    created_at: Date;
    updated_at?: Date;
    user: User;
    admin: User;
}
//# sourceMappingURL=ApprovalLog.d.ts.map