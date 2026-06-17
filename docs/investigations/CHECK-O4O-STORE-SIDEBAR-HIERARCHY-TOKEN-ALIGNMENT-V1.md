# CHECK-O4O-STORE-SIDEBAR-HIERARCHY-TOKEN-ALIGNMENT-V1

> **WO**: `WO-O4O-STORE-SIDEBAR-HIERARCHY-TOKEN-ALIGNMENT-V1`
> **선행**: IR responsive sidebar audit + #1 DomainIASidebar lg/토큰 + #2 GP/KCos admin flex + #3 KPA admin lg + #5/#6 P0 + 누적 smoke PASS
> **목적**: 내 매장 `StoreSidebar`(store-ui-core 공통) 메뉴 계층 **시각 토큰만** O4O 표준에 정렬. breakpoint/drawer/구조 무변경.
> **작성일**: 2026-06-17
> **상태**: 코드 완료 · GP/KCos build PASS · KPA build 외부 WIP 차단(내 변경 무관) · browser smoke 배포 후
> **분류**: frontend-only, 공통 컴포넌트(store-ui-core), 3서비스 store 소비

---

## 1. 결론 요약

- StoreSidebar 는 이미 표준에 근접(section label=group `font-semibold`+chevron ✓, item `text-sm font-medium` ✓, active primary+bg ✓). **명백한 outlier = active 배경 shade**.
- 최소·방어 가능한 토큰 3건만 정렬: **active bg `-100`→`-50`**(정렬된 사이드바 공통 active shade) + **active `font-semibold`**(강조, spec 정합) + **group 헤더 height** `py-2`→`py-2.5`.
- breakpoint/drawer/layout/route/권한/menu visibility/메뉴명 **무변경**. brand color(teal) 유지.
- 사이드바 6종 표준화 **1차 사이클 마지막 축(#4)**.

---

## 2. StoreSidebar 소비처

| 서비스 | 사용 |
|--------|------|
| GlycoPharm | `web-glycopharm/src/App.tsx` (StoreDashboardLayout), `pages/store/StoreOverviewPage.tsx` |
| K-Cosmetics | `web-k-cosmetics/src/App.tsx` |
| KPA-Society | `web-kpa-society/src/App.tsx`, `pages/pharmacy/StoreSignagePage.tsx` |

> `StoreSidebar`/`StoreDashboardLayout` = `packages/store-ui-core` 공통(소스 소비, build 스크립트 없음). breakpoint/drawer 는 **StoreDashboardLayout**(이미 lg 기준) 소관 → 본 WO 미접촉.

---

## 3. 변경 파일 목록

| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/src/components/StoreSidebar.tsx` | 메뉴 계층 토큰 3건 |

---

## 4. 적용한 메뉴 계층 토큰 요약

| 위치 | before | after | 근거(표준) |
|------|--------|-------|-----------|
| section item active (accordion) | `bg-teal-100 text-teal-700` | **`bg-teal-50 text-teal-700 font-semibold`** | active light bg `-50`(DomainIASidebar `bg-blue-50` / GP store-hub `bg-teal-50` / KPA admin `bg-indigo-50`) + active 강조 |
| flat item active | `bg-teal-100 text-teal-700` | **`bg-teal-50 text-teal-700 font-semibold`** | 동일 |
| section(group) 헤더 | `px-3 py-2 … font-semibold` | `px-3 **py-2.5** … font-semibold` | group height 42~44 정합(font-semibold 600 은 이미 부합) |

### 이미 표준 부합(무변경)
```
- section item / flat item: text-sm(14) font-medium(500)        → top-level 토큰 ✓
- section label: text-sm font-semibold(600) + chevron right     → group 토큰 ✓
- item active 색상: text-teal-700 (primary)                     → ✓
- height: item py-2.5(~44)/py-3(~48), label py-2.5              → 42~44 권장 부합
```
> StoreSidebar 의 section item 은 아이콘 보유 1급 메뉴(=top-level 등가)이며, DomainIASidebar 식 "icon 없는 child"(13px/pl-14) 계층은 IA 상 부재 → child 토큰(13px/pl-14)은 적용 대상 아님(해당 계층 없음). 과도 적용 회피.

---

## 5. 검증 결과

| 항목 | 결과 |
|------|------|
| `glycopharm-web` build | ✅ ✓ built 13.1s (exit 0) |
| `@o4o/web-k-cosmetics` build | ✅ ✓ built 13.3s (exit 0) |
| `@o4o/web-kpa-society` build | ⚠️ FAIL — **내 변경 무관**: `operator-ux-core/recruitment-exposure/RecruitmentExposureConsole.tsx` TS6133(미사용 import). 해당 파일은 **다른 세션 미커밋 WIP**(git status `M`, 본 커밋 미포함) |
| breakpoint/drawer/구조 | ✅ 무변경 |
| route/active/권한/menu visibility/메뉴명 | ✅ 무변경 |
| backend/DB/package/lock | ✅ 변경 0 |

> **내 StoreSidebar 변경 clean 근거**: 동일 store-ui-core 소스를 컴파일하는 GP/KCos build PASS. KPA 실패는 무관한 operator-ux-core WIP(다른 세션) — path-specific 커밋이라 미포함, 해당 WIP 정리 시 KPA build 자동 해소.

### browser smoke (배포 후)
```
GP /store, KCos /store, KPA /store · viewport 375/768/1023/1024/wide:
- 기존 lg responsive 유지(<1024 drawer / >=1024 고정) — 본 WO 미변경
- top-level(section item)/group(section label) 시각 계층 명확
- active 메뉴: bg-teal-50 + teal-700 + 강조(semibold) 표시
- horizontal scroll 0, 본문/sidebar 겹침 0, console error 0, route broken 0
```

---

## 6. Known Limitation / 후속

```
- KPA build 는 외부 세션 WIP(recruitment-exposure 미사용 import) 정리 후 재확인 필요(내 변경 무관).
- browser smoke 배포 후 수행(코드/2앱 build 기준 통과).
- child(13px/pl-14) 토큰은 StoreSidebar IA 에 해당 계층 부재로 미적용(과적용 회피) — 의도.
- 1차 responsive sidebar 표준화 사이클 사실상 종료(#1·#2·#3·#4·#5·#6). 
  → 후속: 마일스톤 문서 'O4O Responsive Sidebar Navigation Standard V1' 고정 권장.
```

---

## 7. commit

```
WO-O4O-STORE-SIDEBAR-HIERARCHY-TOKEN-ALIGNMENT-V1 커밋 (이 CHECK 포함, path-specific — 외부 WIP 미포함). hash 는 git log 참조.
```

---

*frontend-only. StoreSidebar 토큰 3건(active bg -100→-50, active semibold, group height) 표준 정렬. breakpoint/drawer/구조/brand 무변경. GP/KCos build PASS(내 변경 clean), KPA 는 외부 WIP 차단. browser smoke 배포 후.*
