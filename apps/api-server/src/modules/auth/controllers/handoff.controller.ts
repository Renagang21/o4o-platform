/**
 * Handoff Controller
 *
 * WO-O4O-SERVICE-HANDOFF-ARCHITECTURE-V1
 * Cross-service SSO handoff via Redis-based single-use tokens.
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

      if (existing.length > 0) {
        // Reactivate if inactive
        if (existing[0].status !== 'active') {
          await AppDataSource.query(
            `UPDATE service_memberships SET status = 'active', updated_at = NOW() WHERE id = $1`,
            [existing[0].id],
          );
        }
      } else {
        // Create new membership
        await AppDataSource.query(
          `INSERT INTO service_memberships (user_id, service_key, status, created_at, updated_at)
           VALUES ($1, $2, 'active', NOW(), NOW())`,
          [user.id, serviceKey],
        );
      }

      return BaseController.ok(res, {
        serviceKey,
        serviceName: service.name,
        status: 'active',
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
