# ADR-0002: O4O Product Description Authenticated Access

- **상태**: Accepted
- **날짜**: 2026-07-12
- **관련**: WO `WO-O4O-PRODUCT-DESCRIPTION-AUTH-ACCESS-BASELINE-AMENDMENT-V1` · baseline `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT.md` · 정책 SSOT `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md` · 조사 `docs/investigations/IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md` · `docs/checks/CHECK-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`

## 맥락 (Context)

F12 Product Resource Architecture(V1)와 V2-AMENDMENT 는 상품 permalink(`/r/{id}`)와 Product Landing(`/p/{key}`)을 **공개 URL** 로 규정했고, 현재 구현도 그 전제대로 설명서 API 가 **완전 무인증 공개**임이 read-only 감사에서 확인됐다. 그러나 확정된 상품 설명서 정책은 "고정 URL·기본 QR 은 유지하되 **설명서 본문은 O4O 로그인 회원만 열람**"을 요구한다. 기존 baseline 과 정면 충돌하므로, 구현 전에 Frozen baseline 을 개정하는 결정이 필요했다. (상세 조사·gap·후속 WO 는 관련 IR/CHECK 참조.)

## 결정 (Decision)

**우리는 O4O 상품 설명서를 "고정 URL·기본 QR 유지 + 로그인 회원 전용 본문 열람"으로 한다.**

- 상품마다 하나의 고정 permalink 와 기본 QR 을 **그대로 유지**(재발급·URL 변경 없음).
- 설명서 본문은 **유효한 O4O 로그인 세션에만** 응답한다. 비로그인은 로그인·가입 후 **원래 상품 URL 로 복귀(returnUrl)**.
- 접근 통제의 기준은 **서버 API 인증**이다(프론트 숨김·`noindex` 단독 금지).
- **열람 = O4O 로그인 기본 권한**(회원 유형·구독 무관). 구독(entitlement)은 설명서 수정·태블릿·POP·캠페인·배포·통계·고급 다국어 등 **사업 기능**에만 적용.

이 결정을 F12 baseline `V3-AMENDMENT`(불변식 #3 개정 + 신규 #8·#9)로 명문화한다.

## 근거 (Rationale)

- 상품 설명서는 O4O 로그인 회원 전용 매장 판매지원 콘텐츠이며(정책 SSOT), 일반 인터넷 공개 자산이 아니다.
- 물리 QR·인쇄물 재발급이 가장 비싼 작업이므로 **URL·QR 은 불변**으로 두고 **열람 게이트만** 얹는다(`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1` 와 동일 철학).
- 프론트 숨김/`noindex` 는 우회 가능하므로 서버 인증만이 실효적 통제다(감사에서 무인증 본문 노출 확인).

## 결과 (Consequences)

- **쉬워지는 것**: 로그인 전용 열람·returnUrl·검색/캐시 보호를 구현할 baseline 근거 확보. 기존 URL·QR 호환 유지로 재발급 0.
- **어려워지는 것/주의**: 비로그인 접근이 막히므로 최소 상품 식별정보 노출 범위를 후속 구현 WO 에서 별도 확정해야 함. 공개 크롤/캐시 경로 점검 필요.
- **영향 문서**: `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT`(신규), V1/V2(원문 보존·계보 참조), 정책 SSOT(이미 정렬). CLAUDE.md §14 F12 행은 V1 만 링크(V2 때도 미갱신) — 갱신은 별도 거버넌스.
- **후속 작업**: `WO-O4O-PRODUCT-DESCRIPTION-AUTH-GATE-AND-RETURNURL-V1`(구현). 본 ADR·V3 는 코드 변경 0.

## 대안 (Alternatives, 선택)

- **A. 공개 유지 + `noindex` 만**: 서버 인증 없이 발견성만 낮춤 → 정책의 "로그인 전용" 미충족. 반려.
- **B. 프론트에서만 로그인 체크**: API 는 공개 → 직접 호출·JS 크롤러가 본문 취득. 반려(감사에서 실제 노출 확인).
- **C. 공개 URL 폐기·회원 전용 URL 신설**: QR·인쇄물 전면 재발급 필요(가장 비쌈). 반려 — 고정 URL 유지가 핵심 요건.

---
> ADR 은 **결정**만 담는다. 열람 접근 baseline 규칙은 `O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V3-AMENDMENT`, 구현은 후속 WO.
