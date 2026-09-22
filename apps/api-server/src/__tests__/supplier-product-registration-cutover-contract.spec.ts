/**
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1 §6 최종 상태 소스 계약
 *
 *   A. web-neture: 레거시 createProduct / POST /neture/supplier/products 사용 0
 *      · Library 선택 → /supplier/products/from-master · 신규 단일 → product-candidates · 대량 → bulk-candidates
 *      · Import Assistant → /supplier/products/new (Candidate 화면)
 *   B. api-server 공급자 Offer 경로: resolveOrCreateMaster 호출 0 · ProductMaster INSERT/UPDATE 0
 *      · primitive = persistOfferForResolvedMaster 1개 · 호출자 = createSupplierOfferFromExistingMaster 1개
 *   C. 레거시 POST /supplier/products 라우트 제거 (census + Cloud Run 30일 로그 외부 호출 0 → 제거)
 *   D. DRUG gate 완화 0 · (supplierId, masterId) unique 불변 · Admin/system resolveOrCreateMaster 소비자 불변
 *   E. Candidate 제출 경로(mapper · controller) ProductMaster write 0 · Supplier Adapter 가 product_masters UPDATE 0
 *   F. Candidate metadata 보존 계약: categoryId/brandId/brandName/originCountry/specification/regulatoryName/이미지 → rawPayload
 *      → normalizer → plan.master.metadata / effects.images → Core create INSERT + linkPromotionImages(커밋 후 · create 만)
 */
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const NETURE = 'apps/api-server/src/modules/neture';
const OFFER_SERVICE = `${NETURE}/services/offer.service.ts`;
const CONTROLLER = `${NETURE}/controllers/supplier-product.controller.ts`;
const NETURE_SERVICE = `${NETURE}/neture.service.ts`;
const CATALOG_SERVICE = `${NETURE}/services/catalog.service.ts`;
const MAPPER = `${NETURE}/services/supplier-single-candidate.mapper.ts`;
const NORMALIZER = `${NETURE}/promotion/adapters/supplier/supplier-candidate.normalizer.ts`;
const PLAN = `${NETURE}/promotion/adapters/supplier/supplier-promotion.plan.ts`;
const ADAPTER_SVC = `${NETURE}/promotion/adapters/supplier/supplier-candidate-promotion.service.ts`;
const CORE = `${NETURE}/promotion/product-promotion-core.service.ts`;
const STORE = `${NETURE}/promotion/product-promotion.store.ts`;
const TYPES = `${NETURE}/promotion/product-promotion.types.ts`;

const WEB = 'services/web-neture/src';

const offerSrc = stripComments(read(OFFER_SERVICE));
const controllerSrc = stripComments(read(CONTROLLER));

function walk(dir: string, pred: (name: string) => boolean, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, pred, out);
    else if (pred(e.name)) out.push(p);
  }
  return out;
}
const webFiles = () => walk(path.join(REPO_ROOT, WEB), (n) => /\.(ts|tsx)$/.test(n));
const webHits = (needle: string | RegExp) =>
  webFiles().filter((p) => {
    const s = stripComments(fs.readFileSync(p, 'utf8'));
    return typeof needle === 'string' ? s.includes(needle) : needle.test(s);
  }).map((p) => path.relative(REPO_ROOT, p).replace(/\\/g, '/'));

describe('A. web-neture — 레거시 createSupplierOffer 소비 0 · 3 경로 cutover', () => {
  it('supplierApi.createProduct 정의·호출 0 · POST /neture/supplier/products(정확히 그 경로) 호출 0', () => {
    expect(webHits(/supplierApi\.createProduct\(/)).toEqual([]);
    expect(webHits(/\n\s*async createProduct\(/)).toEqual([]);
    // 정확한 레거시 경로 문자열(하위 경로 from-master/bulk-candidates 는 제외)
    expect(webHits(/['"`]\/neture\/supplier\/products['"`]\s*,/)).toEqual([]);
  });

  it('supplierApi 에 createOfferFromMaster(from-master) · submitProductCandidate(product-candidates) 가 있다', () => {
    const api = stripComments(read(`${WEB}/lib/api/supplier.ts`));
    expect(api).toMatch(/async createOfferFromMaster\([\s\S]*?api\.post\('\/neture\/supplier\/products\/from-master'/);
    expect(api).toMatch(/async submitProductCandidate\([\s\S]*?api\.post\('\/neture\/supplier\/product-candidates'/);
  });

  it('Library 선택 → /supplier/products/from-master?masterId= (barcode/name 재추론 없음)', () => {
    const lib = stripComments(read(`${WEB}/pages/supplier/SupplierProductLibraryPage.tsx`));
    expect(lib).toMatch(/navigate\(`\/supplier\/products\/from-master\?masterId=\$\{encodeURIComponent\(master\.id\)\}`/);
    expect(lib).not.toContain('/supplier/products/new?');
    expect(lib).not.toMatch(/params\.set\('barcode'/);
  });

  it('from-master 화면: createOfferFromMaster 호출 · Master 기준정보 키를 body 에 보내지 않음 · DRUG 는 PUBLIC 불가 + 서비스 ≥1', () => {
    const page = stripComments(read(`${WEB}/pages/supplier/SupplierProductFromMasterPage.tsx`));
    expect(page).toContain('supplierApi.createOfferFromMaster({');
    const call = page.slice(page.indexOf('supplierApi.createOfferFromMaster({'), page.indexOf('});', page.indexOf('supplierApi.createOfferFromMaster({')));
    for (const k of ['barcode', 'name:', 'regulatoryType', 'categoryId', 'brandName', 'manufacturerName', 'specification', 'originCountry', 'supplierId']) {
      expect(call).not.toContain(k);
    }
    expect(call).toMatch(/isPublic: isDrug \? false : isPublic/);
    expect(page).toMatch(/isDrug && serviceKeys\.length === 0/);
    expect(page).toContain('DRUG_NON_PHARMACY_SERVICE');
    expect(page).toContain('DRUG_SERVICE_CONTEXT_REQUIRED');
    expect(page).toContain('DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN');
    const app = stripComments(read(`${WEB}/App.tsx`));
    expect(app).toContain('path="/supplier/products/from-master"');
  });

  it('신규 단일 등록 화면: submitProductCandidate 만 호출 · Offer/ProductImage 직접 생성 0 · 금지 키(distributionType/serviceKeys/stock) 미전송', () => {
    const page = stripComments(read(`${WEB}/pages/supplier/SupplierProductCreatePage.tsx`));
    expect(page).toContain('supplierApi.submitProductCandidate({');
    expect(page).not.toContain('supplierApi.createProduct(');
    expect(page).not.toContain('productApi.uploadProductImage(');
    expect(page).not.toContain('productApi.registerImageFromUrl(');
    const call = page.slice(page.indexOf('supplierApi.submitProductCandidate({'), page.indexOf('});', page.indexOf('supplierApi.submitProductCandidate({')));
    for (const k of ['distributionType', 'serviceKeys', 'isPublic', 'stockQty', 'stockQuantity', 'supplierId']) {
      expect(call).not.toContain(k);
    }
    // 메타데이터 보존 입력(§2.2)
    for (const k of ['categoryId', 'brandName', 'originCountry', 'specification', 'regulatoryName', 'imageUrl', 'contentImageUrls']) {
      expect(call).toContain(k);
    }
    // 이미지는 master-less 미디어 업로드 URL 만 (Master 확정 전 ProductImage write 0)
    expect(page).toMatch(/mediaApi\.upload\(thumbnailSource\.file, true, undefined, 'product-thumbnail'\)/);
    expect(page).toContain('제품 정보 검토 요청 완료');
    expect(page).not.toContain('Master가 자동 생성됩니다');
  });

  it('대량 → bulk-candidates 유지 · Import Assistant → /supplier/products/new (Candidate 화면)', () => {
    expect(webHits('/products/bulk-candidates').length).toBeGreaterThan(0);
    const imp = stripComments(read(`${WEB}/pages/supplier/SupplierProductImportPage.tsx`));
    expect(imp).toContain('/supplier/products/new');
    expect(imp).not.toContain('createProduct(');
  });
});

describe('B. 공급자 Offer 경로 — Master 재추론·write 0 · primitive 단일', () => {
  it('offer.service: resolveOrCreateMaster( · updateProductMaster( · resolveBrandId · ProductImportCommonService 호출 0', () => {
    expect(offerSrc).not.toContain('resolveOrCreateMaster(');
    expect(offerSrc).not.toContain('updateProductMaster(');
    expect(offerSrc).not.toContain('resolveBrandId');
    expect(offerSrc).not.toContain('ProductImportCommonService');
    expect(offerSrc).not.toContain('resolveProductMetadata');
    expect(offerSrc).not.toContain('validateCreateInput');
  });

  it('offer.service: ProductMaster INSERT/UPDATE 0 (repo write · raw SQL 모두)', () => {
    expect(offerSrc).not.toMatch(/getRepository\(ProductMaster\)\.(save|update|insert|upsert|create)\(/);
    expect(offerSrc).not.toMatch(/INSERT INTO product_masters/i);
    expect(offerSrc).not.toMatch(/UPDATE product_masters/i);
    expect(offerSrc).not.toMatch(/getRepository\(Brand\)\.(save|insert|create)\(/);
  });

  it('primitive 1개 · 호출자 1개(createSupplierOfferFromExistingMaster) · 레거시 createSupplierOffer 0', () => {
    expect(offerSrc.match(/private async persistOfferForResolvedMaster\(/g)).toHaveLength(1);
    expect(offerSrc.match(/this\.persistOfferForResolvedMaster\(/g)).toHaveLength(1);
    expect(offerSrc).not.toMatch(/\n {2}async createSupplierOffer\(/);
    expect(stripComments(read(NETURE_SERVICE))).not.toMatch(/\n {2}async createSupplierOffer\(/);
  });
});

describe('C. 레거시 POST /supplier/products 라우트 제거', () => {
  it("router.post('/products', ...) 없음 · from-master / product-candidates / bulk-candidates 는 있음", () => {
    expect(controllerSrc).not.toMatch(/router\.post\('\/products',/);
    expect(controllerSrc).toMatch(/router\.post\('\/products\/from-master'/);
    expect(stripComments(read(`${NETURE}/controllers/supplier-product-candidate.controller.ts`))).toMatch(/router\.post\('\/product-candidates'/);
    expect(controllerSrc).toMatch(/router\.post\('\/products\/bulk-candidates'/);
  });
});

describe('D. 불변 — DRUG gate · unique · Admin/system resolveOrCreateMaster 소비자', () => {
  it('drug-access.guard 3 코드 그대로 · assertDrugOfferAllowed 는 primitive 안에서 OFFER_CREATE 로 호출', () => {
    const guard = read(`${NETURE}/guards/drug-access.guard.ts`);
    for (const c of ['DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN', 'DRUG_SERVICE_CONTEXT_REQUIRED', 'DRUG_NON_PHARMACY_SERVICE']) {
      expect(guard).toContain(c);
    }
    expect(offerSrc).toMatch(/assertDrugOfferAllowed\([\s\S]{0,400}action: 'OFFER_CREATE'/);
  });

  it('CatalogService.resolveOrCreateMaster 는 남아 있고 Admin/system 소비자가 계속 쓴다', () => {
    expect(stripComments(read(CATALOG_SERVICE))).toMatch(/async resolveOrCreateMaster\(/);
    for (const rel of [
      `${NETURE}/controllers/admin.controller.ts`,
      `${NETURE}/controllers/product-master-create.controller.ts`,
      'apps/api-server/src/modules/catalog-import/services/catalog-import-resolver.ts',
    ]) {
      expect(stripComments(read(rel))).toContain('resolveOrCreateMaster(');
    }
  });

  it('migration/DDL 0 — 이 WO 가 건드린 파일에 CREATE/ALTER/DROP 없음', () => {
    for (const rel of [OFFER_SERVICE, CONTROLLER, NETURE_SERVICE, MAPPER, NORMALIZER, PLAN, ADAPTER_SVC, CORE, STORE, TYPES]) {
      expect(stripComments(read(rel))).not.toMatch(/\b(CREATE|ALTER|DROP)\s+(TABLE|INDEX|CONSTRAINT)\b/i);
    }
  });
});

describe('E. Candidate 제출 · Supplier Adapter — ProductMaster write 0', () => {
  it('mapper: ProductMaster/product_masters/Offer 참조 0 · 금지 키 목록 유지', () => {
    const m = stripComments(read(MAPPER));
    expect(m).not.toMatch(/ProductMaster|product_masters|SupplierProductOffer|supplier_product_offers/);
    // 금지 키 집합은 소문자 정규화 리터럴로 유지된다 (supplierId 는 body 금지 · ctx 전용)
    for (const k of ['supplierid', 'distributiontype', 'servicekeys', 'stockqty', 'stockquantity']) {
      expect(m).toMatch(new RegExp(`'${k}'`));
    }
  });

  it('Supplier Adapter: product_masters UPDATE 0 · category/brand 는 read-only SELECT(is_active) 만 · 생성 0', () => {
    const a = stripComments(read(ADAPTER_SVC));
    expect(a).not.toMatch(/UPDATE product_masters|INSERT INTO product_masters/i);
    expect(a).not.toMatch(/INSERT INTO (product_categories|brands)/i);
    expect(a).toMatch(/SELECT id FROM product_categories WHERE id = \$1 AND is_active = true/);
    expect(a).toMatch(/SELECT id FROM brands WHERE id = \$1 AND is_active = true/);
  });
});

describe('F. Candidate metadata 보존 계약 (rawPayload → normalizer → plan → Core)', () => {
  it('mapper 가 categoryId/brandId/brandName/originCountry/specification/regulatoryName/imageUrl/contentImageUrls 를 rawPayload 로 보존', () => {
    const m = stripComments(read(MAPPER));
    for (const k of ['categoryId', 'brandId', 'brandName', 'originCountry', 'specification', 'regulatoryName', 'imageUrl', 'contentImageUrls']) {
      expect(m).toContain(k);
    }
  });

  it('normalizer: evidence.brandId · images(thumbnail/content · candidateImageUrl fallback)', () => {
    const n = stripComments(read(NORMALIZER));
    expect(n).toMatch(/brandId: string \| null/);
    expect(n).toMatch(/images: NormalizedSupplierImage\[\]/);
    expect(n).toContain('candidateImageUrl');
  });

  it('plan: master.metadata = 확인된 refs + originCountry/regulatoryName · effects.images · approvalMeta.imageCount/droppedRefs', () => {
    const p = stripComments(read(PLAN));
    expect(p).toMatch(/metadata: \{[\s\S]*?categoryId: refs\.categoryId,[\s\S]*?brandId: refs\.brandId,[\s\S]*?originCountry: n\.evidence\.originCountry,[\s\S]*?regulatoryName: n\.evidence\.regulatoryName/);
    expect(p).toMatch(/images: n\.images\.map\(/);
    expect(p).toContain('imageCount: n.images.length');
    expect(p).toContain('droppedRefs');
  });

  it('Core: create INSERT 만 metadata 컬럼 사용(link 시 UPDATE 0) · 이미지는 afterCommit(create 만) 에서 product_images INSERT', () => {
    const s = stripComments(read(STORE));
    expect(s).toMatch(/INSERT INTO product_masters[\s\S]*?category_id, brand_id, origin_country/);
    expect(s).not.toMatch(/UPDATE product_masters/i);
    const c = stripComments(read(CORE));
    expect(c).toMatch(/async afterCommit\([\s\S]*?if \(outcome\.kind !== 'create'\) return;[\s\S]*?linkPromotionImages\(/);
    expect(c).toMatch(/INSERT INTO product_images/);
    expect(c).toContain("'candidate_promotion'");
    // 승격 TX 안(promoteWithStore) 에서는 이미지를 쓰지 않는다
    const within = c.slice(c.indexOf('export async function promoteWithStore('));
    expect(within).not.toContain('product_images');
    expect(within).not.toContain('linkPromotionImages(');
  });
});
