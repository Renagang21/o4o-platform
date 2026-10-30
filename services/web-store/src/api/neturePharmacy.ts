import type { EnrollmentPolicyReference } from '@o4o/shared-space-ui';
/**
 * Neture 약국 매장 commerce API — WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1
 * 설계: docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md §3-1 · §3-2 · §4 · §8
 *
 * `/api/v1/neture/pharmacy/*` 는 서비스 prefix(kpa 등) 밖이라 `coreApiClient` 를 쓴다.
 * 약국 조직은 요청이 고르지 않는다 — 서버가 세션 + 선택 매장 헤더(X-Store-Organization-Id)로 해석한다.
 * 이용 가능 여부 · 단가 · 결제 가능 여부는 전부 서버 판정이다. 화면은 응답을 그대로 보여준다.
 */
import { coreApiClient } from './client';

type Envelope<T> = { success: boolean; data: T };

export type PharmacyMembershipStatus = 'pending' | 'active' | 'rejected' | 'suspended' | 'terminated';

export interface PharmacyMembership {
  id: string;
  organization_id: string;
  status: PharmacyMembershipStatus;
  pharmacy_name: string;
  business_number: string;
  pharmacist_license_number: string;
  applied_at: string;
  decided_at: string | null;
  reason: string | null;
  address?: string;
  phone?: string;
  business_profile?: Record<string, string>;
}

export interface PharmacyMembershipInput {
  policyReferences?: EnrollmentPolicyReference[];
  pharmacyName: string;
  businessNumber: string;
  pharmacistLicenseNumber: string;
  address?: string;
  phone?: string;
  businessRegistrationDocumentId?: string | null;
  contactName?: string;
  managerPhone?: string;
  contactEmail?: string;
  taxInvoiceEmail?: string;
  representativeName?: string;
  businessType?: string;
  businessCategory?: string;
}

export type PaymentMode = 'test' | 'live' | 'disabled';

export interface PharmacyStoreContext {
  organizationId: string;
  semiFranchiseKeys: string[];
  paymentMode: PaymentMode;
}

export interface SemiFranchiseRow {
  registrationConditions?: string;
  key: string;
  name: string;
  communityKey: string | null;
  membershipId: string | null;
  membershipStatus: PharmacyMembershipStatus | null;
  reason: string | null;
  appliedAt: string | null;
  decidedAt: string | null;
}

export type SupplyKind = 'default' | 'proposal' | 'event' | 'recruitment';

export interface SupplyOption {
  termsSnapshot?: { version: 1; baseShippingFee: number; freeShippingThreshold: number | null; minOrderAmount: number } | null;
  kind: SupplyKind;
  optionId: string;
  offerId: string;
  productName: string;
  supplierName: string;
  semiFranchiseKey: string | null;
  semiFranchiseName: string;
  unitPrice: number;
  targetOrganizationId: string | null;
  note: string | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perStoreLimit: number | null;
  perOrderLimit: number | null;
  availableStock: number | null;
}

export interface PharmacyRecruitment {
  orderable?: boolean;
  id: string;
  productName: string;
  supplierName: string;
  supplyUnitPrice: number | string | null;
  consumerPrice: number | string | null;
  createdAt: string;
  semiFranchiseKey: string | null;
  semiFranchiseName: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
}

export interface PharmacyCartItem {
  id: string;
  kind: SupplyKind | null;
  optionId: string | null;
  productName: string;
  quantity: number;
  available: boolean;
  unitPrice: number | null;
  option: SupplyOption | null;
}

export interface PaymentGroup {
  paymentGroupId: string;
  receiverKey: string;
  receiverDetermined: boolean;
  orderIds: string[];
  totalAmount: number;
}

export interface CheckoutResult {
  createdOrders: Array<{ orderId: string; orderNumber: string; supplierId: string; receiverKey: string; paymentGroupId: string; totalAmount: number }>;
  paymentGroups: PaymentGroup[];
  failedItems: Array<{ itemId: string; productName: string; code: string; message: string }>;
}

export interface PreparedPayment {
  paymentId: string;
  paymentGroupId: string;
  amount: number;
  mode: PaymentMode;
  orderIds: string[];
  reused: boolean;
}

export interface ConfirmedPayment {
  paymentId: string;
  paymentGroupId: string;
  status: 'PAID';
  alreadyPaid: boolean;
  testPayment: boolean;
  deliveries: Array<{ orderId: string; netureOrderId: string | null; delivered: boolean; skippedReason: string | null }>;
}

export interface PharmacyOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number | string;
  shippingFee: number | string | null;
  createdAt: string;
  paidAt: string | null;
  supplierId: string | null;
  items: Array<{ productName?: string; quantity?: number; unitPrice?: number; subtotal?: number; metadata?: { semiFranchiseKey?: string | null; supplyKind?: SupplyKind } }> | null;
  paymentGroupId: string | null;
  receiverKey: string | null;
  testPayment: boolean;
  fulfillmentStatus?: string | null;
  shipment?: {
    status: string;
    carrierName: string;
    trackingNumber: string;
    shippedAt: string | null;
    deliveredAt: string | null;
  } | null;
}

/** 가입(active) 세미프랜차이즈의 게시 콘텐츠 — 서버가 가입 상태 · 게시 상태로 거른다. */
export interface SemiFranchiseContent {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  thumbnailUrl: string | null;
  attachments: unknown;
  tags: unknown;
  status: string;
  publishedAt: string | null;
  semiFranchiseKey: string;
  semiFranchiseName: string;
}

const P = '/neture/pharmacy';

export const neturePharmacyApi = {
  // ─── 내 매장(약국) 신청 (매장 게이트 이전 — 로그인 + 서버의 Neture 가입 승인 확인) ───
  async getMembership(): Promise<PharmacyMembership | null> {
    return (await coreApiClient.get<Envelope<PharmacyMembership | null>>(`${P}/membership`)).data;
  },
  async applyMembership(input: PharmacyMembershipInput): Promise<PharmacyMembership> {
    return (await coreApiClient.post<Envelope<PharmacyMembership>>(`${P}/membership`, input)).data;
  },

  // ─── 내 매장 (내 매장(약국) 신청 active) ───
  async getStoreContext(): Promise<PharmacyStoreContext> {
    return (await coreApiClient.get<Envelope<PharmacyStoreContext>>(`${P}/store/context`)).data;
  },

  async listSemiFranchises(): Promise<SemiFranchiseRow[]> {
    const result = await coreApiClient.get<Envelope<SemiFranchiseRow[]>>(`${P}/semi-franchises`);
    if (!result.success || !Array.isArray(result.data)) throw new Error('협업체 목록을 확인하지 못했습니다.');
    return result.data;
  },
  async applySemiFranchise(key: string, application: { acceptedConditions?: boolean; conditions?: string; note?: string } = {}): Promise<unknown> {
    return (await coreApiClient.post<Envelope<unknown>>(`${P}/semi-franchises/${encodeURIComponent(key)}/apply`, application)).data;
  },
  async withdrawSemiFranchise(key: string): Promise<unknown> {
    return (await coreApiClient.post<Envelope<unknown>>(`${P}/semi-franchises/${encodeURIComponent(key)}/withdraw`)).data;
  },

  async listSupplyOptions(params: { source?: string; business?: string; recruitment?: string; q?: string; page?: number; limit?: number }): Promise<{ items: SupplyOption[]; total: number }> {
    const res = await coreApiClient.get<Envelope<{ items: SupplyOption[]; total: number }>>(`${P}/store/supply-options`, params);
    if (!res.success || !Array.isArray(res.data?.items) || !Number.isSafeInteger(res.data.total)) throw new Error('공급 상품을 확인하지 못했습니다.');
    return res.data;
  },

  async getSupplyOption(kind: SupplyKind, id: string): Promise<SupplyOption> {
    const result = await coreApiClient.get<Envelope<SupplyOption>>(`${P}/store/supply-options/${encodeURIComponent(kind)}/${encodeURIComponent(id)}`);
    if (!result.success || !result.data || result.data.kind !== kind || result.data.optionId !== id) throw new Error('선택한 공급 제안을 확인하지 못했습니다.');
    return result.data;
  },

  async listContents(params: { sf?: string; q?: string; tag?: string; page?: number; limit?: number }): Promise<{ items: SemiFranchiseContent[]; total: number }> {
    const res = await coreApiClient.get<Envelope<{ items: SemiFranchiseContent[]; total: number }>>(`${P}/store/contents`, params);
    if (!res.success || !Array.isArray(res.data?.items) || !Number.isSafeInteger(res.data.total)) throw new Error('제공 자료를 확인하지 못했습니다.');
    return res.data;
  },
  async getContent(id: string): Promise<SemiFranchiseContent> {
    return (await coreApiClient.get<Envelope<SemiFranchiseContent>>(`${P}/store/contents/${encodeURIComponent(id)}`)).data;
  },
  /** 내 매장 편집용 사본(매장 소유 독립 사본) 생성 — 원본 변경은 사본에 전파되지 않는다. */
  async copyContent(id: string): Promise<{ snapshotId: string }> {
    return (await coreApiClient.post<Envelope<{ snapshotId: string }>>(`${P}/store/contents/${encodeURIComponent(id)}/copy`, {})).data;
  },

  async listRecruitments(): Promise<PharmacyRecruitment[]> {
    const result = await coreApiClient.get<Envelope<PharmacyRecruitment[]>>(`${P}/recruitments`);
    if (!result.success || !Array.isArray(result.data)) throw new Error('모집 목록을 확인하지 못했습니다.');
    return result.data;
  },
  async applyRecruitment(id: string): Promise<unknown> {
    return (await coreApiClient.post<Envelope<unknown>>(`${P}/recruitments/${encodeURIComponent(id)}/apply`)).data;
  },

  async getCart(): Promise<PharmacyCartItem[]> {
    return (await coreApiClient.get<Envelope<PharmacyCartItem[]>>(`${P}/cart`)).data ?? [];
  },
  async addCartItem(kind: SupplyKind, id: string, quantity: number): Promise<unknown> {
    return (await coreApiClient.post<Envelope<unknown>>(`${P}/cart/items`, { kind, id, quantity })).data;
  },
  async updateCartItem(id: string, quantity: number): Promise<unknown> {
    return (await coreApiClient.patch<Envelope<unknown>>(`${P}/cart/items/${encodeURIComponent(id)}`, { quantity })).data;
  },
  async removeCartItem(id: string): Promise<unknown> {
    return (await coreApiClient.delete<Envelope<unknown>>(`${P}/cart/items/${encodeURIComponent(id)}`)).data;
  },
  async checkout(itemIds?: string[]): Promise<CheckoutResult> {
    return (await coreApiClient.post<Envelope<CheckoutResult>>(`${P}/cart/checkout`, itemIds ? { itemIds } : {})).data;
  },

  async preparePayment(paymentGroupId: string): Promise<PreparedPayment> {
    return (await coreApiClient.post<Envelope<PreparedPayment>>(`${P}/payments/prepare`, { paymentGroupId })).data;
  },
  async confirmPayment(paymentId: string, paymentGroupId: string): Promise<ConfirmedPayment> {
    return (await coreApiClient.post<Envelope<ConfirmedPayment>>(`${P}/payments/confirm`, { paymentId, paymentGroupId })).data;
  },

  async listOrders(): Promise<PharmacyOrder[]> {
    const result = await coreApiClient.get<Envelope<PharmacyOrder[]>>(`${P}/orders`);
    if (!result.success || !Array.isArray(result.data)) throw new Error('주문 내역을 확인하지 못했습니다.');
    return result.data;
  },
  async cancelOrder(id: string): Promise<unknown> {
    return (await coreApiClient.post<Envelope<unknown>>(`${P}/orders/${encodeURIComponent(id)}/cancel`, {})).data;
  },
};

/** API 오류 → 사용자 문구. 서버 메시지를 그대로 쓰고 없으면 기본 문구. */
export function pharmacyErrorMessage(e: unknown, fallback = '요청을 처리하지 못했습니다.'): string {
  const msg = (e as { message?: unknown } | null)?.message;
  return typeof msg === 'string' && msg ? msg : fallback;
}

export function pharmacyErrorCode(e: unknown): string | undefined {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : undefined;
}
