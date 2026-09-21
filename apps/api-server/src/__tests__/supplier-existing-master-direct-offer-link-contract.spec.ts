/**
 * WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1 §2.2 · §2.3 · §6.1 소스 계약 테스트
 *
 *   1. `/from-master` 서비스 경로는 Master 를 새로 만들거나 고치지 않는다
 *      (resolveOrCreateMaster · updateProductMaster · resolveMasterWriteFields · ProductCandidate · ProductIdentifier 참조 0)
 *   2. persistence primitive `persistOfferForResolvedMaster` 하나를 두 경로가 공유한다(복사 0)
 *   3. 기존 POST /products 의 `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 는 validateCreateInput 에 그대로 있다
 *   4. Offer 유일성 계약(findDuplicateOffer 선검사 → save → 23505 fallback) 은 primitive 안에 1회만 있다
 *   5. 컨트롤러: `/products/from-master` 는 requireAuth → requireActiveSupplier, 상태 매핑 404/409, body.supplierId 미사용
 *   6. DRUG gate 완화 0(guard 파일 무접촉) · DDL/migration 0 · 기존 등록 UI 무접촉
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const OFFER_SERVICE = 'apps/api-server/src/modules/neture/services/offer.service.ts';
const CONTROLLER = 'apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts';
const ERROR_CODES = 'apps/api-server/src/modules/neture/constants/offer-error-code.ts';
const NETURE_SERVICE = 'apps/api-server/src/modules/neture/neture.service.ts';

const offerSrc = stripComments(read(OFFER_SERVICE));
const controllerSrc = stripComments(read(CONTROLLER));

/** 메서드 본문 추출 — 다음 top-level 메서드 선언(2-space indent `async`/`private`) 직전까지 */
function methodBody(src: string, signature: RegExp): string {
  const m = src.match(signature);
  if (!m || m.index == null) throw new Error(`method not found: ${signature}`);
  const rest = src.slice(m.index + m[0].length);
  const next = rest.search(/\n {2}(?:private |public |protected )?(?:async )?[a-zA-Z_]\w*\s*\(|\n {2}(?:private|public|protected) [a-zA-Z_]\w*\s*[:=]/);
  return next < 0 ? rest : rest.slice(0, next);
}

const fromMasterBody = methodBody(offerSrc, /\n {2}async createSupplierOfferFromExistingMaster\(/);
const primitiveBody = methodBody(offerSrc, /\n {2}private async persistOfferForResolvedMaster\(/);
const legacyBody = methodBody(offerSrc, /\n {2}async createSupplierOffer\(/);
const validateBody = methodBody(offerSrc, /\n {2}private async validateCreateInput\(/);

describe('① /from-master 서비스 경로 — Master 생성·수정·Identifier·Candidate 참조 0', () => {
  it.each([
    'resolveOrCreateMaster',
    'updateProductMaster',
    'resolveMasterWriteFields',
    'resolveProductMetadata',
    'ProductCandidate',
    'ProductIdentifier',
    'product_identifiers',
    'product_candidates',
    'UPDATE product_masters',
    'INSERT INTO product_masters',
    'masterRepo.save',
    'masterRepo.update',
    'masterRepo.insert',
    'assertSupplierPolicy',
  ])('createSupplierOfferFromExistingMaster 본문에 %s 없음', (token) => {
    expect(fromMasterBody).not.toContain(token);
  });

  it('ProductMaster 는 read(findOne) 만 — select 에 status·regulatoryType 포함', () => {
    expect(fromMasterBody).toMatch(/getRepository\(ProductMaster\)\.findOne\(/);
    expect(fromMasterBody).toMatch(/'status'/);
    expect(fromMasterBody).toMatch(/'regulatoryType'/);
    expect(fromMasterBody).not.toMatch(/getRepository\(ProductMaster\)\.(save|update|insert|create|upsert)\(/);
  });

  it('검증 순서: UUID → 존재 → ACTIVE → canonicalizeRegulatoryType', () => {
    const i = (t: string) => { const k = fromMasterBody.indexOf(t); expect(k).toBeGreaterThanOrEqual(0); return k; };
    expect(i('INVALID_MASTER_ID')).toBeLessThan(i('MASTER_NOT_FOUND'));
    expect(i('MASTER_NOT_FOUND')).toBeLessThan(i('MASTER_NOT_ACTIVE'));
    expect(i('MASTER_NOT_ACTIVE')).toBeLessThan(i('canonicalizeRegulatoryType('));
    expect(i('canonicalizeRegulatoryType(')).toBeLessThan(i('MASTER_REGULATORY_TYPE_UNSUPPORTED'));
    expect(fromMasterBody).toContain("status !== 'ACTIVE'");
  });

  it('body 계약: supplierId 거부 · Master 기준정보 키 거부 · 허용 목록 밖 거부 (검증이 Master 조회보다 먼저)', () => {
    expect(fromMasterBody).toContain('SUPPLIER_ID_NOT_ALLOWED');
    expect(fromMasterBody).toContain('MASTER_FIELD_NOT_ALLOWED');
    expect(fromMasterBody).toContain('UNSUPPORTED_FIELD');
    expect(fromMasterBody.indexOf('UNSUPPORTED_FIELD')).toBeLessThan(fromMasterBody.indexOf('getRepository(ProductMaster)'));
    for (const k of ['barcode', 'name', 'regulatoryType', 'regulatoryName', 'mfdsPermitNumber', 'manufacturerName', 'categoryId', 'brandName', 'specification', 'originCountry']) {
      expect(offerSrc).toMatch(new RegExp(`FROM_MASTER_FORBIDDEN_MASTER_KEYS[\\s\\S]{0,400}'${k}'`));
    }
    expect(offerSrc).not.toMatch(/FROM_MASTER_ALLOWED_KEYS[\s\S]{0,300}'supplierId'/);
  });

  it('primitive 호출 시 masterId 는 조회된 master.id 그대로, regulatoryType 은 canonical 값', () => {
    expect(fromMasterBody).toMatch(/persistOfferForResolvedMaster\(supplierId, \{[\s\S]*?masterId: master\.id/);
    expect(fromMasterBody).toMatch(/regulatoryType: canonicalRegulatoryType/);
  });
});

describe('② persistence primitive 공유 — 복사 0', () => {
  it('persistOfferForResolvedMaster 는 offer.service 에 1회 정의되고 두 경로가 호출한다', () => {
    expect(offerSrc.match(/private async persistOfferForResolvedMaster\(/g)).toHaveLength(1);
    expect(legacyBody).toMatch(/await this\.persistOfferForResolvedMaster\(supplierId,/);
    expect(fromMasterBody).toMatch(/await this\.persistOfferForResolvedMaster\(supplierId,/);
  });

  it('Offer 유일성 계약은 primitive 안에만: findDuplicateOffer 선검사 → offerRepo.save → 23505 fallback', () => {
    expect(primitiveBody.indexOf('await this.findDuplicateOffer(supplierId, masterId)')).toBeGreaterThanOrEqual(0);
    expect(primitiveBody.indexOf('await this.findDuplicateOffer(supplierId, masterId)')).toBeLessThan(primitiveBody.indexOf('await this.offerRepo.save(offer)'));
    expect(primitiveBody).toContain('asOfferDuplicateViolation');
    expect(offerSrc).toMatch(/private async findDuplicateOffer\([\s\S]*?OFFER_IN_RECYCLE_BIN[\s\S]*?OFFER_ALREADY_EXISTS/);
    // 두 진입 경로 본문에는 중복 검사·save 가 없다(primitive 로만 도달)
    for (const body of [legacyBody, fromMasterBody]) {
      expect(body).not.toContain('findDuplicateOffer(');
      expect(body).not.toContain('offerRepo.save(');
      expect(body).not.toContain('offerRepo.create(');
      expect(body).not.toContain('assertDrugOfferAllowed(');
      expect(body).not.toContain('createPendingApprovals(');
    }
  });

  it('DRUG gate · 약국 전용 서비스 검사 · service approval 은 primitive 안에 있다 (완화 0)', () => {
    expect(primitiveBody).toContain('assertDrugOfferAllowed(');
    expect(primitiveBody).toContain("action: 'OFFER_CREATE'");
    expect(primitiveBody).toContain('assertPharmacyOnlyServiceKeys(isPharmacyAudience, isRegulated, filteredServiceKeys)');
    expect(primitiveBody).toContain('createPendingApprovals(');
  });

  it('기존 createSupplierOffer 는 여전히 validateCreateInput → resolveProductMetadata 를 거쳐 primitive 로 간다', () => {
    expect(legacyBody).toContain('this.validateCreateInput(');
    expect(legacyBody).toContain('this.resolveProductMetadata(');
    expect(legacyBody.indexOf('this.resolveProductMetadata(')).toBeLessThan(legacyBody.indexOf('this.persistOfferForResolvedMaster('));
    // 기존 경로는 regulatoryType 을 넘기지 않는다(guard 가 masterId 로 재조회 — 기존 동작 유지)
    const call = legacyBody.slice(legacyBody.indexOf('this.persistOfferForResolvedMaster('));
    expect(call).not.toContain('regulatoryType');
  });
});

describe('③ 기존 POST /products — masterId 주입 금지 유지', () => {
  it('validateCreateInput 에 MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED 가 그대로 있다', () => {
    expect(validateBody).toContain('MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED');
    expect(read(ERROR_CODES)).toContain("MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED = 'MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED'");
  });

  it('기존 핸들러의 destructure 화이트리스트에 masterId 없음', () => {
    const legacyHandler = controllerSrc.slice(controllerSrc.indexOf("router.post('/products',"), controllerSrc.indexOf("router.post('/products/from-master'"));
    expect(legacyHandler.length).toBeGreaterThan(200);
    expect(legacyHandler).not.toMatch(/\bmasterId\b/);
    expect(legacyHandler).toContain('netureService.createSupplierOffer(');
    expect(legacyHandler).not.toContain('createSupplierOfferFromExistingMaster');
  });
});

describe('④ 컨트롤러 /products/from-master 계약', () => {
  const handler = controllerSrc.slice(controllerSrc.indexOf("router.post('/products/from-master'"), controllerSrc.indexOf("router.get('/products'"));

  it('guard: requireAuth → requireActiveSupplier (requireLinkedSupplier 아님)', () => {
    expect(handler).toMatch(/router\.post\('\/products\/from-master', requireAuth, requireActiveSupplier as RequestHandler/);
    expect(handler).not.toContain('requireLinkedSupplier');
  });

  it('supplierId 는 req.supplierId 만 — req.body.supplierId 참조 0', () => {
    expect(handler).toContain('(req as SupplierRequest).supplierId');
    expect(handler).not.toMatch(/body\.supplierId|body\[.supplierId.\]/);
  });

  it('상태 매핑: MASTER_NOT_FOUND 404 · MASTER_NOT_ACTIVE/REGULATORY_UNSUPPORTED/OFFER dup 409 · SUPPLIER_NOT_ACTIVE 403 · 성공 201', () => {
    expect(handler).toMatch(/MASTER_NOT_FOUND \? 404/);
    expect(handler).toMatch(/MASTER_NOT_ACTIVE \? 409/);
    expect(handler).toMatch(/MASTER_REGULATORY_TYPE_UNSUPPORTED \? 409/);
    expect(handler).toMatch(/'OFFER_ALREADY_EXISTS' \? 409/);
    expect(handler).toMatch(/'OFFER_IN_RECYCLE_BIN' \? 409/);
    expect(handler).toMatch(/SUPPLIER_NOT_ACTIVE \? 403/);
    expect(handler).toContain('res.status(201)');
  });

  it('NetureService 는 얇은 위임만', () => {
    expect(read(NETURE_SERVICE)).toMatch(/createSupplierOfferFromExistingMaster\(supplierId: string, rawBody: Record<string, unknown>\)\s*\{\s*return this\.offerService\.createSupplierOfferFromExistingMaster\(supplierId, rawBody\);/);
  });
});

describe('⑤ 무접촉 — DRUG guard · DDL/migration · 기존 등록 UI', () => {
  const guard = read('apps/api-server/src/modules/neture/guards/drug-access.guard.ts');

  it('drug-access.guard: DRUG_SERVICE_CONTEXT_REQUIRED / PUBLIC 금지 / 비약국 금지 코드 3종 그대로', () => {
    expect(guard).toContain('DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN');
    expect(guard).toContain('DRUG_SERVICE_CONTEXT_REQUIRED');
    expect(guard).toContain('DRUG_NON_PHARMACY_SERVICE');
    expect(guard).not.toMatch(/from-master|EXISTING-MASTER-DIRECT/i);
  });

  it('offer.service · controller 에 DDL/migration 없음', () => {
    for (const src of [offerSrc, controllerSrc]) {
      expect(src).not.toMatch(/\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|CONSTRAINT)\b/i);
      expect(src).not.toMatch(/MigrationInterface|queryRunner\.(createTable|addColumn|createIndex)/);
    }
  });

  it('web-neture 기존 등록 화면·supplierApi 는 /from-master 를 아직 호출하지 않는다 (⑥ 범위)', () => {
    const web = path.join(REPO_ROOT, 'services/web-neture/src');
    if (!fs.existsSync(web)) return;
    const hits: string[] = [];
    const walk = (d: string) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && fs.readFileSync(p, 'utf8').includes('products/from-master')) hits.push(p);
      }
    };
    walk(web);
    expect(hits).toEqual([]);
  });
});
