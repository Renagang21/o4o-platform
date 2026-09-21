/**
 * WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1 §2.2 · §6.1 소스 계약 테스트
 *
 * 공급자 Promotion Adapter(promotion/adapters/supplier/) 는 Promotion Core 위의 얇은 계층이다.
 *   1. `core.promote(` 금지 — `promoteWithin` 만 (정책 후검사가 같은 TX 에 있어야 롤백)
 *   2. product_masters 직접 UPDATE 금지 (§2.2-A) · Offer 생성 · Master 직접 생성 경로 참조 0
 *   3. bulk 인식은 sourceType + sourceLabel + rawPayload.source 셋 다 — 두 리터럴이 normalizer 에 함께 있다
 *   4. `MFDS_CODE` 0 (품목신고번호/허가번호는 evidence) · `SUPPLIER_SKU` 0 (공급자 SKU 는 ProductIdentifier 아님)
 *   5. Core(promotion/product-promotion*.ts) · store-web adapter · 컨트롤러 promote-master handler 불변
 */
import fs from 'node:fs';
import path from 'node:path';
import { SUPPLIER_CREATE_ALLOWED_TYPES } from '../modules/neture/promotion/adapters/supplier/supplier-promotion.policy.js';
import {
  SUPPLIER_BULK_RAW_SOURCE,
  SUPPLIER_BULK_SOURCE_LABEL,
  SUPPLIER_BULK_SOURCE_TYPE,
  SUPPLIER_SINGLE_RAW_SOURCE,
  SUPPLIER_SINGLE_SOURCE_LABEL,
  SUPPLIER_SINGLE_SOURCE_TYPE,
} from '../modules/neture/promotion/adapters/supplier/supplier-candidate.normalizer.js';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const ADAPTER_DIR = 'apps/api-server/src/modules/neture/promotion/adapters/supplier';
const CONTROLLER = 'apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts';
const BULK_CONTROLLER = 'apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts';
const SINGLE_MAPPER = 'apps/api-server/src/modules/neture/services/supplier-single-candidate.mapper.ts';

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

const adapterFiles = fs.readdirSync(path.join(REPO_ROOT, ADAPTER_DIR)).filter((f) => f.endsWith('.ts')).sort();
const adapterSources = Object.fromEntries(adapterFiles.map((f) => [f, read(`${ADAPTER_DIR}/${f}`)]));
const adapterCode = Object.fromEntries(Object.entries(adapterSources).map(([f, s]) => [f, stripComments(s)]));
const allAdapterCode = Object.values(adapterCode).join('\n');

describe('Supplier Promotion Adapter — 파일 구성', () => {
  it('5 파일 (normalizer · plan · policy · service · regulatory-type) — 이 목록 밖 파일이 생기면 계약을 다시 본다', () => {
    expect(adapterFiles).toEqual([
      'supplier-candidate-promotion.service.ts',
      'supplier-candidate.normalizer.ts',
      'supplier-promotion.plan.ts',
      'supplier-promotion.policy.ts',
      'supplier-regulatory-type.ts',
    ]);
  });
});

describe('Supplier Promotion Adapter — Core 경계', () => {
  it('core.promote( 0 · promoteWithin 만 사용', () => {
    for (const [f, code] of Object.entries(adapterCode)) {
      expect({ f, hit: /\.promote\(/.test(code) }).toEqual({ f, hit: false });
    }
    expect(adapterCode['supplier-candidate-promotion.service.ts']).toMatch(/\.promoteWithin\(/);
    expect(adapterCode['supplier-candidate-promotion.service.ts']).toMatch(/\.afterCommit\(/);
  });

  it('정책 후검사는 dataSource.transaction 안 · afterCommit 은 transaction 밖', () => {
    const code = adapterCode['supplier-candidate-promotion.service.ts'];
    const txStart = code.indexOf('.transaction(');
    const policyAt = code.indexOf('assertSupplierPolicy(', txStart);
    const afterAt = code.indexOf('.afterCommit(');
    expect(txStart).toBeGreaterThan(-1);
    expect(policyAt).toBeGreaterThan(txStart);
    // transaction 콜백은 `return o;` 로 닫힌다 — afterCommit 은 그 뒤
    const txEnd = code.indexOf('return o;', policyAt);
    expect(afterAt).toBeGreaterThan(txEnd);
  });

  it('Core 파일 import 는 promotion 루트 2개(core.service · types)만 · store-web adapter · services/* 미참조', () => {
    const imports = allAdapterCode.match(/from '([^']+)'/g) ?? [];
    const externalPromotion = imports.filter((i) => i.includes('../../product-promotion'));
    expect(new Set(externalPromotion)).toEqual(new Set([
      "from '../../product-promotion-core.service.js'",
      "from '../../product-promotion.types.js'",
    ]));
    expect(allAdapterCode).not.toMatch(/store-web-promotion/);
    expect(allAdapterCode).not.toMatch(/product-promotion\.(store|decide)/);
    expect(allAdapterCode).not.toMatch(/\/services\/(offer|catalog|neture|product-candidate)\./);
  });
});

describe('Supplier Promotion Adapter — 쓰기 경계 (§2.2-A)', () => {
  it('product_masters UPDATE 0 · Master/Identifier/Offer 직접 생성 경로 0', () => {
    expect(allAdapterCode).not.toMatch(/UPDATE\s+product_masters/i);
    expect(allAdapterCode).not.toMatch(/product_masters\s+SET/i);
    expect(allAdapterCode).not.toMatch(/INSERT\s+INTO/i);
    for (const forbidden of [
      'createSupplierOffer', 'resolveOrCreateMaster', 'approveAsNewMaster', 'approveAsNewProductMaster',
      'SupplierProductOffer', 'offer.service', 'catalog.service', 'getRepository(ProductMaster', 'getRepository(ProductIdentifier',
      '.save(', '.insert(', '.update(',
    ]) {
      expect({ forbidden, hit: allAdapterCode.includes(forbidden) }).toEqual({ forbidden, hit: false });
    }
  });

  it('유일한 SQL 은 정책의 product_masters SELECT 1건 (LIMIT 1 · 파라미터 바인딩)', () => {
    const sqls = allAdapterCode.match(/`\s*SELECT[\s\S]*?`/gi) ?? [];
    expect(sqls).toHaveLength(1);
    expect(sqls[0]).toMatch(/FROM product_masters WHERE id = \$1 LIMIT 1/);
    expect(sqls[0]).not.toMatch(/\$\{/);
  });

  it('candidate 는 findOne 조회만 (Adapter 가 candidate 를 직접 갱신하지 않는다 — Core 가 한다)', () => {
    const svc = adapterCode['supplier-candidate-promotion.service.ts'];
    expect(svc).toMatch(/getRepository\(ProductCandidate\)\.findOne\(/);
    expect(svc).not.toMatch(/getRepository\(ProductCandidate\)\.(save|update|insert)/);
  });
});

describe('Supplier Promotion Adapter — 식별자 · 소스 인식 계약', () => {
  it('MFDS_CODE 0 · SUPPLIER_SKU 0 (코드 본문 — 주석은 "쓰지 않는다" 를 설명하려고 이름을 언급한다)', () => {
    expect(allAdapterCode).not.toMatch(/MFDS_CODE/);
    expect(allAdapterCode).not.toMatch(/SUPPLIER_SKU/);
    // ProductIdentifierType 리터럴 중 Adapter 코드가 쓰는 것 — 바코드 계열 4(UPC/JAN 은 primary 판정 집합에만) + 표준코드 · 보험코드 · UNKNOWN
    const used = new Set(allAdapterCode.match(/'(GTIN|EAN13|UPC|JAN|KOREA_DRUG_CODE|KOREA_INSURANCE_CODE|ATC_CODE|MFDS_CODE|UDI_DI|UNKNOWN)'/g) ?? []);
    expect([...used].sort()).toEqual(["'EAN13'", "'GTIN'", "'JAN'", "'KOREA_DRUG_CODE'", "'KOREA_INSURANCE_CODE'", "'UNKNOWN'", "'UPC'"]);
  });

  it('bulk 인식 리터럴 3종이 normalizer 에 함께 있고 bulk 컨트롤러 원문과 같다', () => {
    const normalizer = adapterCode['supplier-candidate.normalizer.ts'];
    expect(normalizer).toContain(`'${SUPPLIER_BULK_SOURCE_LABEL}'`);
    expect(normalizer).toContain(`'${SUPPLIER_BULK_RAW_SOURCE}'`);
    expect(SUPPLIER_BULK_SOURCE_TYPE).toBe('csv_import');
    expect(SUPPLIER_BULK_SOURCE_LABEL).toBe('공급자 대량 등록');
    expect(SUPPLIER_BULK_RAW_SOURCE).toBe('supplier_bulk_upload');

    const bulk = stripComments(read(BULK_CONTROLLER));
    expect(bulk).toContain("sourceType: 'csv_import'");
    expect(bulk).toContain("sourceLabel: '공급자 대량 등록'");
    expect(bulk).toContain("source: 'supplier_bulk_upload'");
  });

  it('단건 인식 리터럴 3종이 ② mapper 원문과 같다', () => {
    const mapper = stripComments(read(SINGLE_MAPPER));
    expect(SUPPLIER_SINGLE_SOURCE_TYPE).toBe('supplier_web');
    expect(SUPPLIER_SINGLE_SOURCE_LABEL).toBe('neture-supplier-single');
    expect(SUPPLIER_SINGLE_RAW_SOURCE).toBe('supplier_single');
    expect(mapper).toContain("'supplier_web'");
    expect(mapper).toContain("'neture-supplier-single'");
    expect(mapper).toContain("'supplier_single'");
  });

  it('normalizer 는 sourceType 단독으로 bulk 를 판정하지 않는다 (3조건 && 결합)', () => {
    const normalizer = adapterCode['supplier-candidate.normalizer.ts'];
    expect(normalizer).toMatch(/sourceType\s*!==\s*SUPPLIER_BULK_SOURCE_TYPE[\s\S]{0,200}sourceLabel\s*!==\s*SUPPLIER_BULK_SOURCE_LABEL[\s\S]{0,200}SUPPLIER_BULK_RAW_SOURCE/);
  });

  it('Plan Builder 에 origin 업무 분기 없음 — origin 은 sourceLabel 선택과 approvalMeta 에만', () => {
    const plan = adapterCode['supplier-promotion.plan.ts'];
    const originUses = plan.match(/n\.origin/g) ?? [];
    expect(originUses).toHaveLength(2);
    expect(plan).not.toMatch(/origin\s*===\s*'bulk'\s*\?/);
  });

  it('create 허용 제품군은 GENERAL · COSMETIC 뿐 (정책 상수)', () => {
    expect([...SUPPLIER_CREATE_ALLOWED_TYPES]).toEqual(['GENERAL', 'COSMETIC']);
  });
});

describe('컨트롤러 — promote-master 불변 · promote-supplier 추가만', () => {
  const src = read(CONTROLLER);
  const code = stripComments(src);

  it('promote-master handler 본문은 기존 그대로 (service.promoteMasterFromCandidate · NOT_PROMOTABLE_ 400)', () => {
    const start = code.indexOf("router.post('/:id/promote-master'");
    const end = code.indexOf("router.post('/:id/promote-supplier'");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const handler = code.slice(start, end).replace(/\s+/g, ' ').trim();
    expect(handler).toBe(
      "router.post('/:id/promote-master', requireProductDbWrite, (async (req: Request, res: Response) => { try { const result = await service.promoteMasterFromCandidate(req.params.id); return res.json({ success: true, data: result }); } catch (error) { const msg = error instanceof Error ? error.message : String(error); if (msg.startsWith('NOT_PROMOTABLE_')) { return res.status(400).json({ success: false, error: msg }); } return handleMutationError(res, error, 'promote-master'); } }) as RequestHandler);",
    );
  });

  it('promote-supplier 는 requireProductDbWrite 가드 · 오류 3계층(404/400/409) 매핑', () => {
    expect(code).toMatch(/router\.post\('\/:id\/promote-supplier',\s*requireProductDbWrite,/);
    expect(code).toMatch(/SupplierPromotionNotFoundError[\s\S]{0,120}status\(404\)/);
    expect(code).toMatch(/SupplierNormalizationError[\s\S]{0,120}status\(400\)/);
    expect(code).toMatch(/SupplierPolicyError[\s\S]{0,120}status\(409\)/);
    expect((code.match(/promote-supplier/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
