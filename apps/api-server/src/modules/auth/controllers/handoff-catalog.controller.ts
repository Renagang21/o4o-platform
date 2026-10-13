import {
  getNetureMainMembershipStatus,
  NETURE_MAIN_MEMBERSHIP_MESSAGES,
} from '../../neture/services/neture-main-membership.js';
import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import type { AuthRequest } from '../../../common/middleware/auth.middleware.js';
import { AppDataSource } from '../../../database/connection.js';
import {
  REPRESENTATIVE_ENTRY_SERVICE_KEY,
  getService,
  O4O_SERVICES,
} from '../../../config/service-catalog.js';
import logger from '../../../utils/logger.js';

export class HandoffCatalogController extends BaseController {
  static async joinService(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;
    const { serviceKey } = req.params;

    if (!user) {
      return BaseController.error(
        res,
        'Authentication required',
        401,
        'AUTH_REQUIRED',
      );
    }

    // Validate service exists
    const service = getService(serviceKey);
    if (!service) {
      return BaseController.error(
        res,
        `Unknown service: ${serviceKey}`,
        400,
        'INVALID_SERVICE',
      );
    }

    if (!service.joinEnabled) {
      return BaseController.error(
        res,
        'This service does not accept new memberships',
        400,
        'JOIN_DISABLED',
      );
    }

    try {
      const mainStatus = await getNetureMainMembershipStatus(
        AppDataSource,
        user.id,
      );
      if (serviceKey === REPRESENTATIVE_ENTRY_SERVICE_KEY) {
        return BaseController.ok(res, {
          serviceKey,
          serviceName: service.name,
          status: mainStatus,
          pendingApproval: false,
          requestSubmitted: false,
          message:
            mainStatus === 'active'
              ? '이메일 확인이 완료되었습니다.'
              : NETURE_MAIN_MEMBERSHIP_MESSAGES[mainStatus],
        });
      }
      if (mainStatus !== 'active') {
        return BaseController.error(
          res,
          NETURE_MAIN_MEMBERSHIP_MESSAGES[mainStatus],
          403,
          'NETURE_MEMBERSHIP_REQUIRED',
        );
      }
      // Check existing membership
      const existing: { id: string; status: string }[] =
        await AppDataSource.query(
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
          logger.warn(
            '[Handoff] Blocked reactivation of withdrawn membership',
            {
              userId: user.id,
              serviceKey,
            },
          );
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
        // Neture 재신청은 legacy role(예: 과거 가입 시 'supplier')을 들고 가지 않는다 — Neture 가입은
        // 메인 이용 자격만이며 연결 서비스 역할은 각 서비스 승인으로만 생긴다(CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 B2).
        if (serviceKey === 'neture') {
          await AppDataSource.query(
            `UPDATE service_memberships SET status = 'pending', role = 'member', updated_at = NOW() WHERE id = $1`,
            [current.id],
          );
        } else {
          await AppDataSource.query(
            `UPDATE service_memberships SET status = 'pending', updated_at = NOW() WHERE id = $1`,
            [current.id],
          );
        }
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
      return BaseController.error(
        res,
        'Failed to join service',
        500,
        'SERVICE_JOIN_FAILED',
      );
    }
  }

  static async getServices(req: Request, res: Response): Promise<any> {
    const user = (req as AuthRequest).user;

    if (!user) {
      return BaseController.error(
        res,
        'Authentication required',
        401,
        'AUTH_REQUIRED',
      );
    }

    try {
      // Load user's service memberships
      const memberships: { serviceKey: string; status: string }[] =
        await AppDataSource.query(
          `SELECT service_key AS "serviceKey", status FROM service_memberships WHERE user_id = $1`,
          [user.id],
        );

      const mainStatus = await getNetureMainMembershipStatus(
        AppDataSource,
        user.id,
      );
      const membershipMap = new Map(
        memberships.map((m) => [m.serviceKey, m.status]),
      );

      // Build service catalog with membership status
      // WO-O4O-NETURE-UNIFIED-ENTRY-UI-PHASE1-V1: nameKo · basePath 추가 (additive).
      //   대표 홈이 서비스 한글명과 실제 진입 URL(basePath 포함)을 catalog 에서 얻는다.
      const services = O4O_SERVICES.map((svc) => ({
        key: svc.key,
        name: svc.name,
        nameKo: svc.nameKo ?? svc.name,
        domain: svc.domain,
        basePath: svc.basePath ?? '',
        description: svc.description,
        joinEnabled: svc.joinEnabled,
        membership:
          svc.key === REPRESENTATIVE_ENTRY_SERVICE_KEY
            ? { status: mainStatus }
            : membershipMap.has(svc.key)
              ? { status: membershipMap.get(svc.key)! }
              : null,
      }));

      return BaseController.ok(res, { services });
    } catch (err: any) {
      logger.error('[Handoff] Service catalog query failed', err);
      return BaseController.error(
        res,
        'Failed to load services',
        500,
        'SERVICE_CATALOG_ERROR',
      );
    }
  }
}
