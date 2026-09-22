/**
 * External Sales API — 외부 판매 채널(네이버·쿠팡) 연동 · 판매 조건
 *
 * WO-O4O-KPA-NAVER-ONLINE-SALES-CONNECTION-AND-PILOT-CLOSEOUT-V1
 *
 * 상품 원장을 복제하지 않는다. 여기서 다루는 것은 연동 상태와 판매 조건뿐이다.
 */

import { apiClient } from './client';

export type ExternalChannelCode = 'NAVER' | 'COUPANG';

export type ExternalSyncStatus =
  | 'NOT_LINKED'
  | 'PENDING'
  | 'LINKED'
  | 'FAILED'
  | 'UNLINKED';

/** O4O 에 원천이 없어 매장이 입력해야 하는 판매 조건 */
export interface ExternalChannelInput {
  leafCategoryId: string | null;
  stockQuantity: number | null;
  deliveryFeeType: string | null;
  baseDeliveryFee: number | null;
  returnDeliveryFee: number | null;
  exchangeDeliveryFee: number | null;
  releaseAddressId: number | null;
  refundAddressId: number | null;
  afterServiceTelephoneNumber: string | null;
  afterServiceGuideContent: string | null;
  productInfoProvidedNotice: Record<string, unknown> | null;
}

export interface MissingRequiredField {
  path: string;
  origin: 'O4O' | 'CHANNEL_INPUT';
  label: string;
}

export interface ExternalChannelSummary {
  channelCode: ExternalChannelCode;
  /** adapter 구현 여부 (쿠팡은 스키마만 준비) */
  implemented: boolean;
  /** 서버에 자격정보가 설정돼 있는지 — false 면 실제 전송 불가 */
  credentialConfigured: boolean;
  total: number;
  linked: number;
  failed: number;
  lastSyncedAt: string | null;
}

export interface ExternalSalesLink {
  id: string;
  masterId: string;
  listingId: string | null;
  productName: string;
  price: number | null;
  channelCode: ExternalChannelCode;
  channelInput: Partial<ExternalChannelInput> | null;
  syncStatus: ExternalSyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  externalOriginProductId: string | null;
  externalChannelProductId: string | null;
  missingRequired: MissingRequiredField[];
  readyToSend: boolean;
}

export interface ExternalSalesCandidate {
  masterId: string;
  listingId: string | null;
  name: string;
  price: number | null;
}

const BASE = '/store-hub/external-sales';

export async function fetchExternalChannels(): Promise<ExternalChannelSummary[]> {
  const res = await apiClient.get<{ success: boolean; data: ExternalChannelSummary[] }>(
    `${BASE}/channels`,
  );
  return res.data ?? [];
}

export async function fetchExternalSalesLinks(
  channelCode: ExternalChannelCode,
): Promise<ExternalSalesLink[]> {
  const res = await apiClient.get<{ success: boolean; data: ExternalSalesLink[] }>(
    `${BASE}/${channelCode}/links`,
  );
  return res.data ?? [];
}

export async function fetchExternalSalesCandidates(
  channelCode: ExternalChannelCode,
): Promise<ExternalSalesCandidate[]> {
  const res = await apiClient.get<{ success: boolean; data: ExternalSalesCandidate[] }>(
    `${BASE}/${channelCode}/candidates`,
  );
  return res.data ?? [];
}

export async function createExternalSalesLink(
  channelCode: ExternalChannelCode,
  masterId: string,
  listingId: string | null,
): Promise<{ id: string }> {
  const res = await apiClient.post<{ success: boolean; data: { id: string } }>(
    `${BASE}/${channelCode}/links`,
    { masterId, listingId },
  );
  return res.data;
}

export async function saveExternalSalesInput(
  channelCode: ExternalChannelCode,
  linkId: string,
  channelInput: Partial<ExternalChannelInput>,
): Promise<{
  id: string;
  channelInput: ExternalChannelInput;
  missingRequired: MissingRequiredField[];
  readyToSend: boolean;
}> {
  const res = await apiClient.put<{
    success: boolean;
    data: {
      id: string;
      channelInput: ExternalChannelInput;
      missingRequired: MissingRequiredField[];
      readyToSend: boolean;
    };
  }>(`${BASE}/${channelCode}/links/${linkId}`, { channelInput });
  return res.data;
}

export async function deleteExternalSalesLink(
  channelCode: ExternalChannelCode,
  linkId: string,
): Promise<void> {
  await apiClient.delete(`${BASE}/${channelCode}/links/${linkId}`);
}
