# CHECK-O4O-GP-KCOS-ADMIN-DASHBOARD-LAYOUT-RESPONSIVE-CLEANUP-V1

> **WO**: `WO-O4O-GP-KCOS-ADMIN-DASHBOARD-LAYOUT-RESPONSIVE-CLEANUP-V1`
> **선행**: `IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1` · P0 drawer fix · operator/admin 공통 lg 표준화
> **목적**: GP/KCos admin `DashboardLayout` 의 `fixed` 사이드바 + `lg:ml-64` 고정 본문 margin 의존을 제거하고 **flex sibling** 구조로 정리 → 본문 겹침·가로스크롤 위험 제거.
> **작성일**: 2026-06-17
> **상태**: 코드 완료 · GP/KCos build PASS · browser smoke 배포 후 필수(구조 변경)

---

## 1. 결론 요약

- GP/KCos admin `DashboardLayout` 2개만 변경. 사이드바를 **mobile=fixed drawer / desktop(>=lg)=in-flow sticky** 로, 본문을 **`flex-1 min-w-0`** 로 전환.
- 제거: `lg:ml-64`(본문 고정 margin) · `pt-16`(고정 본문 top padding) → flex 흐름이 대체.
- breakpoint 는 **이미 lg** 였음(`lg:translate-x-0`/`lg:hidden`/`lg:ml-64`) → 본 WO 는 breakpoint 변경이 아니라 **margin 의존 제거**가 핵심.
- frontend-only. route/active/권한/menu visibility/메뉴명/backend/DB/package 변경 없음. 공통 DomainIASidebar·store·store-hub·supplier·KPA AdminSidebar **미변경**.

---

## 2. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx` | flex sibling 구조 + margin/pt 제거 |
| `services/web-k-cosmetics/src/components/layouts/DashboardLayout.tsx` | 동일 |

---

## 3. 제거/대체한 고정 margin 목록

| before | after | 효과 |
|--------|-------|------|
| 본문 `<div className="lg:ml-64 pt-16">` | `<div className="flex-1 min-w-0">` | 고정 좌측 margin·top padding 제거 → 사이드바 폭과 무관하게 본문 자동 영역 |
| aside `fixed ... lg:translate-x-0` | aside `fixed ... lg:sticky lg:top-16 lg:z-auto lg:shrink-0 lg:translate-x-0` | desktop 에서 out-of-flow `fixed` → **in-flow sticky flex item** (margin 불필요) |
| (신규) sidebar+content 래핑 | `<div className="flex flex-1 min-h-0">` | sidebar/content **sibling flex row** → 겹침 없이 영역 분할 |

### 동작
- **<1024px(lg)**: aside `fixed`(off-canvas, `-translate-x-full`) → 햄버거로 `translate-x-0` drawer, overlay(`lg:hidden`), 본문 full-width(아래로 밀리거나 가려지지 않음).
- **>=1024px**: aside `lg:sticky lg:top-16`(GlobalHeader 64px 아래 고정) in-flow `w-64 lg:shrink-0`, 본문 `flex-1 min-w-0`. **margin 없이 flex 로 영역 분할 → 겹침 0**.
- GlobalHeader = `sticky top-0 z-50`(in-flow 64px). 본문이 자연 흐름으로 그 아래 시작 → `pt-16` 불필요(제거). 검증된 operator(`OperatorAreaShell`) 패턴과 동형.

---

## 4. GP/KCos 차이점 / 동일성

- **거의 동일 복제본**: 두 `DashboardLayout` 구조 동일(roleConfig admin menuGroups + fixed aside + lg:ml-64 본문). 본 WO 변경 지점·패턴 100% 동일.
- 차이: color 토큰(GP `bg-${config.color}-*` / KCos `colors.light/text`), 서비스명 라벨, GP 는 본문 상단에 **검색 포함 sub-header**(`sticky top-16 z-30`, 모바일 햄버거 내장) / KCos 는 **lg:hidden 햄버거 바**(`sticky top-16`)만.
- **공통 컴포넌트 추출은 하지 않음**(WO 원칙) — import/theme/label/auth 결합 위험 → 후속 IR/WO 로 분리. 이번엔 동일 패턴으로 각각 안전 정리.

---

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| `glycopharm-web` build | ✅ ✓ built 16.5s (exit 0) |
| `@o4o/web-k-cosmetics` build | ✅ ✓ built 13.7s (exit 0) |
| route/active/권한/menu visibility | ✅ 무변경(구조/클래스만) |
| 공통 DomainIASidebar / store / store-hub / supplier / KPA AdminSidebar | ✅ 미변경 |
| backend/DB/package/lock | ✅ 변경 0 |

### ⚠️ browser smoke (배포 후 — 구조 변경이라 필수)
```
viewport 375 / 768 / 1023 / 1024 / wide, GP admin + KCos admin (대시보드 + 하위메뉴 1~2):
- <1024: 사이드바 기본 숨김, 햄버거 → drawer open, 본문이 margin 으로 밀리지 않음
- drawer close: overlay click / 사이드바 내 X / (메뉴선택 시 라우팅) 정상
- >=1024: 사이드바 고정(sticky top-16) 표시, 본문이 사이드바와 겹치지 않음, 좌측 빈 margin/이중 여백 없음
- 1023↔1024 경계 전환 정상, horizontal scroll 0, console error 0, route broken 0
- GP 검색 sub-header / KCos 햄버거 바 정상 위치(헤더 겹침 없음)
```
> 구조(fixed→flex sticky) 변경이라 시각 검증 전까지 desktop 정렬·sticky 동작은 코드 추론 기준. (operator 동형 패턴이라 신뢰도 높음)

---

## 6. Known Limitation / 후속

```
- browser visual smoke 미수행(배포 후 필수) — 특히 >=1024 sticky 사이드바 full-height·겹침, GP sub-header 위치.
- admin DashboardLayout 에는 ESC close 미추가(기존 패턴: overlay+X+메뉴선택만). 표준 ESC 정합은 후속(공통화 시 일괄) — 본 WO 는 margin 제거에 집중.
- GP/KCos DashboardLayout 공통 컴포넌트 추출은 별도 IR/WO (theme/label/auth 결합 위험).
- 남은 사이드바: #3 KPA admin AdminSidebar(md), #4 store StoreSidebar(토큰) 후속.
```

---

## 7. commit

```
WO-O4O-GP-KCOS-ADMIN-DASHBOARD-LAYOUT-RESPONSIVE-CLEANUP-V1 커밋 (이 CHECK 포함). hash 는 git log 참조.
```

---

*frontend-only. GP/KCos admin DashboardLayout: fixed+lg:ml-64 → flex sibling(mobile drawer / desktop sticky in-flow + flex-1 min-w-0). margin 의존 제거. build PASS. browser smoke 배포 후 필수.*
