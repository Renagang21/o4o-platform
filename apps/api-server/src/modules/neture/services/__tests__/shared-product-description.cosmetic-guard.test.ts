/**
 * SharedProductDescriptionService — 화장품 O4O 공통 설명서 write 가드 Unit Tests
 *
 * WO-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1
 *
 * 검증: 화장품 ProductMaster 에는 O4O 공통(비-supplier) 설명서 createCandidate / setCanonical 이
 *   CosmeticDescriptionBlockedError 로 차단되고, 공급자(source_type='supplier')·비화장품은 정상 통과.
 *   화장품 판정은 regulatory_type='COSMETIC' 또는 category(자기/부모) slug='cosmetics'.
 * DB 비의존 — dataSource.query(화장품 판정) / repository(create/save/findOne) 를 목킹한다.
 */

import type { DataSource } from 'typeorm';
import {
  SharedProductDescriptionService,
  CosmeticDescriptionBlockedError,
} from '../shared-product-description.service.js';

type MasterRow = { rt: string | null; slug: string | null; parent_slug: string | null } | null;

/** createCandidate 용 목 DataSource — 화장품 판정 row + repo.create/save */
function dsForCreate(master: MasterRow): DataSource {
  const repo = {
    create: (e: any) => e,
    save: async (e: any) => ({ id: 'spd-new', ...e }),
    findOne: async () => null,
  };
  return {
    getRepository: () => repo,
    query: async (sql: string) =>
      sql.includes('FROM product_masters pm') ? (master ? [master] : []) : [],
  } as unknown as DataSource;
}

/** setCanonical 용 목 DataSource — transaction + 대상 candidate + 화장품 판정 */
function dsForCanonical(target: any, master: MasterRow): DataSource {
  const qb: any = new Proxy(
    {},
    { get: (_t, p) => (p === 'execute' ? async () => ({}) : () => qb) },
  );
  const repo = {
    findOne: async () => target,
    createQueryBuilder: () => qb,
    save: async (t: any) => t,
  };
  return {
    getRepository: () => repo,
    query: async (sql: string) =>
      sql.includes('FROM product_masters pm') ? (master ? [master] : []) : [],
    transaction: async (cb: any) => cb({ getRepository: () => repo }),
  } as unknown as DataSource;
}

const BODY = '<p>설명 본문</p>';
const HFF: MasterRow = { rt: 'HEALTH_FUNCTIONAL_FOOD', slug: 'hf-probiotics', parent_slug: 'health-functional' };
const COSMETIC_RT: MasterRow = { rt: 'COSMETIC', slug: null, parent_slug: null };
const COSMETIC_SLUG: MasterRow = { rt: null, slug: 'cosmetics', parent_slug: null };
const COSMETIC_CHILD: MasterRow = { rt: null, slug: 'cos-basic', parent_slug: 'cosmetics' };
const GENERAL_FOOD: MasterRow = { rt: 'GENERAL', slug: 'general-food', parent_slug: 'general' };

describe('createCandidate — cosmetic O4O write guard', () => {
  const base = { masterId: 'm1', content: BODY, language: 'ko' as const };

  it('건강기능식품 + O4O(manual) → 허용(생성)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(HFF));
    const row = await svc.createCandidate({ ...base, sourceType: 'manual' });
    expect(row.id).toBe('spd-new');
  });

  it('화장품(regulatory_type=COSMETIC) + O4O(manual) → 차단', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(COSMETIC_RT));
    await expect(svc.createCandidate({ ...base, sourceType: 'manual' })).rejects.toBeInstanceOf(
      CosmeticDescriptionBlockedError,
    );
  });

  it('화장품(category slug=cosmetics) + O4O(manual) → 차단', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(COSMETIC_SLUG));
    await expect(svc.createCandidate({ ...base, sourceType: 'manual' })).rejects.toBeInstanceOf(
      CosmeticDescriptionBlockedError,
    );
  });

  it('화장품(부모 category=cosmetics) + O4O(manual) → 차단', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(COSMETIC_CHILD));
    await expect(svc.createCandidate({ ...base, sourceType: 'manual' })).rejects.toBeInstanceOf(
      CosmeticDescriptionBlockedError,
    );
  });

  it('화장품 + 공급자(supplier) → 허용(공급자·브랜드 경로 유지)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(COSMETIC_RT));
    const row = await svc.createCandidate({ ...base, sourceType: 'supplier', sourceRefId: 'offer-1' });
    expect(row.id).toBe('spd-new');
  });

  it('일반식품 + O4O(manual) → 허용(기존 콘텐츠 트랙, 차단 대상 아님)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(GENERAL_FOOD));
    const row = await svc.createCandidate({ ...base, sourceType: 'manual' });
    expect(row.id).toBe('spd-new');
  });

  it('master 미발견 → 화장품 아님으로 처리(허용)', async () => {
    const svc = new SharedProductDescriptionService(dsForCreate(null));
    const row = await svc.createCandidate({ ...base, sourceType: 'manual' });
    expect(row.id).toBe('spd-new');
  });
});

describe('setCanonical — cosmetic O4O promotion guard (2차 방어)', () => {
  it('화장품 + 비-supplier(manual) 후보 canonical 승격 → 차단', async () => {
    const target = { id: 'c1', masterId: 'm1', descriptionType: 'STORE', language: 'ko', sourceType: 'manual', deletedAt: null };
    const svc = new SharedProductDescriptionService(dsForCanonical(target, COSMETIC_RT));
    await expect(svc.setCanonical('c1', 'actor')).rejects.toBeInstanceOf(CosmeticDescriptionBlockedError);
  });

  it('화장품 + 공급자(supplier) 후보 canonical 승격 → 허용', async () => {
    const target = { id: 'c2', masterId: 'm1', descriptionType: 'STORE', language: 'ko', sourceType: 'supplier', deletedAt: null };
    const svc = new SharedProductDescriptionService(dsForCanonical(target, COSMETIC_RT));
    const row = await svc.setCanonical('c2', 'actor');
    expect(row.status).toBe('canonical');
  });

  it('건강기능식품 + manual canonical 승격 → 허용(회귀 없음)', async () => {
    const target = { id: 'c3', masterId: 'm2', descriptionType: 'STORE', language: 'ko', sourceType: 'manual', deletedAt: null };
    const svc = new SharedProductDescriptionService(dsForCanonical(target, HFF));
    const row = await svc.setCanonical('c3', 'actor');
    expect(row.status).toBe('canonical');
  });
});
