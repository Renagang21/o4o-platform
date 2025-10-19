import { User } from './User';
import { AuthProvider, LinkingStatus } from '../types/account-linking';
export declare class LinkingSession {
    id: string;
    userId: string;
    user: User;
    provider: AuthProvider;
    status: LinkingStatus;
    verificationToken?: string;
    expiresAt: Date;
    metadata?: Record<string, any>;
    createdAt: Date;
}
//# sourceMappingURL=LinkingSession.d.ts.map