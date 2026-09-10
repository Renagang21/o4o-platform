/**
 * POP V2 API (Pharmacy-Hub adapter) — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 계약 본체는 `@o4o/store-ui-core` 의 createPopV2Api 가 갖는다.
 * 여기서는 PH base path 와 HTTP 어댑터만 주입한다 — 화면·계약 복제 없음.
 *
 *   PH : /api/v1/pharmacy-hub/store-owner/pop-v2/*
 *
 * 기존 `pharmacyHubStorePop.ts`(/store-owner/pop, 원장 store_pops)는 건드리지 않는다.
 */
import { createPopV2Api, type PopV2Api, type PopV2ProductOption } from '@o4o/store-ui-core';
import { api } from '../apiClient';
import { fetchHandledProducts } from './pharmacyHubHandledProducts';
import { fetchStoreQrCodes } from './pharmacyHubStoreQr';

const BASE = '/pharmacy-hub/store-owner/pop-v2';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

/** 실패는 반드시 throw 한다 — 실패를 빈 값으로 삼키지 않는다. */
async function request<T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PUT' | 'PATCH'; body?: unknown },
): Promise<T> {
  const method = options?.method ?? 'GET';
  let res;
  if (method === 'GET') {
    res = await api.get(path);
  } else if (method === 'POST') {
    res = await api.post(path, options?.body);
  } else if (method === 'PUT') {
    res = await api.put(path, options?.body);
  } else {
    res = await api.patch(path, options?.body);
  }
  return unwrap<T>(res.data, 'POP 요청에 실패했습니다.');
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
  const page = await fetchStoreQrCodes({ limit: 100 });
  return (page.items ?? []).map((q) => ({ id: q.id, title: q.title }));
}

export const popV2Api: PopV2Api = createPopV2Api({
  basePath: BASE,
  request,
  listProductOptions,
  listQrCodes,
});
