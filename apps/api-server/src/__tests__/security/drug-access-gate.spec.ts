import type { DataSource } from 'typeorm';
import {
  isDrugRegulatoryType,
  isDrugProduct,
  isDrugProductById,
  isPharmacyAudienceServiceStrict,
  assertDrugActionAllowed,
  assertDrugOfferAllowed,
  filterPharmacyAudienceServiceKeys,
  DrugGateErrorCode,
} from '../../modules/neture/guards/drug-access.guard.js';

/**
 * WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1
 *
 * 의약품(DRUG)이 비약국 대상 서비스로 **신규 유입**되는 것을 막는 공통 게이트의 회귀 테스트.
 *
 * 판정 SSOT: product_masters.regulatory_type='DRUG'
 *   (product_categories.is_regulated 는 실측상 DRUG 커버리지 0% 라 판정에 쓰지 않는다)
 *
 * fail-closed 계약이 핵심이다 — 정책 행 부재 / 서비스 문맥 부재 / 상품 미확정 시 **거부**.
 */

const MASTER_DRUG = '11111111-1111-4111-8111-111111111111';
const MASTER_DRUG_KO = '55555555-5555-4555-8555-555555555555'; // regulatory_type='의약품'
const MASTER_HFF = '22222222-2222-4222-8222-222222222222'; // 건강기능식품
const MASTER_QUASI = '66666666-6666-4666-8666-666666666666'; // QUASI_DRUG (의약외품 — 의약품 아님)
const MASTER_MISSING = '33333333-3333-4333-8333-333333333333'; // product_masters 에 없음

const ORG_PHARMACY = '44444444-4444-4444-8444-444444444444';
const ORG_GENERAL = '77777777-7777-4777-8777-777777777777';

/** 운영 실측과 동일한 정책 세트 (U1) */
const POLICY: Record<string, boolean> = {
  'kpa-society': true,
  glycopharm: true,
  'pharmacy-hub': true,
  neture: false,
  'k-cosmetics': false,
  // 'brand-new-service' 는 의도적으로 행 없음 → fail-closed 대상
};

const MASTER_TYPE: Record<string, string> = {
  [MASTER_DRUG]: 'DRUG',
  [MASTER_DRUG_KO]: '의약품',
  [MASTER_HFF]: '건강기능식품',
  [MASTER_QUASI]: 'QUASI_DRUG',
};

/** org → 소속된 active serviceKey 집합 */
const ORG_SERVICES: Record<string, string[]> = {
  [ORG_PHARMACY]: ['kpa-society'],
  [ORG_GENERAL]: ['neture'],
};

interface FakeOptions {
  /** true 면 정책 조회가 예외를 던진다 (DB 조회 실패 시뮬레이션) */
  policyQueryFails?: boolean;
}

function makeExecutor(opts: FakeOptions = {}): DataSource {
  const query = async (sql: string, params: unknown[] = []): Promise<any[]> => {
    if (/FROM product_masters/.test(sql)) {
      const id = params[0] as string;
      const t = MASTER_TYPE[id];
      return t ? [{ regulatory_type: t }] : [];
    }

    if (/FROM service_audience_policies/.test(sql)) {
      if (opts.policyQueryFails) throw new Error('policy query failed');
      // 배열(ANY) 형태 — filterPharmacyAudienceServiceKeys
      if (/ANY\(\$1::text\[\]\)/.test(sql)) {
        const keys = (params[0] as string[]) || [];
        return keys.filter((k) => POLICY[k] === true).map((k) => ({ service_key: k }));
      }
      // 전체 조회 — listPharmacyAudienceServiceKeys
      if (!params.length) {
        return Object.entries(POLICY)
          .filter(([, v]) => v)
          .map(([k]) => ({ service_key: k }));
      }
      // 단건 조회
      const key = params[0] as string;
      if (!(key in POLICY)) return []; // 행 부재
      return [{ is_pharmacy_target_service: POLICY[key] }];
    }

    if (/FROM organization_service_enrollments/.test(sql)) {
      const [orgId, serviceKey] = params as [string, string];
      const services = ORG_SERVICES[orgId] || [];
      return services.includes(serviceKey) ? [{ ok: 1 }] : [];
    }

    return [];
  };

  return { query } as unknown as DataSource;
}

describe('drug-access.guard — 의약품 판정 SSOT', () => {
  it('regulatory_type=DRUG 를 의약품으로 판정한다 (대소문자/공백 정규화)', () => {
    expect(isDrugRegulatoryType('DRUG')).toBe(true);
    expect(isDrugRegulatoryType(' drug ')).toBe(true);
    expect(isDrugRegulatoryType('의약품')).toBe(true);
  });

  it('의약외품·건강기능식품은 의약품이 아니다 (기존 유통 계약 보존)', () => {
    expect(isDrugRegulatoryType('QUASI_DRUG')).toBe(false);
    expect(isDrugRegulatoryType('건강기능식품')).toBe(false);
    expect(isDrugRegulatoryType('MEDICAL_DEVICE')).toBe(false);
    expect(isDrugRegulatoryType(null)).toBe(false);
    expect(isDrugProduct({ regulatoryType: 'GENERAL' })).toBe(false);
  });

  it('존재하지 않는 master 는 확정 불가(null) — fail-closed 대상', async () => {
    const ds = makeExecutor();
    expect(await isDrugProductById(ds, MASTER_MISSING)).toBeNull();
    expect(await isDrugProductById(ds, 'not-a-uuid')).toBeNull();
    expect(await isDrugProductById(ds, null)).toBeNull();
  });

  it('정책 행이 없는 서비스는 null 을 돌려준다 (하드코딩 fallback 사용 안 함)', async () => {
    const ds = makeExecutor();
    expect(await isPharmacyAudienceServiceStrict(ds, 'kpa-society')).toBe(true);
    expect(await isPharmacyAudienceServiceStrict(ds, 'neture')).toBe(false);
    expect(await isPharmacyAudienceServiceStrict(ds, 'brand-new-service')).toBeNull();
  });
});

describe('drug-access.guard — OPL 유입 (assertDrugActionAllowed)', () => {
  it('[1] 일반 서비스(neture)에서 DRUG OPL 생성은 거부된다', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: 'neture',
      organizationId: ORG_GENERAL,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });

  it('[2] 약국 서비스(kpa-society)에서 DRUG OPL 생성은 허용된다', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: 'kpa-society',
      organizationId: ORG_PHARMACY,
    });
    expect(r.allowed).toBe(true);
    expect(r.isDrug).toBe(true);
  });

  it('[3] 한글 표기 의약품(의약품)도 동일하게 차단된다', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG_KO,
      serviceKey: 'neture',
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });

  it('[4] 비의약품은 비약국 서비스에서도 통과한다 (기존 동작 보존)', async () => {
    for (const master of [MASTER_HFF, MASTER_QUASI]) {
      const r = await assertDrugActionAllowed(makeExecutor(), {
        action: 'OPL_CREATE',
        masterId: master,
        serviceKey: 'neture',
        organizationId: ORG_GENERAL,
      });
      expect(r.allowed).toBe(true);
      expect(r.isDrug).toBe(false);
    }
  });

  it('[5] 서비스 문맥이 없으면 DRUG 는 fail-closed', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: '',
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED);
  });

  it('[6] 정책 행이 없는 신규 서비스는 DRUG 쓰기 fail-closed', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: 'brand-new-service',
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_POLICY_UNAVAILABLE);
  });

  it('[7] 정책 조회 실패 시 fallback 으로 허용되지 않는다', async () => {
    const r = await assertDrugActionAllowed(makeExecutor({ policyQueryFails: true }), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: 'kpa-society', // fallback 이라면 통과할 키
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_POLICY_UNAVAILABLE);
  });

  it('[8] serviceKey 위조 — 조직이 그 서비스 소속이 아니면 거부', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_DRUG,
      serviceKey: 'kpa-society', // 약국 서비스지만
      organizationId: ORG_GENERAL, // 이 조직은 neture 소속
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_ORG_CONTEXT_MISMATCH);
  });

  it('[9] 상품을 확정할 수 없으면 fail-closed', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_CREATE',
      masterId: MASTER_MISSING,
      serviceKey: 'kpa-society',
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_PRODUCT_UNRESOLVED);
  });

  it('[10] 기존 DRUG listing 의 비약국 서비스 활성화(OPL_ACTIVATE)는 거부된다', async () => {
    const r = await assertDrugActionAllowed(makeExecutor(), {
      action: 'OPL_ACTIVATE',
      masterId: MASTER_DRUG,
      serviceKey: 'neture',
      organizationId: ORG_GENERAL,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });
});

describe('drug-access.guard — offer 유입 (assertDrugOfferAllowed)', () => {
  it('[11] 일반 서비스에서 DRUG offer 생성은 거부된다', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_CREATE',
      masterId: MASTER_DRUG,
      serviceKeys: ['neture'],
      isPublic: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });

  it('[12] 약국 서비스 serviceKey 로는 DRUG offer 생성이 허용된다', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_CREATE',
      masterId: MASTER_DRUG,
      serviceKeys: ['kpa-society'],
      isPublic: false,
    });
    expect(r.allowed).toBe(true);
  });

  it('[13] 약국+비약국 혼합 serviceKeys 는 거부된다 (부분 허용 없음)', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_UPDATE',
      masterId: MASTER_DRUG,
      serviceKeys: ['kpa-society', 'k-cosmetics'],
      isPublic: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });

  it('[14] serviceKeys=[] 인 DRUG offer 는 거부된다 (기존 no-op 반전)', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_CREATE',
      masterId: MASTER_DRUG,
      serviceKeys: [],
      isPublic: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_SERVICE_CONTEXT_REQUIRED);
  });

  it('[15] DRUG offer 의 isPublic=true 전환은 명시적으로 거부된다', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_PUBLISH',
      masterId: MASTER_DRUG,
      serviceKeys: ['kpa-society'], // 약국 서비스라도 PUBLIC 은 불가
      isPublic: true,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN);
  });

  it('[16] 비의약품 offer 는 PUBLIC·빈 serviceKeys 모두 기존대로 허용된다', async () => {
    const publicHff = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_PUBLISH',
      masterId: MASTER_HFF,
      serviceKeys: [],
      isPublic: true,
    });
    expect(publicHff.allowed).toBe(true);
    expect(publicHff.isDrug).toBe(false);

    const quasi = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_CREATE',
      masterId: MASTER_QUASI,
      serviceKeys: ['k-cosmetics'],
      isPublic: false,
    });
    expect(quasi.allowed).toBe(true);
  });

  it('[17] regulatoryType 을 직접 넘기면 master 조회 없이 판정한다', async () => {
    const r = await assertDrugOfferAllowed(makeExecutor(), {
      action: 'OFFER_UPDATE',
      regulatoryType: 'DRUG',
      serviceKeys: ['neture'],
      isPublic: false,
    });
    expect(r.allowed).toBe(false);
    expect(r.code).toBe(DrugGateErrorCode.DRUG_NON_PHARMACY_SERVICE);
  });
});

describe('drug-access.guard — 자동확산 대상 축소', () => {
  it('[18] 약국 대상 서비스만 남긴다', async () => {
    const kept = await filterPharmacyAudienceServiceKeys(makeExecutor(), [
      'kpa-society',
      'neture',
      'glycopharm',
      'k-cosmetics',
    ]);
    expect(kept.sort()).toEqual(['glycopharm', 'kpa-society']);
  });

  it('[19] 정책 행이 없는 키는 확산 대상에서 제외된다', async () => {
    const kept = await filterPharmacyAudienceServiceKeys(makeExecutor(), ['brand-new-service']);
    expect(kept).toEqual([]);
  });

  it('[20] 정책 조회 실패 시 확산 대상 0 (fail-closed)', async () => {
    const kept = await filterPharmacyAudienceServiceKeys(makeExecutor({ policyQueryFails: true }), [
      'kpa-society',
    ]);
    expect(kept).toEqual([]);
  });
});
