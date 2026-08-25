/**
 * WO-O4O-KCOS-STORE-POLICY-OWNERSHIP-AXIS-FIX-V1 §8
 *
 * `/api/v1/stores/:slug/*` 소유권 판정이 **organizations.id 축**으로만 이뤄지는지 검증한다.
 * fixture 는 `organization.id != cosmetics_stores.id` 를 강제한다.
 *
 * DB 는 붙이지 않는다 — DataSource.query 를 stub 으로 대체한다.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { isStoreOwner } from '../routes/platform/store-policy.ownership.js';

const ORG_ID = '83ff96c7-217b-4f13-8b55-ac9abbe7be86'; // organizations.id (= platform_store_slugs.store_id)
const STORE_PK = 'bac64424-b653-42a2-9f89-2ed8a40e0ab8'; // cosmetics.cosmetics_stores.id (다른 축)
const OTHER_ORG_ID = '31e926a0-8b41-4af6-8a22-b32d3ad880e6';

type Row = Record<string, unknown>;

/**
 * SQL 내용으로 응답을 결정하는 stub.
 * - service_memberships → 서비스 접근 게이트 (기본 active)
 * - role_assignments  → role 게이트
 * - organization_members → 조직 후보
 */
function makeDataSource(opts: {
  hasRole: boolean;
  candidateOrgIds: string[];
  orgCreators?: string[];
  /**
   * WO-O4O-CROSSSERVICE-MEMBERSHIP-SUSPENSION-ROLE-LIFECYCLE-CONTRACT-V1:
   *   판정의 첫 게이트가 role 이 아니라 active membership 이다.
   *   본 spec 의 관심사는 **id 축**이므로 기본값은 active 로 둔다.
   */
  hasActiveMembership?: boolean;
}) {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const query = jest.fn(async (sql: string, params: unknown[] = []): Promise<Row[]> => {
    calls.push({ sql, params });
    if (sql.includes('service_memberships')) {
      return opts.hasActiveMembership === false ? [] : [{ '?column?': 1 }];
    }
    if (sql.includes('role_assignments')) return opts.hasRole ? [{ '?column?': 1 }] : [];
    if (sql.includes('organization_members')) {
      return opts.candidateOrgIds.map((id) => ({ organization_id: id, role: 'owner' }));
    }
    if (sql.includes('FROM organizations')) {
      const [storeId, userId] = params as [string, string];
      return (opts.orgCreators ?? []).includes(`${storeId}:${userId}`) ? [{ '?column?': 1 }] : [];
    }
    return [];
  });
  return { dataSource: { query } as any, calls };
}

describe('store-policy ownership — canonical axis', () => {
  it('A. KCos owner + 자기 매장(organizations.id) → 소유자', async () => {
    const { dataSource } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
    await expect(isStoreOwner(dataSource, ORG_ID, 'cosmetics', 'user-1')).resolves.toBe(true);
  });

  it('B. KCos owner + 다른 KCos 매장 → 비소유자(403)', async () => {
    const { dataSource } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
    await expect(isStoreOwner(dataSource, OTHER_ORG_ID, 'cosmetics', 'user-1')).resolves.toBe(false);
  });

  it('C. cosmetics_stores.id(매장 PK)로는 절대 통과하지 않는다 — 축 혼용 금지', async () => {
    const { dataSource, calls } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
    await expect(isStoreOwner(dataSource, STORE_PK, 'cosmetics', 'user-1')).resolves.toBe(false);
    // cosmetics_stores 테이블을 조회하지 않는다
    expect(calls.some((c) => c.sql.includes('cosmetics_stores'))).toBe(false);
  });

  it('D. role 이 없으면 조직 후보를 보지 않고 차단한다 (role_assignments SSOT)', async () => {
    const { dataSource, calls } = makeDataSource({ hasRole: false, candidateOrgIds: [ORG_ID] });
    await expect(isStoreOwner(dataSource, ORG_ID, 'cosmetics', 'user-1')).resolves.toBe(false);
    expect(calls.some((c) => c.sql.includes('organization_members'))).toBe(false);
  });

  it('D-2. membership 이 active 가 아니면 role 도 보지 않고 차단한다', async () => {
    const { dataSource, calls } = makeDataSource({
      hasRole: true,
      candidateOrgIds: [ORG_ID],
      hasActiveMembership: false,
    });
    await expect(isStoreOwner(dataSource, ORG_ID, 'cosmetics', 'user-1')).resolves.toBe(false);
    expect(calls.some((c) => c.sql.includes('role_assignments'))).toBe(false);
  });

  it('E. 같은 서비스 조직이 2개여도 slug 로 특정된 매장이면 통과한다 (ambiguous 로 막지 않음)', async () => {
    const { dataSource } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID, OTHER_ORG_ID] });
    await expect(isStoreOwner(dataSource, ORG_ID, 'cosmetics', 'user-1')).resolves.toBe(true);
  });

  it('F. kpa / pharmacy-hub slug 도 같은 축으로 판정된다', async () => {
    for (const serviceKey of ['kpa', 'pharmacy-hub']) {
      const { dataSource } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
      await expect(isStoreOwner(dataSource, ORG_ID, serviceKey, 'user-1')).resolves.toBe(true);

      const other = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
      await expect(isStoreOwner(other.dataSource, OTHER_ORG_ID, serviceKey, 'user-1')).resolves.toBe(false);
    }
  });

  it('G. glycopharm 은 기존 legacy(조직 생성자) 허용 범위를 유지한다', async () => {
    const { dataSource } = makeDataSource({
      hasRole: false,
      candidateOrgIds: [],
      orgCreators: [`${ORG_ID}:user-1`],
    });
    await expect(isStoreOwner(dataSource, ORG_ID, 'glycopharm', 'user-1')).resolves.toBe(true);

    const nonOwner = makeDataSource({ hasRole: false, candidateOrgIds: [], orgCreators: [] });
    await expect(isStoreOwner(nonOwner.dataSource, ORG_ID, 'glycopharm', 'user-2')).resolves.toBe(false);
  });

  it('H. 매장 소유 축이 없는 서비스(neture)는 판정 대상이 아니다', async () => {
    const { dataSource, calls } = makeDataSource({ hasRole: true, candidateOrgIds: [ORG_ID] });
    await expect(isStoreOwner(dataSource, ORG_ID, 'neture', 'user-1')).resolves.toBe(false);
    expect(calls).toHaveLength(0);
  });

  it('I. 라우터는 매장 PK 축 SQL 을 더 이상 갖지 않는다 (census)', () => {
    const src = readFileSync(
      join(__dirname, '../routes/platform/store-policy.routes.ts'),
      'utf-8',
    );
    // 남은 언급은 주석뿐이어야 한다 — SQL 은 0건
    expect(src).not.toMatch(/FROM\s+cosmetics\.cosmetics_stores/i);
    expect(src).not.toContain('created_by_user_id');
    expect(src).toContain("from './store-policy.ownership.js'");
  });
});
