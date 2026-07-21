/**
 * 매장 HUB — 운영자 Screen Set 원본 열람 + 매장 독립 사본 가져오기
 *
 * WO-O4O-OPERATOR-SCREEN-SET-HUB-PUBLISH-AND-STORE-INDEPENDENT-COPY-V1
 *
 * backend: /api/v1/store/screen-set-hub/*  (매장 인증 · withStoreAuth)
 *   GET  /templates            — 운영자 원본 목록(q · templateKey 필터)
 *   GET  /templates/:id        — 상세 + blocks(미리보기 입력)
 *   POST /templates/:id/import — 매장 소유 독립 사본 생성(가져오기=사본)
 *
 * 미리보기는 별도 API 를 만들지 않는다 — 상세의 blocks 를 기존 previewScreenSet(draft preview)에 넣어
 * "내 매장 기준" 으로 렌더한다(tabletDisplays.previewScreenSet 재사용).
 *
 * 운영자 원본에는 공개 URL·QR 이 없다(publicQrSlug 미노출). 가져온 매장 사본의 QR 은
 * 기존 매장 Screen Set 규칙(withQrLink lazy ensure)으로 관리된다.
 */

import { authClient } from '@o4o/auth-client';
import type { ScreenBlock, ScreenSet } from './tabletDisplays';

const BASE = '/store/screen-set-hub';

/** HUB 목록 행 — 운영자 원본(공개 URL·QR 없음). */
export interface OperatorTemplateListItem {
  id: string;
  name: string;
  templateKey: string;
  blockCount: number;
  createdAt: string;
  updatedAt: string;
}

/** HUB 상세 — 미리보기용 blocks 포함. */
export interface OperatorTemplateDetail {
  id: string;
  name: string;
  templateKey: string;
  createdAt: string;
  updatedAt: string;
  blocks: ScreenBlock[];
}

/** 운영자 원본 목록(검색 + 템플릿 필터). */
export async function listOperatorTemplates(params?: { q?: string; templateKey?: string }): Promise<OperatorTemplateListItem[]> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.templateKey) qs.set('templateKey', params.templateKey);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  const res = await authClient.api.get(`${BASE}/templates${suffix}`);
  return res.data?.data ?? [];
}

/** 운영자 원본 상세 + blocks. */
export async function getOperatorTemplate(id: string): Promise<OperatorTemplateDetail> {
  const res = await authClient.api.get(`${BASE}/templates/${id}`);
  return res.data?.data;
}

/**
 * 매장으로 가져오기 — 매장 소유 **독립 사본**을 만든다.
 * 원본 FK·자동 동기화 없음. 코너에는 자동 적용되지 않는다(적용은 '코너별 운영').
 * 반복 가져오기 허용 — 호출마다 새 사본이 생성된다.
 */
export async function importOperatorTemplate(id: string): Promise<ScreenSet> {
  const res = await authClient.api.post(`${BASE}/templates/${id}/import`, {});
  return res.data?.data;
}
