/**
 * WO-O4O-SUPPLIER-DOMAIN-SCOPE-FREEZE-AND-FINAL-REALIGNMENT-V1 §18
 *
 * Supplier Domain 전체 boundary 를 **한 파일의 소스 계약**으로 고정한다.
 * 정본: docs/baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md
 *
 * 이 파일의 목적은 기능 테스트가 아니라 **경계가 조용히 되돌아가는 것을 막는 것**이다.
 * 이미 CLOSED 인 축의 동작 테스트를 복제하지 않는다 — 기존 regression suite 가 담당한다.
 *
 *   §1  5축 · Workspace IA
 *   §2  Products — ProductMaster write=0 · 내부 LLM=0
 *   §3  Distribution — 입력축 vs 파생 표기
 *   §4  Orders / Payment — PAYMENT-FIRST · UNPAID fulfillment=0
 *   §5  Shipping — 외부 택배사 연동=0
 *   §6  Content — handoff 경계 · 멱등성
 *   §7  Programs — Event Offer=특가 · 3종 분리
 *   §8  Identity — organization_members canonical · legacy user_id=fallback
 *   §9  Business Profile — users.businessInfo write=0
 *   §10 Consumer→Store 은퇴 경계 유지
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(REPO_ROOT, rel));

/** 코드 본문만 검사 — 주석은 "하지 않는 것" 을 설명하려고 금지 이름을 언급한다. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const API = 'apps/api-server/src';
const WEB = 'services/web-neture/src';

const SIDEBAR = `${WEB}/components/layouts/SupplierSpaceLayout.tsx`;
const OFFER_SVC = `${API}/modules/neture/services/offer.service.ts`;
const IMPORT_COMMON = `${API}/modules/neture/services/product-import-common.service.ts`;
const HANDOFF_SVC = `${API}/modules/neture/services/supplier-library-handoff.service.ts`;
const CONTENT_SUBMIT = `${API}/routes/kpa/services/supplier-content.service.ts`;
const RESOLVER = `${API}/modules/neture/middleware/supplier-context.resolver.ts`;
const SUPPLIER_SVC = `${API}/modules/neture/services/supplier.service.ts`;
const BASELINE = 'docs/baseline/O4O-SUPPLIER-DOMAIN-BOUNDARY-V1.md';

// ─────────────────────────────────────────────────────────────────────────────
// §1  5축 · Workspace IA
// ─────────────────────────────────────────────────────────────────────────────

describe('§1 Supplier Workspace 5축 IA', () => {
  const sidebar = read(SIDEBAR);

  it('사이드바 그룹은 5축 + 설정 안에 머문다 (축 신설 금지)', () => {
    const groups = [...sidebar.matchAll(/^\s{4}label: '([^']+)'/gm)].map((m) => m[1]);
    expect(groups.length).toBeGreaterThan(0);
    // Programs 는 §4 에 따라 '상품' 안에 두는 형태를 허용한다 — 별도 상위 그룹을 만들지 않는다.
    const allowed = new Set(['공급자 홈', '상품', '주문', '콘텐츠', '설정', '프로그램']);
    for (const g of groups) expect(allowed.has(g)).toBe(true);
  });

  it('은퇴한 Community 진입이 사이드바로 돌아오지 않는다', () => {
    const groups = [...sidebar.matchAll(/^\s{4}label: '([^']+)'/gm)].map((m) => m[1]);
    expect(groups).not.toContain('커뮤니티');
    expect(stripComments(sidebar)).not.toContain('/supplier/forum');
  });

  it('과거 Partner / Seller 워크스페이스 명칭이 없다', () => {
    const body = stripComments(sidebar);
    expect(body).not.toContain('platform-seller');
    expect(body).not.toMatch(/label: '파트너'/);
  });

  it('공급자에게 차단된 기능을 메뉴로 노출하지 않는다 (403 dead-end 금지)', () => {
    // 코너 QR · Screen Set 적용은 backend 가 공급자를 차단한다 — 메뉴를 두면 빈 화면이 된다.
    expect(stripComments(sidebar)).not.toContain('/supplier/qr');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §2  Products
// ─────────────────────────────────────────────────────────────────────────────

describe('§2 Products — ProductMaster 는 플랫폼 SSOT', () => {
  it('공급자 후보 intake 는 ProductCandidate 만 만든다 (Master/Offer write 0)', () => {
    const ctl = stripComments(
      read(`${API}/modules/neture/controllers/supplier-product-candidate.controller.ts`),
    );
    expect(ctl).not.toMatch(/ProductMaster\b/);
    expect(ctl).not.toMatch(/SupplierProductOffer\b/);
  });

  it('공급자 intake 는 supplierId 를 body 에서 받지 않는다 (스푸핑 차단)', () => {
    const mapper = stripComments(
      read(`${API}/modules/neture/services/supplier-single-candidate.mapper.ts`),
    );
    expect(mapper).toContain('supplierid');
  });

  it('Supplier 경로에 내부 LLM 호출이 없다', () => {
    for (const rel of [
      `${API}/modules/neture/controllers/supplier-product-candidate.controller.ts`,
      `${API}/modules/neture/services/supplier-library-handoff.service.ts`,
      `${API}/modules/neture/services/supplier.service.ts`,
    ]) {
      const body = stripComments(read(rel));
      for (const forbidden of ['openai', 'OpenAI', 'anthropic', 'Anthropic', 'gemini', 'generateContent']) {
        expect(body).not.toContain(forbidden);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §3  Distribution — 입력축 vs 파생 표기
// ─────────────────────────────────────────────────────────────────────────────

describe('§3 Distribution — distribution_type 은 파생 표기다', () => {
  const offer = stripComments(read(OFFER_SVC));

  it('파생 규칙이 단일 함수로 존재한다', () => {
    expect(offer).toContain('function deriveDistributionType(');
    expect(offer).toMatch(/if \(isPublic\) return OfferDistributionType\.PUBLIC/);
    expect(offer).toMatch(/if \(serviceKeys\.length > 0\) return OfferDistributionType\.SERVICE/);
  });

  it('공급자 write 경로가 distribution_type 을 독립 입력으로 저장하지 않는다', () => {
    // 저장되는 값은 항상 derive 를 거친다.
    // 읽기(QueryBuilder 바인딩 `offer.distributionType = :distributionType`)는 대상이 아니다 —
    // 그건 SQL 문자열 안의 비교식이지 대입이 아니다.
    const assignments = offer
      .split('\n')
      .filter((line) => /\b(?:offer|savedOffer)\.distributionType\s*=[^=]/.test(line))
      .filter((line) => !line.includes(':distributionType'));
    expect(assignments.length).toBeGreaterThan(0);
    for (const line of assignments) expect(line).toContain('deriveDistributionType');
  });

  it('import 경로도 파생 규칙을 따른다 (is_public 을 함께 쓴다)', () => {
    const imp = stripComments(read(IMPORT_COMMON));
    expect(imp).toContain('is_public');
    // 요청값을 그대로 enum 에 꽂는 옛 형태로 되돌아가지 않는다
    expect(imp).not.toMatch(/distribution_type = EXCLUDED\.distribution_type/);
    expect(imp).toMatch(/WHEN EXCLUDED\.is_public THEN 'PUBLIC'/);
  });

  it('PRIVATE 매장범위 축(allowed_seller_ids)은 살아 있다 — 은퇴시키지 않는다', () => {
    const dash = read(`${API}/modules/neture/services/neture-dashboard.service.ts`);
    expect(dash).toContain('allowed_seller_ids');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §4  Orders / Payment
// ─────────────────────────────────────────────────────────────────────────────

describe('§4 Orders — PAYMENT-FIRST', () => {
  it('fulfillment bridge 는 결제 완료를 전제로만 동작한다', () => {
    const bridge = stripComments(
      read(`${API}/services/neture/checkout-fulfillment-bridge.service.ts`),
    );
    expect(bridge).toMatch(/paid/);
  });

  it('미결제 상태를 fulfillment 로 넘기는 경로가 없다', () => {
    const recovery = stripComments(
      read(`${API}/services/neture/checkout-fulfillment-recovery.service.ts`),
    );
    expect(recovery).toContain('ORDER_NOT_PAID');
  });

  it('공급자 주문은 독립 주문/결제 원장을 만들지 않는다', () => {
    const ordersvc = stripComments(read(`${API}/modules/neture/controllers/supplier-order.controller.ts`));
    expect(ordersvc).not.toMatch(/INSERT INTO\s+\w*_payments/i);
    expect(ordersvc).not.toMatch(/CREATE TABLE/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §5  Shipping — O4O 는 물류 실행자가 아니다
// ─────────────────────────────────────────────────────────────────────────────

describe('§5 Shipping — 외부 택배사 연동 0', () => {
  it('배송 경로에 택배사 API · 3PL · 집하 연동이 없다', () => {
    const shipment = stripComments(read(`${API}/modules/neture/controllers/shipment.controller.ts`));
    for (const forbidden of ['sweettracker', 'smartparcel', 'cj-logistics', 'lotteglogis', 'pickupRequest', '집하요청']) {
      expect(shipment.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §6  Content
// ─────────────────────────────────────────────────────────────────────────────

describe('§6 Content — handoff 경계와 멱등성', () => {
  const handoff = stripComments(read(HANDOFF_SVC));
  const submit = stripComments(read(CONTENT_SUBMIT));

  it('제공 대상은 canonical catalog 로만 정해진다 (특정 매장 직접 전송 금지)', () => {
    expect(handoff).toContain('getSupplierContentHandoffTarget');
    expect(handoff).not.toMatch(/storeId|organization_store/i);
  });

  it('새 workflow engine · lineage 원장을 만들지 않는다', () => {
    expect(handoff).not.toMatch(/StateMachine|WorkflowEngine|lineage/i);
    expect(handoff).not.toMatch(/CREATE TABLE/i);
  });

  it('handoff 가 출처를 넘긴다 — 같은 자료+같은 서비스의 중복 수신 방지', () => {
    expect(handoff).toContain("kind: 'supplier_library_item'");
    expect(handoff).toContain('sourceRef');
  });

  it('수신 측이 동시 요청에도 안전하다 (advisory lock 으로 직렬화)', () => {
    expect(submit).toContain('pg_advisory_xact_lock');
    // lock → 기존 행 조회 → INSERT 순서가 한 트랜잭션 안에 있다
    const iLock = submit.indexOf('pg_advisory_xact_lock');
    const iSelect = submit.indexOf('FROM cms_contents');
    const iInsert = submit.indexOf('INSERT INTO cms_contents');
    expect(iLock).toBeGreaterThan(-1);
    expect(iSelect).toBeGreaterThan(iLock);
    expect(iInsert).toBeGreaterThan(iSelect);
  });

  it('archived 수신은 재제공을 허용한다 (운영자가 내린 자료는 다시 보낼 수 있다)', () => {
    expect(submit).toContain("HANDOFF_REUSABLE_STATUS = 'archived'");
  });

  it('출처가 없는 기존 제출 경로는 멱등 가드를 타지 않는다 (무회귀)', () => {
    expect(submit).toMatch(/if \(data\.sourceRef\?\.id\)/);
  });

  it('출처 태그는 새 컬럼이 아니라 cms_contents.metadata 에 둔다 (migration 0)', () => {
    expect(submit).toMatch(/metadata->'sourceRef'->>'kind'/);
    expect(submit).not.toMatch(/ALTER TABLE|CREATE INDEX/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §7  Programs
// ─────────────────────────────────────────────────────────────────────────────

describe('§7 Programs — 3종은 의미가 다르다', () => {
  it('Event Offer 는 특가다 — 참여·예약·펀딩 런타임을 만들지 않는다', () => {
    const page = stripComments(read(`${WEB}/pages/supplier/SupplierEventOfferPage.tsx`));
    for (const forbidden of ['reservation', '예약', '구매의향', 'crowdfund']) {
      expect(page).not.toContain(forbidden);
    }
  });

  it('Market Trial 은 O4O 정산을 제공하지 않는다', () => {
    const trial = read(`${WEB}/api/trial.ts`);
    expect(trial).toContain('marketTrialCommerceDisabled');
  });

  it('3종을 공통 Program Framework 로 합치지 않았다', () => {
    for (const rel of ['ProgramEngine', 'SupplierProgramFramework', 'program-state-machine']) {
      expect(exists(`${API}/modules/neture/services/${rel}.ts`)).toBe(false);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §8  Identity
// ─────────────────────────────────────────────────────────────────────────────

describe('§8 Identity — organization_members 가 canonical', () => {
  const resolver = stripComments(read(RESOLVER));

  it('canonical 관계가 organization_members → organizations(supplier) → neture_suppliers 다', () => {
    expect(resolver).toContain('FROM organization_members om');
    expect(resolver).toContain("o.type = 'supplier'");
  });

  it('legacy user_id 는 관측 가능한 fallback 으로만 쓴다', () => {
    expect(resolver).toContain('LEGACY_SUPPLIER_USER_ID_FALLBACK');
  });

  it('임의 1건 선택(LIMIT 1)으로 공급자를 고르지 않는다', () => {
    expect(resolver).not.toMatch(/FROM organization_members[\s\S]*?LIMIT\s+1/i);
  });

  it('multi-Supplier 는 데이터·인가만 지원하고 전용 UX 를 만들지 않았다', () => {
    expect(exists(`${WEB}/components/supplier/SupplierOrganizationSwitcher.tsx`)).toBe(false);
    expect(exists(`${WEB}/pages/supplier/SupplierOrganizationsPage.tsx`)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §9  Business Profile
// ─────────────────────────────────────────────────────────────────────────────

describe('§9 Business Profile — Organization 이 SSOT', () => {
  const svc = stripComments(read(SUPPLIER_SVC));

  it('Supplier profile 이 users.businessInfo 를 read/write 하지 않는다', () => {
    expect(svc).not.toContain('businessInfo');
    expect(svc).not.toContain('buildBusinessInfoUpdateStatement');
  });

  it('공유 util 과 컬럼은 삭제하지 않았다 (타 서비스 소비처 존재)', () => {
    expect(exists(`${API}/utils/business-info-write.ts`)).toBe(true);
  });

  it('profile write 는 단일 트랜잭션이다', () => {
    expect(svc).toMatch(/AppDataSource\.transaction\(async \(manager\)/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// §10  은퇴 경계 유지
// ─────────────────────────────────────────────────────────────────────────────

describe('§10 Consumer→Store commerce 은퇴 경계', () => {
  it('B2B 결제는 은퇴한 소비자 경로가 아니라 별도 namespace 를 쓴다', () => {
    const constants = read(`${API}/services/payment/b2b/store-b2b-payment.constants.ts`);
    expect(constants).toContain("STORE_B2B_PAYMENT_SERVICE_KEY = 'store-b2b'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// baseline 문서 존재
// ─────────────────────────────────────────────────────────────────────────────

describe('Supplier Domain canonical baseline', () => {
  it('정본 문서가 존재하고 5축 · 금지선을 담는다', () => {
    expect(exists(BASELINE)).toBe(true);
    const doc = read(BASELINE);
    for (const axis of ['Business', 'Products', 'Orders', 'Content', 'Programs']) {
      expect(doc).toContain(axis);
    }
    expect(doc).toContain('금지선');
  });
});
