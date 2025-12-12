/**
 * AnnualFee-Yaksa
 *
 * 약사회 연회비 시스템
 *
 * 주요 기능:
 * - 회비 정책 관리 (FeePolicy)
 * - 회비 청구 관리 (FeeInvoice)
 * - 납부 처리 (FeePayment)
 * - 감면 관리 (FeeExemption)
 * - 정산 관리 (FeeSettlement)
 * - 감사 로그 (FeeLog)
 * - Membership-Yaksa/LMS-Yaksa 연동
 *
 * Phase 2 추가 기능:
 * - 자동 청구 생성 (InvoiceAutoGenerator)
 * - 미납 알림 (FeeReminderService)
 * - PDF 영수증 (ReceiptPdfGenerator)
 * - CSV 임포트 (CsvPaymentImporter)
 * - 정산 자동화 (SettlementAutomation)
 */

// Manifest
export { manifest } from './manifest.js';

// Backend
export * from './backend/index.js';

// Views (Member Portal) - import as namespace to avoid conflicts
export * as Views from './views/index.js';
