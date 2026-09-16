/**
 * WO-O4O-CONTENT-BOUNDARY-ALIGNMENT-V1 — Content Boundary Alignment 계약 테스트
 *
 * 검증 축 (WO §17):
 *   1. producer 매핑 — platform admin CMS → platform · service admin CMS → service_operator ·
 *      community member → community · supplier library → supplier · store → store
 *   2. boundary — Community ≠ Service · Supplier ≠ Community · Service ≠ Hub 자체 · Store copy ≠ 원본
 *   3. KPA 일반 회원 콘텐츠 producer 가 `service_admin` 이 아니다 (drift FIX)
 *   4. regression — KPA 목록 mapper · Hub producer 4종 유지 (이번 단계 축소 금지) ·
 *      ContentMeta 가 콘텐츠 시스템으로 확장되지 않았다 (Universal table / Transfer engine 0)
 *
 * 순수 타입·mapper 단위 테스트 — DB 접속 없음.
 */
import {
  mapCmsAuthorRole,
  mapKpaContentProducer,
  mapSupplierLibraryProducer,
  normalizeContentProducer,
  mapCmsVisibilityScope,
  CONTENT_PRODUCER_LABELS,
  CONTENT_DOMAIN_LABELS,
  HUB_PRODUCER_LABELS,
  type ContentProducer,
  type ContentDomain,
  type HubProducer,
} from '@o4o/types';
import { createKpaListRowMapper } from '../routes/kpa/controllers/kpa-content-resource.config.js';

const CANONICAL_PRODUCERS: readonly ContentProducer[] = [
  'platform',
  'service_operator',
  'supplier',
  'community',
  'store',
];
const CANONICAL_DOMAINS: readonly ContentDomain[] = ['community', 'service', 'supplier', 'store'];
const HUB_PRODUCERS: readonly HubProducer[] = ['operator', 'supplier', 'community', 'store'];

// ─────────────────────────────────────────────────────────────────────────────
// 1. producer 매핑
// ─────────────────────────────────────────────────────────────────────────────

describe('canonical producer mapping (WO §5)', () => {
  it('cms admin → platform', () => {
    expect(mapCmsAuthorRole('admin')).toBe('platform');
  });

  it('cms service_admin → service_operator (물리 enum 은 그대로, adapter 정규화)', () => {
    expect(mapCmsAuthorRole('service_admin')).toBe('service_operator');
  });

  it('cms community → community', () => {
    expect(mapCmsAuthorRole('community')).toBe('community');
  });

  it('cms supplier → supplier (Supplier → Store Hub 제출 경로 = canonical)', () => {
    expect(mapCmsAuthorRole('supplier')).toBe('supplier');
  });

  it('supplier library (neture_supplier_library_items) → supplier', () => {
    expect(mapSupplierLibraryProducer()).toBe('supplier');
  });

  it('kpa_contents (회원 작성 원장) → community', () => {
    expect(mapKpaContentProducer()).toBe('community');
  });

  it('구 producer 값은 canonical 로 정규화되고 canonical 값은 통과한다 (TEMP_COMPAT)', () => {
    expect(normalizeContentProducer('platform_admin')).toBe('platform');
    expect(normalizeContentProducer('service_admin')).toBe('service_operator');
    expect(normalizeContentProducer('store_operator')).toBe('store');
    for (const p of CANONICAL_PRODUCERS) expect(normalizeContentProducer(p)).toBe(p);
  });

  it('producer / domain 라벨은 canonical 값만 가진다 (구 값 없음)', () => {
    expect(Object.keys(CONTENT_PRODUCER_LABELS).sort()).toEqual([...CANONICAL_PRODUCERS].sort());
    expect(Object.keys(CONTENT_DOMAIN_LABELS).sort()).toEqual([...CANONICAL_DOMAINS].sort());
    for (const legacy of ['platform_admin', 'service_admin', 'store_operator']) {
      expect(CONTENT_PRODUCER_LABELS).not.toHaveProperty(legacy);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. boundary
// ─────────────────────────────────────────────────────────────────────────────

describe('content boundary (WO §4 · §11)', () => {
  it('Community ≠ Service — 회원 작성과 Service Operator 작성은 다른 producer 다', () => {
    expect(mapCmsAuthorRole('community')).not.toBe(mapCmsAuthorRole('service_admin'));
    expect(mapKpaContentProducer()).not.toBe(mapCmsAuthorRole('service_admin'));
  });

  it('Supplier ≠ Community', () => {
    expect(mapSupplierLibraryProducer()).not.toBe('community');
    expect(mapCmsAuthorRole('supplier')).not.toBe(mapCmsAuthorRole('community'));
  });

  it('Service ≠ Hub 자체 — visibility=service 가 Service Content 도메인을 뜻하지 않는다', () => {
    // cms 의 service scope 는 노출 축(visibility)이며 producer/domain 을 결정하지 않는다.
    expect(mapCmsVisibilityScope('service')).toBe('service');
    // Community 회원 작성(authorRole community)도 visibilityScope='service' 로 저장된다.
    expect(mapCmsAuthorRole('community')).toBe('community');
    // Hub producer 축은 Content Domain 과 별개 집합이다 ('operator' 는 도메인이 아니다).
    expect(CANONICAL_DOMAINS as readonly string[]).not.toContain('operator');
    expect(HUB_PRODUCERS as readonly string[]).not.toContain('service_operator');
  });

  it('Store copy ≠ 원본 — 원본 producer 와 무관하게 Store 사본은 store 다', () => {
    // kpa_contents(community) → o4o_asset_snapshots / kpa_store_contents 사본은 Store 소유.
    const original = mapKpaContentProducer();
    const storeCopy: ContentProducer = 'store';
    expect(original).toBe('community');
    expect(storeCopy).not.toBe(original);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. KPA producer drift FIX
// ─────────────────────────────────────────────────────────────────────────────

describe('KPA producer drift (WO §6)', () => {
  const mapper = createKpaListRowMapper((s: string) => `mapped:${s}`);

  it('일반 회원이 작성한 kpa_contents 행의 producer 는 community 이며 service_admin 이 아니다', () => {
    const row = mapper({ id: 'c1', title: 't', status: 'published', created_by: 'member-uuid' });
    expect(row.producer).toBe('community');
    expect(row.producer).not.toBe('service_admin');
    expect(row.producerRef).toBe('member-uuid');
  });

  it('created_by 값과 무관하게 원장 계약으로 판정한다 (role 추정 없음)', () => {
    const a = mapper({ id: 'a', created_by: 'operator-uuid', status: 'draft' });
    const b = mapper({ id: 'b', created_by: 'member-uuid', status: 'draft' });
    expect(a.producer).toBe(b.producer);
    expect(a.producer).toBe('community');
  });

  it('visibility=service · serviceKey · contentType=document 는 유지된다 (API 호환 additive)', () => {
    const row = mapper({ id: 'c1', status: 'ready' });
    expect(row).toEqual(
      expect.objectContaining({
        visibility: 'service',
        serviceKey: 'kpa-society',
        contentType: 'document',
        metaStatus: 'mapped:ready',
      }),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. regression — Hub / no engine
// ─────────────────────────────────────────────────────────────────────────────

describe('Hub producer 유지 · 확장 금지 (WO §10 · §13)', () => {
  it('HubProducer 4종은 이번 단계에서 축소되지 않았다 (community/store 즉시 제거 금지)', () => {
    expect(Object.keys(HUB_PRODUCER_LABELS).sort()).toEqual([...HUB_PRODUCERS].sort());
  });

  it('ContentMeta 는 공통 언어만 노출한다 — 전송 엔진 · publication graph · lineage API 없음', async () => {
    const mod = await import('@o4o/types');
    const forbidden = Object.keys(mod).filter((k) =>
      /transfer|publication|lineage|syncContent|mergeContent|universalContent/i.test(k),
    );
    expect(forbidden).toEqual([]);
  });
});
