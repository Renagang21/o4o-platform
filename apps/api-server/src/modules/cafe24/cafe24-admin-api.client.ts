/**
 * Cafe24 Admin API Client — 상품 조회 전용
 * WO-O4O-CAFE24-OAUTH-PRODUCT-CENSUS-V1 §6
 *
 * 상품 조회 외 endpoint 를 추가하지 않는다. 주문/회원/결제 API 사용 금지 (WO §2·§10).
 * 응답을 DB 에 저장하지 않는다 — 호출부(census)가 메모리에서 집계만 한다.
 */

import { cafe24ApiBase } from './cafe24-oauth.client.js';
import type { Cafe24OAuthConfig } from './cafe24-oauth.client.js';

/**
 * 매칭 분석에 쓸 수 있는 필드만 좁게 선언한다.
 * 가격·재고·상세설명은 의도적으로 넣지 않았다 (WO §6 — 필요 없으면 저장하지 않는다).
 * 실제 응답 필드 전수는 census 가 raw key 집합으로 별도 기록한다.
 */
export interface Cafe24ProductRow {
  product_no?: number;
  product_code?: string | null;
  custom_product_code?: string | null;
  product_name?: string | null;
  eng_product_name?: string | null;
  model_name?: string | null;
  brand_code?: string | null;
  manufacturer_code?: string | null;
  supplier_code?: string | null;
  origin_place_value?: string | null;
  /** Cafe24 상품 자체 바코드 (몰 설정에 따라 비어있을 수 있다) */
  barcode?: string | null;
  [key: string]: unknown;
}

export interface Cafe24ProductPage {
  products: Cafe24ProductRow[];
  /** 원본 응답의 key 집합 — "문서상 가능"이 아니라 실제 응답 기준 판정용 (WO §6) */
  observedKeys: string[];
}

function apiHeaders(accessToken: string, cfg: Cafe24OAuthConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'X-Cafe24-Api-Version': cfg.apiVersion,
  };
}

/** 총 상품 수 (mall.read_product 로 조회 가능) */
export async function fetchProductCount(
  cfg: Cafe24OAuthConfig,
  mallId: string,
  accessToken: string,
  shopNo = 1,
): Promise<number> {
  const url = `${cafe24ApiBase(mallId)}/api/v2/admin/products/count?shop_no=${encodeURIComponent(String(shopNo))}`;
  const res = await fetch(url, { headers: apiHeaders(accessToken, cfg) });
  if (!res.ok) throw new Error(`CAFE24_PRODUCT_COUNT_FAILED_${res.status}`);
  const json = (await res.json()) as { count?: number };
  return Number(json?.count ?? 0);
}

/**
 * 상품 목록 1페이지. Cafe24 는 offset/limit 페이징(limit 최대 100)을 쓴다.
 */
export async function fetchProductPage(
  cfg: Cafe24OAuthConfig,
  mallId: string,
  accessToken: string,
  opts: { offset: number; limit: number; shopNo?: number },
): Promise<Cafe24ProductPage> {
  const params = new URLSearchParams({
    shop_no: String(opts.shopNo ?? 1),
    offset: String(opts.offset),
    limit: String(Math.min(opts.limit, 100)),
  });
  const url = `${cafe24ApiBase(mallId)}/api/v2/admin/products?${params.toString()}`;
  const res = await fetch(url, { headers: apiHeaders(accessToken, cfg) });
  if (!res.ok) throw new Error(`CAFE24_PRODUCT_LIST_FAILED_${res.status}`);

  const json = (await res.json()) as { products?: Cafe24ProductRow[] };
  const products = Array.isArray(json?.products) ? json.products : [];

  const keys = new Set<string>();
  for (const p of products) for (const k of Object.keys(p)) keys.add(k);

  return { products, observedKeys: [...keys].sort() };
}
