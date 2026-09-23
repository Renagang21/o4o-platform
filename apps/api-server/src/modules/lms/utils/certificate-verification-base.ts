/**
 * 수료증 검증 링크(PDF QR)의 frontend base URL 결정 계약.
 *
 * 이력:
 *  - WO-O4O-LMS-CERTIFICATE-DOMAIN-V1 · WO-O4O-KCOSMETICS-CERTIFICATE-VERIFICATION-DOMAIN-FALLBACK-FIX-V1:
 *    serviceKey 별 도메인(kpa-society / k-cosmetics / pharmacy-hub) 분기 + KPA default fallback.
 *  - WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 §17:
 *    수료증 화면은 독립 강의 서비스(`lecture` · study.neture.co.kr) 단일 소유다.
 *    KPA / K-Cosmetics / PharmacyHub 의 `/certificate/verify/:id` 는 Lecture 로 외부 이동만 하므로
 *    검증 링크는 serviceKey 와 무관하게 Lecture 도메인으로 인쇄한다. **KPA fallback 은 없다.**
 *    (data cutover 전 잔존 legacy serviceKey row 도 동일 — Lecture 가 id 기반 공개 검증을 제공한다.)
 *
 * 우선순위: LECTURE_FRONTEND_URL → 코드 fallback(정본 production 도메인)
 */
export const LECTURE_CERTIFICATE_VERIFICATION_BASE = 'https://study.neture.co.kr';

export function resolveVerificationBase(_serviceKey: string | null | undefined): string {
  return process.env.LECTURE_FRONTEND_URL || LECTURE_CERTIFICATE_VERIFICATION_BASE;
}
