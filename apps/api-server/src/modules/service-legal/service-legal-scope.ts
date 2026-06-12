/**
 * Service Legal — cross-service scope guard + 공통 상수
 *
 * WO-O4O-SERVICE-LEGAL-POLICY-SETTINGS-BACKEND-V1
 *
 * 법정정보/정책 문서는 4개 서비스 공통 구조이므로, admin write API 는
 * `/:serviceKey` path param 으로 대상 서비스를 받는다. 각 serviceKey 에 맞는
 * security-core scope config 를 적용해 권한을 검사한다.
 *
 * 핵심: serviceKey 별 config 를 그대로 사용하므로 KPA 의 platformBypass=false
 * (platform:super_admin 도 KPA 격리)도 자동 준수된다 — 별도 우회 없음.
 */

import type { RequestHandler } from 'express';
import {
  NETURE_SCOPE_CONFIG,
  GLYCOPHARM_SCOPE_CONFIG,
  KPA_SCOPE_CONFIG,
  COSMETICS_SCOPE_CONFIG,
} from '@o4o/security-core';
import type { ServiceScopeGuardConfig } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../common/middleware/membership-guard.middleware.js';

/** 본 기능이 관리하는 canonical serviceKey (service-catalog 기준). */
export const SUPPORTED_LEGAL_SERVICE_KEYS = [
  'neture',
  'glycopharm',
  'kpa-society',
  'k-cosmetics',
] as const;

export type LegalServiceKey = (typeof SUPPORTED_LEGAL_SERVICE_KEYS)[number];

export function isSupportedLegalServiceKey(key: string): key is LegalServiceKey {
  return (SUPPORTED_LEGAL_SERVICE_KEYS as readonly string[]).includes(key);
}

/**
 * 정책 문서 document_type 화이트리스트 (WO §7.2).
 * custom 은 자유 확장용. 그 외 임의 문자열은 거부한다.
 */
export const SUPPORTED_POLICY_DOCUMENT_TYPES = [
  'terms',
  'privacy',
  'refund',
  'commerce',
  'seller',
  'partner',
  'community',
  'marketing',
  'location',
  'custom',
] as const;

export function isSupportedPolicyDocumentType(t: string): boolean {
  return (SUPPORTED_POLICY_DOCUMENT_TYPES as readonly string[]).includes(t);
}

/**
 * canonical serviceKey → { membership scope guard factory, role prefix }.
 * role prefix 는 config.serviceKey (kpa / cosmetics / neture / glycopharm) 이며
 * 실제 role 은 `${prefix}:admin` · `${prefix}:operator` 형태다.
 */
const CONFIG_BY_SERVICE_KEY: Record<LegalServiceKey, ServiceScopeGuardConfig> = {
  neture: NETURE_SCOPE_CONFIG,
  glycopharm: GLYCOPHARM_SCOPE_CONFIG,
  'kpa-society': KPA_SCOPE_CONFIG,
  'k-cosmetics': COSMETICS_SCOPE_CONFIG,
};

const GUARD_BY_SERVICE_KEY: Record<
  LegalServiceKey,
  { requireScope: (scope: string) => RequestHandler; rolePrefix: string }
> = Object.fromEntries(
  (SUPPORTED_LEGAL_SERVICE_KEYS as readonly LegalServiceKey[]).map((sk) => {
    const config = CONFIG_BY_SERVICE_KEY[sk];
    return [sk, { requireScope: createMembershipScopeGuard(config), rolePrefix: config.serviceKey }];
  }),
) as Record<LegalServiceKey, { requireScope: (scope: string) => RequestHandler; rolePrefix: string }>;

/**
 * `:serviceKey` path param 기준으로 `${prefix}:${level}` scope 를 검사하는 미들웨어.
 * 반드시 `authenticate` 뒤에 사용한다 (req.user.roles / memberships 필요).
 *
 * @param level 'admin'(write) | 'operator'(read). scopeRoleMapping 에 의해 admin ⊃ operator.
 */
export function requireServiceLegalScope(level: 'admin' | 'operator'): RequestHandler {
  return (req, res, next) => {
    const serviceKey = req.params.serviceKey;
    if (!serviceKey || !isSupportedLegalServiceKey(serviceKey)) {
      res.status(404).json({
        success: false,
        error: { code: 'UNKNOWN_SERVICE', message: '지원하지 않는 서비스입니다.' },
      });
      return;
    }
    const guard = GUARD_BY_SERVICE_KEY[serviceKey];
    const scope = `${guard.rolePrefix}:${level}`;
    return guard.requireScope(scope)(req, res, next);
  };
}
