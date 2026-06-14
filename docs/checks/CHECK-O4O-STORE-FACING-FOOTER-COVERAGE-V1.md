# CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1

> **WO:** WO-O4O-STORE-FACING-FOOTER-COVERAGE-V1
> **선행 IR:** [IR-O4O-FOOTER-COVERAGE-AUDIT-V1](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md)
> **선행:** [CHECK-STANDARDIZATION-MILESTONE](CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md) · LINK/LEGAL/LOADER GUARD
> **작성일:** 2026-06-14
> **상태:** ✅ **구현 완료** — 4서비스 tsc 0 + Shared Module Change Protocol 검증. 배포/브라우저 smoke는 §14·§15 참조(보류).

## 1. 목적
GP·KCos·KPA의 store-facing 사용자 화면(매장 HUB / 내 매장·내 약국 owner dashboard)에 Footer coverage 보장. **layout 단위 주입**(page별 `<Footer/>` 패치 금지). 공개 footer 표준(법정정보·링크·loader)은 기존 유지.

## 2. 선행 IR 반영
IR-FOOTER-COVERAGE-AUDIT §5 누락:
- 내 매장/약국 owner dashboard → 공통 `StoreDashboardLayout`(@o4o/store-ui-core) footer 없음 (Type A, 1곳).
- GP/KCos store-hub layout top-level → footer 없음 (Type A). KPA store-hub는 공개 `Layout` 중첩 → 상속(해당 없음).
IR 권고대로 **compact footer + layout 단위 + admin/operator 제외 + Neture 제외** 적용.

## 3. 수정한 layout / 컴포넌트
| # | 파일 | 변경 |
|---|------|------|
| 1 | `packages/shared-space-ui/src/legal/StoreFacingFooter.tsx` | **신규** 공통 compact footer |
| 2 | `packages/shared-space-ui/src/index.ts` | export 추가 |
| 3 | `packages/store-ui-core/src/layout/StoreDashboardLayout.tsx` | **additive** `footer?: ReactNode` prop + 하단 렌더 |
| 4 | `services/web-glycopharm/src/App.tsx` | StoreLayoutWrapper footer 주입 |
| 5 | `services/web-glycopharm/.../GlycoPharmHubLayout.tsx` | hub footer + root flex-col |
| 6 | `services/web-k-cosmetics/src/App.tsx` | wrapper footer 주입 |
| 7 | `services/web-k-cosmetics/.../KCosmeticsHubLayout.tsx` | hub footer + root flex-col |
| 8 | `services/web-kpa-society/src/App.tsx` | wrapper footer 주입 (약관 `/policy`) |

### 설계 (F3 Store Layer Freeze 존중)
- `StoreDashboardLayout`은 **신규 의존 추가 없이** optional `footer` prop만 추가(additive). 미주입 시 동작 불변.
- 공통 `StoreFacingFooter`는 shared-space-ui(서비스 이미 의존)에 두고 **서비스 wrapper가 주입** → store-ui-core가 shared-space-ui를 직접 의존하지 않음(레이어 방향 보존).
- footer는 `min-h-screen flex flex-col`의 `flex-1` body 하단 sibling → 짧은 페이지에서도 하단 배치.

## 4. StoreDashboardLayout 영향 범위 (Shared Module Change Protocol)
- `StoreDashboardLayout` **route layout 소비처 = 3개**: GP `StoreLayoutWrapper`, KCos wrapper, KPA wrapper(App.tsx). 전부 footer 주입.
- `StoreOverviewPage`/`StoreSignagePage`의 `StoreDashboardLayout` 언급은 **주석뿐**(렌더 아님).
- **Neture는 store-ui-core `StoreDashboardLayout` 미소비**(내 매장 없음) → 무영향.
- prop이 optional이므로 미주입 소비처가 생겨도 회귀 0.
- 검색: `rg "StoreDashboardLayout"` (34 hits = 3 wrapper + 문서/주석), `rg "@o4o/store-ui-core" services/web-neture` → store layout 소비 없음.

## 5. GlycoPharm 적용
- StoreLayoutWrapper(`/store/*` 내 약국 dashboard): `StoreFacingFooter serviceKey="glycopharm"` links `/terms /privacy /contact`.
- `GlycoPharmHubLayout`(`/store-hub/*`): footer 추가, root `flex flex-col` + content `flex-1`.
- 사용자 문구 "내 약국" 유지(코드 store→문구 일괄치환 안 함).

## 6. K-Cosmetics 적용
- 내 매장 wrapper(`/store/*`): `serviceKey="k-cosmetics"` links `/terms /privacy /contact`.
- `KCosmeticsHubLayout`(`/store-hub/*`): footer 추가 + root flex-col.
- "내 매장" 문구 유지.

## 7. KPA Society 적용
- 내 약국 dashboard wrapper(`/store/*`): `serviceKey="kpa-society"` **약관 `/policy`**(의도된 차이 유지, `/terms` 강제통일 안 함), `/privacy /contact`. copyright "약사회".
- store-hub(`/store-hub`)는 `<Layout><PharmacyHubLayout/></Layout>` 구조로 **이미 footer 상속 → 무수정**(회귀 방지).
- 약사·약대생 커뮤니티 정체성 유지(분회/지부 표현 없음).

## 8. Neture 미수정 확인
커밋 staged 파일에 `services/web-neture/**` 0건. Neture는 store-facing 대상 아님. (shared-space-ui 변경은 additive → Neture tsc 영향만 확인, §13.)

## 9. admin/operator/supplier/auth/fullscreen 미영향
- footer는 `StoreDashboardLayout`(store owner 전용)·store-hub layout·서비스 wrapper에만 주입. admin `DashboardLayout`/operator `OperatorAreaShell`/auth/fullscreen layout 무수정.
- `footer` prop 기본 undefined → 비주입 layout 동작 불변.

## 10. page별 Footer 직접 삽입 없음
모든 footer는 layout/wrapper 레벨 주입(3 wrapper + 2 hub layout). 개별 page 컴포넌트 수정 0.

## 11. Footer link 정합성 유지
- GP/KCos `/terms`·`/privacy`·`/contact`, KPA `/policy`·`/privacy`·`/contact` — 전부 기존 공개 footer와 동일 route(이전 LINK-GUARD 결과 유지). `/education`·`/about` 등 dead link 미사용.
- 링크는 react-router `Link`(SPA 네비, full-reload 없음).

## 12. 법정정보 하드코딩 재등장 없음
`StoreFacingFooter`는 법정정보를 **`PublicLegalFooterInfo`(동적, `service_legal_profiles`)** 로만 렌더. 회사명/사업자번호 등 하드코딩 0. 미설정 시 법정 block 비표시(placeholder 0). loader는 기존 서비스별 `loadFooterLegal`(공통 factory) 재사용.

## 13. TypeScript 검증
| 서비스 | tsc --noEmit | error TS |
|--------|:---:|:---:|
| glycopharm-web | ✅ exit 0 | 0 |
| @o4o/web-k-cosmetics | ✅ exit 0 | 0 |
| @o4o/web-kpa-society | ✅ exit 0 | 0 |
| @o4o/web-neture | ✅ exit 0 | 0 |
> 4서비스 모두 store-ui-core·shared-space-ui 소스를 직접 컴파일(main=src/index.ts). Neture clean = shared-space-ui 추가 export non-breaking.

## 14. 브라우저 smoke
⏭️ **보류** — Playwright 병렬 세션 점유. layout-level 주입 + 4서비스 tsc 0 + 소비처 정적 검증으로 갈음. 배포 후 가용 시 확인 권장:
- GP `/store-hub`·`/store` 하단 footer(약관/개인정보/문의 + copyright), 레이아웃/모바일 drawer 정상
- KCos `/store-hub`·`/store` 동일
- KPA `/store`(내 약국) footer 노출 + **`/store-hub` 기존 상속 footer 회귀 없음**, `/policy` 링크 정상

## 15. 배포
⏳ **push 대기** — main 직접 commit 완료(코드 `189fbc5ed`). 공통 package(store-ui-core/shared-space-ui) 변경 → push 시 GP/KCos/KPA 재배포 필요. **prod 3서비스 배포는 outward-facing이라 사용자 확인 후 push.** Neture는 코드 무변경이나 shared-space-ui 변경으로 build 영향 가능 → 재배포 시 tsc만 확인(UI 수정 없음).
> 주의: detect-changes가 push tip 기준 skip 가능 — 공통 package 변경 시 GP/KCos/KPA 실제 재배포 여부 확인, 필요 시 workflow_dispatch 명시 재배포.

## 16. Commit
- 코드(8파일): `189fbc5ed`.
- 본 CHECK: 별도 path-specific commit.

## 17. 후속
1. `WO-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1` — KPA `/store/:slug` bare storefront + GP custom inline footer→공통 정렬 + 404.
2. `WO-O4O-FOOTER-LAYOUT-STICKY-BASELINE-V1` — 브라우저 시각 확인 후 sticky 정리.
3. (선택) `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1`.
4. (결정) Neture supplier/partner account dashboard footer 포함 여부.

---

*End of CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1*
