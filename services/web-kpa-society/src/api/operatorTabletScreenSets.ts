/**
 * Operator Tablet Screen Set API Client — 운영자 Screen Set 원본 제작
 *
 * WO-O4O-OPERATOR-SCREEN-SET-AUTHORING-FOUNDATION-V1
 *
 * Base: /api/v1/kpa/operator/screen-sets  (매장 API /api/v1/store/screen-sets 와 별도)
 *   운영자 원본(operator_template) 목록·상세·생성·수정·블록·미리보기·제거 + O4O 설명서 검색.
 *   서버가 origin='operator' AND service_key='kpa' 로 격리한다. QR·코너 적용·매장 콘텐츠 조회 없음.
 *
 * 타입은 매장 클라이언트(tabletDisplays)와 공유(동일 DTO). 제작 셸(TabletContentStepBuilder)에
 * 주입할 ScreenSetBuilderApi 형태의 operatorScreenSetBuilderApi 를 함께 제공한다.
 */

import { getAccessToken } from '../contexts/AuthContext';
import { tryRefreshToken } from './token-refresh';
import type { ScreenSet, ScreenSetDetail, ScreenBlock, O4oDescriptionSearchResult } from './tabletDisplays';
import type { TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import type { ScreenSetBuilderApi } from '@o4o/tablet-screen-set-editor';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
// serviceKey='kpa' — KPA 운영자 앱. 다른 서비스는 자기 앱에서 별도 base 를 쓴다.
const BASE = `${API_BASE}/api/v1/kpa/operator/screen-sets`;

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Network error' }));
    const error: any = new Error(body.error || body.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.code = body.code;
    throw error;
  }
  return response.json();
}

export interface OperatorScreenSetListResponse {
  data: ScreenSet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export async function fetchOperatorScreenSets(
  params: {
    page?: number;
    limit?: number;
  } = {},
): Promise<OperatorScreenSetListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });
  const res = await request<{
    success: boolean;
    data: ScreenSet[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>(`${BASE}?${query.toString()}`);
  return {
    data: res.data ?? [],
    page: res.page,
    limit: res.limit,
    total: res.total,
    totalPages: res.totalPages,
  };
}

export async function fetchOperatorScreenSet(id: string): Promise<ScreenSetDetail> {
  const res = await request<{ success: boolean; data: ScreenSetDetail }>(`${BASE}/${id}`);
  return res.data;
}

export async function createOperatorScreenSet(input: { name: string; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}`, {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      templateKey: input.templateKey ?? undefined,
    }),
  });
  return res.data;
}

export async function updateOperatorScreenSet(id: string, input: { name?: string; templateKey?: string | null }): Promise<ScreenSet> {
  const res = await request<{ success: boolean; data: ScreenSet }>(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return res.data;
}

export async function saveOperatorScreenSetBlocks(id: string, blocks: ScreenBlock[]): Promise<ScreenBlock[]> {
  const res = await request<{ success: boolean; data: ScreenBlock[] }>(`${BASE}/${id}/blocks`, {
    method: 'PUT',
    body: JSON.stringify({
      blocks: blocks.map((b, i) => ({
        blockType: b.blockType,
        sortOrder: i,
        isEnabled: b.isEnabled,
        config: b.config,
      })),
    }),
  });
  return res.data;
}

export async function removeOperatorScreenSet(id: string): Promise<void> {
  await request(`${BASE}/${id}`, { method: 'DELETE' });
}

export async function previewOperatorScreenSet(input: { templateKey?: string | null; blocks: ScreenBlock[] }): Promise<TabletScreenResponse> {
  const res = await request<{ success: boolean; data: TabletScreenResponse }>(`${BASE}/preview`, {
    method: 'POST',
    body: JSON.stringify({
      templateKey: input.templateKey ?? undefined,
      blocks: input.blocks.map((b, i) => ({
        blockType: b.blockType,
        sortOrder: i,
        isEnabled: b.isEnabled,
        config: b.config,
      })),
    }),
  });
  return res.data;
}

export async function searchOperatorO4oDescriptions(q: string): Promise<O4oDescriptionSearchResult[]> {
  const res = await request<{
    success: boolean;
    data: O4oDescriptionSearchResult[];
  }>(`${BASE}/content-sources/o4o-descriptions?q=${encodeURIComponent(q)}`);
  return res.data;
}

/**
 * 제작 셸(TabletContentStepBuilder)에 주입할 운영자 API.
 *   - create/update: 운영자 엔드포인트(status/tabletId 무시, operator_template 강제).
 *   - searchStoreContents: 매장 콘텐츠는 운영자가 조회 불가 → 항상 빈 배열(picker 에서도 store 탭 미노출).
 */
export const operatorScreenSetBuilderApi: ScreenSetBuilderApi = {
  create: (input) =>
    createOperatorScreenSet({
      name: input.name,
      templateKey: input.templateKey,
    }),
  update: (id, input) =>
    updateOperatorScreenSet(id, {
      name: input.name,
      templateKey: input.templateKey,
    }),
  saveBlocks: saveOperatorScreenSetBlocks,
  preview: previewOperatorScreenSet,
  searchO4oDescriptions: searchOperatorO4oDescriptions,
  searchStoreContents: async () => [],
};
