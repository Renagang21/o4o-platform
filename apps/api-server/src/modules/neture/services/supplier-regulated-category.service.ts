import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import path from 'path';
import { In, type DataSource, type Repository } from 'typeorm';
import { KycDocument } from '../../../entities/KycDocument.js';
import {
  NetureSupplier,
  NetureSupplierRegulatedCategory,
  REGULATED_CATEGORIES,
  REGULATED_CATEGORY_STATUSES,
  type RegulatedCategory,
  type RegulatedCategoryStatus,
} from '../entities/index.js';
import logger from '../../../utils/logger.js';

/**
 * SupplierRegulatedCategoryService
 *
 * WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
 *
 * 공급자 품목군(규제 카테고리) 선택 + 증빙 PDF 제출 + O4O 내부 등록 가능 상태 검토.
 * 증빙 PDF 는 kyc_documents(private GCS) 재사용. 제품 등록 gate 미연결.
 */

// 운영자/admin 가 설정 가능한 검토 상태
const REVIEWABLE_STATUSES: RegulatedCategoryStatus[] = ['approved', 'rejected', 'needs_update', 'suspended'];
// 공급자가 삭제(선택 해제) 가능한 상태 — 검토중/승인/제한 상태는 잠금
const SUPPLIER_REMOVABLE_STATUSES: RegulatedCategoryStatus[] = ['not_requested', 'rejected', 'needs_update'];

function decodeOriginalName(name: string): string {
  if (/[ᄀ-ᇿ㄰-㆏가-힯]/.test(name)) return name;
  if (/[^\x00-\x7F]/.test(name)) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (/[ᄀ-ᇿ㄰-㆏가-힯]/.test(decoded)) return decoded;
  }
  return name;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRegulatedCategory(value: string): value is RegulatedCategory {
  return (REGULATED_CATEGORIES as readonly string[]).includes(value);
}

function isRegulatedCategoryStatus(value: string): value is RegulatedCategoryStatus {
  return (REGULATED_CATEGORY_STATUSES as readonly string[]).includes(value);
}

// ==================== 제품 등록 gate (WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1) ====================

export type ProductCategoryGateReason =
  | 'SUPPLIER_CATEGORY_NOT_SELECTED'
  | 'SUPPLIER_CATEGORY_NOT_APPROVED'
  | 'SUPPLIER_CATEGORY_NEEDS_UPDATE'
  | 'SUPPLIER_CATEGORY_REJECTED'
  | 'SUPPLIER_CATEGORY_SUSPENDED'
  | 'SUPPLIER_CATEGORY_UNRESOLVED';

export interface ProductCategoryGateResult {
  allowed: boolean;
  category: RegulatedCategory | null;
  status: RegulatedCategoryStatus | null;
  reasonCode: ProductCategoryGateReason | null;
}

export interface ProductRegulatedCategoryInput {
  regulatoryType?: string | null;
  categoryName?: string | null;
  categorySlug?: string | null;
}

/**
 * 제품 분류값(regulatoryType + ProductCategory name/slug)을 공급자 품목군으로 최소 매핑.
 * 기존 제품 분류 개편 없이 현행 값만 사용한다. 의약품/OTC/Rx 상세 흐름은 건드리지 않음.
 */
export function resolveRegulatedCategoryFromProduct(input: ProductRegulatedCategoryInput): RegulatedCategory | null {
  const rt = (input.regulatoryType || '').trim().toUpperCase();
  const name = input.categoryName || '';
  const slug = (input.categorySlug || '').toLowerCase();
  const looksMedicalDevice = /의료\s*기기/.test(name) || /medical|device/.test(slug);
  const looksFood = (/식품/.test(name) && !/건강\s*기능/.test(name)) || /(^|[-_])food/.test(slug);

  switch (rt) {
    case 'DRUG':
      return 'pharmaceutical';
    case 'QUASI_DRUG':
      return 'quasi_drug';
    case 'HEALTH_FUNCTIONAL':
      return 'health_functional_food';
    case 'COSMETIC':
      return 'cosmetics';
    case 'GENERAL':
      if (looksMedicalDevice) return 'medical_device';
      if (looksFood) return 'food';
      return 'general';
    default:
      // regulatoryType 미상 — category hint 로만 최소 판정, 그 외엔 확인 불가
      if (looksMedicalDevice) return 'medical_device';
      if (looksFood) return 'food';
      return null;
  }
}

export class SupplierRegulatedCategoryService {
  private storage = new Storage();
  private bucketName = process.env.GCS_PRIVATE_DOCUMENT_BUCKET || 'o4o-private-documents';
  private supplierRepo: Repository<NetureSupplier>;
  private categoryRepo: Repository<NetureSupplierRegulatedCategory>;
  private documentRepo: Repository<KycDocument>;

  constructor(private dataSource: DataSource) {
    this.supplierRepo = dataSource.getRepository(NetureSupplier);
    this.categoryRepo = dataSource.getRepository(NetureSupplierRegulatedCategory);
    this.documentRepo = dataSource.getRepository(KycDocument);
  }

  /** 공급자의 전체 품목군 행 + 증빙 문서 메타 */
  async listForSupplier(supplierId: string) {
    const rows = await this.categoryRepo.find({
      where: { supplierId },
      order: { createdAt: 'ASC' },
    });
    const docIds = rows.map((r) => r.evidenceDocumentId).filter(Boolean) as string[];
    const docMap = new Map<string, KycDocument>();
    if (docIds.length > 0) {
      const docs = await this.documentRepo.find({ where: { id: In(docIds) } });
      for (const d of docs) docMap.set(d.id, d);
    }
    return rows.map((r) => this.mapCategory(r, r.evidenceDocumentId ? docMap.get(r.evidenceDocumentId) ?? null : null));
  }

  /** 공급자 품목군 → 현재 상태 맵 (제품 등록 gate 용 batch 조회) */
  async getStatusMap(supplierId: string): Promise<Map<string, RegulatedCategoryStatus>> {
    const rows = await this.categoryRepo.find({ where: { supplierId } });
    return new Map(rows.map((r) => [r.category, r.status as RegulatedCategoryStatus]));
  }

  /**
   * 제품 등록 gate 판정 — 해당 품목군이 approved 일 때만 allowed.
   * statusMap 은 getStatusMap() 결과를 재사용(여러 offer 일괄 처리 시 1회 조회).
   */
  evaluateGate(
    category: RegulatedCategory | null,
    statusMap: Map<string, RegulatedCategoryStatus>,
  ): ProductCategoryGateResult {
    if (!category) {
      return { allowed: false, category: null, status: null, reasonCode: 'SUPPLIER_CATEGORY_UNRESOLVED' };
    }
    const status = statusMap.get(category) ?? null;
    if (!status || status === 'not_requested') {
      return { allowed: false, category, status, reasonCode: 'SUPPLIER_CATEGORY_NOT_SELECTED' };
    }
    if (status === 'approved') {
      return { allowed: true, category, status, reasonCode: null };
    }
    const reasonByStatus: Record<string, ProductCategoryGateReason> = {
      submitted: 'SUPPLIER_CATEGORY_NOT_APPROVED',
      needs_update: 'SUPPLIER_CATEGORY_NEEDS_UPDATE',
      rejected: 'SUPPLIER_CATEGORY_REJECTED',
      suspended: 'SUPPLIER_CATEGORY_SUSPENDED',
    };
    return { allowed: false, category, status, reasonCode: reasonByStatus[status] ?? 'SUPPLIER_CATEGORY_NOT_APPROVED' };
  }

  /** 공급자가 품목군 선택(행 생성). 이미 있으면 기존 행 반환. */
  async selectCategory(supplierId: string, category: string) {
    if (!isRegulatedCategory(category)) return { success: false as const, error: 'INVALID_CATEGORY' };
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) return { success: false as const, error: 'SUPPLIER_NOT_FOUND' };

    let row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row) {
      row = this.categoryRepo.create({ supplierId, category, status: 'not_requested' });
      row = await this.categoryRepo.save(row);
    }
    return { success: true as const, data: this.mapCategory(row, null) };
  }

  /** 공급자가 품목군 선택 해제(삭제) — 검토중/승인/제한 상태는 잠금 */
  async removeCategory(supplierId: string, category: string) {
    if (!isRegulatedCategory(category)) return { success: false as const, error: 'INVALID_CATEGORY' };
    const row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row) return { success: false as const, error: 'CATEGORY_NOT_FOUND' };
    if (!SUPPLIER_REMOVABLE_STATUSES.includes(row.status as RegulatedCategoryStatus)) {
      return { success: false as const, error: 'CATEGORY_LOCKED' };
    }
    await this.categoryRepo.remove(row);
    return { success: true as const };
  }

  /** 공급자가 신고/허가 번호 등 입력 (상태 변경 없음) */
  async updateCategory(supplierId: string, category: string, input: { registrationNumber?: string | null }) {
    if (!isRegulatedCategory(category)) return { success: false as const, error: 'INVALID_CATEGORY' };
    const row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row) return { success: false as const, error: 'CATEGORY_NOT_FOUND' };
    if (input.registrationNumber !== undefined) {
      row.registrationNumber = normalizeOptionalText(input.registrationNumber);
    }
    const saved = await this.categoryRepo.save(row);
    return { success: true as const, data: await this.withDocument(saved) };
  }

  /** 공급자가 품목군 증빙 PDF 업로드 → status 'submitted'(suspended 는 유지) */
  async uploadEvidence(supplierId: string, category: string, file: Express.Multer.File) {
    if (!isRegulatedCategory(category)) return { success: false as const, error: 'INVALID_CATEGORY' };
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) return { success: false as const, error: 'SUPPLIER_NOT_FOUND' };
    if (!supplier.userId) return { success: false as const, error: 'SUPPLIER_USER_NOT_LINKED' };

    const originalName = decodeOriginalName(file.originalname || 'document.pdf');
    const ext = path.extname(originalName).toLowerCase();
    if (file.mimetype !== 'application/pdf' && ext !== '.pdf') {
      return { success: false as const, error: 'PDF_ONLY' };
    }

    let row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row) {
      row = this.categoryRepo.create({ supplierId, category, status: 'not_requested' });
      row = await this.categoryRepo.save(row);
    }

    const gcsPath = `neture/suppliers/${supplierId}/regulated/${category}/${randomUUID()}.pdf`;
    const bucket = this.storage.bucket(this.bucketName);
    await bucket.file(gcsPath).save(file.buffer, {
      resumable: false,
      metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' },
    });

    const document = this.documentRepo.create({
      userId: supplier.userId,
      documentType: 'regulated_category_evidence',
      fileUrl: `gcs://${this.bucketName}/${gcsPath}`,
      fileName: originalName,
      fileSize: file.size,
      mimeType: 'application/pdf',
      verificationStatus: 'PENDING',
    });
    const saved = await this.documentRepo.save(document);

    row.evidenceDocumentId = saved.id;
    // 제출 시 재검토 대상으로 — 단 운영자 제한(suspended)은 공급자 업로드로 해제하지 않음
    if (row.status !== 'suspended') row.status = 'submitted';
    const savedRow = await this.categoryRepo.save(row);

    logger.info(`[SupplierRegulatedCategory] evidence uploaded supplier=${supplierId} category=${category}`);
    return { success: true as const, data: this.mapCategory(savedRow, saved) };
  }

  /** 증빙 문서 조회 (공급자/운영자/admin 공용 — supplierId 로 격리) */
  async getEvidenceDocument(supplierId: string, category: string) {
    if (!isRegulatedCategory(category)) return null;
    const row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row || !row.evidenceDocumentId) return null;
    return this.documentRepo.findOne({ where: { id: row.evidenceDocumentId } });
  }

  /** 운영자/admin 검토 — 상태 변경 + 검토 메모 */
  async review(
    supplierId: string,
    category: string,
    input: { status: string; reviewNote?: string | null },
    reviewerUserId: string,
  ) {
    if (!isRegulatedCategory(category)) return { success: false as const, error: 'INVALID_CATEGORY' };
    if (!input.status || !isRegulatedCategoryStatus(input.status) || !REVIEWABLE_STATUSES.includes(input.status)) {
      return { success: false as const, error: 'INVALID_REVIEW_STATUS' };
    }
    const row = await this.categoryRepo.findOne({ where: { supplierId, category } });
    if (!row) return { success: false as const, error: 'CATEGORY_NOT_FOUND' };

    row.status = input.status;
    if (input.reviewNote !== undefined) row.reviewNote = normalizeOptionalText(input.reviewNote);
    row.reviewedBy = reviewerUserId;
    row.reviewedAt = new Date();
    const saved = await this.categoryRepo.save(row);

    logger.info(`[SupplierRegulatedCategory] reviewed supplier=${supplierId} category=${category} status=${input.status}`);
    return { success: true as const, data: await this.withDocument(saved) };
  }

  async createReadStream(document: KycDocument) {
    const location = this.parseGcsUrl(document.fileUrl);
    if (!location) throw new Error('INVALID_DOCUMENT_LOCATION');
    return this.storage.bucket(location.bucket).file(location.path).createReadStream();
  }

  private async withDocument(row: NetureSupplierRegulatedCategory) {
    const doc = row.evidenceDocumentId
      ? await this.documentRepo.findOne({ where: { id: row.evidenceDocumentId } })
      : null;
    return this.mapCategory(row, doc);
  }

  private mapCategory(row: NetureSupplierRegulatedCategory, document: KycDocument | null) {
    return {
      id: row.id,
      category: row.category,
      status: row.status,
      registrationNumber: row.registrationNumber ?? null,
      reviewNote: row.reviewNote ?? null,
      reviewedAt: row.reviewedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      evidenceDocument: document
        ? {
            id: document.id,
            fileName: document.fileName,
            fileSize: document.fileSize ?? null,
            mimeType: document.mimeType ?? null,
            createdAt: document.createdAt,
          }
        : null,
    };
  }

  private parseGcsUrl(fileUrl: string): { bucket: string; path: string } | null {
    if (!fileUrl.startsWith('gcs://')) return null;
    const withoutScheme = fileUrl.slice('gcs://'.length);
    const slash = withoutScheme.indexOf('/');
    if (slash <= 0) return null;
    return { bucket: withoutScheme.slice(0, slash), path: withoutScheme.slice(slash + 1) };
  }
}
