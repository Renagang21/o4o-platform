import { Request, Response } from 'express';
import type { User } from '../entities/User.js';
import type {
  AuthTokens,
  AccessTokenPayload,
} from '../types/auth.js';
import type {
  AuthProvider,
  UnifiedLoginRequest,
  UnifiedLoginResponse,
  ServiceUserLoginRequest,
  ServiceUserLoginResponse,
  GuestTokenIssueRequest,
  GuestTokenIssueResponse,
  GuestUpgradeRequest,
  GuestUpgradeResponse,
} from '../types/account-linking.js';
import { AuthLoginService } from './auth/auth-login.service.js';
import { AuthTokenSessionService } from './auth/auth-token-session.service.js';
import { AuthServiceUserService } from './auth/auth-service-user.service.js';
import { AuthGuestService } from './auth/auth-guest.service.js';
import { AuthAccountInquiryService } from './auth/auth-account-inquiry.service.js';

/**
 * AuthenticationService - SSOT (Single Source of Truth) for Authentication
 *
 * ============================================================================
 * THIS IS THE ONLY AUTHORIZED AUTH SERVICE IN O4O PLATFORM
 * ============================================================================
 *
 * This service is the single source of truth for all authentication operations:
 * - Login (email + OAuth)
 * - Token generation and validation
 * - Session management
 * - Password reset
 *
 * DO NOT use:
 * - AuthService (DEPRECATED)
 * - AuthServiceV2 (DEPRECATED)
 * - Any direct JWT generation outside this service
 *
 * For user CRUD operations, use userService (modules/auth/services/user.service.ts)
 *
 * WO-O4O-AUTHENTICATION-SERVICE-SPLIT-V1:
 * All business logic has been extracted to dedicated sub-services.
 * This class delegates every call for backward compatibility with 4 external consumers.
 *
 * Sub-services:
 * - AuthLoginService          (login, email/OAuth flows)
 * - AuthTokenSessionService   (token refresh, verify, logout, cookies)
 * - AuthServiceUserService    (service user OAuth login)
 * - AuthGuestService          (guest token issuance, upgrade)
 * - AuthAccountInquiryService (provider checks, test accounts, find-id)
 *
 * @see docs/architecture/auth-ssot-declaration.md
 * @see CLAUDE.md Section 2.6
 */
export class AuthenticationService {
  private readonly loginService = new AuthLoginService();
  private readonly tokenSessionService = new AuthTokenSessionService();
  private readonly serviceUserService = new AuthServiceUserService();
  private readonly guestService = new AuthGuestService(this.serviceUserService);
  private readonly accountInquiryService = new AuthAccountInquiryService();

  // ==================== Login ====================

  async login(request: UnifiedLoginRequest): Promise<UnifiedLoginResponse> {
    return this.loginService.login(request);
  }

  // ==================== Service User ====================

  async handleServiceUserLogin(
    request: ServiceUserLoginRequest,
  ): Promise<ServiceUserLoginResponse> {
    return this.serviceUserService.handleServiceUserLogin(request);
  }

  // ==================== Guest ====================

  async issueGuestToken(request: GuestTokenIssueRequest): Promise<GuestTokenIssueResponse> {
    return this.guestService.issueGuestToken(request);
  }

  async upgradeGuestToServiceUser(request: GuestUpgradeRequest): Promise<GuestUpgradeResponse> {
    return this.guestService.upgradeGuestToServiceUser(request);
  }

  // ==================== Token / Session ====================

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    return this.tokenSessionService.refreshTokens(refreshToken);
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    return this.tokenSessionService.verifyAccessToken(token);
  }

  async logout(userId: string, sessionId?: string): Promise<void> {
    return this.tokenSessionService.logout(userId, sessionId);
  }

  async logoutAll(userId: string): Promise<void> {
    return this.tokenSessionService.logoutAll(userId);
  }

  setAuthCookies(req: Request, res: Response, tokens: AuthTokens, sessionId?: string): void {
    this.tokenSessionService.setAuthCookies(req, res, tokens, sessionId);
  }

  clearAuthCookies(req: Request, res: Response): void {
    this.tokenSessionService.clearAuthCookies(req, res);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.tokenSessionService.getUserById(userId);
  }

  // ==================== Account Inquiry ====================

  async canLogin(email: string, provider: AuthProvider): Promise<boolean> {
    return this.accountInquiryService.canLogin(email, provider);
  }

  async getAvailableProviders(email: string): Promise<AuthProvider[]> {
    return this.accountInquiryService.getAvailableProviders(email);
  }

  async getTestAccounts(): Promise<Array<{ role: string; email: string; password: string }>> {
    return this.accountInquiryService.getTestAccounts();
  }

  async sendFindIdEmail(email: string): Promise<void> {
    return this.accountInquiryService.sendFindIdEmail(email);
  }
}

// Create singleton instance
let authenticationServiceInstance: AuthenticationService | null = null;

export const getAuthenticationService = (): AuthenticationService => {
  if (!authenticationServiceInstance) {
    authenticationServiceInstance = new AuthenticationService();
  }
  return authenticationServiceInstance;
};

// Export singleton instance
export const authenticationService = getAuthenticationService();
