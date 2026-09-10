/**
 * POP V2 API (K-Cosmetics adapter) — WO-O4O-KCOS-POP-V2-CANONICAL-ADOPTION-V1
 *
 * 계약 본체는 `@o4o/store-ui-core` 의 createPopV2Api 가 갖는다.
 * 여기서는 KCos base path 와 HTTP 어댑터, 그리고 서비스별 소스 원장만 주입한다
 * — 화면·계약 복제 없음, 공통 Core 에 serviceKey 조건문 없음.
 *
 *   KPA  : /api/v1/kpa/pharmacy/pop-v2/*
 *   PH   : /api/v1/pharmacy-hub/store-owner/pop-v2/*
 *   KCos : /api/v1/cosmetics/pharmacy/pop-v2/*   ← 이 파일
 *
 * 상품 후보 원장 주의:
 *   KPA/PH 는 통합 취급제품(handled-products = listing + local)을 원장으로 쓴다.
 *   KCos 매장 화면의 상품 축은 **매장 자체 상품(store_local_products)** 뿐이며
 *   (StoreLocalProductsPage / StoreProductDescriptionsPage 가 모두 이 원장을 쓴다)
 *   취급제품 통합 화면·엔드포인트가 없다. 따라서 sourceType='local' 만 주입한다.
 *   서버 계약(GET /sources/product/:id?sourceType=local)은 KPA/PH 와 동일하다.
 *
 * 기존 `StorePopPage`(/store/marketing/pop, POST /cosmetics/pharmacy/pop/generate) 는 그대로 둔다.
 */

import { createPopV2Api, type PopV2Api, type PopV2ProductOption } from '@o4o/store-ui-core';
import { api } from '@/lib/apiClient';
import { fetchLocalProducts } from '@/services/localProductApi';
import { getStoreQrCodes } from '@/api/storeProductionSources';

const BASE = '/cosmetics/pharmacy/pop-v2';

/** `{ success, data }` envelope 를 벗기고, 실패는 반드시 throw 한다(빈 값 삼킴 금지). */
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
  const body: any = (res as any).data;
  if (!body?.success) {
    throw new Error(body?.error || 'POP 요청에 실패했습니다.');
  }
  return body.data as T;
}

async function listProductOptions(): Promise<PopV2ProductOption[]> {
  const { items } = await fetchLocalProducts({ limit: 100 });
  return items.map((p) => ({
    sourceType: 'local' as const,
    id: p.id,
    title: p.name,
    subtitle: p.category,
  }));
}

async function listQrCodes(): Promise<Array<{ id: string; title: string }>> {
  const items = await getStoreQrCodes({ limit: 100 });
  return (items ?? []).map((q: any) => ({ id: q.id, title: q.title }));
}

export const popV2Api: PopV2Api = createPopV2Api({
  basePath: BASE,
  request,
  listProductOptions,
  listQrCodes,
});
