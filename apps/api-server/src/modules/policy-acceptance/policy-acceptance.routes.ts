/**
 * Policy Acceptance Routes — 통합 이용약관 pending 조회 · 승낙 제출
 *
 * WO-O4O-INTEGRATED-TERMS-ACCEPTANCE-AND-SIGNUP-ALIGNMENT-V1 §16 · §20
 *
 * mount: /api/v1/auth/policy-acceptances (register-routes.ts — Core auth.routes.ts 는 수정하지 않는다)
 *   GET  /   → { pending: PendingPolicyAcceptance[] }             (본인 · allowlist 경로)
 *   POST /   → { serviceKey, policyDocumentId, version? }         (본인 · allowlist 경로)
 *              → { accepted: { serviceKey, policyDocumentId, version, created }, pending: [...] }
 *
 * 검증(서버 재확인): 현재 사용자 · 해당 serviceKey membership(active|pending) 보유 · 문서가 terms ·
 * published · 그 서비스의 현재 적용 약관 · (버전 일치). 클라이언트가 임의 문서를 승낙시킬 수 없다.
 */

import { Router, type IRouter, type Request, type Response } from 'express';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { AppDataSource } from '../../database/connection.js';
import { REQUIRED_MEMBERSHIP_STATUSES, REQUIRED_POLICY_DOCUMENT_TYPE } from '../../common/auth/terms-acceptance.policy.js';
import {
  PolicyAcceptanceError,
  STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
  policyAcceptanceService,
  type MandatoryAgreementDocumentType,
} from './policy-acceptance.service.js';
import logger from '../../utils/logger.js';

const router: IRouter = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
    const requestedType = typeof req.query.documentType === 'string' ? req.query.documentType : '';
    const requestedService = typeof req.query.serviceKey === 'string' ? req.query.serviceKey.trim() : '';
    const pending = requestedType === STORE_OWNER_AGREEMENT_DOCUMENT_TYPE
      ? await policyAcceptanceService.getPendingStoreOwnerAgreementsForUser(userId, requestedService || undefined)
      : await policyAcceptanceService.getPendingForUser(userId);
    return res.json({ success: true, data: { pending } });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const serviceKey = typeof body.serviceKey === 'string' ? body.serviceKey.trim() : '';
    const policyDocumentId = typeof body.policyDocumentId === 'string' ? body.policyDocumentId.trim() : '';
    const version = body.version === undefined || body.version === null ? undefined : Number(body.version);
    const documentType = (typeof body.documentType === 'string' && body.documentType.trim()
      ? body.documentType.trim()
      : REQUIRED_POLICY_DOCUMENT_TYPE) as MandatoryAgreementDocumentType;
    if (!serviceKey || !policyDocumentId || (version !== undefined && !Number.isInteger(version))) {
      return res.status(400).json({
        success: false,
        error: 'serviceKey 와 policyDocumentId 가 필요합니다.',
        code: 'VALIDATION_ERROR',
      });
    }

    try {
      // WO §20: 활성/허용된 service membership 보유자만 그 서비스 약관을 승낙할 수 있다.
      const rows = (await AppDataSource.query(
        `SELECT status FROM service_memberships WHERE user_id = $1 AND service_key = $2 LIMIT 1`,
        [userId, serviceKey],
      )) as { status: string }[];
      const status = rows[0]?.status;
      const isStoreAgreement = documentType === STORE_OWNER_AGREEMENT_DOCUMENT_TYPE;
      const membershipAllowed = isStoreAgreement ? status === 'active' : !!status && REQUIRED_MEMBERSHIP_STATUSES.has(status);
      if (!membershipAllowed) {
        return res.status(403).json({
          success: false,
          error: '해당 서비스의 유효한 회원자격이 필요합니다.',
          code: status ? 'MEMBERSHIP_NOT_ACTIVE' : 'MEMBERSHIP_NOT_FOUND',
        });
      }
      if (isStoreAgreement) {
        const roleByService: Record<string, string> = {
          'kpa-society': 'kpa:store_owner',
          'k-cosmetics': 'cosmetics:store_owner',
          'pharmacy-hub': 'pharmacy-hub:store_owner',
        };
        const requiredRole = roleByService[serviceKey];
        if (!requiredRole) {
          return res.status(400).json({ success: false, error: '매장 경영자 계약 대상 서비스가 아닙니다.', code: 'POLICY_SERVICE_NOT_ALLOWED' });
        }
        const roleRows = await AppDataSource.query(
          `SELECT 1 FROM role_assignments WHERE user_id = $1 AND role = $2 AND is_active = true LIMIT 1`,
          [userId, requiredRole],
        );
        if (!roleRows.length) {
          return res.status(403).json({ success: false, error: '매장 경영자만 계약에 동의할 수 있습니다.', code: 'STORE_OWNER_REQUIRED' });
        }
      }

      const result = await policyAcceptanceService.recordAcceptance({ userId, serviceKey, policyDocumentId, version, documentType });
      const pending = isStoreAgreement
        ? await policyAcceptanceService.getPendingStoreOwnerAgreementsForUser(userId, serviceKey)
        : await policyAcceptanceService.getPendingForUser(userId);
      logger.info('[PolicyAcceptance] agreement accepted', {
        userId,
        serviceKey,
        policyDocumentId: result.document.id,
        version: result.document.version,
        created: result.created,
      });
      return res.json({
        success: true,
        data: {
          accepted: {
            serviceKey: result.document.serviceKey,
            documentType: result.document.documentType,
            policyDocumentId: result.document.id,
            version: result.document.version,
            created: result.created,
          },
          pending,
        },
      });
    } catch (error) {
      if (error instanceof PolicyAcceptanceError) {
        return res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
      }
      logger.error('[PolicyAcceptance] accept failed', {
        userId,
        serviceKey,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(500).json({ success: false, error: '약관 승낙 처리에 실패했습니다.', code: 'INTERNAL_ERROR' });
    }
  }),
);

export default router;
