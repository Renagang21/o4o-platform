/**
 * Public 푸터 법정정보 loader factory
 *
 * WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1
 *
 * 4서비스에 byte-동일/유사하게 분산돼 있던 loadFooterLegal 중복을 제거한다.
 * 서비스는 자신의 HTTP 호출(axios / fetch)만 어댑터로 주입하고, null/오류 계약은 본 factory가 단일 보유.
 *
 * 계약:
 *  - serviceKey 기반 `/public/services/:serviceKey/footer-legal` 호출(서비스가 base/transport 주입).
 *  - 응답 body({ data })에서 data 만 반환. 비활성/빈 값/오류 → null.
 *  - placeholder/실값 fallback 없음. serviceKey 조건문 없음. UI 미담당.
 */

import type { PublicLegalProfileDto } from './PublicLegalFooterInfo';

/**
 * @param fetchBody serviceKey path 의 응답 body({ data })를 반환(또는 throw). 서비스별 transport 주입.
 * @returns module-level 에 할당해 useEffect dep 안정성을 유지하는 loader.
 */
export function createFooterLegalLoader(
  fetchBody: (path: string) => Promise<{ data?: PublicLegalProfileDto | null } | null | undefined>,
): (serviceKey: string) => Promise<PublicLegalProfileDto | null> {
  return async (serviceKey: string): Promise<PublicLegalProfileDto | null> => {
    try {
      const body = await fetchBody(`/public/services/${serviceKey}/footer-legal`);
      return body?.data ?? null;
    } catch {
      return null;
    }
  };
}
