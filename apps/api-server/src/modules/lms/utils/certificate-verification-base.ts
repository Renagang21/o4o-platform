/**
 * WO-O4O-KCOSMETICS-CERTIFICATE-VERIFICATION-DOMAIN-FALLBACK-FIX-V1
 *
 * 수료증 검증 링크(PDF QR)의 frontend base URL 결정 계약.
 * WO-O4O-LMS-CERTIFICATE-DOMAIN-V1 에서 CertificateController 내부 private
 * 함수로 있던 것을 계약 고정(unit test) 목적으로 util 로 분리했다. 동작은 동일하다.
 *
 * 우선순위: 서비스별 env → 공통 FRONTEND_URL → 코드 fallback(정본 production 도메인)
 * null/unknown serviceKey = legacy course → KPA fallback (하위호환 유지)
 */
export function resolveVerificationBase(serviceKey: string | null | undefined): string {
  switch (serviceKey) {
    case 'k-cosmetics':
      // k-cosmetics 정본 production 도메인은 k-cosmetics.site 다.
      // (k-cosmetics.co.kr 은 O4O 소유가 아닌 제3자 Cafe24 몰이다 — CHECK 문서 §2 참조)
      return process.env.KCOSMETICS_FRONTEND_URL || process.env.FRONTEND_URL || 'https://k-cosmetics.site';
    case 'glycopharm':
      return process.env.GLYCOPHARM_FRONTEND_URL || process.env.FRONTEND_URL || 'https://glycopharm.co.kr';
    case 'kpa-society':
    default:
      return process.env.KPA_FRONTEND_URL || process.env.FRONTEND_URL || 'https://kpa-society.co.kr';
  }
}
