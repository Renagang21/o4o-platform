# CHECK-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1

> **WO:** [WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1](../work-orders/WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1.md)
> **선행:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md), [WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1](../work-orders/WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md)
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — 하드코딩 법정정보 제거 + tsc + 배포 성공. 브라우저 UI smoke는 점유로 보류(source grep + deploy success로 갈음).

## 1. 목적
Neture 공개 ContactPage 하드코딩 법정정보(`㈜쓰리라이프존`, `108-86-02873`) 제거. **공개 화면 사업자 법정정보 표기는 Footer `PublicLegalFooterInfo`(service_legal_profiles 동적) 하나만** 담당하도록 기준 고정.

## 2. 선행 IR/WO 반영
IR 권고 B(guard 강화)의 legal guard 부분. LINK-GUARD에서 dead link 정리 완료, 본 WO에서 하드코딩 법정정보 정리.

## 3. ContactPage 조사 결과
- `services/web-neture/src/pages/ContactPage.tsx` "연락처 정보" 섹션 하단 **"회사 정보" 카드**에 하드코딩: `㈜쓰리라이프존`, `사업자등록번호: 108-86-02873`.
- "직접 연락하기"(email `partners@neture.co.kr`, 고객센터 `1577-2779`)는 contact 채널 CTA — 사업자 등록 법정정보 아님 → 유지.
- Footer(NetureLayout)에는 하드코딩 법정정보 없음(`PublicLegalFooterInfo` 동적).

## 4. 제거한 하드코딩 법정정보
- ContactPage "회사 정보" 카드 전체 제거: `㈜쓰리라이프존`, `사업자등록번호: 108-86-02873`.
- diff: 1 file, +2/-8 (카드 제거 + 설명 주석).

## 5. ContactPage 처리 방식 (Option A)
법정정보 카드 제거. ContactPage = 문의 양식 + 문의 안내 + 직접 연락 CTA(email/phone)만. 사업자 법정정보는 Footer 단독 담당.

## 6. Footer legal block 미수정
`PublicLegalFooterInfo`·`loadFooterLegal`·NetureLayout footer 코드 무변경. 동적 legal 렌더 회귀 없음.

## 7. Contact submit 회귀 없음
submit handler·`contactApi.submitContactMessage`·payload 무변경. (제거는 페이지 하단 정적 카드뿐.)

## 8. 개인정보 동의 유지
동의 체크박스(`privacyConsent`)·검증 무변경.

## 9. GP/KCos/KPA 미수정
커밋 파일 = ContactPage 1개(+WO/CHECK 문서). `services/web-{glycopharm,k-cosmetics,kpa-society}` 0건.

## 10. backend/API/DB 미수정
`apps/api-server` 0. migration 0. `service_legal_profiles` 미변경.

## 11. 검색 결과
작업 후 `services/web-neture/src` grep:
- `쓰리라이프존` / `108-86-02873` → **0건**(공개 표기 하드코딩 값 완전 제거).
- `사업자등록번호` / `대표자` 잔존은 **입점 신청(RegisterModal)·공급자 프로필(SupplierProfilePage) 폼 라벨, admin/operator 테이블 헤더, footerLegal.ts 주석, ContactPage 제거 주석** — 법정정보 표기 아님, 대상 아님.

## 12. TypeScript 검증
- web-neture `tsc --noEmit` ✅ 0 errors.

## 13. 브라우저 smoke
⏭️ **보류** — Playwright 브라우저 병렬 세션 점유. 변경이 정적 텍스트 카드 제거이고 grep으로 하드코딩 값 0 확인 + tsc clean + deploy success → source/deploy 레벨 갈음. 브라우저 가용 시 `https://neture.co.kr/contact`에서 `㈜쓰리라이프존`/`108-86-02873` 미노출 + form/동의 정상 1회 확인 권장.

## 14. 배포 결과
| 대상 | 결과 |
|------|------|
| Deploy Web Services (run 27457747156) | ✅ success |
| deploy-neture | ✅ success |
| GP/KCos/KPA | skipped (무수정) |
| API Server | 미변경 → 대상 아님 |

## 15. Commit
- WO 문서: 별도 커밋. 코드(ContactPage): `47c08e51f`. 본 CHECK: 별도 path-specific commit.

## 16. 후속
1. `WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1` — `loadFooterLegal` 공통화 + Neture footer 3중 정리
2. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 FooterCore

> **기준 고정:** 공개 화면에서 사업자 법정정보가 나오는 곳은 Footer 하나뿐.

---
*End of CHECK-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1*
