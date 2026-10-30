export type { RegulatedCategory, RegulatedCategoryStatus, SupplierRegulatedCategory } from '@o4o/operator-core-ui/modules/supplier-operations';
import type { ContactVisibility } from '../neture.js';

// ==================== Supplier Profile Types ====================

export interface SupplierProfile {
  id: string;
  name: string;
  slug: string;
  status?: string;
  // WO-O4O-NETURE-SUPPLIER-APPROVAL-AND-PROFILE-COMPLETION-SEPARATION-V1:
  // 프로필 완성 상태의 단일 권위(backend 산출) — 승인 여부(status)와 분리된 정보성 필드.
  profileComplete?: boolean;
  missingProfileFields?: string[];
  /** @deprecated profileComplete 사용 */
  activationReady?: boolean;
  /** @deprecated missingProfileFields 사용 */
  missingActivationFields?: string[];
  // Business profile (WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1)
  businessNumber: string | null;
  representativeName: string | null;
  businessZipCode: string | null;
  businessAddress: string | null;
  businessAddressDetail: string | null;
  managerName: string | null;
  managerPhone: string | null;
  businessType: string | null;
  businessItem: string | null;
  // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
  businessEntityType: string | null;
  businessStartDate: string | null;
  taxInvoiceEmail: string | null;
  _prefilled?: boolean;
  // Contact
  contactEmail: string | null;
  contactPhone: string | null;
  contactWebsite: string | null;
  contactKakao: string | null;
  contactEmailVisibility: ContactVisibility;
  contactPhoneVisibility: ContactVisibility;
  contactWebsiteVisibility: ContactVisibility;
  contactKakaoVisibility: ContactVisibility;
  // WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
  minOrderAmount: number | null;
  minOrderSurcharge: number | null;
  orderConditionNote: string | null;
  // WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1: 배송 정책 (저장/조회 foundation)
  baseShippingFee?: number | null;
  freeShippingThreshold?: number | null;
  averageDispatchDays?: number | null;
  returnExchangeNotice?: string | null;
  shippingStandard?: string | null;
  shippingIsland?: string | null;
  shippingMountain?: string | null;
}

export type SupplierOnboardingDocumentType =
  | 'business_registration'
  | 'bank_statement'
  | 'mail_order_report';

export type MailOrderSalesStatus = 'not_applicable' | 'reported' | 'pending';

export interface SupplierOnboardingDocument {
  id: string;
  documentType: SupplierOnboardingDocumentType;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  verificationStatus: string;
  createdAt: string;
  verifiedAt: string | null;
}

export interface SupplierOnboarding {
  supplierId: string;
  taxInvoiceEmail: string | null;
  settlementBankName: string | null;
  settlementAccountNumber: string | null;
  settlementAccountNumberMasked: string | null;
  settlementAccountHolder: string | null;
  settlementContactName: string | null;
  settlementContactEmail: string | null;
  mailOrderSalesStatus: MailOrderSalesStatus | null;
  mailOrderSalesRegistrationNumber: string | null;
  businessRegistrationDocument: SupplierOnboardingDocument | null;
  settlementBankbookDocument: SupplierOnboardingDocument | null;
  mailOrderSalesDocument: SupplierOnboardingDocument | null;
}

// WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1
export interface SupplierOrderCondition {
  supplierId: string;
  supplierName: string;
  minOrderAmount: number | null;
  minOrderSurcharge: number | null;
  note: string | null;
}

// ==================== Supplier Regulated Category API ====================
// WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
