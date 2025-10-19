import { AuthProvider, LinkAccountResponse, UnlinkAccountRequest, ProfileMergeOptions, MergedProfile, AccountMergeRequest, AccountMergeResult, SecurityVerification } from '../types/account-linking';
export declare class AccountLinkingService {
    /**
     * Link an OAuth account to existing user
     */
    static linkOAuthAccount(userId: string, provider: AuthProvider, providerData: {
        providerId: string;
        email: string;
        displayName?: string;
        profileImage?: string;
    }): Promise<LinkAccountResponse>;
    /**
     * Link email account to existing OAuth user
     */
    static linkEmailAccount(userId: string, email: string, password: string): Promise<LinkAccountResponse>;
    /**
     * Verify email linking
     */
    static verifyEmailLinking(token: string): Promise<LinkAccountResponse>;
    /**
     * Unlink account
     */
    static unlinkAccount(userId: string, request: UnlinkAccountRequest, verification: SecurityVerification): Promise<LinkAccountResponse>;
    /**
     * Get merged profile
     */
    static getMergedProfile(userId: string, options?: ProfileMergeOptions): Promise<MergedProfile | null>;
    /**
     * Merge two user accounts
     */
    static mergeAccounts(request: AccountMergeRequest): Promise<AccountMergeResult>;
    /**
     * Check if account can be linked
     */
    static canLinkAccount(userId: string, provider: AuthProvider, providerId?: string): Promise<boolean>;
}
//# sourceMappingURL=account-linking.service.d.ts.map