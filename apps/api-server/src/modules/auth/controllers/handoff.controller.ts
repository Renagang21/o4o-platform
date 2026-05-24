/**
 * Handoff Controller
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Cross-service SSO handoff via Redis-based single-use tokens.
 *
 * WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1 (2026-05-24):
 *   Identity V2 §7.2 해석 A 충족 — generateHandoff / exchangeHandoff 양쪽 모두
 *   target service 의 service_memberships.status === 'active' 검증을 수행한다.
 *   pending / rejected / suspended / withdrawn / 미가입 사용자가 Handoff 로
 *   대상 서비스 인증 토큰을 우회 획득하는 경로를 차단 (Service Join API 의
 *   pending 정책과 짝을 이루는 V2 정합 보강).
 *
 * Endpoints:
 * - POST /api/v1/auth/handoff         — Generate handoff token (requireAuth)
 * - POST /api/v1/auth/handoff/exchange — Exchange token for auth (public)
 * - GET  /api/v1/auth/services        — User's service catalog (requireAuth)
 */

import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { handoffTokenService } from '../../../services/handoff-token.service.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../entities/User.js';
import { roleAssignmentService } from '../services/role-assignment.service.js';
import * as tokenUtils from '../../../utils/token.utils.js';
import { setAuthCookies } from '../../../utils/cookie.utils.js';
import { getService, O4O_SERVICES } from '../../../config/service-catalog.js';
import logger from '../../../utils/logger.js';

export class HandoffController extends BaseController {
  /**
   * POST /api/v1/auth/handoff
   *
   * Generate a handoff token for cross-service navigation.
   * Requires authentication. The token is stored in Redis (60s TTL, single-use).
   */
  static async generateHandoff(req: Request, res: Response): Promise<any> {
    const { targetServiceKey } = req.body;
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }

    if (!targetServiceKey) {
      return BaseController.error(res, 'targetServiceKey is required', 400, 'VALIDATION_ERROR');
    }

    // Validate target service exists
    const targetService = getService(targetServiceKey);
    if (!targetService) {
      return BaseController.error(res, `Unknown service: ${targetServiceKey}`, 400, 'INVALID_SERVICE');
    }

    try {
      // WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1:
      //   target service active membership 검증 (generation 시점).
      //   미가입 / pending / rejected / suspended / withdrawn 모두 차단.
      const targetMembership: { status: string }[] = await AppDataSource.query(
        `SELECT status FROM service_memberships
           WHERE user_id = $1 AND service_key = $2`,
        [user.id, targetServiceKey],
      );

      if (targetMembership.length === 0) {
        logger.warn('[Handoff] Blocked generation — no membership on target service', {
          userId: user.id,
          targetServiceKey,
          reason: 'no_membership',
        });
        return BaseController.error(
          res,
          '대상 서비스에 가입되어 있지 않습니다.',
          403,
          'HANDOFF_TARGET_NO_MEMBERSHIP',
        );
      }

      const targetStatus = targetMembership[0].status;

      if (targetStatus === 'withdrawn') {
        logger.warn('[Handoff] Blocked generation — withdrawn membership on target service', {
          userId: user.id,
          targetServiceKey,
          membershipStatus: targetStatus,
          reason: 'withdrawn',
        });
        return BaseController.error(
          res,
          '탈퇴한 서비스는 Handoff 로 접근할 수 없습니다.',
          403,
          'HANDOFF_TARGET_WITHDRAWN',
        );
      }

      if (targetStatus !== 'active') {
        logger.warn('[Handoff] Blocked generation — non-active membership on target service', {
          userId: user.id,
          targetServiceKey,
          membershipStatus: targetStatus,
          reason: 'not_active',
        });
        return BaseController.error(
          res,
          '대상 서비스 가입이 아직 승인되지 않았습니다.',
          403,
          'HANDOFF_TARGET_NOT_ACTIVE',
        );
      }

      // Detect source service from request origin
      const origin = req.get('origin') || '';
      let sourceServiceKey = 'unknown';
      for (const svc of O4O_SERVICES) {
        if (origin.includes(svc.domain)) {
          sourceServiceKey = svc.key;
          break;
        }
      }

      const handoffToken = await handoffTokenService.generateToken(
        user.id,
        sourceServiceKey,
        targetServiceKey,
      );

      const targetUrl = `https://${targetService.domain}/handoff?token=${handoffToken}`;

      return BaseController.ok(res, {
        handoffToken,
        targetUrl,
        targetService: {
          key: targetService.key,
          name: targetService.name,
          domain: targetService.domain,
        },
      });
    } catch (err: any) {
      logger.error('[Handoff] Token generation failed', err);
      return BaseController.error(res, 'Failed to generate handoff token', 500, 'HANDOFF_GENERATION_FAILED');
    }
  }

  /**
   * POST /api/v1/auth/handoff/exchange
   *
   * Exchange a handoff token for authentication tokens.
   * Public endpoint — the handoff token itself acts as authentication.
   * Sets cookies for the target domain (auto-detected from Origin header).
   * Also returns tokens in body for localStorage-strategy services.
   */
  static async exchangeHandoff(req: Request, res: Response): Promise<any> {
    const { token } = req.body;

    if (!token) {
      return BaseController.error(res, 'Handoff token is required', 400, 'VALIDATION_ERROR');
    }

    try {
      // 1. Exchange token from Redis (single-use)
      const payload = await handoffTokenService.exchangeToken(token);
      if (!payload) {
        return BaseController.error(
          res,
          'Handoff token is invalid or expired',
          401,
          'HANDOFF_TOKEN_INVALID',
        );
      }

      // 2. Load user from DB
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: payload.userId } });

      if (!user || !user.isActive) {
        return BaseController.error(res, 'User not found or inactive', 401, 'INVALID_USER');
      }

      // 3. Load fresh roles from role_assignments
      const roles = await roleAssignmentService.getRoleNames(user.id);

      // 4. Load fresh memberships from service_memberships
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      // WO-O4O-AUTH-HANDOFF-ACTIVE-MEMBERSHIP-VERIFICATION-V1:
      //   target service active membership 재검증 (exchange 시점).
      //   generation 시점에 active 였더라도 60s TTL 사이에 status 가 변경됐을 수 있으므로
      //   exchange 시점에 다시 확인 (이중 안전판).
      const targetMembership = memberships.find(
        m => m.serviceKey === payload.targetServiceKey,
      );

      if (!targetMembership) {
        logger.warn('[Handoff] Blocked exchange — no membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          reason: 'no_membership',
        });
        return BaseController.error(
          res,
          '대상 서비스에 가입되어 있지 않습니다.',
          403,
          'HANDOFF_TARGET_NO_MEMBERSHIP',
        );
      }

      if (targetMembership.status === 'withdrawn') {
        logger.warn('[Handoff] Blocked exchange — withdrawn membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          membershipStatus: targetMembership.status,
          reason: 'withdrawn',
        });
        return BaseController.error(
          res,
          '탈퇴한 서비스는 Handoff 로 접근할 수 없습니다.',
          403,
          'HANDOFF_TARGET_WITHDRAWN',
        );
      }

      if (targetMembership.status !== 'active') {
        logger.warn('[Handoff] Blocked exchange — non-active membership on target service', {
          userId: user.id,
          targetServiceKey: payload.targetServiceKey,
          membershipStatus: targetMembership.status,
          reason: 'not_active',
        });
        return BaseController.error(
          res,
          '대상 서비스 가입이 아직 승인되지 않았습니다.',
          403,
          'HANDOFF_TARGET_NOT_ACTIVE',
        );
      }

      // 5. Generate auth tokens
      const tokens = tokenUtils.generateTokens(user, roles, 'neture.co.kr', memberships);

      // 6. Set cookies (domain auto-detected from Origin header via getCookieDomainFromOrigin)
      setAuthCookies(req, res, tokens);

      // 7. Always include tokens in body (for localStorage-strategy services)
      return BaseController.ok(res, {
        message: 'Handoff successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name || user.firstName || '',
          roles,
          memberships,
        },
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
        },
        targetServiceKey: payload.targetServiceKey,
      });
    } catch (err: any) {
      logger.error('[Handoff] Token exchange failed', err);
      return BaseController.error(res, 'Handoff exchange failed', 500, 'HANDOFF_EXCHANGE_FAILED');
    }
  }

  /**
   * POST /api/v1/auth/services/:serviceKey/join
   *
   * Join or reactivate a service membership.
   * Requires authentication.
   */
  static async joinService(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;
    const { serviceKey } = req.params;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }

    // Validate service exists
    const service = getService(serviceKey);
    if (!service) {
      return BaseController.error(res, `Unknown service: ${serviceKey}`, 400, 'INVALID_SERVICE');
    }

    if (!service.joinEnabled) {
      return BaseController.error(res, 'This service does not accept new memberships', 400, 'JOIN_DISABLED');
    }

    try {
      // Check existing membership
      const existing: { id: string; status: string }[] = await AppDataSource.query(
        `SELECT id, status FROM service_memberships WHERE user_id = $1 AND service_key = $2`,
        [user.id, serviceKey],
      );

      // WO-O4O-AUTH-SERVICE-JOIN-API-DEPRECATION-V1 (2026-05-23):
      //   Option β — instant active 우회 제거. 모든 신규/재신청은 pending 으로 생성.
      //   운영자 승인을 거쳐야 active 가 된다 (Register 흐름과 정합).
      //   IR-O4O-SERVICE-SWITCHER-DEPRECATION-AUDIT-V1 §3.3 의 service_memberships
      //   생성 경로 비대칭 (Switcher Join 만 instant active) 해소.
      if (existing.length > 0) {
        const current = existing[0];

        // WO-O4O-HANDOFF-INACTIVE-MEMBERSHIP-BLOCK-V1 + WO-O4O-SM-WITHDRAWN-STATUS-CANONICAL-ALIGNMENT-V1:
        //   withdrawn 은 보안 정책 — 차단 유지.
        if (current.status === 'withdrawn') {
          logger.warn('[Handoff] Blocked reactivation of withdrawn membership', {
            userId: user.id,
            serviceKey,
          });
          return BaseController.error(
            res,
            '이 서비스는 탈퇴 처리된 상태입니다. 다시 이용하려면 가입 신청을 진행하세요.',
            403,
            'MEMBERSHIP_WITHDRAWN',
          );
        }

        if (current.status === 'active') {
          // 이미 active — 변경 없음, alreadyActive 알림만 반환
          return BaseController.ok(res, {
            serviceKey,
            serviceName: service.name,
            status: 'active',
            alreadyActive: true,
            message: '이미 가입된 서비스입니다.',
          });
        }

        if (current.status === 'pending') {
          // 이미 신청 중 — 변경 없음
          return BaseController.ok(res, {
            serviceKey,
            serviceName: service.name,
            status: 'pending',
            pendingApproval: true,
            requestSubmitted: false,
            message: '가입 신청이 이미 접수되어 운영자 승인 대기 중입니다.',
          });
        }

        // rejected / suspended → pending 으로 재신청 (active 직접 전환 금지)
        await AppDataSource.query(
          `UPDATE service_memberships SET status = 'pending', updated_at = NOW() WHERE id = $1`,
          [current.id],
        );
      } else {
        // 신규 → pending 으로 가입 신청 (instant active 금지)
        await AppDataSource.query(
          `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
           VALUES ($1, $2, 'pending', NOW(), NOW())`,
          [user.id, serviceKey],
        );
      }

      return BaseController.ok(res, {
        serviceKey,
        serviceName: service.name,
        status: 'pending',
        pendingApproval: true,
        requestSubmitted: true,
        message: '가입 신청이 접수되었습니다. 운영자 승인 후 이용 가능합니다.',
      });
    } catch (err: any) {
      logger.error('[Handoff] Service join failed', err);
      return BaseController.error(res, 'Failed to join service', 500, 'SERVICE_JOIN_FAILED');
    }
  }

  /**
   * GET /api/v1/auth/services
   *
   * Returns the service catalog with user's membership status.
   * Requires authentication.
   */
  static async getServices(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(res, 'Authentication required', 401, 'AUTH_REQUIRED');
    }

    try {
      // Load user's service memberships
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      const membershipMap = new Map(
        memberships.map(m => [m.serviceKey, m.status]),
      );

      // Build service catalog with membership status
      const services = O4O_SERVICES.map(svc => ({
        key: svc.key,
        name: svc.name,
        domain: svc.domain,
        description: svc.description,
        joinEnabled: svc.joinEnabled,
        membership: membershipMap.has(svc.key)
          ? { status: membershipMap.get(svc.key)! }
          : null,
      }));

      return BaseController.ok(res, { services });
    } catch (err: any) {
      logger.error('[Handoff] Service catalog query failed', err);
      return BaseController.error(res, 'Failed to load services', 500, 'SERVICE_CATALOG_ERROR');
    }
  }
}
