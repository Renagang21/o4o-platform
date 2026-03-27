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
 * WO-NETURE-XLSX-TEMPLATE-FINAL-V2
 *   - barcode 선택화 (미입력 시 자동 생성)
 *   - category_name / distribution_type 필수 해제
 *   - consumer_price / packaging_name / short_description / detail_description 매핑 추가
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
import { ImageStorageService } from './image-storage.service.js';
import type { ProductContentInput } from '@o4o/ai-prompts/store';
import logger from '../../../utils/logger.js';

/** CSV 허용 컬럼 */
const ALLOWED_CSV_COLUMNS = [
  'barcode',
  'supply_price',
  'msrp', // legacy compat
  'consumer_price', // WO-NETURE-XLSX-TEMPLATE-FINAL-V2
  'stock_qty',
  'distribution_type', // legacy compat (무시, 기본 PUBLIC)
  'description', // legacy compat
  'image_url',
  'regulatory_name', // legacy compat
  'packaging_name', // WO-NETURE-XLSX-TEMPLATE-FINAL-V2 (→ regulatory_name 매핑)
  'manufacturer_name',
  'brand',
  'origin_country', // WO-NETURE-XLSX-TEMPLATE-FINAL-V2 (rawJson 보존)
  'marketing_name',
  'consumer_short_description', // legacy compat
  'short_description', // WO-NETURE-XLSX-TEMPLATE-FINAL-V2 (→ consumer_short_description 매핑)
  'detail_description', // WO-NETURE-XLSX-TEMPLATE-FINAL-V2
  'category_name', // legacy compat (선택)
];

const VALID_DISTRIBUTION_TYPES = ['PUBLIC', 'SERVICE', 'PRIVATE'];

export class CsvImportService {
  private batchRepo: Repository<SupplierCsvImportBatch>;
  private rowRepo: Repository<SupplierCsvImportRow>;
  private masterRepo: Repository<ProductMaster>;
  private offerRepo: Repository<SupplierProductOffer>;
  private supplierRepo: Repository<NetureSupplier>;
  private importCommon: ProductImportCommonService;
  private imageStorage: ImageStorageService;

  constructor(private dataSource: DataSource) {
    this.batchRepo = dataSource.getRepository(SupplierCsvImportBatch);
    this.rowRepo = dataSource.getRepository(SupplierCsvImportRow);
    this.masterRepo = dataSource.getRepository(ProductMaster);
    this.offerRepo = dataSource.getRepository(SupplierProductOffer);
    this.supplierRepo = dataSource.getRepository(NetureSupplier);
    this.importCommon = new ProductImportCommonService(dataSource);
    this.imageStorage = new ImageStorageService();
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
    // WO-O4O-NETURE-UPLOAD-VALIDATION-REFORM-V1: 확장자 기반 검증 + 파싱 기반 실제 검증
    // STEP 1. 확장자 체크
    const ext = file.originalname ? file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase() : '';
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      return { success: false, error: '.xlsx 또는 .csv 파일만 업로드 가능합니다' };
    }

    // STEP 2. 파일 크기 체크 (25MB)
    if (file.buffer.length > 25 * 1024 * 1024) {
      return { success: false, error: '파일 크기가 25MB를 초과합니다' };
    }

    // STEP 3. 실제 파싱 검증 (핵심 — MIME이 아닌 파일 내용으로 검증)
    let records: Record<string, string>[];
    const isXlsx = /\.xlsx?$/i.test(file.originalname);
    try {
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
      logger.error(`[CsvImport] Parse failed — file: ${file.originalname}, error:`, err);
      const friendlyMsg = isXlsx
        ? '엑셀 파일 형식이 올바르지 않습니다. Excel에서 다시 저장 후 업로드해 주세요.'
        : 'CSV 파일 형식이 올바르지 않습니다.';
      return { success: false, error: friendlyMsg };
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

      // WO-NETURE-XLSX-TEMPLATE-FINAL-V2: barcode 선택, 미입력 시 자동 생성
      let effectiveBarcode = barcode;
      let isAutoBarcode = false;
      if (!barcode) {
        effectiveBarcode = `INT${Date.now()}${String(rowNumber).padStart(4, '0')}`;
        isAutoBarcode = true;
      }

      const row = this.rowRepo.create({
        batchId: savedBatch.id,
        rowNumber,
        rawJson: raw,
        parsedBarcode: effectiveBarcode,
        parsedSupplyPrice: null,
        parsedDistributionType: null,
        validationStatus: CsvRowValidationStatus.PENDING,
        validationError: null,
        masterId: null,
        actionType: null,
      });

      // 3a. GTIN 유효? (자동 생성 바코드는 스킵)
      if (!isAutoBarcode) {
        const gtinError = validateGtin(effectiveBarcode);
        if (gtinError) {
          this.rejectRow(row, `INVALID_GTIN: ${gtinError}`);
          rejectedCount++;
          rowEntities.push(row);
          continue;
        }
      }

      // 3b. batch 내 barcode 중복?
      if (seenBarcodes.has(effectiveBarcode)) {
        this.rejectRow(row, 'DUPLICATE_IN_BATCH');
        rejectedCount++;
        rowEntities.push(row);
        continue;
      }
      seenBarcodes.add(effectiveBarcode);

      // 3c. supply_price 검증 (필수)
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

      // 3d. distribution_type — 값이 있으면 파싱, 없으면 PUBLIC 기본값 (검증 안함)
      const rawDist = (raw.distribution_type || '').trim().toUpperCase();
      row.parsedDistributionType = rawDist && VALID_DISTRIBUTION_TYPES.includes(rawDist) ? rawDist : 'PUBLIC';

      // 3e. category_name — 선택 (있으면 DB 매칭 시도, 없어도 통과)
      const categoryName = (raw.category_name || '').trim();
      if (categoryName) {
        const catMatchRows: Array<{ id: string }> = await this.dataSource.query(
          `SELECT id FROM product_categories WHERE LOWER(name) = LOWER($1) AND is_active = true ORDER BY depth DESC LIMIT 1`,
          [categoryName],
        );
        if (catMatchRows.length === 0) {
          logger.warn(`[CsvImport] Category not found: "${categoryName}" (row ${rowNumber}), ignoring`);
        }
      }

      // 3f. 내부 Master 조회 (자동 생성 바코드는 항상 CREATE_MASTER)
      if (isAutoBarcode) {
        // packaging_name / marketing_name 중 하나는 있어야 Master 생성 가능
        const packagingName = (raw.packaging_name || '').trim();
        const marketingName = (raw.marketing_name || '').trim();
        const regulatoryName = (raw.regulatory_name || '').trim();
        if (packagingName || marketingName || regulatoryName) {
          row.actionType = CsvRowActionType.CREATE_MASTER;
          row.validationStatus = CsvRowValidationStatus.VALID;
          validCount++;
        } else {
          this.rejectRow(row, 'MISSING_MARKETING_NAME');
          rejectedCount++;
        }
      } else {
        const existingMaster = await this.masterRepo.findOne({
          where: { barcode: effectiveBarcode },
          select: ['id'],
        });

        if (existingMaster) {
          row.masterId = existingMaster.id;
          row.actionType = CsvRowActionType.LINK_EXISTING;
          row.validationStatus = CsvRowValidationStatus.VALID;
          validCount++;
        } else {
          const packagingName = (raw.packaging_name || '').trim();
          const marketingName = (raw.marketing_name || '').trim();
          const regulatoryName = (raw.regulatory_name || '').trim();
          const hasProductName = !!(packagingName || marketingName || regulatoryName);

          if (hasProductName) {
            row.actionType = CsvRowActionType.CREATE_MASTER;
            row.validationStatus = CsvRowValidationStatus.VALID;
            validCount++;
          } else {
            this.rejectRow(row, 'MISSING_MARKETING_NAME');
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
  /**
   * WO-O4O-NETURE-CSV-PARTIAL-SUCCESS-V1
   * SAVEPOINT 기반 행 단위 부분 성공 지원
   */
  async applyBatch(
    batchId: string,
    supplierId: string,
  ): Promise<{
    success: boolean;
    data?: {
      appliedOffers: number;
      createdMasters: number;
      failedRows: number;
      errors: Array<{ rowNumber: number; barcode: string | null; error: string }>;
    };
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

    // 4. SAVEPOINT 기반 행 단위 적용
    let appliedOffers = 0;
    let createdMasters = 0;
    let failedCount = 0;
    const aiContentInputs: ProductContentInput[] = [];
    const imageJobs: Array<{ masterId: string; imageUrl: string }> = [];

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const row of validRows) {
        await qr.query('SAVEPOINT row_sp');
        try {
          const result = await this.applyRow(qr.manager, row, supplierId);
          await qr.query('RELEASE SAVEPOINT row_sp');

          row.applyStatus = 'applied';
          row.applyError = null;
          row.masterId = result.masterId; // WO-O4O-NETURE-IMPORT-PRODUCT-TRACE-V1
          row.offerId = result.offerId;
          appliedOffers++;
          if (result.createdMaster) createdMasters++;
          if (result.imageJob) imageJobs.push(result.imageJob);
          if (result.aiInput) aiContentInputs.push(result.aiInput);
        } catch (err) {
          await qr.query('ROLLBACK TO SAVEPOINT row_sp');
          row.applyStatus = 'failed';
          row.applyError = (err as Error).message?.slice(0, 500) || 'Unknown error';
          failedCount++;
          logger.warn(`[CsvImport] Row ${row.rowNumber} apply failed: ${row.applyError}`);
        }
      }
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    // 5. Row apply 상태 벌크 저장 (트랜잭션 외부)
    await this.rowRepo.save(validRows);

    // 6. Batch 상태 결정
    batch.appliedRows = appliedOffers;
    batch.appliedAt = new Date();
    batch.status = failedCount === 0
      ? CsvImportBatchStatus.APPLIED
      : appliedOffers === 0
        ? CsvImportBatchStatus.FAILED
        : CsvImportBatchStatus.PARTIAL;
    await this.batchRepo.save(batch);

    logger.info(
      `[CsvImport] Batch ${batchId} — status: ${batch.status}, applied: ${appliedOffers}, failed: ${failedCount}, masters: ${createdMasters}`,
    );

    // Fire-and-forget: Image pipeline (성공한 행만)
    if (imageJobs.length > 0) {
      const imageJobsGrouped = imageJobs.map((j) => ({ masterId: j.masterId, imageUrls: [j.imageUrl] }));
      this.importCommon.processImportImages(imageJobsGrouped).catch((err) => {
        logger.error('[CsvImport] Image pipeline error:', err);
      });
    }

    // Fire-and-forget: AI content generation (성공한 행만)
    if (aiContentInputs.length > 0) {
      this.importCommon.triggerAiContentGeneration(aiContentInputs).catch((err) => {
        logger.error('[CsvImport] AI content generation error:', err);
      });
    }

    return {
      success: true,
      data: {
        appliedOffers,
        createdMasters,
        failedRows: failedCount,
        errors: validRows
          .filter((r) => r.applyStatus === 'failed')
          .map((r) => ({
            rowNumber: r.rowNumber,
            barcode: r.parsedBarcode,
            error: r.applyError || 'Unknown error',
          })),
      },
    };
  }

  /**
   * 단일 행 적용 로직 — applyBatch에서 SAVEPOINT 내에서 호출
   */
  private async applyRow(
    manager: import('typeorm').EntityManager,
    row: SupplierCsvImportRow,
    supplierId: string,
  ): Promise<{
    createdMaster: boolean;
    masterId: string;
    offerId: string;
    imageJob?: { masterId: string; imageUrl: string };
    aiInput?: ProductContentInput;
  }> {
    let masterId = row.masterId;
    let masterName = '';
    let masterManufacturer = '';
    let createdMaster = false;

    // CREATE_MASTER
    if (row.actionType === CsvRowActionType.CREATE_MASTER) {
      const barcode = row.parsedBarcode!;
      const raw = row.rawJson as Record<string, string>;
      const masterRepo = manager.getRepository(ProductMaster);

      let master = await masterRepo.findOne({ where: { barcode } });

      if (!master) {
        const mfdsResult = await verifyProductByBarcode(barcode);
        const mfds = mfdsResult.verified && mfdsResult.product ? mfdsResult.product : null;

        const csvMarketingName = (raw.marketing_name || '').trim();
        const csvPackagingName = (raw.packaging_name || '').trim();
        const csvRegulatoryName = (raw.regulatory_name || csvPackagingName).trim();
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
        createdMaster = true;
        logger.info(`[CsvImport] Created Master for barcode ${barcode} (mfdsVerified=${!!mfds})`);
      }

      masterId = master.id;
      masterName = master.marketingName || master.regulatoryName;
      masterManufacturer = master.manufacturerName;
    }

    if (!masterId) {
      throw new Error('NO_MASTER_ID');
    }

    // Brand 해석
    const raw = row.rawJson as Record<string, string>;
    const brandName = (raw.brand || '').trim();
    if (brandName) {
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

    // Category 매칭
    const categoryName = (raw.category_name || '').trim();
    if (categoryName) {
      const catRows: Array<{ id: string }> = await manager.query(
        `SELECT id FROM product_categories WHERE LOWER(name) = LOWER($1) AND is_active = true ORDER BY depth DESC LIMIT 1`,
        [categoryName],
      );
      if (catRows.length > 0) {
        const condition = row.actionType === CsvRowActionType.CREATE_MASTER ? '' : ' AND category_id IS NULL';
        await manager.query(
          `UPDATE product_masters SET category_id = $1 WHERE id = $2${condition}`,
          [catRows[0].id, masterId],
        );
      }
    }

    // Offer upsert
    const distributionType = row.parsedDistributionType || 'PRIVATE';
    const supplyPrice = row.parsedSupplyPrice ?? 0;
    const rawConsumerPrice = (raw.consumer_price || raw.msrp || '').trim();
    const rawStockQty = (raw.stock_qty || '').trim();
    const rawDescription = (raw.short_description || raw.consumer_short_description || raw.description || '').trim();
    const rawDetailDesc = (raw.detail_description || '').trim();
    const extra = {
      msrp: rawConsumerPrice ? parseInt(rawConsumerPrice, 10) || null : null,
      stockQty: rawStockQty ? parseInt(rawStockQty, 10) || null : null,
      description: rawDescription || null,
      detailDescription: rawDetailDesc || null,
    };

    const offerId = await this.importCommon.upsertSupplierOffer(
      manager, masterId, supplierId, distributionType, supplyPrice, row.parsedBarcode!, extra,
    );

    // Image job
    const imageUrl = (raw.image_url || '').trim();
    const imageJob = imageUrl ? { masterId, imageUrl } : undefined;

    // AI content input
    const aiInput: ProductContentInput = {
      id: masterId,
      regulatoryName: masterName || row.parsedBarcode || 'Unknown',
      marketingName: masterName || row.parsedBarcode || 'Unknown',
      manufacturerName: masterManufacturer || 'Unknown',
    };

    return { createdMaster, masterId, offerId, imageJob, aiInput };
  }

  // ==================== 실패 행 재처리 (WO-O4O-NETURE-IMPORT-RETRY-FAILED-V1) ====================

  /**
   * PARTIAL/FAILED 배치의 실패 행만 재처리
   * applyRow() 재사용, SAVEPOINT 기반 행 단위
   */
  async retryBatch(
    batchId: string,
    supplierId: string,
    targetRows?: number[], // 특정 행만 retry (optional)
  ): Promise<{
    success: boolean;
    data?: {
      retriedRows: number;
      appliedOffers: number;
      createdMasters: number;
      failedRows: number;
      errors: Array<{ rowNumber: number; barcode: string | null; error: string }>;
    };
    error?: string;
  }> {
    // 1. Batch 조회 + 상태 검증
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, supplierId },
    });
    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }
    if (batch.status !== CsvImportBatchStatus.PARTIAL && batch.status !== CsvImportBatchStatus.FAILED) {
      return { success: false, error: `BATCH_NOT_RETRYABLE: current status is ${batch.status}` };
    }

    // 2. Supplier ACTIVE guard
    const supplier = await this.supplierRepo.findOne({
      where: { id: supplierId },
      select: ['id', 'status'],
    });
    if (!supplier || supplier.status !== SupplierStatus.ACTIVE) {
      return { success: false, error: 'SUPPLIER_NOT_ACTIVE' };
    }

    // 3. 실패 행 조회 (applyStatus === 'failed' only)
    let failedRows = await this.rowRepo.find({
      where: {
        batchId,
        applyStatus: 'failed',
      },
      order: { rowNumber: 'ASC' },
    });

    // 선택적 행 필터
    if (targetRows && targetRows.length > 0) {
      const targetSet = new Set(targetRows);
      failedRows = failedRows.filter((r) => targetSet.has(r.rowNumber));
    }

    if (failedRows.length === 0) {
      return { success: false, error: 'NO_FAILED_ROWS' };
    }

    // 4. SAVEPOINT 기반 행 단위 재처리
    let appliedOffers = 0;
    let createdMasters = 0;
    let stillFailed = 0;
    const aiContentInputs: ProductContentInput[] = [];
    const imageJobs: Array<{ masterId: string; imageUrl: string }> = [];

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      for (const row of failedRows) {
        await qr.query('SAVEPOINT row_sp');
        try {
          const result = await this.applyRow(qr.manager, row, supplierId);
          await qr.query('RELEASE SAVEPOINT row_sp');

          row.applyStatus = 'applied';
          row.applyError = null;
          row.masterId = result.masterId;
          row.offerId = result.offerId;
          appliedOffers++;
          if (result.createdMaster) createdMasters++;
          if (result.imageJob) imageJobs.push(result.imageJob);
          if (result.aiInput) aiContentInputs.push(result.aiInput);
        } catch (err) {
          await qr.query('ROLLBACK TO SAVEPOINT row_sp');
          row.applyStatus = 'failed';
          row.applyError = (err as Error).message?.slice(0, 500) || 'Unknown error';
          stillFailed++;
          logger.warn(`[CsvImport] Retry row ${row.rowNumber} failed: ${row.applyError}`);
        }
      }
      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    // 5. Row 상태 벌크 저장
    await this.rowRepo.save(failedRows);

    // 6. Batch 상태 재계산 (전체 row 기준)
    const allRows = await this.rowRepo.find({ where: { batchId } });
    const totalApplied = allRows.filter((r) => r.applyStatus === 'applied').length;
    const totalFailed = allRows.filter((r) => r.applyStatus === 'failed').length;

    batch.appliedRows = totalApplied;
    batch.status = totalFailed === 0
      ? CsvImportBatchStatus.APPLIED
      : totalApplied === 0
        ? CsvImportBatchStatus.FAILED
        : CsvImportBatchStatus.PARTIAL;
    await this.batchRepo.save(batch);

    logger.info(
      `[CsvImport] Retry batch ${batchId} — retried: ${failedRows.length}, newApplied: ${appliedOffers}, stillFailed: ${stillFailed}, batchStatus: ${batch.status}`,
    );

    // Fire-and-forget: Image + AI
    if (imageJobs.length > 0) {
      const imageJobsGrouped = imageJobs.map((j) => ({ masterId: j.masterId, imageUrls: [j.imageUrl] }));
      this.importCommon.processImportImages(imageJobsGrouped).catch((err) => {
        logger.error('[CsvImport] Retry image pipeline error:', err);
      });
    }
    if (aiContentInputs.length > 0) {
      this.importCommon.triggerAiContentGeneration(aiContentInputs).catch((err) => {
        logger.error('[CsvImport] Retry AI content error:', err);
      });
    }

    return {
      success: true,
      data: {
        retriedRows: failedRows.length,
        appliedOffers,
        createdMasters,
        failedRows: stillFailed,
        errors: failedRows
          .filter((r) => r.applyStatus === 'failed')
          .map((r) => ({
            rowNumber: r.rowNumber,
            barcode: r.parsedBarcode,
            error: r.applyError || 'Unknown error',
          })),
      },
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
      select: ['id', 'fileName', 'totalRows', 'validRows', 'rejectedRows', 'appliedRows', 'status', 'createdAt', 'appliedAt'],
    });
  }

  // ==================== Batch 삭제 (WO-O4O-NETURE-IMPORT-HISTORY-DELETE-V1) ====================

  /**
   * 업로드 이력 삭제 — batch + rows만 삭제, 상품(offer/master) 유지
   * Rows are auto-deleted via ON DELETE CASCADE at DB level.
   */
  async deleteBatch(
    batchId: string,
    supplierId: string,
  ): Promise<{ success: boolean; error?: string; data?: { deletedId: string; totalRows: number } }> {
    const batch = await this.batchRepo.findOne({
      where: { id: batchId, supplierId },
    });

    if (!batch) {
      return { success: false, error: 'BATCH_NOT_FOUND' };
    }

    // 진행 중 상태는 삭제 불가
    if (batch.status === CsvImportBatchStatus.VALIDATING) {
      return { success: false, error: 'CANNOT_DELETE_IN_PROGRESS' };
    }

    const { totalRows } = batch;

    // CASCADE로 rows 자동 삭제
    await this.batchRepo.remove(batch);

    logger.info(`[CSV Import] DELETE_IMPORT batchId=${batchId} supplierId=${supplierId} status=${batch.status} totalRows=${totalRows}`);

    return { success: true, data: { deletedId: batchId, totalRows } };
  }

  // ==================== 완전삭제 (WO-O4O-NETURE-IMPORT-HISTORY-FULL-DELETE-V1) ====================

  /**
   * 완전삭제 가능 여부 사전 검사
   * - listing 존재 여부 체크 → 있으면 차단
   */
  async checkFullDelete(
    batchId: string,
    supplierId: string,
  ): Promise<{ success: boolean; error?: string; data?: { canFullDelete: boolean; reasons: string[]; offerCount: number; masterCount: number } }> {
    const batch = await this.batchRepo.findOne({ where: { id: batchId, supplierId } });
    if (!batch) return { success: false, error: 'BATCH_NOT_FOUND' };
    if (batch.status === CsvImportBatchStatus.VALIDATING) {
      return { success: true, data: { canFullDelete: false, reasons: ['검증 진행 중인 배치입니다'], offerCount: 0, masterCount: 0 } };
    }

    // rows에서 offer/master IDs 수집
    const rows = await this.rowRepo.find({
      where: { batchId },
      select: ['id', 'offerId', 'masterId'],
    });
    const offerIds = [...new Set(rows.map(r => r.offerId).filter((id): id is string => !!id))];
    const masterIds = [...new Set(rows.map(r => r.masterId).filter((id): id is string => !!id))];

    // offer가 없으면 (apply 안 된 batch) → 기존 deleteBatch로 충분
    if (offerIds.length === 0) {
      return { success: true, data: { canFullDelete: true, reasons: [], offerCount: 0, masterCount: 0 } };
    }

    const reasons: string[] = [];

    // 1. listing 존재 체크
    const [listingCheck] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM organization_product_listings WHERE offer_id = ANY($1)`,
      [offerIds],
    );
    if (listingCheck.cnt > 0) {
      reasons.push(`매장에 등록된 상품이 ${listingCheck.cnt}건 있습니다`);
    }

    // orphan master 수 계산 (이 batch의 offer만 가진 master)
    let orphanMasterCount = 0;
    if (masterIds.length > 0) {
      const [orphanCheck] = await this.dataSource.query(
        `SELECT COUNT(DISTINCT pm.id)::int AS cnt
         FROM product_masters pm
         WHERE pm.id = ANY($1)
           AND NOT EXISTS (
             SELECT 1 FROM supplier_product_offers spo
             WHERE spo.master_id = pm.id AND spo.id != ALL($2)
           )`,
        [masterIds, offerIds],
      );
      orphanMasterCount = orphanCheck.cnt;
    }

    return {
      success: true,
      data: {
        canFullDelete: reasons.length === 0,
        reasons,
        offerCount: offerIds.length,
        masterCount: orphanMasterCount,
      },
    };
  }

  /**
   * 완전삭제 — batch + rows + offers + (조건부) masters + images + GCS
   * 조건 미충족 시 차단.
   */
  async fullDeleteBatch(
    batchId: string,
    supplierId: string,
    userId: string,
  ): Promise<{ success: boolean; error?: string; data?: { deletedOffers: number; deletedMasters: number; deletedImages: number } }> {
    // 사전 검사
    const check = await this.checkFullDelete(batchId, supplierId);
    if (!check.success) return { success: false, error: check.error };
    if (!check.data!.canFullDelete) {
      return { success: false, error: 'FULL_DELETE_BLOCKED', };
    }

    // rows에서 offer/master IDs 수집
    const rows = await this.rowRepo.find({
      where: { batchId },
      select: ['id', 'offerId', 'masterId'],
    });
    const offerIds = [...new Set(rows.map(r => r.offerId).filter((id): id is string => !!id))];
    const masterIds = [...new Set(rows.map(r => r.masterId).filter((id): id is string => !!id))];

    // orphan master 판별 (이 batch의 offer만 가진 master)
    let orphanMasterIds: string[] = [];
    if (masterIds.length > 0) {
      const orphans: { id: string }[] = await this.dataSource.query(
        `SELECT pm.id
         FROM product_masters pm
         WHERE pm.id = ANY($1)
           AND NOT EXISTS (
             SELECT 1 FROM supplier_product_offers spo
             WHERE spo.master_id = pm.id AND spo.id != ALL($2)
           )`,
        [masterIds, offerIds],
      );
      orphanMasterIds = orphans.map(r => r.id);
    }

    // GCS 경로 수집 (트랜잭션 전 — 삭제 후 DB에서 조회 불가)
    let gcsPaths: string[] = [];
    if (orphanMasterIds.length > 0) {
      const images: { gcs_path: string }[] = await this.dataSource.query(
        `SELECT gcs_path FROM product_images WHERE master_id = ANY($1) AND gcs_path IS NOT NULL`,
        [orphanMasterIds],
      );
      gcsPaths = images.map(r => r.gcs_path);
    }

    // 트랜잭션: offers → masters → batch 순서 (FK 안전)
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      let deletedOffers = 0;
      let deletedMasters = 0;

      // 1. offers 삭제 (CASCADE: curations, approvals, listings, service_products, product_approvals)
      if (offerIds.length > 0) {
        const offerResult = await qr.query(
          `DELETE FROM supplier_product_offers WHERE id = ANY($1)`,
          [offerIds],
        );
        deletedOffers = offerResult[1] ?? offerIds.length;
      }

      // 2. orphan masters 삭제 (CASCADE: product_images)
      if (orphanMasterIds.length > 0) {
        const masterResult = await qr.query(
          `DELETE FROM product_masters WHERE id = ANY($1)`,
          [orphanMasterIds],
        );
        deletedMasters = masterResult[1] ?? orphanMasterIds.length;
      }

      // 3. batch 삭제 (CASCADE: rows)
      await qr.query(
        `DELETE FROM supplier_csv_import_batches WHERE id = $1`,
        [batchId],
      );

      await qr.commitTransaction();

      // GCS 파일 삭제 (fire-and-forget, 트랜잭션 외부)
      if (gcsPaths.length > 0) {
        Promise.allSettled(
          gcsPaths.map(p => this.imageStorage.deleteImage(p))
        ).then(results => {
          const failed = results.filter(r => r.status === 'rejected').length;
          if (failed > 0) {
            logger.warn(`[CSV Import] FULL_DELETE GCS cleanup: ${failed}/${gcsPaths.length} failed`);
          }
        });
      }

      logger.info(
        `[CSV Import] FULL_DELETE batchId=${batchId} supplierId=${supplierId} user=${userId} ` +
        `offers=${deletedOffers} masters=${deletedMasters} images=${gcsPaths.length}`
      );

      return {
        success: true,
        data: { deletedOffers, deletedMasters, deletedImages: gcsPaths.length },
      };
    } catch (error) {
      await qr.rollbackTransaction();
      logger.error(`[CSV Import] FULL_DELETE failed batchId=${batchId}:`, error);
      throw error;
    } finally {
      await qr.release();
    }
  }

  // ==================== Internal helpers ====================

  private rejectRow(row: SupplierCsvImportRow, error: string): void {
    row.validationStatus = CsvRowValidationStatus.REJECTED;
    row.validationError = error;
    row.actionType = CsvRowActionType.REJECT;
  }
}
