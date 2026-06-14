# CHECK-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1

> **WO:** WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1
> **선행 IR:** [IR-O4O-FOOTER-COVERAGE-AUDIT-V1](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md)
> **선행 WO(404 표준):** [WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1](../investigations/WO-O4O-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1.md)
> **선행:** [STORE-FACING-FOOTER-COVERAGE](CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1.md) · [STANDARDIZATION-MILESTONE](CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md)
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — 조사 결과 WO 전제 2건이 부정확함을 확인(아래 §3). 실제 코드 변경은 **GP 404 복귀 네비 정합 1파일**. storefront·KPA/KCos 404 무수정(근거 기록). GP tsc 0.

## 1. 목적
공개 페이지 Footer coverage 누락/분리 구간 정리. **단, 조사 결과 WO가 가정한 누락 2건(KPA storefront bare / GP storefront custom footer)은 실제로는 정합 상태**였고, 404는 선행 WO가 이미 "minimal 복귀 네비"로 표준화한 상태였다. 본 WO는 그 사실을 확정하고 **유일한 outlier(GP 404)만 표준에 정합**시켰다.

## 2. 선행 IR/WO 반영
- IR-FOOTER-COVERAGE-AUDIT의 KPA storefront 'Type C(bare)' / GP storefront 'Type B(custom→공통 정렬)' 분류를 **실제 코드로 재검증** → 오분류로 확인(§3).
- 선행 `WO-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX-V1` §4-B·§5: **404 = 의도적 minimal 복귀 네비, footer 제외**. KCos/KPA 404는 이 결정대로 이미 구현됨 → 본 WO는 footer를 추가하지 않고 GP만 정합.

## 3. WO 전제 정정 (조사 결과 — 코드 근거)

### 3.1 KPA `/store/:slug` storefront — "bare, footer 없음" → **틀림**
[StorefrontHomePage.tsx](../../services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx)는 자체 header + **footer를 가진 self-contained 테마형 block-engine storefront**(`StoreBlockRegistry`, 4 테마 CSS 변수). footer L270-274: "{매장명}의 스토어프론트 · Powered by O4O Platform". **Layout 미사용 = footer 없음이 아님.** IR 서브에이전트가 "no Layout wrapper"를 "no footer"로 오판.
→ **무수정.** 플랫폼 `Layout`/`PublicLegalFooterInfo` 주입은 테마형 self-contained 디자인을 깨뜨림.

### 3.2 GP `/store/:slug` storefront — "custom footer → 공통 PublicLegalFooterInfo 정렬" → **하면 안 됨**
[StoreLayout.tsx](../../services/web-glycopharm/src/components/layouts/StoreLayout.tsx) L262-292 footer는 `store.businessNumber`·`store.onlineSalesNumber`·`store.pharmacistName`을 **store 엔티티에서 동적 표시** = **판매자(약국) 본인의 법정정보**. 전자상거래법상 storefront엔 실제 판매자 정보가 정합. 이를 `serviceKey="glycopharm"`(플랫폼 운영사 정보)로 교체하면 **법적 회귀**(판매자≠플랫폼 운영사). 하드코딩 위반 아님(동적 store 데이터).
→ **무수정.** (cosmetic `© 2025` 잔존은 본 WO 범위 밖 — 별도 사소 정리.)

### 3.3 404 — "footer 포함 권장" → **선행 WO와 충돌**
선행 WO가 404를 "minimal 복귀 네비, footer 제외 의도"로 결론(§4-B·§5). KCos/KPA 404는 그대로 구현됨. footer 추가는 선행 결정 및 KCos/KPA 현행과 불일치 → **footer 미추가**, 표준(minimal nav)으로 정합만.

## 4. 404 현황 및 처리

| 서비스 | 변경 전 | 처리 |
|--------|--------|------|
| K-Cosmetics | ✅ 홈/커뮤니티/문의 (min-h-60vh, 선행 WO 적용 완료) | **무수정** |
| KPA Society | ✅ 홈/커뮤니티/이용가이드 (선행 WO 적용 완료) | **무수정** |
| GlycoPharm | ⚠️ 홈/뒤로가기만 (선행 WO 미적용 — 유일 outlier) | **정합** → 홈/커뮤니티/문의 |

- GP [NotFoundPage.tsx](../../services/web-glycopharm/src/pages/NotFoundPage.tsx): action row를 `window.history.back()` 버튼 → KCos/KPA 표준 복귀 네비(홈 `/` · 커뮤니티 `/forum` · 문의 `/contact`)로 교체. `ArrowLeft` import 제거. SPA `NavLink` 사용. 404 시각(big 404 + 메시지) 불변.
- **footer 미추가** — 선행 WO의 minimal-404 결정 준수.

## 5. KPA / GP / KCos / Neture 확인
- **KPA storefront**: §3.1 — self-contained footer 존재, 무수정.
- **GP storefront**: §3.2 — 판매자 법정정보 동적 표시, 무수정. 약국 문구 유지.
- **K-Cosmetics**: 소비자 storefront(`/store/:slug`) 없음(owner dashboard + `/store/:slug/blog`는 MainLayout=footer 有). 404 선행 적용 완료 → 무수정.
- **Neture**: 공개 route 전부 `NetureLayout` footer coverage. **catch-all 404 라우트 자체가 없음**(unmatched=blank) — store-facing 무관, 본 WO 구현 대상 아님(별도 기록 §9).

## 6. 제외 대상 무영향
admin/operator/supplier workspace/auth/fullscreen layout 무수정. `StoreDashboardLayout`(store-ui-core) 무수정. backend/API/DB/migration 0. `packages/**` 무수정(이번엔 공통 패키지 변경 없음).

## 7. Footer link 정합성 / 하드코딩
- GP 404 링크 `/`·`/forum`·`/contact` — 전부 유효 route(기존 LINK-GUARD 결과). dead link 0.
- 하드코딩 법정정보 추가 0. storefront 법정정보는 기존 동적(store 엔티티 / block-engine) 유지.

## 8. 검증
| 항목 | 결과 |
|------|------|
| web-glycopharm tsc --noEmit | ✅ exit 0, error 0 |
| 변경 파일 | GP `pages/NotFoundPage.tsx` 1개 (+ 본 CHECK) |
| KCos/KPA/Neture/packages | 무수정 |
| 브라우저 smoke | ⏭️ 보류(Playwright 점유). 배포 후 GP `/존재하지않는경로` → 홈/커뮤니티/문의 링크 동작 1회 확인 권장 |

## 9. IR 오분류 정정 기록 (영구)
[IR-O4O-FOOTER-COVERAGE-AUDIT-V1](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md) §3.3·§4·§5 기준 정정:
- **KPA `/store/:slug` = 'Type C 누락'** → **오분류.** self-contained 테마형 storefront로 자체 footer 보유. coverage 누락 아님.
- **GP storefront `StoreLayout` = 'Type B(custom→공통 정렬)'** → **정정.** custom footer는 판매자 법정정보 동적 표시로 정합. 공통 `PublicLegalFooterInfo` 교체는 법적 회귀이므로 비대상.
- **404 = 'Type C(권장)'** → **선행 WO에서 minimal-nav로 이미 표준화**(footer 제외 의도). 본 WO에서 GP만 정합.
- **Neture catch-all 404 부재** → 신규 발견. footer 무관(라우트 자체 없음). 필요 시 별도 WO.

## 10. Commit
- GP 404(+CHECK): path-specific commit (hash 본 커밋 이후 기록).

## 11. 후속
1. (선택) `WO-O4O-NETURE-CATCHALL-404-V1` — Neture unmatched route 404 페이지 도입(footer 무관, UX).
2. (선택) GP storefront `© 2025` → 동적 연도 cosmetic 정리.
3. `WO-O4O-FOOTER-LAYOUT-STICKY-BASELINE-V1` — 브라우저 시각 확인 후 sticky.
4. `CHECK-O4O-FOOTER-COVERAGE-MILESTONE-V1` — public/store-facing footer coverage 완료 마일스톤 고정.

## 12. 완료 판정
**PASS.** WO 전제 2건(storefront)·1건(404 footer)이 실제 코드와 충돌함을 확인하고, 회귀를 피해 **GP 404만 기존 minimal-nav 표준으로 정합**. storefront 무수정(근거 §3 명문화), KCos/KPA 404 무수정(선행 완료), IR 오분류 정정 기록(§9). footer 축 누락은 실질적으로 닫힘 — 남은 건 선택 과제(§11).

---

*End of CHECK-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1*
