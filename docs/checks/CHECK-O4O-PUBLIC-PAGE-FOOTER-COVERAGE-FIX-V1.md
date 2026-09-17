# CHECK-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1

> **WO:** WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1
> **선행 IR:** [IR-O4O-FOOTER-COVERAGE-AUDIT-V1](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md)
> **선행 WO(404 표준):** [WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1](../investigations/WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1.md)
> **선행:** [STORE-FACING-FOOTER-COVERAGE](CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1.md) · [STANDARDIZATION-MILESTONE](CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md)
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — 조사 결과 WO 전제 2건이 부정확함을 확인(아래 §3). storefront·KPA/KCos 404 무수정(근거 기록).

## 1. 목적
공개 페이지 Footer coverage 누락/분리 구간 정리.

## 2. 선행 IR/WO 반영
- IR-FOOTER-COVERAGE-AUDIT의 KPA storefront 'Type C(bare)' storefront 'Type B(custom→공통 정렬)' 분류를 **실제 코드로 재검증** → 오분류로 확인(§3).
- 선행 `WO-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1` §4-B·§5: **404 = 의도적 minimal 복귀 네비, footer 제외**.

## 3. WO 전제 정정 (조사 결과 — 코드 근거)

### 3.1 KPA `/store/:slug` storefront — "bare, footer 없음" → **틀림**
[StorefrontHomePage.tsx](../../services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx)는 자체 header + **footer를 가진 self-contained 테마형 block-engine storefront**(`StoreBlockRegistry`, 4 테마 CSS 변수). footer L270-274: "{매장명}의 스토어프론트 · Powered by O4O Platform". **Layout 미사용 = footer 없음이 아님.** IR 서브에이전트가 "no Layout wrapper"를 "no footer"로 오판.
→ **무수정.** 플랫폼 `Layout`/`PublicLegalFooterInfo` 주입은 테마형 self-contained 디자인을 깨뜨림.

### 3.3 404 — "footer 포함 권장" → **선행 WO와 충돌**
선행 WO가 404를 "minimal 복귀 네비, footer 제외 의도"로 결론(§4-B·§5). KCos/KPA 404는 그대로 구현됨. footer 추가는 선행 결정 및 KCos/KPA 현행과 불일치 → **footer 미추가**, 표준(minimal nav)으로 정합만.

## 4. 404 현황 및 처리

| 서비스 | 변경 전 | 처리 |
|--------|--------|------|
| K-Cosmetics | ✅ 홈/커뮤니티/문의 (min-h-60vh, 선행 WO 적용 완료) | **무수정** |
| KPA Society | ✅ 홈/커뮤니티/이용가이드 (선행 WO 적용 완료) | **무수정** |

- 커뮤니티 `/forum` · 문의 `/contact`)로 교체. `ArrowLeft` import 제거. SPA `NavLink` 사용. 404 시각(big 404 + 메시지) 불변.
- **footer 미추가** — 선행 WO의 minimal-404 결정 준수.

## 5. KPA / KCos / Neture 확인
- **KPA storefront**: §3.1 — self-contained footer 존재, 무수정.
- 약국 문구 유지.
- **K-Cosmetics**: 소비자 storefront(`/store/:slug`) 없음(owner dashboard + `/store/:slug/blog`는 MainLayout=footer 有). 404 선행 적용 완료 → 무수정.
- **Neture**: 공개 route 전부 `NetureLayout` footer coverage. **catch-all 404 라우트 자체가 없음**(unmatched=blank) — store-facing 무관, 본 WO 구현 대상 아님(별도 기록 §9).

## 6. 제외 대상 무영향
admin/operator/supplier workspace/auth/fullscreen layout 무수정. `StoreDashboardLayout`(store-ui-core) 무수정. backend/API/DB/migration 0. `packages/**` 무수정(이번엔 공통 패키지 변경 없음).

## 7. Footer link 정합성 / 하드코딩
- dead link 0.
- 하드코딩 법정정보 추가 0. storefront 법정정보는 기존 동적(store 엔티티 / block-engine) 유지.

## 8. 검증
| 항목 | 결과 |
|------|------|
| 변경 파일 `pages/NotFoundPage.tsx` 1개 (+ 본 CHECK) |
| KCos/KPA/Neture/packages | 무수정 |
| 브라우저 smoke | ⏭️ 보류(Playwright 점유). |

## 9. IR 오분류 정정 기록 (영구)
[IR-O4O-FOOTER-COVERAGE-AUDIT-V1](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md) §3.3·§4·§5 기준 정정:
- **KPA `/store/:slug` = 'Type C 누락'** → **오분류.** self-contained 테마형 storefront로 자체 footer 보유. coverage 누락 아님.
- 공통 `PublicLegalFooterInfo` 교체는 법적 회귀이므로 비대상.
- **404 = 'Type C(권장)'** → **선행 WO에서 minimal-nav로 이미 표준화**(footer 제외 의도).
- **Neture catch-all 404 부재** → 신규 발견. footer 무관(라우트 자체 없음). 필요 시 별도 WO.

## 10. Commit / 배포
- 배포: push run `27490390015` → KCos/KPA/Neture **정상 skip**(무변경).

## 11. 후속
1. (선택) `WO-O4O-NETURE-CATCHALL-404-V1` — Neture unmatched route 404 페이지 도입(footer 무관, UX).
3. `WO-O4O-FOOTER-LAYOUT-STICKY-BASELINE-V1` — 브라우저 시각 확인 후 sticky.
4. `CHECK-O4O-FOOTER-COVERAGE-MILESTONE-V1` — public/store-facing footer coverage 완료 마일스톤 고정.

## 12. 완료 판정
storefront 무수정(근거 §3 명문화), KCos/KPA 404 무수정(선행 완료), IR 오분류 정정 기록(§9). footer 축 누락은 실질적으로 닫힘 — 남은 건 선택 과제(§11).

---

*End of CHECK-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1*
