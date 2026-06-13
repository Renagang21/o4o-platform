# WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1

> **유형:** 구현 (공개 페이지 하드코딩 법정정보 제거)
> **선행 IR/WO:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md), [WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1](WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md)
> **작성일:** 2026-06-13
> **CHECK 산출물:** `docs/checks/CHECK-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md`

---

## 1. 목적
Neture 공개 ContactPage에 남은 하드코딩 법정정보(`㈜쓰리라이프존`, `108-86-02873`)를 제거. **공개 화면 법정정보 표기는 Footer의 `PublicLegalFooterInfo`(service_legal_profiles 동적)만 담당**한다는 기준 고정. Footer Core 구현 아님.

## 2. 핵심 원칙
1. 공개 화면 법정정보 하드코딩 금지
2. 사업자명/등록번호/주소/전화/통신판매업 신고번호 코드 직접 삽입 금지
3. 법정정보 실값은 `service_legal_profiles`(Admin 설정)만
4. 값 없거나 비활성 → 비표시, placeholder/더미 금지
5. ContactPage 기능·submit 흐름 미변경
6. Footer Core 미생성
7. backend/API/DB/migration 미수정

## 3. 작업 대상
`services/web-neture/**`, CHECK. (조건부 `packages/shared-space-ui/**` — 재사용 최소 수정 시만.) **금지: `apps/api-server/**`, `services/web-{glycopharm,k-cosmetics,kpa-society}/**`.**

## 4. 제외
Footer Core / 공통화 / 디자인 / `PublicLegalFooterInfo` 구조 / `service_legal_profiles` backend / Admin 설정 UI / Contact submit 로직 / email·autoreply 설정 / 약관·개인정보 본문 / GP·KCos·KPA / backend·API·DB·migration.

## 5. 조사 결과
- `services/web-neture/src/pages/ContactPage.tsx` "연락처 정보" 섹션 하단 **"회사 정보" 카드**(line 351~357)에 하드코딩: `㈜쓰리라이프존`, `사업자등록번호: 108-86-02873`.
- Footer(NetureLayout)·standalone Footer에는 하드코딩 법정정보 없음(`PublicLegalFooterInfo` 동적).
- "직접 연락하기"(email partners@neture.co.kr, 고객센터 1577-2779)는 contact 채널 CTA — 사업자 등록 법정정보 아님.

## 6. 처리 (Option A — 법정정보 카드 제거)
- ContactPage "회사 정보" 카드(㈜쓰리라이프존 + 사업자등록번호) **제거**. ContactPage는 문의 양식 + 문의 안내 + 직접 연락 CTA만.
- 사업자 법정정보 표기는 Footer `PublicLegalFooterInfo`가 단독 담당.
- "직접 연락하기"(email/phone CTA)는 유지(contact 채널, 법정 등록정보 아님). 필요 시 향후 동적화는 별도.

## 7. 문구 기준
허용: 문의 안내("문의를 남겨주시면 운영자가 확인 후 회신…"), 직접 연락 CTA. 금지: 사업자등록번호/㈜쓰리라이프존/준비 중/미정/N/A.

## 8. 검색 기준 (작업 후)
`쓰리라이프존`, `108-86-02873`, `사업자등록번호`, `통신판매업`, `대표자` grep — **공개 표기로서의 하드코딩 값 0** 확인. (입점/공급자 폼 라벨·admin 헤더·주석은 법정정보 표기 아님 → 대상 아님.)

## 9. 검증
ContactPage `㈜쓰리라이프존`·`108-86-02873` 제거 · Contact submit 회귀 없음 · 개인정보 동의 유지 · email/autoreply/in-app 구조 미변경 · Footer legal block 미변경 · placeholder 미표시 · GP/KCos/KPA 미수정 · backend/API/DB 미수정 · tsc 통과 · 가능 시 `/contact` 브라우저 smoke.

## 10. Smoke
배포 후 `https://neture.co.kr/contact`: 렌더 정상 · form 정상 · 동의 체크 유지 · `㈜쓰리라이프존`/`108-86-02873`/placeholder 미노출 · Footer 정상 · `/terms`·`/privacy`·`/contact`·`/guide` 링크 정상.

## 11. 배포
web-neture만 변경 → web-neture 배포 확인. ⚠️ detect-changes skip 가능 → 라이브 확인 + 필요 시 `workflow_dispatch service=neture`.

## 12. staged 가드
허용: `services/web-neture/**`, CHECK. 조건부 `packages/shared-space-ui/**`. **금지: `apps/api-server/**`, `services/web-{glycopharm,k-cosmetics,kpa-society}/**`.** commit 명시 경로.

## 13. CHECK 문서
`docs/checks/CHECK-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md` — 목적·선행 반영·ContactPage 조사·제거한 하드코딩·처리 방식·Footer legal 미수정·submit 회귀 없음·동의 유지·GP/KCos/KPA 미수정·backend 미수정·검색 결과·tsc·smoke·배포·commit.

## 14. 후속
1. `WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1` — `loadFooterLegal` 공통화 + Neture footer 3중 정리
2. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 FooterCore

> **기준 고정:** 공개 화면에서 사업자 법정정보가 나오는 곳은 **Footer 하나뿐**이어야 한다.

---

*End of WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1*
