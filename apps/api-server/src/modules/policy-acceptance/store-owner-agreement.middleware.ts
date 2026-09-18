/**
 * Store Owner Agreement Gate — Store Workspace 전용 계약 acceptance 경계.
 *
 * published store_owner_agreement 가 없으면 no-op. 문서가 게시된 뒤 store_owner 가 아직
 * 승낙하지 않았을 때만 428 STORE_OWNER_AGREEMENT_REQUIRED 를 반환한다.
 * 판정 오류는 terms gate 와 같은 이유로 fail-open(서비스 장애로 인증 전체를 막지 않음).
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import logger from '../../utils/logger.js';
import {
  policyAcceptanceService,
  STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
} from './policy-acceptance.service.js';

export const STORE_OWNER_AGREEMENT_REQUIRED_STATUS = 428;
export const STORE_OWNER_AGREEMENT_REQUIRED_CODE = 'STORE_OWNER_AGREEMENT_REQUIRED';
export const STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE = '매장 경영자 이용계약 동의가 필요합니다.';

export async function enforceStoreOwnerAgreement(
  req: Request,
  res: Response,
  userId: string,
  serviceKey: string,
): Promise<boolean> {
  try {
    const requirement = await policyAcceptanceService.getStoreOwnerAgreementRequirement(userId, serviceKey);
    if (!requirement.required || requirement.accepted || !requirement.document) return false;

    res.status(STORE_OWNER_AGREEMENT_REQUIRED_STATUS).json({
      success: false,
      error: STORE_OWNER_AGREEMENT_REQUIRED_MESSAGE,
      code: STORE_OWNER_AGREEMENT_REQUIRED_CODE,
      pendingStoreOwnerAgreement: {
        serviceKey,
        documentType: STORE_OWNER_AGREEMENT_DOCUMENT_TYPE,
        policyDocumentId: requirement.document.id,
        version: requirement.document.version,
        title: requirement.document.title,
      },
    });
    return true;
  } catch (error) {
    logger.warn('[storeOwnerAgreement] pending check failed (fail-open)', {
      userId,
      serviceKey,
      path: req.originalUrl,
      method: req.method,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export function createRequireStoreOwnerAgreement(serviceKey: string): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as Request & { user?: { id?: string } }).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }
    if (await enforceStoreOwnerAgreement(req, res, userId, serviceKey)) return;
    next();
  };
}
