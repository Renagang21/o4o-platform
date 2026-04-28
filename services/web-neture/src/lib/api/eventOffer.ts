/**
 * Neture Event Offer API
 *
 * WO-O4O-EVENT-OFFER-NETURE-ADOPTION-V1
 *
 * Neture 전용 Event Offer 엔드포인트: /api/v1/neture/event-offers/*
 */

import { api } from '../apiClient';

export const netureEventOfferApi = {
  /** GET /neture/event-offers — listing (paginated) */
  getOffers: (params?: { page?: number; limit?: number }) =>
    api.get('/neture/event-offers', { params }),

  /** GET /neture/event-offers/enriched — enriched listing with product/supplier info */
  getEnrichedOffers: (params?: { page?: number; limit?: number; status?: 'active' | 'ended' | 'all' }) =>
    api.get('/neture/event-offers/enriched', { params }),

  /** GET /neture/event-offers/my-participations — authenticated user's participations */
  getMyParticipations: (params?: { page?: number; limit?: number }) =>
    api.get('/neture/event-offers/my-participations', { params }),

  /** GET /neture/event-offers/:id — detail */
  getOffer: (id: string) =>
    api.get(`/neture/event-offers/${id}`),

  /** POST /neture/event-offers/:id/participate — create participation order */
  participate: (id: string, quantity: number) =>
    api.post(`/neture/event-offers/${id}/participate`, { quantity }),
};
