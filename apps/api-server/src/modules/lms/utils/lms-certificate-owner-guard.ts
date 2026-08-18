/**
 * LMS Certificate Owner Guard — WO-O4O-LMS-CERTIFICATE-OWNERSHIP-AND-READ-AUTHORIZATION-BOUNDARY-FIX-V1
 *
 * `lms-scope-guard.ts` 는 "이 resource 가 요청 service scope 에 속하는가",
 * `lms-enrollment-owner-guard.ts` 는 enrollment 소유권을 판정한다.
 * 본 모듈은 certificate 의 private read 소유권을 같은 계약으로 판정한다.
 *
 * canonical authorization 순서 (WO §4):
 *   1. 인증
 *   2. serviceKey 해석
 *   3. certificate 조회
 *   4. certificate → course service scope 확인
 *   5. certificate.userId 소유권 확인
 *   6. read
 *
 * 원칙:
 *   - service scope 를 owner check 보다 먼저 본다.
 *   - 같은 서비스라고 owner check 를 생략하지 않는다.
 *   - 타 사용자 certificate 의 존재를 드러내지 않는다 → non-disclosure 404.
 *   - user-facing endpoint 에 elevated bypass 를 새로 만들지 않는다.
 *     관리 동작은 기존 `requireKpaAdmin` 계약(issue/update/revoke/renew)을 사용한다.
 *   - 공개 진위확인(`GET /certificates/:id/verify`)은 본 guard 대상이 아니다.
 *     공개 계약은 그대로 두되 최소 필드만 반환한다.
 */

import type { Request, Response } from 'express';
import type { Certificate } from '@o4o/lms-core';
import { CertificateService } from '../services/CertificateService.js';
import { guardLoadedCourseScope, resolveScopeOrRespond } from './lms-scope-guard.js';

const CERTIFICATE_NOT_FOUND = 'Certificate not found';

function respondUnauthorized(res: Response): void {
  res.status(401).json({ success: false, error: 'User not authenticated', code: 'UNAUTHORIZED' });
}

function respondNotFound(res: Response): void {
  res.status(404).json({ success: false, error: CERTIFICATE_NOT_FOUND, code: 'NOT_FOUND' });
}

type CertificateLoader = (service: CertificateService) => Promise<Certificate | null>;

/**
 * 조회 방식(id / certificateNumber)에 무관하게 동일한 판정을 적용한다.
 *
 * @returns 본인 certificate. `null` 이면 이미 응답(401/400/404)이 전송된 상태다.
 */
async function resolveOwnedCertificate(
  req: Request,
  res: Response,
  key: string | undefined,
  load: CertificateLoader,
): Promise<Certificate | null> {
  const userId = (req as any).user?.id;
  if (!userId) {
    respondUnauthorized(res);
    return null;
  }

  // 알 수 없는 serviceKey 는 조회 이전에 400 (기존 계약 유지)
  const scope = resolveScopeOrRespond(req, res);
  if (!scope.ok) return null;

  if (!key) {
    respondNotFound(res);
    return null;
  }

  const certificate = await load(CertificateService.getInstance());
  if (!certificate) {
    respondNotFound(res);
    return null;
  }

  // 1) service boundary 가 항상 먼저다.
  if (!guardLoadedCourseScope(req, res, (certificate as any).course?.serviceKey, CERTIFICATE_NOT_FOUND)) {
    return null;
  }

  // 2) 같은 서비스 안이라도 타인 certificate 는 존재를 드러내지 않고 차단한다.
  if (certificate.userId !== userId) {
    respondNotFound(res);
    return null;
  }

  return certificate;
}

/** id 기반 private read (`GET /certificates/:id`, `GET /certificates/:id/pdf`) */
export function resolveOwnedCertificateByIdOrRespond(
  req: Request,
  res: Response,
  id: string | undefined,
): Promise<Certificate | null> {
  return resolveOwnedCertificate(req, res, id, (service) => service.getCertificate(id as string));
}

/** certificateNumber 기반 private read (`GET /certificates/number/:certificateNumber`) */
export function resolveOwnedCertificateByNumberOrRespond(
  req: Request,
  res: Response,
  certificateNumber: string | undefined,
): Promise<Certificate | null> {
  return resolveOwnedCertificate(req, res, certificateNumber, (service) =>
    service.getCertificateByNumber(certificateNumber as string),
  );
}
