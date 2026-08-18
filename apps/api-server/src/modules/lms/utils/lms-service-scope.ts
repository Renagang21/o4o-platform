/**
 * LMS Service Scope — WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1
 *
 * 공개 강의 목록(`GET /lms/courses`)에는 service boundary 가 없어 모든 서비스가
 * 동일한 전체 강의 목록을 보고 있었다 (K-Cosmetics / GlycoPharm 화면에 KPA 강의 노출).
 * 본 모듈은 Forum 의 `forumContextMiddleware → resolveCanonicalServiceKey → service_code`
 * 선례와 동일한 계약을 LMS 에 적용한다.
 *
 * 우선순위 (WO §4):
 *   1) service-prefix route context — `/api/v1/kpa/lms/*` 처럼 서비스 prefix 아래 mount 된
 *      라우터가 `lmsContextMiddleware({ serviceCode })` 로 주입한 값.
 *   2) 명시적 `serviceKey` canonical 계약 — generic `/api/v1/lms/*` 를 쓰는 서비스
 *      (K-Cosmetics / GlycoPharm) 가 쿼리 파라미터로 전달.
 *   3) 둘 다 없으면 무필터 — legacy(main-site) / admin / platform 카탈로그 용도.
 *      Forum 의 `if (!canonical) return;` (generic/admin route 무필터) 와 동일한 판단이다.
 *
 * service key 매핑은 `@o4o/security-core` 의 `resolveCanonicalServiceKey` SSOT 만 사용한다.
 * LMS 전용 매핑을 새로 만들지 않는다 (WO §3).
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveCanonicalServiceKey } from '@o4o/security-core';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

/** 라우트가 주입하는 LMS 서비스 컨텍스트 (serviceCode = RBAC role prefix) */
export interface LmsContext {
  /** RBAC role prefix ('kpa' | 'cosmetics' | 'glycopharm' | 'neture' | 'pharmacy-hub' | 'kpa-branch') */
  serviceCode?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      lmsContext?: LmsContext;
    }
  }
}

/**
 * 서비스 prefix 라우터에 고정 컨텍스트를 주입한다.
 *
 * Usage:
 *   lmsRouter.use(lmsContextMiddleware({ serviceCode: 'kpa' }));
 */
export function lmsContextMiddleware(context: LmsContext): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    req.lmsContext = context;
    next();
  };
}

/**
 * `serviceKey` 파라미터로 받을 수 있는 canonical platform service key 집합.
 * 값은 `SERVICE_KEYS` SSOT 에서만 파생한다 (로컬 문자열 리터럴 정의 금지).
 */
const LMS_SCOPED_SERVICE_KEYS: ReadonlySet<string> = new Set<string>([
  SERVICE_KEYS.KPA_SOCIETY,
  SERVICE_KEYS.K_COSMETICS,
  SERVICE_KEYS.GLYCOPHARM,
  SERVICE_KEYS.NETURE,
  SERVICE_KEYS.PHARMACY_HUB,
  SERVICE_KEYS.KPA_BRANCH,
]);

export const INVALID_SERVICE_KEY_CODE = 'INVALID_SERVICE_KEY';

/** `resolveLmsServiceScope` 가 알 수 없는 serviceKey 를 만났을 때 던지는 오류 */
export class InvalidLmsServiceKeyError extends Error {
  readonly code = INVALID_SERVICE_KEY_CODE;
  constructor(readonly received: string) {
    super(`Unknown serviceKey: ${received}`);
    this.name = 'InvalidLmsServiceKeyError';
  }
}

/**
 * 요청의 LMS service scope 를 canonical service key 로 해석한다.
 *
 * @returns canonical service key. `undefined` 이면 무경계(legacy/admin) 요청이다.
 * @throws {InvalidLmsServiceKeyError} 알 수 없는 serviceKey 가 명시된 경우.
 */
export function resolveLmsServiceScope(req: Request): string | undefined {
  // 1) route context (service-prefix mount)
  const prefix = req.lmsContext?.serviceCode?.trim();
  if (prefix) return resolveCanonicalServiceKey(prefix);

  // 2) 명시적 serviceKey 계약
  const raw = req.query?.serviceKey;
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return undefined; // 3) 무경계 — 현행 유지

  const canonical = resolveCanonicalServiceKey(value);
  if (!LMS_SCOPED_SERVICE_KEYS.has(canonical)) {
    throw new InvalidLmsServiceKeyError(value);
  }
  return canonical;
}

/**
 * 강의 1건이 현재 service scope 에 속하는지 판단한다.
 *
 * `service_key IS NULL` 은 legacy 강의다. 기존 코드가 일관되게 쓰는 fallback
 * (`course.serviceKey ?? 'kpa-society'` — CourseService / AssignmentService /
 * CertificateController)과 동일하게 KPA scope 에만 포함시킨다.
 */
export function isCourseInServiceScope(
  courseServiceKey: string | null | undefined,
  scope: string | undefined,
): boolean {
  if (!scope) return true; // 무경계 요청
  const effective = courseServiceKey ?? SERVICE_KEYS.KPA_SOCIETY;
  return effective === scope;
}
