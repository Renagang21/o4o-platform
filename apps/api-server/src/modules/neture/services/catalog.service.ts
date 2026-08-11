import { Repository } from 'typeorm';
import type { DataSource } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  ProductMaster,
  ProductCategory,
  Brand,
  ProductImage,
} from '../entities/index.js';
import logger from '../../../utils/logger.js';
// WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1
import { PRODUCT_DRUG_CATEGORIES } from '../utils/product-type.util.js';
import type { ProductDrugCategory } from '../utils/product-type.util.js';

/**
 * 상품 이용 상태 — WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1 / ...-STATUS-ACTIONS-V1
 * ACTIVE(정상) / SUSPENDED(이용 중단) / ARCHIVED(보관). DB 컬럼 product_masters.status 와 1:1.
 */
export const PRODUCT_MASTER_STATUSES = ['ACTIVE', 'SUSPENDED', 'ARCHIVED'] as const;
export type ProductMasterStatus = (typeof PRODUCT_MASTER_STATUSES)[number];

/** drug_category 입력 정규화 — 허용값만 통과, 그 외 null */
function normalizeDrugCategory(raw?: string | null): ProductDrugCategory | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  return (PRODUCT_DRUG_CATEGORIES as string[]).includes(v) ? (v as ProductDrugCategory) : null;
}

/**
 * NetureCatalogService
 *
 * ProductMaster, Category, Brand, ProductImage CRUD.
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1 Phase 1).
 */
/**
 * Master 해석 결과.
 *
 * WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1
 *   `created` 는 **이 요청이 master 를 실제로 INSERT 했는지** 를 말한다.
 *   기존 master 를 찾아 반환한 경우(바코드 일치 / 이름+제조사 dedup / 동시등록 경합)는 false 다.
 *   호출자는 이 값으로 "신규 등록" 과 "기존 master 연결" 을 구분해야 한다 —
 *   기존 master 에는 호출자 입력으로 기준정보를 덮어쓰지 않는다.
 */
export interface MasterResolveResult {
  success: boolean;
  data?: ProductMaster;
  /** 이 요청에서 새로 생성했으면 true, 기존 master 를 찾았으면 false (실패 시 undefined) */
  created?: boolean;
  error?: string;
}

export class NetureCatalogService {
  // Lazy repositories
  private _masterRepo?: Repository<ProductMaster>;
  private _categoryRepo?: Repository<ProductCategory>;
  private _brandRepo?: Repository<Brand>;
  private _imageRepo?: Repository<ProductImage>;

  private get masterRepo(): Repository<ProductMaster> {
    if (!this._masterRepo) {
      this._masterRepo = AppDataSource.getRepository(ProductMaster);
    }
    return this._masterRepo;
  }

  private get categoryRepo(): Repository<ProductCategory> {
    if (!this._categoryRepo) {
      this._categoryRepo = AppDataSource.getRepository(ProductCategory);
    }
    return this._categoryRepo;
  }

  private get brandRepo(): Repository<Brand> {
    if (!this._brandRepo) {
      this._brandRepo = AppDataSource.getRepository(Brand);
    }
    return this._brandRepo;
  }

  private get imageRepo(): Repository<ProductImage> {
    if (!this._imageRepo) {
      this._imageRepo = AppDataSource.getRepository(ProductImage);
    }
    return this._imageRepo;
  }

  // ==================== ProductMaster — SSOT 관리 (WO-O4O-PRODUCT-MASTER-CORE-RESET-V1) ====================

  /** Immutable 필드 목록 — UPDATE 시 변경 차단 */
  private static readonly MASTER_IMMUTABLE_FIELDS: (keyof ProductMaster)[] = [
    'barcode',
    'regulatoryType',
    'regulatoryName',
    'manufacturerName',
    'mfdsPermitNumber',
    'mfdsProductId',
  ];

  /**
   * Master 조회 — barcode 기준
   */
  async getProductMasterByBarcode(barcode: string): Promise<ProductMaster | null> {
    // WO-...-BARCODE-NULLABLE-...-V1: 빈값/NULL 로는 조회하지 않는다(실제 바코드만).
    const trimmed = (barcode ?? '').trim();
    if (!trimmed) return null;
    return this.masterRepo.findOne({ where: { barcode: trimmed }, relations: ['category', 'brand'] });
  }

  /**
   * Master 조회 — ID 기준
   */
  async getProductMasterById(id: string): Promise<ProductMaster | null> {
    return this.masterRepo.findOne({ where: { id }, relations: ['category', 'brand'] });
  }

  /**
   * Master 생성 파이프라인
   *
   * WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1
   * WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1:
   *   바코드는 등록 전제조건이 아니다 — 바코드 미제공 시 **합성 내부코드(200…)를 만들지 않고 barcode=NULL** 로
   *   생성한다. 정체성은 ProductMaster.id(UUID). 중복 방지는 이름+제조사(+공식 식별자) 정확 일치.
   *
   * [바코드 제공 시]
   * 1. GTIN 검증
   * 2. 내부 barcode 조회 → 이미 존재하면 반환
   * 3. MFDS stub 호출
   * 4a. MFDS 검증 성공 → MFDS 데이터로 생성 (isMfdsVerified = true)
   * 4b. MFDS 미연동(stub) + manualData 제공 → 수동 데이터로 생성 (isMfdsVerified = false)
   * 4c. 둘 다 없으면 → 에러
   *
   * [바코드 미제공 시] → createMasterWithoutBarcode (이름+제조사 정확 dedup 후 barcode=NULL 등록. 합성 내부코드 생성 안 함)
   *
   * 공급자가 직접 호출 불가. Admin/시스템 전용.
   */
  async resolveOrCreateMaster(
    barcode: string | null | undefined,
    manualData?: {
      regulatoryType?: string;
      regulatoryName?: string;
      manufacturerName?: string;
      name?: string;
      mfdsPermitNumber?: string | null;
      // WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1: OTC/Rx/QUASI active 분류 (optional)
      drugCategory?: string | null;
    }
  ): Promise<MasterResolveResult> {
    const trimmed = (barcode ?? '').trim();

    // 바코드 미제공 → barcode=NULL 로 생성 (합성 내부코드 생성 안 함)
    if (!trimmed) {
      return this.createMasterWithoutBarcode(manualData);
    }

    // 1. GTIN 검증
    const { validateGtin } = await import('../../../utils/gtin.js');
    const gtinError = validateGtin(trimmed);
    if (gtinError) {
      return { success: false, error: `INVALID_GTIN: ${gtinError}` };
    }

    // 2. 내부 조회 — 이미 존재하면 반환
    const existing = await this.masterRepo.findOne({ where: { barcode: trimmed } });
    if (existing) {
      return { success: true, data: existing, created: false };
    }

    // 3. MFDS 조회 (stub)
    const { verifyProductByBarcode } = await import('./mfds.service.js');
    const mfdsResult = await verifyProductByBarcode(trimmed);

    // 4a. MFDS 검증 성공 → MFDS 데이터로 생성
    if (mfdsResult.verified && mfdsResult.product) {
      const master = this.masterRepo.create({
        barcode: trimmed,
        regulatoryType: mfdsResult.product.regulatoryType,
        regulatoryName: mfdsResult.product.regulatoryName,
        name: mfdsResult.product.regulatoryName,
        manufacturerName: mfdsResult.product.manufacturerName,
        mfdsPermitNumber: mfdsResult.product.permitNumber || null,
        mfdsProductId: mfdsResult.product.productId || trimmed,
        isMfdsVerified: true,
        mfdsSyncedAt: new Date(),
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureCatalogService] Created ProductMaster ${saved.id} for barcode ${trimmed} (MFDS verified)`);
      return { success: true, data: saved, created: true };
    }

    // 4b. MFDS 미연동 + manualData 제공 → 수동 생성
    if (manualData) {
      const effectiveRegName = manualData.regulatoryName || manualData.name || 'UNKNOWN';
      const effectiveName = manualData.name || manualData.regulatoryName || 'UNKNOWN';
      const master = this.masterRepo.create({
        barcode: trimmed,
        regulatoryType: manualData.regulatoryType || '일반',
        regulatoryName: effectiveRegName,
        name: effectiveName,
        manufacturerName: manualData.manufacturerName || '',
        mfdsPermitNumber: manualData.mfdsPermitNumber ?? null,
        mfdsProductId: trimmed, // MFDS 미연동 시 barcode를 ID로 사용
        isMfdsVerified: false,
        mfdsSyncedAt: null,
        // WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1: 제공 시 active 분류 저장 (없으면 null)
        drugCategory: normalizeDrugCategory(manualData.drugCategory),
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureCatalogService] Created ProductMaster ${saved.id} for barcode ${trimmed} (manual, MFDS unverified)`);
      return { success: true, data: saved, created: true };
    }

    // 4c. 둘 다 없음 → 에러
    return { success: false, error: mfdsResult.error || 'MFDS_VERIFICATION_FAILED' };
  }

  /**
   * 바코드 없는 Master 생성 — barcode=NULL (합성 내부코드 생성 안 함)
   *
   * WO-O4O-PRODUCT-BARCODE-NULLABLE-AND-INTERNAL-CODE-GENERATION-STOP-V1
   *   - 정체성 = ProductMaster.id(UUID). 합성 200 코드·INTERNAL_O4O·합성 mfds_product_id 를 만들지 않는다.
   *   - barcode UNIQUE 충돌 없음(NULL) → 재시도 루프 불필요.
   *   - 중복 방지 = 이름+제조사(정규화) 정확 일치(기존 검사 유지). 이름-유사 매칭 재도입 금지.
   *   - 규제 카테고리 특례 없음 — 모든 제품이 동일하게 바코드 없이 생성 가능.
   */
  private async createMasterWithoutBarcode(
    manualData?: {
      regulatoryType?: string;
      regulatoryName?: string;
      manufacturerName?: string;
      name?: string;
      mfdsPermitNumber?: string | null;
      drugCategory?: string | null;
    }
  ): Promise<MasterResolveResult> {
    const name = (manualData?.name || manualData?.regulatoryName || '').trim();
    if (!name) {
      // 바코드도 MFDS도 없으므로 최소 식별 정보(상품명)는 필요
      return { success: false, error: 'NAME_REQUIRED_WITHOUT_BARCODE' };
    }
    const manufacturerName = (manualData?.manufacturerName || '').trim();

    // 중복 방지: 이름+제조사 정확 일치로 기존 Master 조회
    const existing = await this.findMasterByNameAndManufacturer(name, manufacturerName);
    if (existing) {
      return { success: true, data: existing, created: false };
    }

    const effectiveRegName = (manualData?.regulatoryName || name).trim();
    const master = this.masterRepo.create({
      barcode: null, // 실제 바코드 없음 — 합성코드 금지
      regulatoryType: manualData?.regulatoryType || '일반',
      regulatoryName: effectiveRegName,
      name,
      manufacturerName,
      mfdsPermitNumber: manualData?.mfdsPermitNumber ?? null,
      mfdsProductId: null, // 공식 값 없으면 NULL — 합성코드 금지
      isMfdsVerified: false,
      mfdsSyncedAt: null,
      drugCategory: normalizeDrugCategory(manualData?.drugCategory),
    });

    try {
      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureCatalogService] Created ProductMaster ${saved.id} (barcode=NULL, no synthetic code)`);
      return { success: true, data: saved, created: true };
    } catch (e: any) {
      // 동시 등록으로 방금 같은 이름+제조사가 생겼을 수 있음 → 재조회
      const raced = await this.findMasterByNameAndManufacturer(name, manufacturerName);
      if (raced) {
        // 경합으로 다른 요청이 먼저 만들었다 — 이 요청 기준으로는 "기존 master" 다.
        return { success: true, data: raced, created: false };
      }
      logger.error('[NetureCatalogService] Failed to create master without barcode:', e);
      return { success: false, error: 'MASTER_CREATE_FAILED' };
    }
  }

  /** 이름+제조사(대소문자·공백 정규화) 기준 Master 조회 — 바코드 없는 등록의 중복 방지용 */
  private async findMasterByNameAndManufacturer(
    name: string,
    manufacturerName: string
  ): Promise<ProductMaster | null> {
    // 이 파일의 검증된 검색 쿼리와 동일하게 QueryBuilder raw 문자열엔 실제 컬럼명 사용
    // (m.manufacturer_name — property명 m.manufacturerName 은 함수식 안에서 컬럼 매핑 안 됨)
    const qb = this.masterRepo
      .createQueryBuilder('m')
      .where('LOWER(TRIM(m.name)) = LOWER(TRIM(:name))', { name });
    if (manufacturerName) {
      qb.andWhere('LOWER(TRIM(m.manufacturer_name)) = LOWER(TRIM(:mfr))', { mfr: manufacturerName });
    } else {
      qb.andWhere("COALESCE(TRIM(m.manufacturer_name), '') = ''");
    }
    return qb.getOne();
  }

  /** Postgres UNIQUE 위반 판별 */
  private isUniqueViolation(e: any): boolean {
    return e?.code === '23505' || /duplicate key value/i.test(e?.message || '');
  }

  /**
   * Master 업데이트 — immutable 필드 변경 차단 (런타임 Guard)
   *
   * 변경 가능: name, brandName, categoryId, brandId, specification, originCountry, tags
   * 변경 불가: barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId
   */
  async updateProductMaster(
    masterId: string,
    updates: Record<string, unknown>
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
    // Immutable Guard — 런타임 보호
    const violatedFields = NetureCatalogService.MASTER_IMMUTABLE_FIELDS.filter(
      (field) => field in updates
    );
    if (violatedFields.length > 0) {
      return {
        success: false,
        error: `IMMUTABLE_FIELD_VIOLATION: ${violatedFields.join(', ')}`,
      };
    }

    const master = await this.masterRepo.findOne({ where: { id: masterId } });
    if (!master) {
      return { success: false, error: 'MASTER_NOT_FOUND' };
    }

    // 허용 필드만 적용
    if ('name' in updates && typeof updates.name === 'string') {
      master.name = updates.name;
    }
    if ('brandName' in updates) {
      master.brandName = updates.brandName as string | null;
    }
    // WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1: 확장 필드
    // WO-NETURE-SUPPLIER-PRODUCT-SAVE-ERROR-RESOLUTION-V1: empty string → null (UUID 컬럼 보호)
    if ('categoryId' in updates) {
      master.categoryId = (updates.categoryId as string | null) || null;
    }
    if ('brandId' in updates) {
      master.brandId = (updates.brandId as string | null) || null;
    }
    if ('specification' in updates) {
      master.specification = updates.specification as string | null;
    }
    if ('originCountry' in updates) {
      master.originCountry = updates.originCountry as string | null;
    }
    if ('tags' in updates && Array.isArray(updates.tags)) {
      master.tags = updates.tags as string[];
    }
    // WO-O4O-PRODUCT-DRUG-CATEGORY-ACTIVE-MODEL-F1-V1: 의약품 분류 refine 허용 (mutable, 허용값만)
    if ('drugCategory' in updates) {
      master.drugCategory = normalizeDrugCategory(updates.drugCategory as string | null);
    }

    const saved = await this.masterRepo.save(master);
    return { success: true, data: saved };
  }

  /**
   * Master 전체 목록 (Admin 전용)
   */
  async getAllProductMasters() {
    return this.masterRepo.find({ relations: ['category', 'brand'], order: { createdAt: 'DESC' } });
  }

  /**
   * Master 검색 — WO-O4O-GLOBAL-PRODUCT-LIBRARY-SEARCH-V1
   * 텍스트(이름/바코드/제조사) + 카테고리/브랜드 필터 + 페이지네이션
   */
  async searchProductMasters(params: {
    q?: string;
    categoryId?: string;
    brandId?: string;
    /** 표시용 분류 필터 (WO-...-STANDARD-PICKER...): additive, 미전달 시 미적용 */
    regulatoryType?: string;
    drugCategory?: string;
    /**
     * 이용 상태 필터 (WO-...-STATUS-ACTIONS-V1). 미전달 시 기본 ACTIVE-only.
     * 참여자용 검색(공급자/매장/저작 picker)은 이 파라미터를 넘기지 않으므로 SUSPENDED/ARCHIVED 가 노출되지 않는다.
     * 관리자 목록만 명시적으로 statuses 를 전달해 전체/특정 상태를 조회한다.
     */
    statuses?: ProductMasterStatus[];
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductMaster[]; total: number }> {
    const page = params.page || 1;
    // WO-O4O-ADMIN-PRODUCT-MASTER-TABLE-PERFORMANCE-V1: 관리 목록 페이지 크기 최대 100 지원 (cap 50→100)
    const limit = Math.min(params.limit || 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.masterRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'c')
      .leftJoinAndSelect('m.brand', 'b');

    if (params.q) {
      // WO-O4O-PRODUCT-ALIAS-FOUNDATION-V1: alias 포함 검색
      qb.andWhere(
        `(m.name ILIKE :q
          OR m.regulatory_name ILIKE :q
          OR m.barcode ILIKE :q
          OR m.manufacturer_name ILIKE :q
          OR EXISTS (
            SELECT 1 FROM product_aliases pa
            WHERE pa.product_master_id = m.id AND pa.alias ILIKE :q
          ))`,
        { q: `%${params.q}%` },
      );
      // 점수 기반 정렬: name 정확 일치 → alias 일치 → 부분 일치
      // WO-O4O-FIX-PRODUCT-SEARCH-ORDERBY-ALIAS-V1:
      //   multi-line CASE 식을 orderBy 첫 인자에 직접 넣으면 TypeORM 이 alias 로 파싱하여
      //   '"CASE\n WHEN LOWER(m" alias was not found' 오류가 난다 (getManyAndCount 페이지네이션 wrap).
      //   addSelect 로 명시적 alias 'search_rank' 부여 후 alias 로 정렬.
      //   forum.search.service.ts 의 ts_rank_cd 패턴과 동일.
      qb.addSelect(
        `CASE
           WHEN LOWER(m.name) = LOWER(:exactQ) THEN 0
           WHEN EXISTS (SELECT 1 FROM product_aliases pa WHERE pa.product_master_id = m.id AND LOWER(pa.alias) = LOWER(:exactQ)) THEN 1
           ELSE 2
         END`,
        'search_rank',
      );
      qb.orderBy('search_rank', 'ASC').addOrderBy('m.name', 'ASC');
      qb.setParameter('exactQ', params.q);
    } else {
      qb.orderBy('m.name', 'ASC');
    }
    if (params.categoryId) {
      qb.andWhere('m.category_id = :categoryId', { categoryId: params.categoryId });
    }
    if (params.brandId) {
      qb.andWhere('m.brand_id = :brandId', { brandId: params.brandId });
    }
    if (params.regulatoryType) {
      qb.andWhere('m.regulatory_type = :regulatoryType', { regulatoryType: params.regulatoryType });
    }
    if (params.drugCategory) {
      qb.andWhere('m.drug_category = :drugCategory', { drugCategory: params.drugCategory });
    }
    // 이용 상태 필터 — 미전달 시 기본 ACTIVE-only (참여자 검색에서 SUSPENDED/ARCHIVED 제외)
    const statuses: ProductMasterStatus[] = params.statuses && params.statuses.length ? params.statuses : ['ACTIVE'];
    qb.andWhere('m.status IN (:...statuses)', { statuses });

    qb.skip(offset).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  /**
   * 상품 이용 상태 단건 변경 — WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1
   *
   * product_masters.status 변경 + 변경 이력을 product_master_notes 시스템 메모로 기록(단일 트랜잭션).
   * 신규 감사 테이블/승인 흐름 없음. 참여자·공급자·매장·주문·콘텐츠 등 사용처 데이터는 **일절 변경하지 않는다**.
   * 같은 상태로의 변경은 no-op (changed=false, 메모 미기록). raw parameterized SQL(FOR UPDATE 로 경합 방지).
   */
  async setProductMasterStatus(params: {
    masterId: string;
    status: ProductMasterStatus;
    reason?: string | null;
    actorId: string;
  }): Promise<{ found: boolean; previousStatus?: ProductMasterStatus; changed: boolean }> {
    const { masterId, status, reason, actorId } = params;
    const qr = AppDataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      const cur: Array<{ status: string | null }> = await qr.query(
        `SELECT status FROM product_masters WHERE id = $1 FOR UPDATE`,
        [masterId],
      );
      if (cur.length === 0) {
        await qr.rollbackTransaction();
        return { found: false, changed: false };
      }
      const previousStatus = (cur[0].status as ProductMasterStatus) ?? 'ACTIVE';
      if (previousStatus === status) {
        await qr.rollbackTransaction();
        return { found: true, previousStatus, changed: false };
      }
      await qr.query(
        `UPDATE product_masters SET status = $2, updated_at = NOW() WHERE id = $1`,
        [masterId, status],
      );
      const trimmedReason = (reason ?? '').trim();
      const noteBody =
        `상품 상태 변경: ${previousStatus} → ${status}` +
        (trimmedReason ? `\n사유: ${trimmedReason}` : '');
      await qr.query(
        `INSERT INTO product_master_notes (product_master_id, note, visibility, created_by)
         VALUES ($1, $2, 'internal', $3)`,
        [masterId, noteBody, actorId],
      );
      await qr.commitTransaction();
      return { found: true, previousStatus, changed: true };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  // ==================== ProductCategory — 카테고리 관리 (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * 카테고리 트리 (root → children, in-memory 빌드)
   */
  async getCategoryTree(): Promise<ProductCategory[]> {
    const all = await this.categoryRepo.find({ order: { depth: 'ASC', sortOrder: 'ASC', name: 'ASC' } });
    const map = new Map<string, ProductCategory & { children: ProductCategory[] }>();
    const roots: (ProductCategory & { children: ProductCategory[] })[] = [];

    for (const cat of all) {
      map.set(cat.id, { ...cat, children: [] });
    }
    for (const cat of all) {
      const node = map.get(cat.id)!;
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /**
   * 카테고리 생성 (depth 자동 계산, 최대 4단계: 0-3)
   */
  async createCategory(data: {
    name: string;
    slug: string;
    parentId?: string | null;
    sortOrder?: number;
    isRegulated?: boolean;
  }): Promise<ProductCategory> {
    let depth = 0;
    if (data.parentId) {
      const parent = await this.categoryRepo.findOne({ where: { id: data.parentId } });
      if (!parent) throw new Error('PARENT_CATEGORY_NOT_FOUND');
      if (parent.depth >= 3) throw new Error('MAX_CATEGORY_DEPTH_EXCEEDED');
      depth = parent.depth + 1;
    }
    const cat = this.categoryRepo.create({
      name: data.name,
      slug: data.slug,
      parentId: data.parentId || null,
      depth,
      sortOrder: data.sortOrder || 0,
      isActive: true,
      isRegulated: data.isRegulated ?? false,
    });
    return this.categoryRepo.save(cat);
  }

  /**
   * 카테고리 수정
   */
  async updateCategory(id: string, data: Partial<{
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
    isRegulated: boolean;
  }>): Promise<ProductCategory> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new Error('CATEGORY_NOT_FOUND');
    Object.assign(cat, data);
    return this.categoryRepo.save(cat);
  }

  /**
   * 카테고리 삭제 (FK SET NULL → 자식/상품 안전)
   */
  async deleteCategory(id: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id } });
    if (!cat) throw new Error('CATEGORY_NOT_FOUND');
    await this.categoryRepo.delete(id);
  }

  // ==================== Brand — 브랜드 관리 (WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1) ====================

  /**
   * 브랜드 전체 목록
   */
  async getAllBrands(): Promise<Brand[]> {
    return this.brandRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  /**
   * 브랜드 생성
   */
  async createBrand(data: {
    name: string;
    slug: string;
    manufacturerName?: string;
    countryOfOrigin?: string;
  }): Promise<Brand> {
    const brand = this.brandRepo.create({
      name: data.name,
      slug: data.slug,
      manufacturerName: data.manufacturerName || null,
      countryOfOrigin: data.countryOfOrigin || null,
      isActive: true,
    });
    return this.brandRepo.save(brand);
  }

  /**
   * 브랜드 수정
   */
  async updateBrand(id: string, data: Partial<{
    name: string;
    slug: string;
    manufacturerName: string;
    countryOfOrigin: string;
    isActive: boolean;
  }>): Promise<Brand> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new Error('BRAND_NOT_FOUND');
    Object.assign(brand, data);
    return this.brandRepo.save(brand);
  }

  /**
   * 브랜드 삭제 (FK SET NULL → ProductMaster 안전)
   */
  async deleteBrand(id: string): Promise<void> {
    const brand = await this.brandRepo.findOne({ where: { id } });
    if (!brand) throw new Error('BRAND_NOT_FOUND');
    await this.brandRepo.delete(id);
  }

  /**
   * 브랜드 검색 (이름 ILIKE) + 상품 수 포함
   * WO-NETURE-BRAND-MANAGEMENT-V1
   */
  async searchBrands(search?: string): Promise<Array<Brand & { productCount: number }>> {
    const ds: DataSource = AppDataSource;
    const params: any[] = [];
    let searchFilter = '';
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      searchFilter = `WHERE b.name ILIKE $${params.length}`;
    }
    const rows = await ds.query(`
      SELECT b.*,
             COALESCE(pc.cnt, 0)::int AS "productCount"
      FROM brands b
      LEFT JOIN (
        SELECT brand_id, COUNT(*)::int AS cnt
        FROM product_masters
        WHERE brand_id IS NOT NULL
        GROUP BY brand_id
      ) pc ON pc.brand_id = b.id
      ${searchFilter}
      ORDER BY b.name ASC
    `, params);
    return rows;
  }

  /**
   * 브랜드 병합 — source → target
   * 1. product_masters.brand_id 변경
   * 2. source 브랜드 삭제
   * WO-NETURE-BRAND-MANAGEMENT-V1
   */
  async mergeBrands(sourceBrandId: string, targetBrandId: string): Promise<{ merged: number }> {
    if (sourceBrandId === targetBrandId) throw new Error('SAME_BRAND');

    const ds: DataSource = AppDataSource;
    const source = await this.brandRepo.findOne({ where: { id: sourceBrandId } });
    if (!source) throw new Error('SOURCE_BRAND_NOT_FOUND');
    const target = await this.brandRepo.findOne({ where: { id: targetBrandId } });
    if (!target) throw new Error('TARGET_BRAND_NOT_FOUND');

    const queryRunner = ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // 1. product_masters 이관
      const updateResult = await queryRunner.query(
        `UPDATE product_masters SET brand_id = $1 WHERE brand_id = $2`,
        [targetBrandId, sourceBrandId],
      );
      const merged = updateResult?.[1] ?? 0;

      // 2. source 삭제
      await queryRunner.query(`DELETE FROM brands WHERE id = $1`, [sourceBrandId]);

      await queryRunner.commitTransaction();
      logger.info(`[Brand Merge] ${source.name} → ${target.name}: ${merged} products migrated`);
      return { merged };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ==================== ProductImage — 상품 이미지 관리 (WO-O4O-NETURE-PRODUCT-IMAGE-STRUCTURE-V1) ====================

  /**
   * 특정 Master의 이미지 목록 조회
   */
  async getProductImages(masterId: string): Promise<ProductImage[]> {
    return this.imageRepo.find({
      where: { masterId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /**
   * 이미지 추가 — type 기반 관리 (WO-NETURE-IMAGE-ASSET-STRUCTURE-V1)
   * - thumbnail: master당 1개, 기존 있으면 교체, isPrimary=true 강제
   * - detail/content: 다수 허용, 첫 이미지면 자동 대표
   */
  async addProductImage(
    masterId: string,
    imageUrl: string,
    gcsPath: string,
    type: 'thumbnail' | 'detail' | 'content' = 'detail',
    isPrimary?: boolean
  ): Promise<ProductImage & { replacedGcsPath?: string }> {
    let replacedGcsPath: string | undefined;

    if (type === 'thumbnail') {
      // 기존 썸네일 있으면 삭제 (교체)
      const existing = await this.imageRepo.findOne({ where: { masterId, type: 'thumbnail' } });
      if (existing) {
        replacedGcsPath = existing.gcsPath;
        await this.imageRepo.delete(existing.id);
      }
    }

    const existingCount = await this.imageRepo.count({ where: { masterId } });

    const image = this.imageRepo.create({
      masterId,
      imageUrl,
      gcsPath,
      type,
      isPrimary: type === 'thumbnail' ? true : (isPrimary ?? existingCount === 0),
      sortOrder: existingCount,
    });

    // thumbnail이면 기존 primary 해제
    if (type === 'thumbnail') {
      await this.imageRepo.update({ masterId, isPrimary: true }, { isPrimary: false });
    }

    const saved = await this.imageRepo.save(image);
    return Object.assign(saved, { replacedGcsPath });
  }

  /**
   * 대표 이미지 변경
   */
  async setPrimaryImage(imageId: string, masterId: string): Promise<void> {
    // 트랜잭션: 기존 primary → false, 선택 → true
    await AppDataSource.transaction(async (manager) => {
      await manager.update(ProductImage, { masterId, isPrimary: true }, { isPrimary: false });
      await manager.update(ProductImage, { id: imageId, masterId }, { isPrimary: true });
    });
  }

  /**
   * 이미지 삭제 — gcsPath 반환 (GCS 삭제는 호출자가 수행)
   */
  async deleteProductImage(imageId: string, masterId: string): Promise<{ gcsPath: string }> {
    const image = await this.imageRepo.findOne({ where: { id: imageId, masterId } });
    if (!image) throw new Error('IMAGE_NOT_FOUND');

    const { gcsPath, isPrimary } = image;
    await this.imageRepo.delete(imageId);

    // 대표 이미지 삭제 시, 다음 이미지를 대표로 승격
    if (isPrimary) {
      const next = await this.imageRepo.findOne({
        where: { masterId },
        order: { sortOrder: 'ASC' },
      });
      if (next) {
        next.isPrimary = true;
        await this.imageRepo.save(next);
      }
    }

    return { gcsPath };
  }
}
