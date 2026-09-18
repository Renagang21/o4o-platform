/**
 * WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1 §2.2 · §6.1 소스 계약 테스트
 *
 * 공급자 단건 Candidate intake 는 product_candidates 1건만 쓴다.
 *   1. 컨트롤러 · mapper 원문에 Master / Identifier / Offer / Promotion Core 참조 0
 *   2. supplierId 는 middleware(requireActiveSupplier) 에서만 온다 — body 의 supplierId 는 금지 키
 *   3. O4O 범위 외 금지 키(lot/유효기간/일련번호/재고)는 bulk 경로 BULK_FORBIDDEN_KEYS 와 값이 같다
 *   4. neture.routes.ts 에 /supplier 마운트 존재
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  O4O_OUT_OF_SCOPE_KEYS,
  SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS,
} from '../modules/neture/services/supplier-single-candidate.mapper.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const CONTROLLER = 'apps/api-server/src/modules/neture/controllers/supplier-product-candidate.controller.ts';
const MAPPER = 'apps/api-server/src/modules/neture/services/supplier-single-candidate.mapper.ts';
const BULK_CONTROLLER = 'apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts';
const ROUTES = 'apps/api-server/src/modules/neture/neture.routes.ts';

/** 코드 본문(주석 제외)만 검사 — 헤더 주석은 "하지 않는 것" 을 설명하려고 이름을 언급한다 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const FORBIDDEN_REFS = [
  'ProductMaster',
  'SupplierProductOffer',
  'createSupplierOffer',
  'resolveOrCreateMaster',
  'promotion/',
  'promoteWithin',
  'promote(',
  'NetureService',
  'OfferService',
  'CatalogService',
  'offer_service_approvals',
  'organization_product_listings',
  'requireProductDbWrite',
  'requireAdmin',
];

describe('supplier single candidate intake — 소스 계약', () => {
  const controller = stripComments(read(CONTROLLER));
  const mapper = stripComments(read(MAPPER));

  it.each(FORBIDDEN_REFS)('컨트롤러 · mapper 본문에 "%s" 참조 0', (ref) => {
    expect(controller).not.toContain(ref);
    expect(mapper).not.toContain(ref);
  });

  it('mapper 는 ProductIdentifierType 을 type-only import 로만 안다 (entity 런타임 import 0)', () => {
    expect(mapper).toMatch(/import type \{ ProductIdentifierType \} from '\.\.\/entities\/ProductIdentifier\.entity\.js'/);
    expect(mapper).not.toMatch(/import \{[^}]*\} from '\.\.\/entities\//);
  });

  it('컨트롤러 guard 체인은 requireAuth → requireActiveSupplier 뿐', () => {
    expect(controller).toMatch(/router\.post\('\/product-candidates', requireAuth, requireActiveSupplier, /);
    expect(controller).toContain("createRequireActiveSupplier");
  });

  it('supplierId 는 SupplierRequest(middleware) 에서만 읽는다 — req.body.supplierId 참조 0', () => {
    expect(controller).toContain('(req as SupplierRequest).supplierId');
    expect(controller).not.toMatch(/body\.supplierId|body\?\.supplierId/);
    expect(mapper).not.toMatch(/\bb\.supplierId\b|body\.supplierId/);
    for (const k of ['supplierid', 'supplier_id']) {
      expect(SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS.has(k)).toBe(true);
    }
  });

  it('O4O 범위 외 금지 키 = bulk BULK_FORBIDDEN_KEYS 와 동일 집합', () => {
    const bulkSrc = read(BULK_CONTROLLER);
    const m = bulkSrc.match(/const BULK_FORBIDDEN_KEYS = new Set\(\s*\[([\s\S]*?)\]\.map/);
    expect(m).not.toBeNull();
    const bulkKeys = Array.from((m as RegExpMatchArray)[1].matchAll(/'([^']+)'/g)).map((x) => x[1].toLowerCase());
    expect(bulkKeys.length).toBeGreaterThan(0);
    expect(new Set(O4O_OUT_OF_SCOPE_KEYS.map((k) => k.toLowerCase()))).toEqual(new Set(bulkKeys));
    for (const k of bulkKeys) expect(SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS.has(k)).toBe(true);
  });

  it('공급 정책 · 재고 키는 금지 집합에 있다', () => {
    for (const k of ['distributiontype', 'servicekeys', 'stockqty', 'stockquantity']) {
      expect(SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS.has(k)).toBe(true);
    }
  });

  it('neture.routes.ts 가 /supplier 아래에 마운트한다', () => {
    const routes = read(ROUTES);
    expect(routes).toContain("router.use('/supplier', createSupplierProductCandidateController(dataSource));");
  });
});
