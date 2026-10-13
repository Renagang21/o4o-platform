// ==================== KPA Event Offer Stats ====================
// WO-EVENT-OFFER-SUPPLIER-DASHBOARD-STATS-INTEGRATION-V1

export interface SupplierEventOfferStats {
  totalOffers: number;
  activeOffers: number;
  inactiveOffers: number;
  totalOrders: number;
  totalRevenue: number;
}

// WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1
export interface ProposableOffer {
  id: string;
  masterId: string;
  title: string;
  supplierName: string;
  price: number | null;
  approvalStatus: string;
}

export interface ProposeOfferResult {
  id: string;
  offerId: string;
  title: string;
  supplierName: string;
  status: 'pending' | 'approved';
  isActive: boolean;
  proposedAt: string;
}

// WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1
// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1: serviceKey 필드 추가 (KPA + K-Cos 통합)
// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 조건 필드 추가
export interface MyEventOfferProposal {
  id: string;
  offerId: string;
  /** OPL service_key (kpa-groupbuy / k-cosmetics-event-offer) */
  serviceKey: string;
  title: string;
  supplierName: string;
  /** 일반 공급가 (price_general) */
  price: number | null;
  /** WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: 이벤트 전용 가격/기간/수량 */
  eventPrice: number | null;
  startAt: string | null;
  endAt: string | null;
  totalQuantity: number | null;
  perOrderLimit: number | null;
  perStoreLimit: number | null;
  isActive: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'canceled';
  proposedAt: string;
  decidedAt: string | null;
  rejectedReason: string | null;
}

// WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: supplier 가 제안 시 입력하는 이벤트 조건
export interface ProposeEventConditions {
  eventPrice: number;
  /** ISO date string (YYYY-MM-DD or full ISO) */
  startAt: string;
  endAt: string;
  totalQuantity?: number | null;
  perOrderLimit?: number | null;
  perStoreLimit?: number | null;
}

// WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
export type ProposalStatus =
  | 'created'
  | 'already_proposed'
  | 'offer_not_found'
  | 'offer_not_owned'
  | 'org_unavailable'
  | 'unsupported'
  | 'internal_error';

export interface PerServiceProposalResult {
  targetServiceKey: string;
  eventOfferServiceKey: string | null;
  status: ProposalStatus;
  listingId: string | null;
  message?: string;
}

export interface MultiServiceProposalResult {
  offerId: string;
  results: PerServiceProposalResult[];
}

/** Backend 응답 에러 코드 (supplier-offers.controller.ts ERROR_CODES와 동일) */
export type SupplierEventOfferErrorCode =
  | 'INTERNAL_ERROR'
  | 'SUPPLIER_NOT_FOUND'
  | 'OFFER_NOT_FOUND'
  | 'OFFER_NOT_OWNED'
  | 'ALREADY_PROPOSED'
  | 'ORG_UNAVAILABLE'
  | 'INVALID_PARAMS';
