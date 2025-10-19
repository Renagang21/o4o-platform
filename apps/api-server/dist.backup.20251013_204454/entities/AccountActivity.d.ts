import { User } from './User';
import { AuthProvider } from '../types/account-linking';
export declare class AccountActivity {
    id: string;
    userId: string;
    user: Promise<User>;
    action: 'linked' | 'unlinked' | 'merged' | 'login' | 'failed_link';
    provider: AuthProvider;
    ipAddress: string;
    userAgent: string;
    metadata?: Record<string, any>;
    createdAt: Date;
}
//# sourceMappingURL=AccountActivity.d.ts.map