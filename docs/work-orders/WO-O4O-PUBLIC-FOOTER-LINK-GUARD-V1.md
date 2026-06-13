# WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1

> **유형:** 구현 (Footer 링크 정합성 guard — Core 추출 아님)
> **선행 IR:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md`

---

## 1. 목적
4서비스 공개 Footer 링크 정합성 정비 + dead link/route drift 재발 방지 기준 고정. 법정정보 위험(하드코딩·placeholder)은 이미 `PublicLegalFooterInfo`+`service_legal_profiles`로 닫힘 → 이번은 **링크 guard만**. Footer Core 추출 아님.

## 2. 핵심 원칙
1. Footer 전체 공통 컴포넌트화 안 함
2. `PublicLegalFooterInfo` 구조·법정정보 로직 미변경
3. footer 링크가 실제 route와 맞는지 정리
4. 없는 route 링크는 제거 또는 실제 route 교체
5. 서비스별 route 차이 인정 (KPA `/policy` 등)
6. footer 디자인 미변경
7. backend/API/DB/migration 미수정

## 3. 작업 대상
`services/web-{glycopharm,k-cosmetics,kpa-society,neture}/**`, CHECK. (조건부 `packages/shared-space-ui/**` — link util/타입 필요 시만.) **금지: `apps/api-server/**`.**

## 4. 제외
PublicFooterCore 신규 / Footer 전체 공통화 / GP-KCos Core 추출 / 디자인 변경 / 법정정보 fetch·`PublicLegalFooterInfo`·`service_legal_profiles` 수정 / backend·API·DB·migration / Contact form / 약관·개인정보 본문 / Admin 설정.

## 5. 조사 결과 (route 검증 완료)
| 서비스 | footer 링크 | route 존재 | 처리 |
|--------|-----------|:---:|------|
| GlycoPharm | `/forum`,`/business`,`/service-guide`,`/contact`,`/terms`,`/privacy` | ✅ | 유지 |
| GlycoPharm | **`/education`** | ❌ (0 route; LMS=`/lms`) | **→ `/lms`** |
| K-Cosmetics | `/`,`/service-guide`,`/contact`,`/register`,`/terms`,`/privacy` | ✅ | **무수정** |
| KPA Society | `/about`,`/guide/intro`,`/service-guide`,`/contact`,`/policy`,`/privacy` | ✅ | **무수정** (`/policy` 기준 유지, `/terms`·`/sitemap` 없음) |
| Neture | `/contact` | ✅ | 유지 |
| Neture | **`/about`** | ❌ (route 없음) | **제거** |

→ **실제 변경 2건: GP `/education`→`/lms`, Neture `/about` 링크 제거.** KCos·KPA 무수정.

## 6. 서비스별 처리
- **GP** ([common/Footer.tsx](../../services/web-glycopharm/src/components/common/Footer.tsx)): `to="/education"` → `to="/lms"` (label "교육/자료" 유지). 약국 표현·법정 block 유지.
- **Neture** ([layouts/NetureLayout.tsx](../../services/web-neture/src/components/layouts/NetureLayout.tsx)): `/about` Link 제거(route 없음, About 페이지 부재). "Contact Us" 유지. 법정 block 유지. (About→/guide 재연결은 라벨 불일치라 미채택 — 제거가 깔끔.)
- **KCos/KPA:** 변경 없음(전 링크 route 정합).

## 7. route 확인 기준
각 서비스 `src/App.tsx`의 실제 Route 정의 기준으로 판단(완료 — §5). footer 링크 정리는 route 존재 여부 기준.

## 8. 하드코딩 법정정보 확인
작업 중 footer 내부에 사업자/대표/번호 등 하드코딩·placeholder(예: `108-86-02873`, `㈜쓰리라이프존`, `준비 중`, `미정`, `N/A`) 재등장 없는지 확인. **Neture ContactPage 하드코딩(㈜쓰리라이프존/108-86-02873)은 이번 WO 미수정 — 후속 `WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1` 대상.** 단 footer 내부에 같은 값 있으면 제거(현재 footer엔 없음).

## 9. 검증
GP `/education` dead link 제거 · Neture `/about` dead link 제거 · KPA `/policy` 유지·`/terms`/`/sitemap` 없음 · 나머지 링크 route 정합 · 법정정보 동적 렌더 회귀 없음 · footer 하드코딩 재등장 없음 · backend/API/DB 미수정 · 디자인 미변경 · TypeScript 통과 · 가능 시 브라우저 smoke.

## 10. Smoke
배포 후 GP `/`(footer `/education` 없음·`/lms` 정합), Neture `/`(footer `/about` 없음). KCos/KPA는 무수정이라 배포 대상 아님(회귀만 비대상).

## 11. 배포
변경된 web(GP, Neture)만 배포. ⚠️ detect-changes skip 가능 → 라이브 확인 + 필요 시 `workflow_dispatch` 대상 재배포.

## 12. staged 가드
허용: `services/web-*/**`, CHECK. 조건부 `packages/shared-space-ui/**`. **금지: `apps/api-server/**`.** commit 명시 경로(실제 수정 = GP Footer + Neture NetureLayout + CHECK).

## 13. CHECK 문서
`docs/checks/CHECK-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md` — 목적·IR 반영·서비스별 footer 파일·link matrix·제거/교체 dead link·KPA `/policy` 유지·Neture `/about` 처리·GP `/education` 처리·법정정보 회귀 없음·하드코딩 재등장 없음·backend 미수정·디자인 미변경·tsc·smoke·배포·commit.

## 14. 후속
1. `WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1` — Neture ContactPage 하드코딩 동적화/제거 + 재발 방지
2. `WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1` — `loadFooterLegal` 공통화 + Neture footer 3중 정리
3. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 FooterCore

---

*End of WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1*
