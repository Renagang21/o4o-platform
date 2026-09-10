/**
 * PopV2Api factory — WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 * 서버 계약(§4-3)은 KPA / PH 가 동일하고 base path 만 다르다.
 * 따라서 서비스 adapter 는 base path 와 request 함수만 넘긴다 — fetch 로직을 복제하지 않는다.
 *
 *   KPA : /kpa/pharmacy/pop-v2
 *   PH  : /pharmacy-hub/store-owner/pop-v2
 */

import type {
  PopV2Api,
  PopV2ContentCandidate,
  PopV2Document,
  PopV2DocumentInput,
  PopV2Format,
  PopV2RenderResult,
  PopV2ResolvedSource,
  PopV2SourceOrigin,
  PopV2Status,
} from './types';

export interface PopV2RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH';
  body?: unknown;
}

/**
 * 서비스별 HTTP 어댑터. `{ success, data }` envelope 의 `data` 만 돌려주고,
 * 실패는 반드시 throw 한다 — 실패를 빈 값으로 삼키지 않는다.
 */
export type PopV2Request = <T>(path: string, options?: PopV2RequestOptions) => Promise<T>;

export interface CreatePopV2ApiOptions {
  basePath: string;
  request: PopV2Request;
  /** 상품 후보는 서비스별 원장이 달라 선택 주입한다. */
  listProductOptions?: PopV2Api['listProductOptions'];
  /** QR 후보도 서비스별 endpoint 가 달라 주입한다. */
  listQrCodes: PopV2Api['listQrCodes'];
}

export function createPopV2Api(options: CreatePopV2ApiOptions): PopV2Api {
  const { basePath, request } = options;
  const base = basePath.replace(/\/+$/, '');

  return {
    list: (status?: PopV2Status | 'all') =>
      request<PopV2Document[]>(`${base}${status ? `?status=${encodeURIComponent(status)}` : ''}`),

    get: (id: string) => request<PopV2Document>(`${base}/${id}`),

    create: (input: PopV2DocumentInput) =>
      request<PopV2Document>(base, { method: 'POST', body: input }),

    update: (id: string, input: PopV2DocumentInput) =>
      request<PopV2Document>(`${base}/${id}`, { method: 'PUT', body: input }),

    duplicate: (id: string) =>
      request<PopV2Document>(`${base}/${id}/duplicate`, { method: 'POST' }),

    setArchived: (id: string, archived: boolean) =>
      request<PopV2Document>(`${base}/${id}/archive`, { method: 'PATCH', body: { archived } }),

    render: (id: string, format: PopV2Format) =>
      request<PopV2RenderResult>(`${base}/${id}/render`, { method: 'POST', body: { format } }),

    resolveProductSource: (productId: string, sourceType: 'listing' | 'local') =>
      request<PopV2ResolvedSource>(
        `${base}/sources/product/${productId}?sourceType=${sourceType}`,
      ),

    listContentSources: () => request<PopV2ContentCandidate[]>(`${base}/sources/contents`),

    resolveContentSource: (origin: PopV2SourceOrigin, id: string) =>
      request<PopV2ResolvedSource>(`${base}/sources/content/${origin}/${id}`),

    listProductOptions: options.listProductOptions,
    listQrCodes: options.listQrCodes,
  };
}
