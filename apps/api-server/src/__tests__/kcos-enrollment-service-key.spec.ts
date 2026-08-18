/**
 * WO-O4O-KCOS-ENROLLMENT-SERVICE-KEY-CANONICALIZATION-V1
 *
 * organization_service_enrollments.service_code 의 K-Cosmetics canonical key 회귀 테스트.
 *
 * 확정 계약:
 *   ROLE_SCOPE_KEY   = 'cosmetics'    (role_assignments prefix)
 *   MEMBERSHIP_KEY   = 'k-cosmetics'  (service_memberships.service_key)
 *   ENROLLMENT_KEY   = 'k-cosmetics'  (organization_service_enrollments.service_code)
 *   SLUG_KEY         = 'cosmetics'    (platform_store_slugs.service_key — 별도 축)
 *   LISTING/POLICY   = 'k-cosmetics'  (OPL.service_key / service_audience_policies)
 */
import fs from 'fs';
import path from 'path';

import {
  ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY,
  resolveCanonicalServiceKey,
} from '@o4o/security-core';
import {
  LISTING_SERVICE_KEYS,
  NON_CANONICAL_ENROLLMENT_CODES,
} from '../utils/listing-service-key.js';
import { STORE_SERVICE_ORG_LINKAGE } from '../utils/store-organization.resolver.js';
import { resolveOrganizationForEventOffer } from '../routes/kpa/helpers/event-offer-organization.helper.js';
import { SellerService } from '../modules/neture/services/seller.service.js';
import { autoExpandPublicProduct } from '../utils/auto-listing.utils.js';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf-8');

describe('K-Cos enrollment canonical key', () => {
  // ── canonical 판정 ────────────────────────────────────────────────
  it('role prefix cosmetics 의 canonical service key 는 k-cosmetics 다', () => {
    expect(resolveCanonicalServiceKey('cosmetics')).toBe('k-cosmetics');
  });

  it('NON_CANONICAL_ENROLLMENT_CODES 는 SSOT 에서 파생되며 canonical key 를 포함하지 않는다', () => {
    expect([...NON_CANONICAL_ENROLLMENT_CODES].sort()).toEqual(
      Object.keys(ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY).sort(),
    );
    expect(NON_CANONICAL_ENROLLMENT_CODES).toContain('cosmetics');
    for (const canonical of LISTING_SERVICE_KEYS) {
      expect(NON_CANONICAL_ENROLLMENT_CODES).not.toContain(canonical);
    }
  });

  it('공통 resolver 의 enrollmentCodes 는 canonical 우선 + legacy 별칭 호환이다', () => {
    expect(STORE_SERVICE_ORG_LINKAGE.cosmetics.enrollmentCodes[0]).toBe('k-cosmetics');
    expect(STORE_SERVICE_ORG_LINKAGE.cosmetics.enrollmentCodes).toContain('cosmetics');
  });

  // ── WRITE 경로: 신규 write 는 canonical 만 ─────────────────────────
  it('KCos 매장 생성/연결 write 는 canonical enrollment key 만 기록한다', () => {
    const src = read('routes/cosmetics/services/cosmetics-store.service.ts');
    const enrollCalls = src.match(/enrollService\(\{[\s\S]{0,200}?\}/g) ?? [];
    expect(enrollCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of enrollCalls) {
      expect(call).toContain("serviceCode: 'k-cosmetics'");
      expect(call).not.toContain("serviceCode: 'cosmetics'");
    }
  });

  it('런타임 enrollment write 어디에도 legacy key 리터럴이 없다', () => {
    for (const rel of [
      'routes/cosmetics/services/cosmetics-store.service.ts',
      'modules/organization/services/organization-ops.service.ts',
    ]) {
      expect(read(rel)).not.toMatch(/serviceCode:\s*'cosmetics'/);
    }
  });

  // ── READ 경로: Event Offer 조직 해석 ───────────────────────────────
  const makeDs = (rows: any[]) => {
    const calls: Array<{ sql: string; params: any[] }> = [];
    return {
      calls,
      ds: {
        query: jest.fn(async (sql: string, params: any[]) => {
          calls.push({ sql, params });
          return rows;
        }),
      } as any,
    };
  };

  it('K-Cos Event Offer operator 해석은 canonical 을 포함한 별칭 집합으로 질의한다', async () => {
    const { ds, calls } = makeDs([{ organization_id: 'org-canonical' }]);
    const orgId = await resolveOrganizationForEventOffer({
      dataSource: ds,
      userId: 'u1',
      roleType: 'operator',
      serviceKey: 'k-cosmetics-event-offer',
    });
    expect(orgId).toBe('org-canonical');
    expect(calls[0].sql).toContain('organization_service_enrollments');
    expect(calls[0].sql).toContain('ANY($2::text[])');
    expect(calls[0].params[1]).toContain('k-cosmetics');
    expect(calls[0].params[1]).toContain('cosmetics');
  });

  it('K-Cos Event Offer supplier 해석도 canonical 을 포함한 별칭 집합으로 질의한다', async () => {
    const { ds, calls } = makeDs([{ organization_id: 'org-canonical' }]);
    const orgId = await resolveOrganizationForEventOffer({
      dataSource: ds,
      userId: 'u1',
      roleType: 'supplier',
      serviceKey: 'k-cosmetics-event-offer',
    });
    expect(orgId).toBe('org-canonical');
    expect(calls[0].params[0]).toContain('k-cosmetics');
  });

  it('타 서비스(GlycoPharm) Event Offer 는 K-Cos 별칭 집합을 쓰지 않는다', async () => {
    const { ds, calls } = makeDs([{ organization_id: 'gp-org' }]);
    await resolveOrganizationForEventOffer({
      dataSource: ds,
      userId: 'u1',
      roleType: 'supplier',
      serviceKey: 'glycopharm-event-offer',
    });
    expect(JSON.stringify(calls[0].params)).not.toContain('k-cosmetics');
    expect(JSON.stringify(calls[0].params)).toContain('glycopharm');
  });

  // ── READ 경로: dual-key 조직에서 결정적 canonical 선택 ─────────────
  it('dual-key 조직의 serviceKey 해석은 canonical 을 선택한다', async () => {
    const captured: any[] = [];
    const ds = {
      query: jest.fn(async (sql: string, params: any[]) => {
        captured.push({ sql, params });
        // ORDER BY 가 canonical 을 앞세우는지 SQL 계약으로 검증
        return [{ service_code: 'k-cosmetics' }];
      }),
    } as any;
    const svc = new SellerService(ds);
    await expect(svc.resolveServiceKey('org-1')).resolves.toBe('k-cosmetics');
    expect(captured[0].sql).toContain('ORDER BY');
    expect(captured[0].sql).toContain('ANY($2::text[])');
    expect(captured[0].params[1]).toContain('cosmetics');
    expect(captured[0].params[1]).not.toContain('k-cosmetics');
  });

  // ── WRITE 경로: enrollment→OPL 복사에서 legacy key 확산 차단 ───────
  it('PUBLIC 자동확산은 legacy 별칭 enrollment 행을 OPL 로 복사하지 않는다', async () => {
    const captured: any[] = [];
    const executor = {
      query: jest.fn(async (sql: string, params: any[]) => {
        captured.push({ sql, params });
        if (/FROM product_masters/i.test(sql) && /regulatory_type/i.test(sql)) return [];
        return [];
      }),
    } as any;
    await autoExpandPublicProduct(executor, 'offer-1', 'master-1');
    const insert = captured.find((c) => /INSERT INTO organization_product_listings/.test(c.sql));
    expect(insert).toBeDefined();
    expect(insert.sql).toContain('NOT (ose.service_code = ANY($3::text[]))');
    expect(insert.params[2]).toContain('cosmetics');
    expect(insert.params[2]).not.toContain('k-cosmetics');
  });
});
