import { User } from './User';
import { AuthProvider } from '../types/account-linking';
export declare class LinkedAccount {
    id: string;
    userId: string;
    user: User;
    provider: AuthProvider;
    providerId?: string;
    email: string;
    displayName?: string;
    profileImage?: string;
    isVerified: boolean;
    isPrimary: boolean;
    providerData?: Record<string, any>;
    lastUsedAt?: Date;
    linkedAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=LinkedAccount.d.ts.map