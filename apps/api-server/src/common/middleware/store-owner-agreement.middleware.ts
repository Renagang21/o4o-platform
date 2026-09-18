/**
 * Store Owner Agreement Gate — Store Workspace 전용 별도 계약 게이트.
 *
 * WO-O4O-STORE-OWNER-AGREEMENT-PUBLISH-PREREQUISITES-V1 §3.
 * published 계약이 없으면 no-op. 있으면 active store_owner 서비스별 explicit acceptance 를 요구한다.
 * DB 판정 실패는 법적 게이트 우회가 되지 않도록 503 fail-closed 로 처리한다.
 */
import type { DataSource } from 'typeorm';
import type { Request, Response, NextFunction } from 'express';
import { policyAcceptanceService } from '../../modules/policy-acceptance/policy-acceptance.service.js';
import {
  STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
  STORE_OWNER_AGREEMENT_REQUIRED_CODE,
  STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE,
  STORE_OWNER_AGREEMENT_REQUIRED_STATUS,
  STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE,
  canonicalStoreOwnerAgreementServiceKey,
  type StoreOwnerAgreementServiceKey,
} from '../auth/store-owner-agreement.policy.js';
import logger from '../../utils/logger.js';

async function resolveActiveStoreOwnerServiceKeys(dataSource: DataSource, userId: string): Promise<StoreOwnerAgreementServiceKey[]> {
  const entries = Object.entries(STORE_OWNER_AGREEMENT_ROLE_BY_SERVICE) as [StoreOwnerAgreementServiceKey, string][];
  const rows = await dataSource.query(
    `SELECT DISTINCT sm.service_key
       FROM service_memberships sm
       JOIN role_assignments ra ON ra.user_id = sm.user_id AND ra.is_active = true
      WHERE sm.user_id = $1 AND sm.status = 'active'
        AND (sm.service_key, ra.role) IN (
          ('kpa-society','kpa:store_owner'),
          ('k-cosmetics','cosmetics:store_owner'),
          ('pharmacy-hub','pharmacy-hub:store_owner')
        )`,
    [userId],
  ) as { service_key: string }[];
  const allowed = new Set(entries.map(([key]) => key));
  return rows.map((r) => r.service_key).filter((key): key is StoreOwnerAgreementServiceKey => allowed.has(key as StoreOwnerAgreementServiceKey));
}

export async function enforceStoreOwnerAgreement(
  req: Request,
  res: Response,
  dataSource: DataSource,
  rolePrefixOrServiceKey?: string,
): Promise<boolean> {
  const userId = (req as any).user?.id as string | undefined;
  if (!userId) return false;

  try {
    const explicit = rolePrefixOrServiceKey
      ? canonicalStoreOwnerAgreementServiceKey(rolePrefixOrServiceKey)
      : null;
    const serviceKeys = explicit ? [explicit] : await resolveActiveStoreOwnerServiceKeys(dataSource, userId);
    if (serviceKeys.length === 0) return false;

    const pending = await policyAcceptanceService.getPendingRequiredAgreements(
      userId,
      STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
      serviceKeys,
    );
    if (pending.length === 0) return false;

    res.status(STORE_OWNER_AGREEMENT_REQUIRED_STATUS).json({
      success: false,
      error: STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE,
      code: STORE_OWNER_AGREEMENT_REQUIRED_CODE,
      pendingPolicyAcceptances: pending,
    });
    return true;
  } catch (error) {
    logger.error('[storeOwnerAgreement] agreement check failed', {
      userId,
      service: rolePrefixOrServiceKey ?? 'service-neutral',
      error: error instanceof Error ? error.message : String(error),
    });
    res.status(503).json({
      success: false,
      error: '매장 경영자 계약 확인을 완료할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      code: 'STORE_OWNER_AGREEMENT_CHECK_FAILED',
    });
    return true;
  }
}

export function createRequireStoreOwnerAgreement(
  dataSource: DataSource,
  rolePrefixOrServiceKey?: string,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (await enforceStoreOwnerAgreement(req, res, dataSource, rolePrefixOrServiceKey)) return;
    next();
  };
}
