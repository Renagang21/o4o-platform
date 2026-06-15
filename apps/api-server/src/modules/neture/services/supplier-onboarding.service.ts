import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import path from 'path';
import type { DataSource, Repository } from 'typeorm';
import { KycDocument } from '../../../entities/KycDocument.js';
import { NetureSupplier } from '../entities/index.js';
import logger from '../../../utils/logger.js';

export type SupplierOnboardingDocumentType = 'business_registration' | 'bank_statement';

export interface SupplierOnboardingInput {
  taxInvoiceEmail?: string | null;
  settlementBankName?: string | null;
  settlementAccountNumber?: string | null;
  settlementAccountHolder?: string | null;
  settlementContactName?: string | null;
  settlementContactEmail?: string | null;
}

function decodeOriginalName(name: string): string {
  if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(name)) return name;
  if (/[^\x00-\x7F]/.test(name)) {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    if (/[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/.test(decoded)) return decoded;
  }
  return name;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeAccountNumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/[^\d-]/g, '').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(value: string | null): boolean {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function maskAccountNumber(value: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return value;
  const suffix = digits.slice(-4);
  return `${value.slice(0, Math.max(0, value.length - suffix.length)).replace(/\d/g, '*')}${suffix}`;
}

export class SupplierOnboardingService {
  private storage = new Storage();
  private bucketName = process.env.GCS_PRIVATE_DOCUMENT_BUCKET || 'o4o-private-documents';
  private supplierRepo: Repository<NetureSupplier>;
  private documentRepo: Repository<KycDocument>;

  constructor(private dataSource: DataSource) {
    this.supplierRepo = dataSource.getRepository(NetureSupplier);
    this.documentRepo = dataSource.getRepository(KycDocument);
  }

  async getOnboarding(supplierId: string) {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) return null;
    return this.mapSupplierOnboarding(supplier);
  }

  async updateOnboarding(supplierId: string, input: SupplierOnboardingInput) {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) return null;

    const taxInvoiceEmail = input.taxInvoiceEmail !== undefined
      ? normalizeOptionalText(input.taxInvoiceEmail)
      : undefined;
    const settlementContactEmail = input.settlementContactEmail !== undefined
      ? normalizeOptionalText(input.settlementContactEmail)
      : undefined;

    if (taxInvoiceEmail !== undefined && !isValidEmail(taxInvoiceEmail)) {
      return { success: false as const, error: 'INVALID_TAX_INVOICE_EMAIL' };
    }
    if (settlementContactEmail !== undefined && settlementContactEmail && !isValidEmail(settlementContactEmail)) {
      return { success: false as const, error: 'INVALID_SETTLEMENT_CONTACT_EMAIL' };
    }

    if (taxInvoiceEmail !== undefined) supplier.taxInvoiceEmail = taxInvoiceEmail;
    if (input.settlementBankName !== undefined) supplier.settlementBankName = normalizeOptionalText(input.settlementBankName);
    if (input.settlementAccountNumber !== undefined) supplier.settlementAccountNumber = normalizeAccountNumber(input.settlementAccountNumber);
    if (input.settlementAccountHolder !== undefined) supplier.settlementAccountHolder = normalizeOptionalText(input.settlementAccountHolder);
    if (input.settlementContactName !== undefined) supplier.settlementContactName = normalizeOptionalText(input.settlementContactName);
    if (settlementContactEmail !== undefined) supplier.settlementContactEmail = settlementContactEmail;

    await this.supplierRepo.save(supplier);
    return { success: true as const, data: await this.mapSupplierOnboarding(supplier) };
  }

  async uploadDocument(
    supplierId: string,
    documentType: SupplierOnboardingDocumentType,
    file: Express.Multer.File,
  ) {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) return { success: false as const, error: 'SUPPLIER_NOT_FOUND' };
    if (!supplier.userId) return { success: false as const, error: 'SUPPLIER_USER_NOT_LINKED' };
    if (!this.isAllowedDocumentType(documentType)) return { success: false as const, error: 'INVALID_DOCUMENT_TYPE' };

    const originalName = decodeOriginalName(file.originalname || 'document.pdf');
    const ext = path.extname(originalName).toLowerCase();
    if (file.mimetype !== 'application/pdf' && ext !== '.pdf') {
      return { success: false as const, error: 'PDF_ONLY' };
    }

    const gcsPath = `neture/suppliers/${supplierId}/kyc/${documentType}/${randomUUID()}.pdf`;
    const bucket = this.storage.bucket(this.bucketName);
    await bucket.file(gcsPath).save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'private, no-store',
      },
    });

    const document = this.documentRepo.create({
      userId: supplier.userId,
      documentType,
      fileUrl: `gcs://${this.bucketName}/${gcsPath}`,
      fileName: originalName,
      fileSize: file.size,
      mimeType: 'application/pdf',
      verificationStatus: 'PENDING',
    });
    const saved = await this.documentRepo.save(document);

    if (documentType === 'business_registration') {
      supplier.businessRegistrationDocumentId = saved.id;
    } else {
      supplier.settlementBankbookDocumentId = saved.id;
    }
    await this.supplierRepo.save(supplier);

    logger.info(`[SupplierOnboarding] ${documentType} uploaded for supplier ${supplierId}`);
    return { success: true as const, data: this.mapDocument(saved) };
  }

  async getDocumentForSupplier(supplierId: string, documentType: SupplierOnboardingDocumentType) {
    const supplier = await this.supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier || !this.isAllowedDocumentType(documentType)) return null;
    const id = documentType === 'business_registration'
      ? supplier.businessRegistrationDocumentId
      : supplier.settlementBankbookDocumentId;
    if (!id) return null;
    return this.documentRepo.findOne({ where: { id } });
  }

  async createReadStream(document: KycDocument) {
    const location = this.parseGcsUrl(document.fileUrl);
    if (!location) throw new Error('INVALID_DOCUMENT_LOCATION');
    return this.storage.bucket(location.bucket).file(location.path).createReadStream();
  }

  private async mapSupplierOnboarding(supplier: NetureSupplier) {
    const [businessRegistrationDocument, settlementBankbookDocument] = await Promise.all([
      supplier.businessRegistrationDocumentId
        ? this.documentRepo.findOne({ where: { id: supplier.businessRegistrationDocumentId } })
        : Promise.resolve(null),
      supplier.settlementBankbookDocumentId
        ? this.documentRepo.findOne({ where: { id: supplier.settlementBankbookDocumentId } })
        : Promise.resolve(null),
    ]);

    return {
      supplierId: supplier.id,
      taxInvoiceEmail: supplier.taxInvoiceEmail || null,
      settlementBankName: supplier.settlementBankName || null,
      settlementAccountNumber: supplier.settlementAccountNumber || null,
      settlementAccountNumberMasked: maskAccountNumber(supplier.settlementAccountNumber || null),
      settlementAccountHolder: supplier.settlementAccountHolder || null,
      settlementContactName: supplier.settlementContactName || null,
      settlementContactEmail: supplier.settlementContactEmail || null,
      businessRegistrationDocument: businessRegistrationDocument ? this.mapDocument(businessRegistrationDocument) : null,
      settlementBankbookDocument: settlementBankbookDocument ? this.mapDocument(settlementBankbookDocument) : null,
    };
  }

  private mapDocument(document: KycDocument) {
    return {
      id: document.id,
      documentType: document.documentType,
      fileName: document.fileName,
      fileSize: document.fileSize ?? null,
      mimeType: document.mimeType ?? null,
      verificationStatus: document.verificationStatus,
      createdAt: document.createdAt,
      verifiedAt: document.verifiedAt ?? null,
    };
  }

  private parseGcsUrl(fileUrl: string): { bucket: string; path: string } | null {
    if (!fileUrl.startsWith('gcs://')) return null;
    const withoutScheme = fileUrl.slice('gcs://'.length);
    const slash = withoutScheme.indexOf('/');
    if (slash <= 0) return null;
    return {
      bucket: withoutScheme.slice(0, slash),
      path: withoutScheme.slice(slash + 1),
    };
  }

  private isAllowedDocumentType(type: string): type is SupplierOnboardingDocumentType {
    return type === 'business_registration' || type === 'bank_statement';
  }
}
