/**
 * Catalog Import Service — Core Orchestration
 *
 * createJob(): Parse file via extension → create Job + Rows (PENDING)
 * validateJob(): Run validator on each row → update status/action/masterId
 * applyJob(): Transaction — resolve masters + upsert offers
 * getJob() / listJobs(): Query methods
 *
 * WO-O4O-CATALOG-IMPORT-APP-IMPLEMENTATION-V1
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { ProductMaster } from '../../neture/entities/index.js';
import { CatalogImportJob } from '../entities/CatalogImportJob.entity.js';
import { CatalogImportRow } from '../entities/CatalogImportRow.entity.js';
import {
  CatalogImportJobStatus,
  CatalogImportRowStatus,
  CatalogImportRowAction,
  type CatalogImportExtensionKey,
  type CatalogParserExtension,
  type NormalizedProduct,
} from '../types/catalog-import.types.js';
import { CatalogImportValidator } from './catalog-import-validator.js';
import { CatalogImportResolver } from './catalog-import-resolver.js';
import { CatalogImportOfferService } from './catalog-import-offer.service.js';
import { ProductImportCommonService } from '../../neture/services/product-import-common.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import { csvParserExtension } from '../extensions/csv/csv-parser.extension.js';
import { firstmallParserExtension } from '../extensions/firstmall/firstmall-parser.extension.js';
import logger from '../../../utils/logger.js';

const EXTENSION_REGISTRY: Record<CatalogImportExtensionKey, CatalogParserExtension> = {
  csv: csvParserExtension,
  firstmall: firstmallParserExtension,
};

export class CatalogImportService {
  private jobRepo: Repository<CatalogImportJob>;
  private rowRepo: Repository<CatalogImportRow>;
  private masterRepo: Repository<ProductMaster>;
  private validator: CatalogImportValidator;
  private resolver: CatalogImportResolver;
  private offerService: CatalogImportOfferService;
  private importCommon: ProductImportCommonService;

  constructor() {
    this.jobRepo = AppDataSource.getRepository(CatalogImportJob);
    this.rowRepo = AppDataSource.getRepository(CatalogImportRow);
    this.masterRepo = AppDataSource.getRepository(ProductMaster);
    this.validator = new CatalogImportValidator(this.masterRepo);
    this.resolver = new CatalogImportResolver();
    this.offerService = new CatalogImportOfferService();
    this.importCommon = new ProductImportCommonService(AppDataSource);
  }

  // ==================== Create Job ====================

  async createJob(
    file: { buffer: Buffer; originalname: string },
    extensionKey: CatalogImportExtensionKey,
    supplierId: string,
    uploadedBy: string,
  ): Promise<{ success: boolean; data?: CatalogImportJob; error?: string }> {
    // 1. Get parser extension
    const parser = EXTENSION_REGISTRY[extensionKey];
    if (!parser) {
      return { success: false, error: `UNKNOWN_EXTENSION: ${extensionKey}` };
    }

    // 2. Parse file
    let products: NormalizedProduct[];
    try {
      products = parser.parse(file.buffer, file.originalname);
    } catch (err) {
      return { success: false, error: `PARSE_ERROR: ${(err as Error).message}` };
    }

    if (products.length === 0) {
      return { success: false, error: 'EMPTY_FILE' };
    }

    // 3. Create Job
    const job = this.jobRepo.create({
      supplierId,
      uploadedBy,
      fileName: file.originalname || null,
      extensionKey,
      totalRows: products.length,
      status: CatalogImportJobStatus.UPLOADED,
    });
    const savedJob = await this.jobRepo.save(job);

    // 4. Create Rows from NormalizedProduct
    // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1: 옵션 상품 REJECTED + 신규 필드 매핑
    const rowEntities: CatalogImportRow[] = [];
    let optionSkippedCount = 0;

    for (const p of products) {
      if (p.hasOptions) {
        // 옵션 상품 → REJECTED 처리
        optionSkippedCount++;
        rowEntities.push(this.rowRepo.create({
          jobId: savedJob.id,
          rowNumber: p.rowNumber,
          rawJson: p.rawData,
          parsedBarcode: p.barcode,
          parsedProductName: p.productName,
          parsedPrice: p.price,
          parsedDistributionType: p.distributionType,
          parsedManufacturerName: p.manufacturerName,
          parsedBrandName: p.brandName,
          parsedSupplierSku: p.supplierSku,
          parsedImageUrls: p.imageUrls.length > 0 ? p.imageUrls : null,
          parsedMsrp: p.msrp ?? null,
          parsedStockQty: p.stockQty ?? null,
          parsedDescription: p.description ?? null,
          validationStatus: CatalogImportRowStatus.REJECTED,
          validationError: 'HAS_OPTIONS: 옵션 상품은 현재 미지원',
          masterId: null,
          actionType: CatalogImportRowAction.REJECT,
        }));
        continue;
      }

      rowEntities.push(this.rowRepo.create({
        jobId: savedJob.id,
        rowNumber: p.rowNumber,
        rawJson: p.rawData,
        parsedBarcode: p.barcode,
        parsedProductName: p.productName,
        parsedPrice: p.price,
        parsedDistributionType: p.distributionType,
        parsedManufacturerName: p.manufacturerName,
        parsedBrandName: p.brandName,
        parsedSupplierSku: p.supplierSku,
        parsedImageUrls: p.imageUrls.length > 0 ? p.imageUrls : null,
        parsedMsrp: p.msrp ?? null,
        parsedStockQty: p.stockQty ?? null,
        parsedDescription: p.description ?? null,
        validationStatus: CatalogImportRowStatus.PENDING,
        validationError: null,
        masterId: null,
        actionType: null,
      }));
    }

    await this.rowRepo.save(rowEntities);

    logger.info(`[CatalogImport] Job ${savedJob.id} created — total: ${products.length}, options_skipped: ${optionSkippedCount} (extension: ${extensionKey})`);

    // Reload with rows
    const fullJob = await this.jobRepo.findOne({
      where: { id: savedJob.id },
      relations: ['rows'],
    });

    return { success: true, data: fullJob! };
  }

  // ==================== Validate Job ====================

  async validateJob(jobId: string): Promise<{
    success: boolean;
    data?: { validRows: number; warningRows: number; rejectedRows: number };
    error?: string;
  }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return { success: false, error: 'JOB_NOT_FOUND' };

    if (job.status !== CatalogImportJobStatus.UPLOADED) {
      return { success: false, error: `INVALID_STATUS: expected UPLOADED, got ${job.status}` };
    }

    // Update status
    job.status = CatalogImportJobStatus.VALIDATING;
    await this.jobRepo.save(job);

    // Load rows
    const rows = await this.rowRepo.find({
      where: { jobId },
      order: { rowNumber: 'ASC' },
    });

    // Run validation
    const result = await this.validator.validateRows(rows);

    // Persist validated rows
    await this.rowRepo.save(rows);

    // Update job stats
    job.validRows = result.validCount;
    job.warningRows = result.warningCount;
    job.rejectedRows = result.rejectedCount;
    job.status = (result.validCount + result.warningCount) > 0
      ? CatalogImportJobStatus.VALIDATED
      : CatalogImportJobStatus.FAILED;
    job.validatedAt = new Date();
    await this.jobRepo.save(job);

    logger.info(`[CatalogImport] Job ${jobId} validated — valid: ${result.validCount}, warning: ${result.warningCount}, rejected: ${result.rejectedCount}`);

    return {
      success: true,
      data: {
        validRows: result.validCount,
        warningRows: result.warningCount,
        rejectedRows: result.rejectedCount,
      },
    };
  }

  // ==================== Apply Job ====================

  async applyJob(jobId: string, supplierId: string): Promise<{
    success: boolean;
    data?: { appliedOffers: number; createdMasters: number };
    error?: string;
  }> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return { success: false, error: 'JOB_NOT_FOUND' };

    if (job.status !== CatalogImportJobStatus.VALIDATED) {
      return { success: false, error: `INVALID_STATUS: expected VALIDATED, got ${job.status}` };
    }

    // Update status
    job.status = CatalogImportJobStatus.APPLYING;
    await this.jobRepo.save(job);

    const rows = await this.rowRepo.find({
      where: { jobId },
      order: { rowNumber: 'ASC' },
    });

    // Filter actionable rows (VALID + WARNING with CREATE_MASTER or LINK_EXISTING)
    const actionableRows = rows.filter(r =>
      (r.validationStatus === CatalogImportRowStatus.VALID ||
       r.validationStatus === CatalogImportRowStatus.WARNING) &&
      r.actionType !== CatalogImportRowAction.REJECT
    );

    let appliedOffers = 0;
    let createdMasters = 0;

    // Collect post-transaction async jobs
    const imageJobs: Array<{ masterId: string; imageUrls: string[] }> = [];
    const aiContentInputs: ProductContentInput[] = [];

    try {
      await AppDataSource.transaction(async (manager) => {
        for (const row of actionableRows) {
          // Resolve master if needed
          let masterId = row.masterId;

          if (!masterId && row.actionType === CatalogImportRowAction.CREATE_MASTER) {
            masterId = await this.resolver.resolveMaster(row);
            if (masterId) {
              row.masterId = masterId;
              createdMasters++;
            }
          }

          if (!masterId) {
            logger.warn(`[CatalogImport] No masterId for row ${row.rowNumber}, skipping`);
            continue;
          }

          // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1: Brand 해석
          if (row.parsedBrandName) {
            try {
              const brandId = await this.importCommon.resolveBrandId(
                manager,
                row.parsedBrandName,
                row.parsedManufacturerName || undefined,
              );
              // Master에 brand_id 연결 (CREATE_MASTER인 경우만, 기존값 없을 때)
              if (row.actionType === CatalogImportRowAction.CREATE_MASTER) {
                await manager.query(
                  `UPDATE product_masters SET brand_id = $1 WHERE id = $2 AND brand_id IS NULL`,
                  [brandId, masterId],
                );
              }
            } catch (err) {
              logger.warn(`[CatalogImport] Brand resolution failed for row ${row.rowNumber}:`, err);
            }
          }

          // Upsert offer (with extra fields)
          const distributionType = row.parsedDistributionType || 'PRIVATE';
          const price = row.parsedPrice ?? 0;
          await this.offerService.upsertOffer(
            manager, masterId, supplierId, distributionType, price, row.parsedBarcode,
            {
              msrp: row.parsedMsrp,
              stockQty: row.parsedStockQty,
              description: row.parsedDescription,
            },
          );
          appliedOffers++;

          // Collect image URLs for post-transaction processing
          if (row.parsedImageUrls && row.parsedImageUrls.length > 0) {
            imageJobs.push({ masterId, imageUrls: row.parsedImageUrls });
          }

          // Collect AI content inputs
          aiContentInputs.push({
            id: masterId,
            regulatoryName: row.parsedProductName || row.parsedBarcode,
            marketingName: row.parsedProductName || row.parsedBarcode,
            manufacturerName: row.parsedManufacturerName || 'Unknown',
            brandName: row.parsedBrandName || undefined,
          });
        }
      });

      // Update job
      job.status = CatalogImportJobStatus.APPLIED;
      job.appliedAt = new Date();
      await this.jobRepo.save(job);

      // Update rows with resolved masterIds
      await this.rowRepo.save(actionableRows);

      logger.info(`[CatalogImport] Job ${jobId} applied — offers: ${appliedOffers}, masters: ${createdMasters}`);

      // Fire-and-forget via common service (WO-REFINEMENT-V1 3.5)
      if (imageJobs.length > 0) {
        this.importCommon.processImportImages(imageJobs).catch((err) => {
          logger.error('[CatalogImport] Image pipeline error:', err);
        });
      }

      if (aiContentInputs.length > 0) {
        this.importCommon.triggerAiContentGeneration(aiContentInputs).catch((err) => {
          logger.error('[CatalogImport] AI content generation error:', err);
        });
      }

      return { success: true, data: { appliedOffers, createdMasters } };
    } catch (err) {
      job.status = CatalogImportJobStatus.FAILED;
      await this.jobRepo.save(job);
      logger.error(`[CatalogImport] Job ${jobId} apply failed:`, err);
      return { success: false, error: `APPLY_FAILED: ${(err as Error).message}` };
    }
  }

  // ==================== Query Methods ====================

  async getJob(jobId: string): Promise<CatalogImportJob | null> {
    return this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['rows'],
      order: { createdAt: 'DESC' },
    });
  }

  async listJobs(supplierId?: string): Promise<CatalogImportJob[]> {
    const where = supplierId ? { supplierId } : {};
    return this.jobRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
