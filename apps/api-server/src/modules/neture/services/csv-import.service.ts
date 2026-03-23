/**
 * CSV Import Service
 *
 * B2B 공급자 CSV 대량 유입 파이프라인
 *
 * WO-O4O-B2B-CSV-INGEST-PIPELINE-V1
 * WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1
 *   - image_url 컬럼 지원 (3.2)
 *   - manualData 컬럼 지원: regulatory_name, manufacturer_name, brand (3.3)
 *   - MFDS 실패 + manualData 존재 → Master 수동 생성 (isMfdsVerified=false)
 * WO-NETURE-CSV-MASTER-CREATION-DECOUPLING-V1
 *   - marketing_name 컬럼 추가 (primary name for Master)
 *   - MFDS 의존 제거: marketing_name만 있으면 Master 생성 가능
 *   - manufacturer_name 필수 해제
 * WO-NETURE-CSV-TEMPLATE-V1
 *   - supply_price 필수화
 *   - consumer_short_description 컬럼 추가 (Plain text only)
 */

import { DataSource, Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import {
  SupplierCsvImportBatch,
  CsvImportBatchStatus,
  SupplierCsvImportRow,
  CsvRowValidationStatus,
  CsvRowActionType,
  SupplierProductOffer,
  ProductMaster,
  NetureSupplier,
  SupplierStatus,
} from '../entities/index.js';
import { validateGtin } from '../../../utils/gtin.js';
import { verifyProductByBarcode } from './mfds.service.js';
import { parseXlsxToRecords } from './xlsx-parser.service.js';
import { ProductImportCommonService } from './product-import-common.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import logger from '../../../utils/logger.js';

/** CSV 허용 컬럼 */
const ALLOWED_CSV_COLUMNS = [
  'barcode',
  'supply_price',
  'msrp',
  'stock_qty',
  'distribution_type',
  'description',
  // WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-REFINEMENT-V1
  'image_url',
  'regulatory_name',
  'manufacturer_name',
  'brand',
  // WO-NETURE-CSV-MASTER-CREATION-DECOUPLING-V1
  'marketing_name',
  // WO-NETURE-CSV-TEMPLATE-V1
  'consumer_short_description',
  // WO-NETURE-PRODUCT-REGISTRATION-UI-ALIGN-TO-IMPORT-V1
  'category_name',
];

const VALID_DISTRIBUTION_TYPES = ['PUBLIC', 'SERVICE', 'PRIVATE'];

export class CsvImportService {
  private batchRepo: Repository<SupplierCsvImportBatch>;
  private rowRepo: Repository<SupplierCsvImportRow>;
  private masterRepo: Repository<ProductMaster>;
  private offerRepo: Repository<SupplierProductOffer>;
  private supplierRepo: Repository<NetureSupplier>;
  private importCommon: ProductImportCommonService;

  constructor(private dataSource: DataSource) {
    this.batchRepo = dataSource.getRepository(SupplierCsvImportBatch);
    this.rowRepo = dataSource.getRepository(SupplierCsvImportRow);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.offerRepo = dataSource.getRepository(SupplierProductOffer);
    this.supplierRepo = dataSource.getRepository(NetureSupplier);
    this.importCommon = new ProductImportCommonService(dataSource);
  }

  // ==================== Upload + Validate ====================

  /**
   * CSV 업로드 + 검증 (1회 호출로 결과까지)
   *
   * 1. CSV 파싱
   * 2. Batch 생성 (VALIDATING)
   * 3. Row별 검증
   * 4. 결과 반환
   */
  async uploadAndValidate(
    supplierId: string,
    uploadedBy: string,
    file: { buffer: Buffer; originalname: string },
  ): Promise<{
    success: boolean;
    data?: {
      batchId: string;
      status: CsvImportBatchStatus;
      totalRows: number;
      validRows: number;
      rejectedRows: number;
      rows: Array<{
        rowNumber: number;
        barcode: string | null;
        validationStatus: CsvRowValidationStatus;
        validationError: string | null;
        actionType: CsvRowActionType | null;
      }>;
    };
    error?: string;
  }> {
    // 1. 파일 파싱 (CSV / XLSX 자동 감지) — WO-NETURE-XLSX-DIRECT-UPLOAD-V1
    let records: Record<string, string>[];
    try {
      const isXlsx = /\.xlsx?$/i.test(file.originalname);
      if (isXlsx) {
        records = parseXlsxToRecords(file.buffer);
      } else {
        const csvString = file.buffer.toString('utf-8');
        records = parse(csvString, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true,
        }) as Record<string, string>[];
      }
    } catch (err) {
      return { success: false, error: `PARSE_ERROR: ${(err as Error).message}` };
    }

    if (records.length === 0) {
      return { success: false, error: 'CSV_EMPTY' };
    }

    // 2. Batch 생성
    const batch = this.batchRepo.create({
      supplierId,
      uploadedBy,
      fileName: file.originalname || null,
      totalRows: records.length,
      status: CsvImportBatchStatus.VALIDATING,
    });
    const savedBatch = await this.batchRepo.save(batch);

    // 3. Row별 검증
    const seenBarcodes = new Set<string>();
    const rowEntities: SupplierCsvImportRow[] = [];
    let validCount = 0;
    let rejectedCount = 0;

    for (let i = 0; i < records.length; i++) {
      const raw = records[i];
      const rowNumber = i + 1;
      const barcode = (raw.barcode || '').trim();

      const row = this.rowRepo.create({
        batchId: savedBatch.id,
        rowNumber,
        rawJson: raw,
        parsedBarcode: barcode || null,
        parsedSupplyPrice: null,
        parsedDistributionType: null,
        validationStatus: CsvRowValidationStatus.PENDING,
        validationError: null,
        masterId: null,
        actionType: null,
      });

      // 3a. barcode 존재?
      if (!barcode) {
        this.rejectRow(row, 'INVALID_BARCODE');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }

      // 3b. GTIN 유효?
      const gtinError = validateGtin(barcode);
      if (gtinError) {
        this.rejectRow(row, `INVALID_GTIN: ${gtinError}`);
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }

      // 3c. batch 내 barcode 중복?
      if (seenBarcodes.has(barcode)) {
        this.rejectRow(row, 'DUPLICATE_IN_BATCH');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }
      seenBarcodes.add(barcode);

      // 3d. supply_price 검증 (WO-NETURE-CSV-TEMPLATE-V1: 필수)
      const rawPrice = (raw.supply_price || '').trim();
      if (!rawPrice) {
        this.rejectRow(row, 'MISSING_SUPPLY_PRICE');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }
      const price = parseInt(rawPrice, 10);
      if (isNaN(price) || price < 0) {
        this.rejectRow(row, 'INVALID_PRICE');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }
      row.parsedSupplyPrice = price;

      // 3e. distribution_type 검증
      const rawDist = (raw.distribution_type || '').trim().toUpperCase();
      if (rawDist && !VALID_DISTRIBUTION_TYPES.includes(rawDist)) {
        this.rejectRow(row, `INVALID_DISTRIBUTION_TYPE: ${rawDist}`);
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }
      if (rawDist) {
        row.parsedDistributionType = rawDist;
      }

      // 3f. PUBLIC requires consumer_short_description
      const distType = rawDist || 'PRIVATE';
      if (distType === 'PUBLIC' && !((raw.consumer_short_description || '') as string).trim()) {
        this.rejectRow(row, 'PUBLIC_REQUIRES_DESCRIPTION');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }

      // 3g. 내부 Master 조회
      const existingMaster = await this.masterRepo.findOne({
        where: { barcode },
        select: ['id'],
      });

      if (existingMaster) {
        // Master 존재 → link
        row.masterId = existingMaster.id;
        row.actionType = CsvRowActionType.LINK_EXISTING;
        row.validationStatus = CsvRowValidationStatus.VALID;
        validCount++;
      } else {
        // WO-NETURE-CSV-MASTER-CREATION-DECOUPLING-V1
        // Master 미존재 → marketing_name 또는 regulatory_name이 있으면 CREATE_MASTER
        // MFDS는 Apply 단계에서 advisory-only로 호출 (validation에서 gate 아님)
        const marketingName = (raw.marketing_name || '').trim();
        const regulatoryName = (raw.regulatory_name || '').trim();
        const hasProductName = !!(marketingName || regulatoryName);

        if (hasProductName) {
          row.actionType = CsvRowActionType.CREATE_MASTER;
          row.validationStatus = CsvRowValidationStatus.VALID;
          validCount++;
        } else {
          this.rejectRow(row, 'MISSING_MARKETING_NAME');
          rejectedCount++;
        }
      }

      rowEntities.push(row);
    }

    // 4. Bulk save rows
    await this.rowRepo.save(rowEntities);

    // 5. Batch 통계 업데이트
    savedBatch.validRows = validCount;
    savedBatch.rejectedRows = rejectedCount;
    savedBatch.status = validCount > 0
      ? CsvImportBatchStatus.READY
      : CsvImportBatchStatus.FAILED;
    await this.batchRepo.save(savedBatch);

    logger.info(
      `[CsvImport] Batch ${savedBatch.id} — total: ${records.length}, valid: ${validCount}, rejected: ${rejectedCount}, status: ${savedBatch.status}`,
    );

    // 6. Return
    return {
      success: true,
      data: {
        batchId: savedBatch.id,
        status: savedBatch.status,
        totalRows: records.length,
        validRows: validCount,
        rejectedRows: rejectedCount,
        rows: rowEntities.map((r) => ({
          rowNumber: r.rowNumber,
          barcode: r.parsedBarcode,
          validationStatus: r.validationStatus,
          validationError: r.validationError,
          actionType: r.actionType,
        })),
      },
    };
  }

  // ==================== Apply Batch ====================

  /**
   * 2-Phase Apply — 검증 완료된 batch를 실제 테이블에 반영
   *
   * Transaction 내부:
   * - CREATE_MASTER → MFDS 검증 or manualData fallback
   * - LINK_EXISTING → master_id 이미 설정됨
   * - Offer upsert: ON CONFLICT (master_id, supplier_id) DO UPDATE
   *
   * Post-transaction (fire-and-forget):
   * - 이미지 다운로드 + GCS 업로드 (3.2)
   * - AI 콘텐츠 생성
   */
  async applyBatch(
    batchId: string,
    supplierId: string,
  ): Promise<{
    success: boolean;
    data?: { appliedOffers: number; createdMasters: number };
    error?: string;
  }> {
    // 1. Batch 조회 + 상태 검증
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, supplierId },
    });
    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }
    if (batch.status !== CsvImportBatchStatus.READY) {
      return { success: false, error: `BATCH_NOT_READY: current status is ${batch.status}` };
    }

    // 2. Supplier ACTIVE guard
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId },
      select: ['id', 'status'],
    });
    if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    // 3. Valid rows 조회
    const validRows = await this.rowRepo.find({
      where: {
        batchId,
        validationStatus: CsvRowValidationStatus.VALID,
      },
      order: { rowNumber: 'ASC' },
    });

    if (validRows.length === 0) {
      return { success: false, error: 'NO_VALID_ROWS' };
    }

    // 4. Transaction 내 적용
    let appliedOffers = 0;
    let createdMasters = 0;
    const aiContentInputs: ProductContentInput[] = [];
    const imageJobs: Array<{ masterId: string; imageUrl: string }> = [];

    await this.dataSource.transaction(async (manager) => {
      for (const row of validRows) {
        let masterId = row.masterId;
        let masterName = '';
        let masterManufacturer = '';

        // WO-NETURE-CSV-MASTER-CREATION-DECOUPLING-V1
        // CREATE_MASTER → CSV 데이터 우선, MFDS advisory-only
        if (row.actionType === CsvRowActionType.CREATE_MASTER) {
          const barcode = row.parsedBarcode!;
          const raw = row.rawJson as Record<string, string>;

          const masterRepo = manager.getRepository(ProductMaster);

          // UNIQUE(barcode) 보호 — 동시 batch에서 같은 barcode가 이미 생성됐을 수 있음
          let master = await masterRepo.findOne({ where: { barcode } });

          if (!master) {
            // MFDS advisory 호출 — 실패해도 Master 생성 진행
            const mfdsResult = await verifyProductByBarcode(barcode);
            const mfds = mfdsResult.verified && mfdsResult.product ? mfdsResult.product : null;

            // CSV 데이터 추출
            const csvMarketingName = (raw.marketing_name || '').trim();
            const csvRegulatoryName = (raw.regulatory_name || '').trim();
            const csvManufacturerName = (raw.manufacturer_name || '').trim();

            master = masterRepo.create({
              barcode,
              marketingName: csvMarketingName || csvRegulatoryName || mfds?.regulatoryName || 'UNKNOWN_PRODUCT',
              regulatoryName: csvRegulatoryName || mfds?.regulatoryName || csvMarketingName || 'UNKNOWN',
              regulatoryType: mfds?.regulatoryType || 'UNKNOWN',
              manufacturerName: csvManufacturerName || mfds?.manufacturerName || null,
              mfdsPermitNumber: mfds?.permitNumber || null,
              mfdsProductId: mfds?.productId || barcode,
              isMfdsVerified: !!mfds,
              mfdsSyncedAt: mfds ? new Date() : null,
            });
            master = await masterRepo.save(master);
            createdMasters++;
            logger.info(`[CsvImport] Created Master for barcode ${barcode} (mfdsVerified=${!!mfds})`);
          }

          masterId = master.id;
          masterName = master.marketingName || master.regulatoryName;
          masterManufacturer = master.manufacturerName;
        }

        if (!masterId) {
          logger.warn(`[CsvImport] No masterId for row ${row.rowNumber}, skipping`);
          continue;
        }

        // WO-NETURE-FIRSTMALL-BASIC-BULK-IMPORT-ENABLEMENT-V1: Brand 해석 + extra 필드
        const raw = row.rawJson as Record<string, string>;
        const brandName = (raw.brand || '').trim();
        if (brandName && masterId) {
          try {
            const brandId = await this.importCommon.resolveBrandId(manager, brandName, masterManufacturer || undefined);
            if (row.actionType === CsvRowActionType.CREATE_MASTER) {
              await manager.query(
                `UPDATE product_masters SET brand_id = $1 WHERE id = $2 AND brand_id IS NULL`,
                [brandId, masterId],
              );
            }
          } catch (err) {
            logger.warn(`[CsvImport] Brand resolution failed for row ${row.rowNumber}:`, err);
          }
        }

        // WO-NETURE-PRODUCT-REGISTRATION-UI-ALIGN-TO-IMPORT-V1: Category 해석
        const categoryName = (raw.category_name || '').trim();
        if (categoryName && masterId) {
          try {
            const catRows: Array<{ id: string }> = await manager.query(
              `SELECT id FROM product_categories WHERE name = $1 AND is_active = true ORDER BY depth DESC LIMIT 1`,
              [categoryName],
            );
            if (catRows.length > 0) {
              await manager.query(
                `UPDATE product_masters SET category_id = $1 WHERE id = $2 AND category_id IS NULL`,
                [catRows[0].id, masterId],
              );
            } else {
              logger.warn(`[CsvImport] Category not found: "${categoryName}" (row ${row.rowNumber})`);
            }
          } catch (err) {
            logger.warn(`[CsvImport] Category resolution failed for row ${row.rowNumber}:`, err);
          }
        }

        // Offer upsert via common service (3.5 + ENABLEMENT-V1)
        const distributionType = row.parsedDistributionType || 'PRIVATE';
        const supplyPrice = row.parsedSupplyPrice ?? 0;

        const rawMsrp = (raw.msrp || '').trim();
        const rawStockQty = (raw.stock_qty || '').trim();
        // WO-NETURE-CSV-TEMPLATE-V1: consumer_short_description 우선, description 하위호환
        const rawDescription = (raw.consumer_short_description || raw.description || '').trim();
        const extra = {
          msrp: rawMsrp ? parseInt(rawMsrp, 10) || null : null,
          stockQty: rawStockQty ? parseInt(rawStockQty, 10) || null : null,
          description: rawDescription || null,
        };

        await this.importCommon.upsertSupplierOffer(
          manager, masterId, supplierId, distributionType, supplyPrice, row.parsedBarcode!, extra,
        );
        appliedOffers++;

        // Collect image job (3.2)
        const imageUrl = ((row.rawJson as Record<string, string>).image_url || '').trim();
        if (imageUrl) {
          imageJobs.push({ masterId, imageUrl });
        }

        // Collect AI content input
        aiContentInputs.push({
          id: masterId,
          regulatoryName: masterName || row.parsedBarcode || 'Unknown',
          marketingName: masterName || row.parsedBarcode || 'Unknown',
          manufacturerName: masterManufacturer || 'Unknown',
        });
      }
    });

    // 5. Batch 상태 업데이트
    batch.status = CsvImportBatchStatus.APPLIED;
    batch.appliedAt = new Date();
    await this.batchRepo.save(batch);

    logger.info(`[CsvImport] Batch ${batchId} applied — offers: ${appliedOffers}, masters: ${createdMasters}`);

    // Fire-and-forget: Image pipeline via common service (3.2 + 3.5)
    if (imageJobs.length > 0) {
      const imageJobsGrouped = imageJobs.map((j) => ({ masterId: j.masterId, imageUrls: [j.imageUrl] }));
      this.importCommon.processImportImages(imageJobsGrouped).catch((err) => {
        logger.error('[CsvImport] Image pipeline error:', err);
      });
    }

    // Fire-and-forget: AI content generation via common service (3.5)
    if (aiContentInputs.length > 0) {
      this.importCommon.triggerAiContentGeneration(aiContentInputs).catch((err) => {
        logger.error('[CsvImport] AI content generation error:', err);
      });
    }

    return {
      success: true,
      data: { appliedOffers, createdMasters },
    };
  }

  // ==================== Batch 조회 ====================

  /**
   * Batch 상세 조회 (rows 포함)
   */
  async getBatch(
    batchId: string,
    supplierId: string,
  ): Promise<{ success: boolean; data?: SupplierCsvImportBatch; error?: string }> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, supplierId },
      relations: ['rows'],
      order: { rows: { rowNumber: 'ASC' } },
    });

    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }

    return { success: true, data: batch };
  }

  /**
   * 공급자별 Batch 목록 (최신순)
   */
  async listBatches(
    supplierId: string,
  ): Promise<SupplierCsvImportBatch[]> {
    return this.batchRepo.find({
      where: { supplierId },
      order: { createdAt: 'DESC' },
      select: ['id', 'fileName', 'totalRows', 'validRows', 'rejectedRows', 'status', 'createdAt', 'appliedAt'],
    });
  }

  // ==================== Internal helpers ====================

  private rejectRow(row: SupplierCsvImportRow, error: string): void {
    row.validationStatus = CsvRowValidationStatus.REJECTED;
    row.validationError = error;
    row.actionType = CsvRowActionType.REJECT;
  }
}
