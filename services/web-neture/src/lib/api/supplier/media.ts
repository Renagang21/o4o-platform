import { api } from '../../apiClient';
import type { CopyImagesResult } from './product.types';
import { extractApiError } from './errors';

export const supplierMediaApi = {
  /**
   * 자사 관리자 HTML 에서 추출한 이미지 URL 을 O4O 미디어 라이브러리로 복사.
   * (WO-O4O-NETURE-SUPPLIER-OWN-ADMIN-PRODUCT-IMPORT-V1)
   */
  /**
   * 미리보기 프록시: 자사 쇼핑몰 이미지를 서버 SSRF-safe 경로로 가져와 blob objectURL 반환.
   * (http 외부 이미지를 HTTPS 화면에 직접 넣지 않기 위함 — 혼합 콘텐츠 회피, 영구 저장 없음)
   * @throws Error(메시지) 실패 시
   */
  async proxyImageObjectUrl(url: string, shopOrigin?: string): Promise<string> {
    const response = await api.post(
      '/neture/supplier/import/image-proxy',
      { url, ...(shopOrigin ? { shopOrigin } : {}) },
      { responseType: 'blob' },
    );
    return URL.createObjectURL(response.data as Blob);
  },

  async copyImages(
    urls: string[],
    shopOrigin?: string,
    opts?: { mode?: 'standard' | 'thumbnail' | 'preserve' },
  ): Promise<CopyImagesResult> {
    try {
      const response = await api.post('/neture/supplier/import/copy-images', {
        urls,
        ...(shopOrigin ? { shopOrigin } : {}),
        ...(opts?.mode && opts.mode !== 'standard' ? { mode: opts.mode } : {}),
      });
      return response.data.data as CopyImagesResult;
    } catch (error) {
      throw new Error(extractApiError(error));
    }
  },
};
