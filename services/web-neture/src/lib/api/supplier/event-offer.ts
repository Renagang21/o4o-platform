import { api } from '../../apiClient';
import type {
  SupplierEventOfferStats,
  ProposableOffer,
  ProposeOfferResult,
  MyEventOfferProposal,
  ProposeEventConditions,
  MultiServiceProposalResult,
} from './event-offer.types';

/**
 * 공급자 KPA 이벤트/특가 API
 * - GET  /api/v1/kpa/supplier/event-offers/stats — 성과 집계
 * - GET  /api/v1/kpa/supplier/my-offers          — 제안 가능한 SPO 목록 (WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1)
 * - POST /api/v1/kpa/supplier/event-offers       — Event Offer 제안 (WO-O4O-EVENT-OFFER-SUPPLIER-UI-V1)
 */
export const supplierKpaEventOfferApi = {
  getStats: (): Promise<SupplierEventOfferStats> =>
    api
      .get<{ success: boolean; data: SupplierEventOfferStats }>('/kpa/supplier/event-offers/stats')
      .then((res: { data: { success: boolean; data: SupplierEventOfferStats } }) => res.data.data),

  listMyOffers: (): Promise<ProposableOffer[]> =>
    api
      .get<{
        success: boolean;
        data: { offers: ProposableOffer[]; supplierId: string };
      }>('/kpa/supplier/my-offers')
      .then(
        (res: {
          data: { success: boolean; data: { offers: ProposableOffer[]; supplierId: string } };
        }) => res.data.data.offers || [],
      ),

  proposeOffer: (offerId: string): Promise<ProposeOfferResult> =>
    api
      .post<{
        success: boolean;
        data: ProposeOfferResult;
      }>('/kpa/supplier/event-offers', { offerId })
      .then((res: { data: { success: boolean; data: ProposeOfferResult } }) => res.data.data),

  // WO-O4O-EVENT-OFFER-APPROVAL-PHASE1-V1 + WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  /** 내가 제안한 OPL 목록 — KPA + K-Cos 통합 (serviceKey로 구분) */
  listMyProposals: (): Promise<MyEventOfferProposal[]> =>
    api
      .get<{
        success: boolean;
        data: MyEventOfferProposal[];
      }>('/neture/supplier/event-offer-proposals')
      .then(
        (res: { data: { success: boolean; data: MyEventOfferProposal[] } }) => res.data.data || [],
      ),

  // WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1
  // WO-O4O-EVENT-OFFER-DATA-LIFECYCLE-COMPLETION-V1: eventConditions 파라미터 추가
  /**
   * 단일 SPO를 여러 대상 서비스(KPA / K-Cos)로 동시 제안.
   * 부분 실패 허용 — results 배열에서 서비스별 status 확인.
   *
   * eventConditions: 이벤트 가격/기간/수량 — 각 서비스 row 에 동일 적용.
   *   - 일반 공급가/소비자가는 절대 변경되지 않는다 (정책).
   *   - eventPrice <= 일반 공급가, startAt < endAt — 백엔드 추가 검증.
   */
  proposeEventOfferToServices: (
    offerId: string,
    serviceKeys: string[],
    eventConditions: ProposeEventConditions,
  ): Promise<MultiServiceProposalResult> =>
    api
      .post<{ success: boolean; data: MultiServiceProposalResult }>(
        '/neture/supplier/event-offer-proposals',
        {
          offerId,
          serviceKeys,
          eventPrice: eventConditions.eventPrice,
          startAt: eventConditions.startAt,
          endAt: eventConditions.endAt,
          totalQuantity: eventConditions.totalQuantity ?? null,
          perOrderLimit: eventConditions.perOrderLimit ?? null,
          perStoreLimit: eventConditions.perStoreLimit ?? null,
        },
      )
      .then(
        (res: { data: { success: boolean; data: MultiServiceProposalResult } }) => res.data.data,
      ),
};
