import { AuthProvider, UnifiedLoginRequest, UnifiedLoginResponse } from '../types/account-linking';
export declare class UnifiedAuthService {
    private authService;
    constructor();
    /**
     * Unified login method that handles both email and OAuth
     */
    login(request: UnifiedLoginRequest): Promise<UnifiedLoginResponse>;
    /**
     * Handle email/password login
     */
    private handleEmailLogin;
    /**
     * Handle OAuth login
     */
    private handleOAuthLogin;
    /**
     * Check if user can login with provider
     */
    canLogin(email: string, provider: AuthProvider): Promise<boolean>;
    /**
     * Get available login methods for email
     */
    getAvailableProviders(email: string): Promise<AuthProvider[]>;
}
//# sourceMappingURL=unified-auth.service.d.ts.map