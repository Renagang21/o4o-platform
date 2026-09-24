import { Request, Response } from 'express';
import type { User } from '../entities/User.js';
import type {
  AuthTokens,
  AccessTokenPayload,
} from '../types/auth.js';
import type {
  GuestTokenIssueRequest,
  GuestTokenIssueResponse,
} from '../types/account-linking.js';
import { AuthTokenSessionService } from './auth/auth-token-session.service.js';
import { AuthGuestService } from './auth/auth-guest.service.js';

/**
 * AuthenticationService - SSOT (Single Source of Truth) for Authentication
 *
 * ============================================================================
 * THIS IS THE ONLY AUTHORIZED AUTH SERVICE IN O4O PLATFORM
 * ============================================================================
 *
 * This service is the single source of truth for all authentication operations:
 * - Token generation and validation
 * - Session management
 * - Guest token issuance
 *
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 자체는 Google 경로(GoogleAuthController)가 수행하고, 이 서비스는
 *   그 뒤의 토큰·세션 축만 담당한다. password / password reset 축은 존재하지 않는다.
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
 * - AuthTokenSessionService   (token refresh, verify, logout, cookies)
 * - AuthGuestService          (guest token issuance)
 *
 * @see docs/architecture/auth-ssot-declaration.md
 * @see CLAUDE.md Section 2.6
 */
export class AuthenticationService {
  private readonly tokenSessionService = new AuthTokenSessionService();
  private readonly guestService = new AuthGuestService();

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   email+password 로그인(AuthLoginService)은 은퇴했다.
  //   로그인 진입점은 `POST /auth/google/login` → GoogleAuthController 하나다.

  // ==================== Guest ====================

  async issueGuestToken(request: GuestTokenIssueRequest): Promise<GuestTokenIssueResponse> {
    return this.guestService.issueGuestToken(request);
  }

  // ==================== Token / Session ====================

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    return this.tokenSessionService.refreshTokens(refreshToken);
  }

  verifyAccessToken(token: string): AccessTokenPayload | null {
    return this.tokenSessionService.verifyAccessToken(token);
  }

  async logout(userId: string): Promise<void> {
    return this.tokenSessionService.logout(userId);
  }

  async logoutAll(userId: string): Promise<void> {
    return this.tokenSessionService.logoutAll(userId);
  }

  setAuthCookies(req: Request, res: Response, tokens: AuthTokens): void {
    this.tokenSessionService.setAuthCookies(req, res, tokens);
  }

  clearAuthCookies(req: Request, res: Response): void {
    this.tokenSessionService.clearAuthCookies(req, res);
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.tokenSessionService.getUserById(userId);
  }

  // WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
  //   Account Inquiry(canLogin · getAvailableProviders · sendFindIdEmail)는 은퇴했다.
  //   email 로 계정을 조회해 인증 가능 여부를 답하던 경로이며, 소비처가 이미 0 이었다.
  //   Identity Key 는 Google sub 이므로 email 질의는 인증 판정이 될 수 없다.
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
