/**
 * SettlementEcountHandler
 *
 * SETTLEMENT_CLOSED 이벤트를 수신하여 Ecount ERP에 전표 생성
 *
 * === 워크플로우 ===
 * 1. settlement.closed 이벤트 수신
 * 2. SettlementBatch에서 Supplier 지급 확정 금액 추출
 * 3. 배치 1건 = 전표 1건으로 Ecount 매입/지급 전표 생성
 * 4. 결과 기록 (성공/실패)
 *
 * === 원칙 ===
 * - 내부 정산·계산 로직은 절대 수정하지 않음
 * - 성공 여부는 Ecount API 응답으로만 판단
 */

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettlementBatch, SettlementType } from '../entities/SettlementBatch.entity.js';
import { Supplier } from '../entities/Supplier.entity.js';
import {
  EcountApiClient,
  getEcountApiClient,
  EcountApiResponse,
} from './EcountApiClient.js';
import logger from './logger.js';

export interface EcountVoucherResult {
  success: boolean;
  settlementBatchId: string;
  batchNumber: string;
  supplierCode: string;
  netAmount: number;
  purchaseVoucher?: {
    voucherNo?: string;
    status: string;
    message: string;
    rawResponse: EcountApiResponse;
  };
  paymentVoucher?: {
    voucherNo?: string;
    status: string;
    message: string;
    rawResponse: EcountApiResponse;
  };
  error?: string;
  processedAt: Date;
}

@Injectable()
export class SettlementEcountHandler {
  private ecountClient: EcountApiClient;

  constructor(
    @InjectRepository(SettlementBatch)
    private readonly settlementRepository: Repository<SettlementBatch>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>
  ) {
    this.ecountClient = getEcountApiClient();
  }

  /**
   * settlement.closed 이벤트 핸들러
   *
   * 정산 배치 마감 시 Ecount 전표 생성
   */
  @OnEvent('settlement.closed')
  async handleSettlementClosed(batch: SettlementBatch): Promise<EcountVoucherResult> {
    logger.info('[SettlementEcountHandler] Received settlement.closed event', {
      batchId: batch.id,
      batchNumber: batch.batchNumber,
      settlementType: batch.settlementType,
      supplierId: batch.supplierId,
      netAmount: batch.netAmount,
    });

    // Supplier 정산만 처리 (Seller 정산은 별도 처리)
    if (batch.settlementType !== SettlementType.SUPPLIER) {
      logger.info('[SettlementEcountHandler] Skipping non-supplier settlement', {
        settlementType: batch.settlementType,
      });
      return {
        success: true,
        settlementBatchId: batch.id,
        batchNumber: batch.batchNumber,
        supplierCode: '',
        netAmount: batch.netAmount,
        error: 'Skipped: Not a supplier settlement',
        processedAt: new Date(),
      };
    }

    // Ecount API 설정 확인
    if (!this.ecountClient.isConfigured()) {
      logger.warn('[SettlementEcountHandler] Ecount API not configured, skipping');
      return {
        success: false,
        settlementBatchId: batch.id,
        batchNumber: batch.batchNumber,
        supplierCode: '',
        netAmount: batch.netAmount,
        error: 'Ecount API not configured',
        processedAt: new Date(),
      };
    }

    try {
      // Supplier 정보 조회
      const supplier = await this.supplierRepository.findOne({
        where: { id: batch.supplierId },
      });

      if (!supplier) {
        throw new Error(`Supplier not found: ${batch.supplierId}`);
      }

      // Ecount 거래처 코드 (Supplier 엔티티에 ecountCode 필드가 있다고 가정)
      const supplierCode = (supplier as any).ecountCode || supplier.id.slice(0, 8);

      // 전표 데이터 생성
      const vouchers = this.ecountClient.createVoucherFromSettlement(
        {
          id: batch.id,
          batchNumber: batch.batchNumber,
          supplierId: batch.supplierId,
          periodStart: batch.periodStart,
          periodEnd: batch.periodEnd,
          netAmount: Number(batch.netAmount),
          totalAmount: Number(batch.totalAmount),
          commissionAmount: Number(batch.commissionAmount),
        },
        supplierCode
      );

      // 1. 매입전표 생성
      logger.info('[SettlementEcountHandler] Creating purchase voucher', {
        batchNumber: batch.batchNumber,
        supplierCode,
        fields: Object.keys(vouchers.purchase),
        items: vouchers.purchase.ITEMS.map((item) => ({
          PROD_DES: item.PROD_DES,
          TOTAL_AMT: item.TOTAL_AMT,
        })),
      });

      const purchaseResult = await this.ecountClient.createPurchaseVoucher(vouchers.purchase);

      // 2. 지급전표 생성
      logger.info('[SettlementEcountHandler] Creating payment voucher', {
        batchNumber: batch.batchNumber,
        supplierCode,
        fields: Object.keys(vouchers.payment),
        payAmount: vouchers.payment.PAY_AMT,
      });

      const paymentResult = await this.ecountClient.createPaymentVoucher(vouchers.payment);

      // 결과 기록
      const result: EcountVoucherResult = {
        success: purchaseResult.Status === 'OK' && paymentResult.Status === 'OK',
        settlementBatchId: batch.id,
        batchNumber: batch.batchNumber,
        supplierCode,
        netAmount: Number(batch.netAmount),
        purchaseVoucher: {
          voucherNo: purchaseResult.Data?.VOUCHER_NO,
          status: purchaseResult.Status,
          message: purchaseResult.Message,
          rawResponse: purchaseResult,
        },
        paymentVoucher: {
          voucherNo: paymentResult.Data?.VOUCHER_NO,
          status: paymentResult.Status,
          message: paymentResult.Message,
          rawResponse: paymentResult,
        },
        processedAt: new Date(),
      };

      logger.info('[SettlementEcountHandler] Voucher creation completed', {
        success: result.success,
        batchNumber: batch.batchNumber,
        purchaseVoucherNo: result.purchaseVoucher?.voucherNo,
        paymentVoucherNo: result.paymentVoucher?.voucherNo,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('[SettlementEcountHandler] Failed to create vouchers', {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        error: errorMessage,
      });

      return {
        success: false,
        settlementBatchId: batch.id,
        batchNumber: batch.batchNumber,
        supplierCode: '',
        netAmount: Number(batch.netAmount),
        error: errorMessage,
        processedAt: new Date(),
      };
    }
  }

  /**
   * 수동으로 전표 생성 (재시도용)
   */
  async createVoucherForSettlement(settlementBatchId: string): Promise<EcountVoucherResult> {
    const batch = await this.settlementRepository.findOne({
      where: { id: settlementBatchId },
    });

    if (!batch) {
      throw new Error(`Settlement batch not found: ${settlementBatchId}`);
    }

    return this.handleSettlementClosed(batch);
  }
}

export default SettlementEcountHandler;
