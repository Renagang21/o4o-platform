import { Router } from 'express';
import { DataSource } from 'typeorm';
import { createFeePolicyController } from '../controllers/FeePolicyController.js';
import { createFeeInvoiceController } from '../controllers/FeeInvoiceController.js';
import { createFeePaymentController } from '../controllers/FeePaymentController.js';
import { createFeeExemptionController } from '../controllers/FeeExemptionController.js';
import { createFeeSettlementController } from '../controllers/FeeSettlementController.js';
import { createMemberFeeController } from '../controllers/MemberFeeController.js';

/**
 * AnnualFee-Yaksa Routes
 *
 * 약사회 연회비 시스템 라우트
 *
 * 라우트 구조:
 * - /api/annualfee/policies     - 정책 관리
 * - /api/annualfee/invoices     - 청구 관리
 * - /api/annualfee/payments     - 납부 관리
 * - /api/annualfee/exemptions   - 감면 관리
 * - /api/annualfee/settlements  - 정산 관리
 * - /api/annualfee/members      - 회원 회비 조회
 */
export function createRoutes(dataSource: DataSource): Router {
  const router = Router();

  // 정책 관리 API
  router.use('/policies', createFeePolicyController(dataSource));

  // 청구 관리 API
  router.use('/invoices', createFeeInvoiceController(dataSource));

  // 납부 관리 API
  router.use('/payments', createFeePaymentController(dataSource));

  // 감면 관리 API
  router.use('/exemptions', createFeeExemptionController(dataSource));

  // 정산 관리 API
  router.use('/settlements', createFeeSettlementController(dataSource));

  // 회원 회비 조회 API
  router.use('/members', createMemberFeeController(dataSource));

  return router;
}

export default createRoutes;
