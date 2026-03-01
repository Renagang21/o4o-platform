/**
 * CSV Import Service
 *
 * B2B 공급자 CSV 대량 유입 파이프라인
 * Master 보호형 — CSV는 Offer 생성 도구, Master는 MFDS 검증 기반만 허용
 *
 * WO-O4O-B2B-CSV-INGEST-PIPELINE-V1
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
  OfferDistributionType,
  OfferApprovalStatus,
  ProductMaster,
  NetureSupplier,
  SupplierStatus,
} from '../entities/index.js';
import { validateGtin } from '../../../utils/gtin.js';
import { verifyProductByBarcode } from './mfds.service.js';
import logger from '../../../utils/logger.js';

/** CSV 허용 컬럼 — Master 관련 컬럼은 무시 */
const ALLOWED_CSV_COLUMNS = [
  'barcode',
  'supplier_sku',
  'supply_price',
  'msrp',
  'stock_qty',
  'distribution_type',
  'description',
];

const VALID_DISTRIBUTION_TYPES = ['PUBLIC', 'SERVICE', 'PRIVATE'];

export class CsvImportService {
  private batchRepo: Repository<SupplierCsvImportBatch>;
  private rowRepo: Repository<SupplierCsvImportRow>;
  private masterRepo: Repository<ProductMaster>;
  private offerRepo: Repository<SupplierProductOffer>;
  private supplierRepo: Repository<NetureSupplier>;

  constructor(private dataSource: DataSource) {
    this.batchRepo = dataSource.getRepository(SupplierCsvImportBatch);
    this.rowRepo = dataSource.getRepository(SupplierCsvImportRow);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.offerRepo = dataSource.getRepository(SupplierProductOffer);
    this.supplierRepo = dataSource.getRepository(NetureSupplier);
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
          // MFDS 미검증 → reject (CSV에서 수동 생성 금지)
          this.rejectRow(row, 'MASTER_NOT_FOUND_IN_MFDS');
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
   * - CREATE_MASTER → resolveOrCreateMaster (MFDS 경로만)
   * - LINK_EXISTING → master_id 이미 설정됨
   * - Offer upsert: ON CONFLICT (master_id, supplier_id) DO UPDATE
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

    await this.dataSource.transaction(async (manager) => {
      for (const row of validRows) {
        let masterId = row.masterId;

        // CREATE_MASTER → MFDS 검증 후 생성
        if (row.actionType === CsvRowActionType.CREATE_MASTER) {
          const barcode = row.parsedBarcode!;
          const mfdsResult = await verifyProductByBarcode(barcode);

          if (mfdsResult.verified && mfdsResult.product) {
            const masterRepo = manager.getRepository(ProductMaster);

            // UNIQUE(barcode) 보호 — 동시 batch에서 같은 barcode가 이미 생성됐을 수 있음
            let master = await masterRepo.findOne({ where: { barcode } });
            if (!master) {
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
            }
            masterId = master.id;
          } else {
            // MFDS 검증 실패 (stub 상태에서 발생 가능) → skip
            logger.warn(`[CsvImport] MFDS verification failed during apply for barcode ${row.parsedBarcode}, skipping row ${row.rowNumber}`);
            continue;
          }
        }

        if (!masterId) {
          logger.warn(`[CsvImport] No masterId for row ${row.rowNumber}, skipping`);
          continue;
        }

        // Offer upsert — ON CONFLICT (master_id, supplier_id) DO UPDATE
        const distributionType = row.parsedDistributionType || 'PRIVATE';
        const supplyPrice = row.parsedSupplyPrice ?? 0;

        await manager.query(
          `INSERT INTO supplier_product_offers
            (id, master_id, supplier_id, distribution_type, approval_status, is_active,
             price_general, created_at, updated_at)
           VALUES
            (gen_random_uuid(), $1, $2, $3, $4, false, $5, NOW(), NOW())
           ON CONFLICT (master_id, supplier_id) DO UPDATE SET
             price_general = EXCLUDED.price_general,
             distribution_type = EXCLUDED.distribution_type::supplier_product_offers_distribution_type_enum,
             updated_at = NOW()`,
          [masterId, supplierId, distributionType, OfferApprovalStatus.PENDING, supplyPrice],
        );
        appliedOffers++;
      }
    });

    // 5. Batch 상태 업데이트
    batch.status = CsvImportBatchStatus.APPLIED;
    batch.appliedAt = new Date();
    await this.batchRepo.save(batch);

    logger.info(`[CsvImport] Batch ${batchId} applied — offers: ${appliedOffers}, masters: ${createdMasters}`);

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
