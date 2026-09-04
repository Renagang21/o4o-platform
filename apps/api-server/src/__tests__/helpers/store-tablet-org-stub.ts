/**
 * store-tablet 라우터 조직 해석 테스트용 공통 stub
 *
 * WO-O4O-KPA-MY-STORE-RUNTIME-CONTRACT-QUALITY-CLOSURE-V1 (KPA 축)
 * WO-O4O-CROSS-SERVICE-MY-STORE-RUNTIME-CONTRACT-COMMONIZATION-V1 (4서비스 축)
 *
 * 두 spec 이 같은 DataSource stub 을 각자 들고 있어 중복이었다.
 * **판정 로직은 stub 에 넣지 않는다** — SQL 분기별 고정 응답만 제공하고,
 * 시나리오 차이(채널 상태 · 연결 여부 · service_key · 조직 목록)는 인자로 받는다.
 */

import express from 'express';

import { createStoreTabletRoutes } from '../../routes/platform/store-tablet.routes.js';
import type { StoreOwnerServiceKey } from '../../utils/store-organization.resolver.js';

export const ORG_KPA = 'org-kpa';
export const ORG_COS = 'org-cos';
export const ORG_GP = 'org-gp';
/** Neture 공급자 조직 — is_primary + 최초 가입이라 서비스 중립 정렬에서 1순위가 된다. */
export const ORG_NETURE = 'org-neture';

export interface StubMembership {
  organizationId: string;
  role: string;
  isPrimary: boolean;
  joinedAt: string;
  enrollments: string[];
  slugKeys: string[];
}

export const NETURE_PRIMARY_MEMBERSHIP: StubMembership = {
  organizationId: ORG_NETURE, role: 'owner', isPrimary: true, joinedAt: '2024-01-01',
  enrollments: ['neture'], slugKeys: [],
};
export const KPA_MEMBERSHIP: StubMembership = {
  organizationId: ORG_KPA, role: 'owner', isPrimary: false, joinedAt: '2025-03-01',
  enrollments: ['kpa-society'], slugKeys: ['kpa'],
};
export const COS_MEMBERSHIP: StubMembership = {
  organizationId: ORG_COS, role: 'owner', isPrimary: false, joinedAt: '2025-04-01',
  enrollments: ['k-cosmetics'], slugKeys: [],
};
export const GP_MEMBERSHIP: StubMembership = {
  organizationId: ORG_GP, role: 'owner', isPrimary: false, joinedAt: '2025-05-01',
  enrollments: ['glycopharm'], slugKeys: [],
};

export interface StoreTabletStubOptions {
  memberships: StubMembership[];
  /** role_assignments 통과 판정에 쓰는 현재 사용자 role 목록(테스트가 갱신) */
  currentRoles: () => string[];
  /** platform_store_slugs 응답 */
  storeSlugRows?: unknown[];
  /** organization_channels(TABLET) 응답 */
  channelRows?: Array<{ status: string }>;
  /** 상품별 노출 플래그 */
  productFlags?: { service_ok: boolean; offer_ok: boolean; linked_approved: boolean; linked_any: boolean };
  /** 상품 풀 1건의 service_key */
  poolServiceKey?: string;
}

/**
 * DB 없이 store-tablet 라우터를 태우기 위한 DataSource stub.
 * `poolOrgParams` 에 상품 풀 질의가 실제로 어떤 organization 을 받았는지 기록한다.
 */
export function makeStoreTabletDataSource(opts: StoreTabletStubOptions) {
  const poolOrgParams: string[] = [];
  const flags = opts.productFlags
    ?? { service_ok: true, offer_ok: true, linked_approved: true, linked_any: true };

  const dataSource = {
    query: jest.fn(async (sql: string, params: any[] = []) => {
      if (sql.includes('service_memberships')) return [{ ok: 1 }];
      if (sql.includes('role_assignments')) {
        const allowed = params[1] as string[];
        return opts.currentRoles().some((r) => allowed.includes(r)) ? [{ ok: 1 }] : [];
      }
      if (sql.includes('organization_service_enrollments')) {
        const roles = params[1] as string[];
        const enrollmentCodes = params[2] as string[];
        const slugKeys = params[3] as string[];
        return opts.memberships
          .filter((m) => roles.includes(m.role)
            && (m.enrollments.some((e) => enrollmentCodes.includes(e))
              || m.slugKeys.some((s) => slugKeys.includes(s))))
          .map((m) => ({ organization_id: m.organizationId, role: m.role }));
      }
      if (sql.includes('organization_members')) {
        const roles = params[1] as string[];
        return opts.memberships
          .filter((m) => roles.includes(m.role))
          .map((m) => ({
            organization_id: m.organizationId, role: m.role,
            is_primary: m.isPrimary, joined_at: m.joinedAt,
          }));
      }
      if (sql.includes('platform_store_slugs')) return opts.storeSlugRows ?? [];
      if (sql.includes('FROM organization_channels')) return opts.channelRows ?? [];
      if (sql.includes('linked_approved')) {
        return (params[2] as string[]).map((id) => ({ id, ...flags }));
      }
      if (sql.includes('organization_product_listings')) {
        poolOrgParams.push(params[0] as string);
        return [{
          id: 'listing-1', offer_id: 'offer-1', product_name: 'P', retail_price: '1000',
          is_active: true, created_at: '2025-01-01',
          service_key: opts.poolServiceKey ?? 'kpa-society',
        }];
      }
      if (sql.includes('store_local_products')) return [];
      return [];
    }),
  };

  return { dataSource: dataSource as any, poolOrgParams };
}

/** 서비스 스코프 mount(옵션 지정) 또는 서비스 중립 mount(옵션 미지정) 앱 */
export function makeStoreTabletApp(dataSource: any, serviceKey?: StoreOwnerServiceKey) {
  const app = express();
  app.use(express.json());
  app.use('/store', createStoreTabletRoutes(
    dataSource,
    serviceKey
      ? {
        storeOwnerServiceKey: serviceKey,
        qrServiceKey: serviceKey,
        operatorTemplateServiceKey: serviceKey,
      }
      : {},
  ));
  return app;
}
