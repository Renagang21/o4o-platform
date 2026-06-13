# CHECK-O4O-PUBLIC-FOOTER-LINK-GUARD-V1

> **WO:** [WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1](../work-orders/WO-O4O-PUBLIC-FOOTER-LINK-GUARD-V1.md)
> **선행 IR:** [IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md)
> **작성일:** 2026-06-13
> **상태:** ✅ **완료** — 코드 수정 + tsc + 배포 성공. 브라우저 UI smoke는 점유로 보류(route-level 검증 + deploy success로 갈음).

## 1. 목적
4서비스 공개 Footer 링크를 실제 route와 정합. dead link/route drift 제거. Footer Core 추출 아님 — 링크 guard만. 법정정보 로직 미변경.

## 2. 선행 IR 반영
IR 권고 B(현상 유지 + guard 강화) 중 link guard 부분. 법정정보는 이미 공통 `PublicLegalFooterInfo`로 차단됨 → 이번은 링크만.

## 3. 서비스별 Footer 파일
| 서비스 | Footer 파일 |
|--------|------------|
| GlycoPharm | `services/web-glycopharm/src/components/common/Footer.tsx` |
| K-Cosmetics | `services/web-k-cosmetics/src/components/common/Footer.tsx` |
| KPA Society | `services/web-kpa-society/src/components/Footer.tsx` |
| Neture | `services/web-neture/src/components/layouts/NetureLayout.tsx`(임베드) |

## 4. Footer link matrix (route 존재 = App.tsx grep 검증)
| 서비스 | footer link | route | 존재 | 처리 |
|--------|-----------|-------|:---:|------|
| GlycoPharm | `/forum`,`/business`,`/service-guide`,`/contact`,`/terms`,`/privacy` | ✅ | 유지 |
| GlycoPharm | **`/education`** | `/education` | ❌ 0 | **→ `/lms`** (✅ 2 routes) |
| K-Cosmetics | `/`,`/service-guide`,`/contact`,`/register`,`/terms`,`/privacy` | ✅(전부) | **무수정** |
| KPA Society | `/about`,`/guide/intro`,`/service-guide`,`/contact`,`/policy`,`/privacy` | ✅(전부) | **무수정** |
| Neture | `/contact` | ✅ | 유지 |
| Neture | **`/about`** | `/about` | ❌ 0 | **링크 제거** |

## 5. 제거/교체한 dead link
- GP: `/education` → `/lms` (교체, label "교육/자료" 유지).
- Neture: `/about` 링크 **제거**(route 없음·About 페이지 부재; About→/guide 재연결은 라벨 불일치라 미채택). "Contact Us" 유지.

## 6. KPA `/policy` 기준 유지
KPA footer 이용약관 = `/policy` (route 존재). `/terms`·`/sitemap` footer link **없음**(확인). 무수정.

## 7. Neture `/about` 처리
route grep 0건 → footer Link 제거. (후속 About 페이지 도입 시 재연결은 별도 결정.)

## 8. GlycoPharm `/education` 처리
route grep 0건, 공개 LMS=`/lms`(`EducationPage` @ `App.tsx:571 path="lms"`). `/education`→`/lms` 교체.

## 9. 법정정보 동적 렌더 회귀 없음
`PublicLegalFooterInfo`·`loadFooterLegal` 미변경. footer legal block 코드 무수정 → 회귀 없음.

## 10. 하드코딩 법정정보 재등장 없음
footer 내부 하드코딩/placeholder 없음(GP/KCos/KPA/Neture footer 전부). **Neture ContactPage 하드코딩(㈜쓰리라이프존/108-86-02873)은 footer 외부 — 이번 WO 미수정, 후속 LEGAL-GUARD 대상.**

## 11. backend/API/DB 미수정
`apps/api-server` 변경 0. migration 0.

## 12. 디자인 변경 없음
href 값만 변경. 클래스/구조/색상 무변경.

## 13. TypeScript 검증
- web-glycopharm `tsc --noEmit` ✅ 0 errors
- web-neture `tsc --noEmit` ✅ 0 errors

## 14. 브라우저 smoke
⏭️ **보류** — Playwright 브라우저가 병렬 세션 점유로 잠김. 변경이 정적 href 교정이고 route 존재는 App.tsx grep으로 검증(`/lms` 2 routes, `/education` 0, `/about` 0), tsc clean + deploy success → route-level 검증으로 갈음. 브라우저 가용 시 GP `/`(교육/자료→/lms), Neture `/`(About 링크 없음) 1회 확인 권장.

## 15. 배포 결과
| 대상 | 결과 |
|------|------|
| Deploy Web Services (run 27457544010) | ✅ success |
| deploy-glycopharm | ✅ success |
| deploy-neture | ✅ success |
| deploy-k-cosmetics / deploy-kpa-society | skipped (무수정, 정상) |
| API Server | 미변경 → 배포 대상 아님 |

## 16. Commit
- WO 문서: 별도 커밋. 코드 2파일(GP Footer + Neture NetureLayout): `58708e6e7`. 본 CHECK: 별도 path-specific commit.

## 17. 후속
1. `WO-O4O-PUBLIC-FOOTER-LEGAL-GUARD-V1` — Neture ContactPage 하드코딩 동적화/제거
2. `WO-O4O-PUBLIC-FOOTER-LEGAL-LOADER-CONSOLIDATION-V1` — loadFooterLegal 공통화 + Neture footer 3중 정리
3. `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` — GP/KCos 한정 FooterCore

---
*End of CHECK-O4O-PUBLIC-FOOTER-LINK-GUARD-V1*
