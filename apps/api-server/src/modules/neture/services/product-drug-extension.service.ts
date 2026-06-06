/**
 * ProductDrugExtensionService — Drug Extension persistence (의약품 상세·검증·정책)
 *
 * WO-O4O-PRODUCT-DRUG-EXTENSION-PERSISTENCE-V1
 * Baseline: docs/baseline/O4O-PRODUCT-CORE-BASELINE-V1.md §9, §10
 *
 * ProductMaster 1:1 ProductDrugExtension 의 생성·조회·갱신.
 *
 * 안전 원칙:
 *   - 노출/판매 권한을 여는 변경(onlineSaleAllowed / customerDisplayAllowed = true)은 본 service 에서 막는다(후속 정책 WO).
 *   - rawPayload/공급자 문구를 검증 없이 공식 필드로 자동 저장하지 않는다 (호출처 책임, 본 service 는 전달값만 저장).
 *   - ProductMaster.regulatoryType/barcode 변경 없음.
 */

import type { DataSource, Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { ProductDrugExtension } from '../entities/ProductDrugExtension.entity.js';
import type {
  AdvertisingReviewStatus,
  TabletDisplayPolicy,
  PublicDisplayPolicy,
} from '../entities/ProductDrugExtension.entity.js';
import { ProductMaster } from '../entities/ProductMaster.entity.js';
import type { ProductDrugCategory, DrugVerificationStatus, DrugReviewer } from '../utils/product-type.util.js';

export interface DrugExtensionDefaultPolicy {
  pharmacyOnly: boolean;
  customerDisplayAllowed: boolean;
  tabletDisplayAllowed: TabletDisplayPolicy;
  onlineSaleAllowed: boolean;
  advertisingReviewStatus: AdvertisingReviewStatus;
  publicDisplayPolicy: PublicDisplayPolicy;
}

/** 상세/출처/검증 필드 갱신 입력 (정책 enable 필드는 제외 — guard) */
export interface UpdateDrugExtensionInput {
  drugCode?: string | null;
  insuranceCode?: string | null;
  mfdsCode?: string | null;
  atcCode?: string | null;
  approvalNumber?: string | null;
  approvalDate?: string | null;
  regulatoryStatus?: string | null;
  ingredientSummary?: string | null;
  activeIngredients?: Array<{ name: string; amount?: string; unit?: string }> | null;
  dosageForm?: string | null;
  strength?: string | null;
  packageUnit?: string | null;
  packageQuantity?: string | null;
  manufacturerName?: string | null;
  efficacyText?: string | null;
  dosageText?: string | null;
  cautionText?: string | null;
  storageText?: string | null;
  contraindicationText?: string | null;
  dataSource?: string | null;
  mfdsSourceUrl?: string | null;
  efficacySource?: string | null;
  dosageSource?: string | null;
  cautionSource?: string | null;
  storageSource?: string | null;
  /** 광고 검토 상태는 운영자 검토 대상이므로 허용 (단, 노출/판매 enable 은 불가) */
  advertisingReviewStatus?: AdvertisingReviewStatus;
  reviewNote?: string | null;
}

export interface UpdateReviewStatusInput {
  verificationStatus: DrugVerificationStatus;
  reviewerType?: DrugReviewer | null;
  reviewedBy?: string | null;
  reviewNote?: string | null;
}

const DRUG_EXT_CATEGORIES: ProductDrugCategory[] = ['otc', 'rx', 'quasi_drug', 'drug_unspecified'];

export class ProductDrugExtensionService {
  private readonly repo: Repository<ProductDrugExtension>;
  private readonly masterRepo: Repository<ProductMaster>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(ProductDrugExtension);
    this.masterRepo = dataSource.getRepository(ProductMaster);
  }

  /** 분류별 보수 기본 정책 (검토 전 차단 상태). rx 는 광고 blocked. */
  getDefaultExtensionPolicy(drugCategory: ProductDrugCategory): DrugExtensionDefaultPolicy {
    return {
      pharmacyOnly: true,
      customerDisplayAllowed: false,
      tabletDisplayAllowed: 'limited',
      onlineSaleAllowed: false,
      advertisingReviewStatus: drugCategory === 'rx' ? 'blocked' : 'needs_review',
      publicDisplayPolicy: 'blocked',
    };
  }

  async getByProductMasterId(productMasterId: string): Promise<ProductDrugExtension | null> {
    return this.repo.findOne({ where: { productMasterId, deletedAt: IsNull() } });
  }

  /**
   * ProductMaster 의 drug_category 에 맞춰 extension 을 보장(없으면 보수 기본값으로 생성).
   * 비의약품/null drug_category 면 생성하지 않고 null 반환.
   * 기존 row 가 있으면 drug_category mirror 만 동기화.
   */
  async ensureForProductMaster(productMasterId: string): Promise<ProductDrugExtension | null> {
    const master = await this.masterRepo.findOne({ where: { id: productMasterId } });
    if (!master) throw new Error('PRODUCT_MASTER_NOT_FOUND');
    const cat = (master.drugCategory as ProductDrugCategory | null) ?? null;
    if (!cat || !DRUG_EXT_CATEGORIES.includes(cat)) {
      return null; // 비의약품 → extension 생성하지 않음
    }

    const existing = await this.getByProductMasterId(productMasterId);
    if (existing) {
      if (existing.drugCategory !== cat) {
        existing.drugCategory = cat;
        return this.repo.save(existing);
      }
      return existing;
    }

    const policy = this.getDefaultExtensionPolicy(cat);
    const entity = this.repo.create({
      productMasterId,
      drugCategory: cat,
      verificationStatus: 'pending_review',
      pharmacyOnly: policy.pharmacyOnly,
      customerDisplayAllowed: policy.customerDisplayAllowed,
      tabletDisplayAllowed: policy.tabletDisplayAllowed,
      onlineSaleAllowed: policy.onlineSaleAllowed,
      advertisingReviewStatus: policy.advertisingReviewStatus,
      publicDisplayPolicy: policy.publicDisplayPolicy,
    });
    return this.repo.save(entity);
  }

  /** ProductMaster.drug_category → extension.drug_category 동기화 (extension 있을 때만) */
  async syncDrugCategoryFromProductMaster(productMaster: ProductMaster): Promise<ProductDrugExtension | null> {
    const ext = await this.getByProductMasterId(productMaster.id);
    if (!ext) return null;
    const cat = (productMaster.drugCategory as ProductDrugCategory | null) ?? null;
    if (cat && DRUG_EXT_CATEGORIES.includes(cat) && ext.drugCategory !== cat) {
      ext.drugCategory = cat;
      return this.repo.save(ext);
    }
    return ext;
  }

  /**
   * 상세/출처/광고검토 필드 갱신. **노출/판매 enable 은 허용하지 않는다**(필드는 기본 차단 유지).
   */
  async updateDrugExtension(productMasterId: string, input: UpdateDrugExtensionInput): Promise<ProductDrugExtension> {
    const ext = await this.getByProductMasterId(productMasterId);
    if (!ext) throw new Error('DRUG_EXTENSION_NOT_FOUND');

    const fields: (keyof UpdateDrugExtensionInput)[] = [
      'drugCode', 'insuranceCode', 'mfdsCode', 'atcCode', 'approvalNumber', 'approvalDate', 'regulatoryStatus',
      'ingredientSummary', 'activeIngredients', 'dosageForm', 'strength', 'packageUnit', 'packageQuantity', 'manufacturerName',
      'efficacyText', 'dosageText', 'cautionText', 'storageText', 'contraindicationText',
      'dataSource', 'mfdsSourceUrl', 'efficacySource', 'dosageSource', 'cautionSource', 'storageSource',
      'advertisingReviewStatus', 'reviewNote',
    ];
    const target = ext as unknown as Record<string, unknown>;
    for (const key of fields) {
      if (input[key] !== undefined) target[key] = input[key];
    }
    // 노출/판매 enable 필드는 본 service 에서 변경하지 않음 (pharmacyOnly/customerDisplayAllowed/onlineSaleAllowed/publicDisplayPolicy 유지)
    return this.repo.save(ext);
  }

  /** 검증 상태 갱신 */
  async updateReviewStatus(productMasterId: string, input: UpdateReviewStatusInput): Promise<ProductDrugExtension> {
    const ext = await this.getByProductMasterId(productMasterId);
    if (!ext) throw new Error('DRUG_EXTENSION_NOT_FOUND');
    ext.verificationStatus = input.verificationStatus;
    ext.reviewerType = input.reviewerType ?? ext.reviewerType ?? null;
    ext.reviewedBy = input.reviewedBy ?? ext.reviewedBy ?? null;
    ext.reviewedAt = new Date();
    if (input.reviewNote !== undefined) ext.reviewNote = input.reviewNote;
    return this.repo.save(ext);
  }
}
