import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  ProductMaster,
  ProductCategory,
  Brand,
  ProductImage,
} from '../entities/index.js';
import logger from '../../../utils/logger.js';

/**
 * NetureCatalogService
 *
 * ProductMaster, Category, Brand, ProductImage CRUD.
 * Extracted from NetureService (WO-O4O-NETURE-SERVICE-SPLIT-V1 Phase 1).
 */
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
    return this.masterRepo.findOne({ where: { barcode }, relations: ['category', 'brand'] });
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
   * 1. GTIN 검증
   * 2. 내부 barcode 조회 → 이미 존재하면 반환
   * 3. MFDS stub 호출
   * 4a. MFDS 검증 성공 → MFDS 데이터로 생성 (isMfdsVerified = true)
   * 4b. MFDS 미연동(stub) + manualData 제공 → 수동 데이터로 생성 (isMfdsVerified = false)
   * 4c. 둘 다 없으면 → 에러
   *
   * 공급자가 직접 호출 불가. Admin/시스템 전용.
   */
  async resolveOrCreateMaster(
    barcode: string,
    manualData?: {
      regulatoryType?: string;
      regulatoryName?: string;
      manufacturerName?: string;
      marketingName?: string;
      mfdsPermitNumber?: string | null;
    }
  ): Promise<{ success: boolean; data?: ProductMaster; error?: string }> {
    // 1. GTIN 검증
    const { validateGtin } = await import('../../../utils/gtin.js');
    const gtinError = validateGtin(barcode);
    if (gtinError) {
      return { success: false, error: `INVALID_GTIN: ${gtinError}` };
    }

    // 2. 내부 조회 — 이미 존재하면 반환
    const existing = await this.masterRepo.findOne({ where: { barcode } });
    if (existing) {
      return { success: true, data: existing };
    }

    // 3. MFDS 조회 (stub)
    const { verifyProductByBarcode } = await import('./mfds.service.js');
    const mfdsResult = await verifyProductByBarcode(barcode);

    // 4a. MFDS 검증 성공 → MFDS 데이터로 생성
    if (mfdsResult.verified && mfdsResult.product) {
      const master = this.masterRepo.create({
        barcode,
        regulatoryType: mfdsResult.product.regulatoryType,
        regulatoryName: mfdsResult.product.regulatoryName,
        marketingName: mfdsResult.product.regulatoryName,
        manufacturerName: mfdsResult.product.manufacturerName,
        mfdsPermitNumber: mfdsResult.product.permitNumber || null,
        mfdsProductId: mfdsResult.product.productId || barcode,
        isMfdsVerified: true,
        mfdsSyncedAt: new Date(),
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureCatalogService] Created ProductMaster ${saved.id} for barcode ${barcode} (MFDS verified)`);
      return { success: true, data: saved };
    }

    // 4b. MFDS 미연동 + manualData 제공 → 수동 생성
    if (manualData) {
      const effectiveRegName = manualData.regulatoryName || manualData.marketingName || 'UNKNOWN';
      const effectiveMarketing = manualData.marketingName || manualData.regulatoryName || 'UNKNOWN';
      const master = this.masterRepo.create({
        barcode,
        regulatoryType: manualData.regulatoryType || '일반',
        regulatoryName: effectiveRegName,
        marketingName: effectiveMarketing,
        manufacturerName: manualData.manufacturerName || '',
        mfdsPermitNumber: manualData.mfdsPermitNumber ?? null,
        mfdsProductId: barcode, // MFDS 미연동 시 barcode를 ID로 사용
        isMfdsVerified: false,
        mfdsSyncedAt: null,
      });

      const saved = await this.masterRepo.save(master);
      logger.info(`[NetureCatalogService] Created ProductMaster ${saved.id} for barcode ${barcode} (manual, MFDS unverified)`);
      return { success: true, data: saved };
    }

    // 4c. 둘 다 없음 → 에러
    return { success: false, error: mfdsResult.error || 'MFDS_VERIFICATION_FAILED' };
  }

  /**
   * Master 업데이트 — immutable 필드 변경 차단 (런타임 Guard)
   *
   * 변경 가능: marketingName, brandName, categoryId, brandId, specification, originCountry, tags
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
    if ('marketingName' in updates && typeof updates.marketingName === 'string') {
      master.marketingName = updates.marketingName;
    }
    if ('brandName' in updates) {
      master.brandName = updates.brandName as string | null;
    }
    // WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1: 확장 필드
    if ('categoryId' in updates) {
      master.categoryId = updates.categoryId as string | null;
    }
    if ('brandId' in updates) {
      master.brandId = updates.brandId as string | null;
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
    page?: number;
    limit?: number;
  }): Promise<{ data: ProductMaster[]; total: number }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 50);
    const offset = (page - 1) * limit;

    const qb = this.masterRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'c')
      .leftJoinAndSelect('m.brand', 'b');

    if (params.q) {
      qb.andWhere(
        '(m.marketing_name ILIKE :q OR m.regulatory_name ILIKE :q OR m.barcode ILIKE :q OR m.manufacturer_name ILIKE :q)',
        { q: `%${params.q}%` },
      );
    }
    if (params.categoryId) {
      qb.andWhere('m.category_id = :categoryId', { categoryId: params.categoryId });
    }
    if (params.brandId) {
      qb.andWhere('m.brand_id = :brandId', { brandId: params.brandId });
    }

    qb.orderBy('m.marketing_name', 'ASC')
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
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
   * 이미지 추가 — 첫 이미지면 자동 대표
   */
  async addProductImage(
    masterId: string,
    imageUrl: string,
    gcsPath: string,
    isPrimary?: boolean
  ): Promise<ProductImage> {
    // 기존 이미지 수 확인
    const existingCount = await this.imageRepo.count({ where: { masterId } });

    const image = this.imageRepo.create({
      masterId,
      imageUrl,
      gcsPath,
      isPrimary: isPrimary ?? existingCount === 0, // 첫 이미지면 자동 대표
      sortOrder: existingCount,
    });

    return this.imageRepo.save(image);
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
