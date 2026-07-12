# CHECK-O4O-STORE-MOBILE-SIDEBAR-DRAWER-CROSSSERVICE-STANDARDIZE-V1

> 목적: `/store` 업무형 화면의 `<1024px` 모바일 drawer 진입점(햄버거) 부재를 **공용 `StoreDashboardLayout` 1곳** 수정으로 해결.
> WO: `WO-O4O-STORE-MOBILE-SIDEBAR-DRAWER-CROSSSERVICE-STANDARDIZE-V1`
> 선행 조사: `IR-O4O-STORE-RESPONSIVE-SIDEBAR-DRAWER-CROSSSERVICE-AUDIT-V1` (커밋 `ca3697c3a`)
> 기준 표준: `docs/baseline/O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-V1.md`

---

## 1. 원인 (IR 확정)

공용 `StoreDashboardLayout` 는 drawer(state·overlay·slide-in·close)를 완비했으나, drawer 를 여는 **유일한 트리거(`onMenuToggle` 햄버거)가 `StoreTopBar` 안에만** 존재. store 3서비스(KPA/GlycoPharm/K-Cosmetics)가 모두 `hideTopBar`(외부 GlobalHeader 사용) → `StoreTopBar` 미렌더 → `<1024px` 에서 업무 사이드바 진입점 소멸. 특히 768~1023 구간은 사이트 햄버거(`md:hidden`)마저 없어 접근 수단 0.

---

## 2. 변경 (1파일, additive)

**`packages/store-ui-core/src/layout/StoreDashboardLayout.tsx`** (commit `a8cbeccad`)

- `hideTopBar=true` 일 때 콘텐츠 상단에 **`lg:hidden` "업무 메뉴" 버튼** 자체 렌더 → `setSidebarOpen(true)`. `!hideTopBar` 는 기존 `StoreTopBar` 햄버거가 담당하므로 미표시(동작 불변).
- drawer open 시 **ESC close** + **body scroll lock**(open 상태에서만 `keydown` 리스너·`overflow:hidden` 등록/해제).
- 접근성: 버튼 `aria-label="매장 업무 메뉴 열기"` / `aria-expanded` / `aria-controls="store-work-drawer"`, drawer `<aside id="store-work-drawer">`.
- 기존 overlay click / 메뉴선택 / X close 는 그대로 사용(state 재사용).

무변경: route / 권한 / menu visibility / 메뉴명·순서 / API / DB / 데스크톱 sticky sidebar / 외부 GlobalHeader.

---

## 3. 보존·영향

| 항목 | 상태 |
|---|---|
| 데스크톱(≥1024) sticky sidebar | ✅ 무변경 (버튼 `lg:hidden`) |
| 메뉴명/순서/권한/route/API/DB | 무변경 |
| `!hideTopBar` 소비처(StoreTopBar 사용) | ✅ 버튼 미표시 — 동작 불변 |
| Neture | 비소비처 — 기능 영향 없음(공용 패키지 build 만 확인) |
| z-index | 외부 GlobalHeader `z-50 h-16`, drawer `z-40 top-16` → 충돌 없음 |

---

## 4. 정적 검증

| 항목 | 결과 |
|---|---|
| web-kpa-society `tsc --noEmit` | ✅ exit 0 |
| web-k-cosmetics `tsc --noEmit` | ✅ exit 0 |
| web-glycopharm `tsc -b` | ✅ exit 0 |
| web-kpa-society `vite build` | ✅ exit 0 (13.1s) |

---

## 5. 배포

| 항목 | 값 |
|---|---|
| commit | `a8cbeccad` (push 완료) |
| workflow | Deploy Web Services (Cloud Run) |
| run ID | `29184181616` |
| jobs | detect-changes / deploy-kpa-society / deploy-k-cosmetics / deploy-glycopharm / deploy-neture — **전부 success** |
| kpa live revision | `kpa-society-web-01599-f5b` |

> `@o4o/store-ui-core`(공용) 변경 → 4개 web 서비스 전부 재빌드·배포 success (cross-service backward-compat 확인).

---

## 6. 운영 브라우저 smoke (prod, 2026-07-12)

계정 `sohae2100@gmail.com`. Playwright DOM 실측.

### 6-A. KPA `kpa-society.co.kr/store`
| viewport | 업무 메뉴 버튼 | drawer | 비고 |
|---|---|---|---|
| 390 | ✅ 표시(aria-expanded=false) | 클릭 시 `translateX(0)` open, 전체 메뉴(홈/약국 상품·거래/약국 경영지원/약국 자료함/디지털 사이니지/온라인 판매/판매 채널 확장/분석/설정/로그아웃) | overlay 표시, body `overflow:hidden`, 가로 스크롤 0 |
| 768 | ✅ 표시 | (former dead-zone 해소) | 가로 스크롤 0 |
| 1024 | ❌ 숨김(`lg:hidden`) | sticky sidebar `translateX(0)` 표시 | 데스크톱 무변경, 가로 스크롤 0 |

**close 동작 (390, 전부 PASS)**: ESC → 닫힘+scroll 복원 / overlay 클릭 → 닫힘+복원 / 메뉴선택(홈) → 닫힘+복원. 각 케이스 `aria-expanded=false`·drawer `x=-256` 확인.

### 6-B. K-Cosmetics `k-cosmetics.site/store`
| viewport | 업무 메뉴 버튼 | drawer | 메뉴 |
|---|---|---|---|
| 1023 | ✅ 표시("업무 메뉴") | 클릭 시 open(`translate-x-0`, aria-expanded=true) → ESC close(x=-256, 복원) | 홈/매장 상품·거래/매장 활성화/내 자료함/디지털 사이니지/채널/판매 채널 확장/분석/설정/로그아웃 (서비스별 라벨 보존) |

### 6-C. GlycoPharm
코드 동일(공용 `StoreDashboardLayout`, `GlycoGlobalHeader` 형제 + `hideTopBar`) + deploy-glycopharm success → 동일 판정. (GP live 도메인 SiteGuide 서빙 이슈로 별도 URL 확인 필요.)

---

## 7. 표준 정합

- breakpoint lg(1024) ✅ / <1024 hamburger+drawer ✅ / overlay·메뉴선택·ESC close ✅ / body scroll lock ✅ / aria-label·expanded·controls ✅ / active 메뉴·토큰 무변경 ✅.
- 후속: 표준 문서 matrix #4 주석에 "hideTopBar 모드 트리거" 명문화 권장(별도).

---

## 8. 동시 작업 보호

- 작업 중 다른 세션의 무관한 변경(neture api-server, `TabletScreenSetManager.tsx` 등) 존재 → **미접촉**. stash/reset/revert/`git add .` 미사용. 본 커밋 `a8cbeccad` 는 `StoreDashboardLayout.tsx` 1파일만 포함.

---

## 9. 결론

공용 `StoreDashboardLayout` 1곳 수정으로 KPA/GP/KCos 3서비스 `<1024px` store 업무 사이드바 진입점 복구. KPA·K-Cosmetics live PASS, GlycoPharm 코드·배포 동일 판정. 데스크톱·권한·route·메뉴 무변경.

*작성: 2026-07-12 · Status: 완료*
