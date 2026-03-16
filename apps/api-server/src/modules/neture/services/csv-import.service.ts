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
import { ProductImportCommonService } from './product-import-common.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import logger from '../../../utils/logger.js';

/** CSV 허용 컬럼 */
const ALLOWED_CSV_COLUMNS = [
  'barcode',
  'supplier_sku',
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
    // 1. CSV 파싱
    let records: Record<string, string>[];
    try {
      const csvString = file.buffer.toString('utf-8');
      records = parse(csvString, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }) as Record<string, string>[];
    } catch (err) {
      return { success: false, error: `CSV_PARSE_ERROR: ${(err as Error).message}` };
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

      // 3d. supply_price 검증
      const rawPrice = (raw.supply_price || '').trim();
      if (rawPrice) {
        const price = parseInt(rawPrice, 10);
        if (isNaN(price) || price < 0) {
          this.rejectRow(row, 'INVALID_PRICE');
          rejectedCount++;
          rowEntities.push(row);
          continue;
        }
        row.parsedSupplyPrice = price;
      }

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

      // 3f. 내부 Master 조회
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
        // Master 미존재 → MFDS 검증
        const mfdsResult = await verifyProductByBarcode(barcode);

        if (mfdsResult.verified && mfdsResult.product) {
          // MFDS 검증 성공 → 생성 예정
          row.actionType = CsvRowActionType.CREATE_MASTER;
          row.validationStatus = CsvRowValidationStatus.VALID;
          validCount++;
        } else {
          // MFDS 미검증 → manualData 확인 (WO-REFINEMENT-V1 3.3)
          const hasManualData = this.extractManualData(raw) !== null;
          if (hasManualData) {
            // manualData 존재 → CREATE_MASTER (수동 생성 경로)
            row.actionType = CsvRowActionType.CREATE_MASTER;
            row.validationStatus = CsvRowValidationStatus.VALID;
            validCount++;
          } else {
            this.rejectRow(row, 'MASTER_NOT_FOUND_NO_MANUAL_DATA');
            rejectedCount++;
          }
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

        // CREATE_MASTER → MFDS 검증 or manualData fallback
        if (row.actionType === CsvRowActionType.CREATE_MASTER) {
          const barcode = row.parsedBarcode!;
          const raw = row.rawJson as Record<string, string>;
          const mfdsResult = await verifyProductByBarcode(barcode);

          const masterRepo = manager.getRepository(ProductMaster);

          // UNIQUE(barcode) 보호 — 동시 batch에서 같은 barcode가 이미 생성됐을 수 있음
          let master = await masterRepo.findOne({ where: { barcode } });

          if (!master) {
            if (mfdsResult.verified && mfdsResult.product) {
              // MFDS 검증 성공 → MFDS 데이터로 생성
              master = masterRepo.create({
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
              master = await masterRepo.save(master);
              createdMasters++;
            } else {
              // MFDS 실패 → manualData fallback (3.3)
              const manualData = this.extractManualData(raw);
              if (manualData) {
                master = masterRepo.create({
                  barcode,
                  regulatoryType: 'UNKNOWN',
                  regulatoryName: manualData.regulatoryName,
                  marketingName: manualData.regulatoryName,
                  manufacturerName: manualData.manufacturerName,
                  mfdsProductId: barcode,
                  isMfdsVerified: false,
                  mfdsSyncedAt: null,
                });
                master = await masterRepo.save(master);
                createdMasters++;
                logger.info(`[CsvImport] Created manual Master for barcode ${barcode} (MFDS unverified)`);
              } else {
                logger.warn(`[CsvImport] MFDS failed and no manualData for barcode ${barcode}, skipping row ${row.rowNumber}`);
                continue;
              }
            }
          }

          masterId = master.id;
          masterName = master.regulatoryName;
          masterManufacturer = master.manufacturerName;
        }

        if (!masterId) {
          logger.warn(`[CsvImport] No masterId for row ${row.rowNumber}, skipping`);
          continue;
        }

        // Offer upsert via common service (3.5)
        const distributionType = row.parsedDistributionType || 'PRIVATE';
        const supplyPrice = row.parsedSupplyPrice ?? 0;
        await this.importCommon.upsertSupplierOffer(
          manager, masterId, supplierId, distributionType, supplyPrice, row.parsedBarcode!,
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

  /**
   * CSV raw row에서 manualData 추출 (3.3)
   * regulatory_name + manufacturer_name이 모두 존재해야 유효
   */
  private extractManualData(
    raw: Record<string, string>,
  ): { regulatoryName: string; manufacturerName: string; brand?: string } | null {
    const regulatoryName = (raw.regulatory_name || '').trim();
    const manufacturerName = (raw.manufacturer_name || '').trim();
    if (!regulatoryName || !manufacturerName) return null;

    const brand = (raw.brand || '').trim() || undefined;
    return { regulatoryName, manufacturerName, brand };
  }
}
