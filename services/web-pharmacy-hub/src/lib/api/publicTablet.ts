/**
 * PharmacyHub 공개 태블릿 API — 무인증 kiosk 전용
 *
 * WO-O4O-PHARMACYHUB-TABLET-CANONICAL-ADOPTION-AND-PUBLIC-KIOSK-CLOSURE-V1 §6
 *
 * 공통 공개 endpoint(`/api/v1/stores/:slug/tablet/*`)를 그대로 소비한다.
 * 이 경로는 **service-neutral** 이며 KPA 도 같은 것을 쓴다 — PH 전용 런타임 API 를 만들지 않는다.
 * 새 renderer 도 만들지 않는다(화면은 `@o4o/tablet-kiosk-core`).
 *
 * ⚠️ 인증 클라이언트(`lib/apiClient`)를 쓰지 않는다 — kiosk 는 로그인 없이 열린다.
 */
import type { IdlePlaylistItem, TabletScreenResponse } from '@o4o/tablet-kiosk-core';

function publicStoresBase(): string {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) || '';
  return `${base}/api/v1/stores`;
}

export interface PublicTabletProduct {
  id: string;
  name: string;
  price: number;
  sale_price?: number;
  images?: Array<{ url: string }>;
  category: string;
  specification?: string | null;
  description?: string;
  short_description?: string;
}

export async function fetchTabletProducts(
  slug: string,
  params?: { page?: number; limit?: number; category?: string; q?: string; tabletId?: string },
): Promise<{
  data: PublicTabletProduct[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  localProducts?: unknown[];
}> {
  const q = new URLSearchParams();
  if (params?.page) q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  if (params?.category) q.set('category', params.category);
  if (params?.q) q.set('q', params.q);
  if (params?.tabletId) q.set('tabletId', params.tabletId);
  const res = await fetch(`${publicStoresBase()}/${encodeURIComponent(slug)}/tablet/products?${q}`);
  const body = await res.json();
  if (!body?.success) throw new Error('상품을 불러오지 못했습니다.');
  return { data: body.data ?? [], meta: body.meta, localProducts: body.localProducts };
}

export async function fetchTabletScreen(
  slug: string,
  tabletId?: string,
  language?: string,
): Promise<TabletScreenResponse | null> {
  const q = new URLSearchParams();
  if (tabletId) q.set('tabletId', tabletId);
  if (language) q.set('language', language);
  const res = await fetch(`${publicStoresBase()}/${encodeURIComponent(slug)}/tablet/screen?${q}`);
  const body = await res.json();
  if (!body?.success) return null;
  return body.data ?? null;
}

export async function fetchTabletIdle(slug: string, tabletId?: string): Promise<IdlePlaylistItem[]> {
  const q = new URLSearchParams();
  if (tabletId) q.set('tabletId', tabletId);
  const res = await fetch(`${publicStoresBase()}/${encodeURIComponent(slug)}/tablet/idle?${q}`);
  const body = await res.json();
  if (!body?.success) return [];
  return (body.data?.items ?? []) as IdlePlaylistItem[];
}

export async function fetchTabletSettings(slug: string): Promise<Record<string, unknown> | undefined> {
  const res = await fetch(`${publicStoresBase()}/${encodeURIComponent(slug)}/tablet/settings`);
  const body = await res.json();
  if (!body?.success) return undefined;
  return body.data ?? undefined;
}

/**
 * §7 서비스 격리 — 이 slug 가 **PharmacyHub 매장인지** 확인한다.
 *
 * 공개 endpoint 는 service-neutral 이라 slug 만 맞으면 다른 서비스 매장도 해석된다.
 * PH 오리진에서 타 서비스 매장이 렌더되지 않도록 kiosk 셸이 직접 게이트한다.
 * (공통 resolver 의 격리를 완화하지 않는다 — 서비스 셸에서 **좁히기만** 한다.)
 */
export async function fetchTabletServiceKey(slug: string, tabletId?: string): Promise<string | null> {
  const q = new URLSearchParams();
  if (tabletId) q.set('tabletId', tabletId);
  const res = await fetch(`${publicStoresBase()}/${encodeURIComponent(slug)}/tablet/screen?${q}`);
  const body = await res.json();
  if (!body?.success) return null;
  return (body.data?.serviceKey as string | undefined) ?? null;
}

/** 상담 요청은 PH kiosk V1 에서 사용하지 않는다 — kiosk core 계약을 만족시키는 no-op. */
export async function submitInterestUnsupported(): Promise<never> {
  throw new Error('이 매장에서는 상담 요청을 받지 않습니다.');
}
