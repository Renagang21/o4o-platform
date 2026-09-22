/**
 * POP V2 API (KPA adapter) — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 계약 본체는 `@o4o/store-ui-core` 의 createPopV2Api 가 갖는다.
 * 여기서는 KPA base path 와 HTTP 어댑터만 주입한다 — 화면·계약 복제 없음.
 *
 *   KPA : /api/v1/kpa/pharmacy/pop-v2/*
 */

import { createPopV2Api, type PopV2Api, type PopV2ProductOption } from '@o4o/store-ui-core';
import { apiClient } from './client';
import { fetchHandledProducts } from './handledProducts';
import { getStoreQrCodes } from './storeQr';

interface Envelope<T> {
  success: boolean;
  data: T;
  error?: string;
}

/** `{ success, data }` envelope 를 벗기고, 실패는 반드시 throw 한다(빈 값 삼킴 금지). */
async function request<T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH'; body?: unknown },
): Promise<T> {
  const method = options?.method ?? 'GET';
  let res: Envelope<T>;
  if (method === 'GET') {
    res = await apiClient.get<Envelope<T>>(path);
  } else if (method === 'POST') {
    res = await apiClient.post<Envelope<T>>(path, options?.body);
  } else if (method === 'PUT') {
    res = await apiClient.put<Envelope<T>>(path, options?.body);
  } else {
    res = await apiClient.patch<Envelope<T>>(path, options?.body);
  }
  if (!res?.success) {
    throw new Error(res?.error || 'POP 요청에 실패했습니다.');
  }
  return res.data;
}

async function listProductOptions(): Promise<PopV2ProductOption[]> {
  const { items } = await fetchHandledProducts({ limit: 100 });
  return items.map((p) => ({
    sourceType: p.sourceType,
    id: p.sourceId,
    title: p.name,
    subtitle: p.originLabel,
  }));
}

async function listQrCodes(): Promise<Array<{ id: string; title: string }>> {
  const res = await getStoreQrCodes({ limit: 100 });
  return (res.data?.items ?? []).map((q) => ({ id: q.id, title: q.title }));
}

export const popV2Api: PopV2Api = createPopV2Api({
  basePath: '/pharmacy/pop-v2',
  request,
  listProductOptions,
  listQrCodes,
});
