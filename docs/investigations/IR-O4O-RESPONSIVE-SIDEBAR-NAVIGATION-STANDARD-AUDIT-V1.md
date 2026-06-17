# IR-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARD-AUDIT-V1

> **유형**: Investigation Report (read-only — 코드/route/권한/backend/DB/package 변경 없음)
> **대상**: O4O 전체 업무형 화면(왼쪽 사이드바)의 **반응형 Navigation 표준** 정의를 위한 현황 조사
> **목표**: 단순 글자/들여쓰기 정리가 아니라 desktop/tablet/mobile 공통 동작하는 Responsive Sidebar Navigation 표준을 먼저 확정
> **작성일**: 2026-06-17
> **상태**: 조사 완료 — 표준안 + V1 적용 전략 제시. 후속 `WO-O4O-RESPONSIVE-SIDEBAR-NAVIGATION-STANDARDIZATION-V1`

---

## 0. 결론 요약 (TL;DR)

- O4O 사이드바는 **단일 표준이 아니라 6종 layout 컴포넌트**로 나뉘어 있고, **반응형 수준·breakpoint·본문 처리·메뉴 계층 스타일이 제각각**이다.
- **즉시 깨지는(모바일 미대응) 영역 2곳**: `store-hub`(GlycoPharm·KCos `*HubLayout`) / `supplier`(Neture `SupplierSpaceLayout`) — sticky만 있고 mobile drawer/hamburger 부재 → 모바일에서 사이드바가 본문 압박·가로스크롤 위험. **최우선 수정 대상**.
- **breakpoint 불일치**: operator·KPA admin·Neture = `md`(768) / GP·KCos admin·Store = `lg`(1024). 표준화의 핵심 결정 변수.
- **가장 견고하고 이미 공통화된 패턴**: `DomainIASidebar` + `OperatorAreaShell`(packages/operator-ux-core) — operator 4개 서비스 + Neture admin 공유. drawer+overlay+자동닫힘+domain heading 계층까지 완비. → **표준 베이스로 채택 권장**. 단 desktop 이 `fixed` 아닌 `sticky`, breakpoint 가 `md` 인 점은 표준 확정 시 조정 결정 필요.
- ⚠️ **결정 지점**: 요청하신 표준(Desktop ≥1024 = lg, Tablet 은 drawer)과 현재 공통 컴포넌트(`md`=768, Tablet 은 고정 사이드바)가 **충돌**한다. 표준 breakpoint 를 `md`로 둘지 `lg`로 올릴지 먼저 정해야 한다(§5.1).

---

## 1. Sidebar Component Inventory (현재 구현)

| # | 컴포넌트 | 위치 | 적용 영역 | 공통/독자 |
|---|----------|------|-----------|-----------|
| 1 | **DomainIASidebar** + **OperatorAreaShell** | `packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx` · `layout/OperatorAreaShell.tsx` | operator(4개 서비스 전부) + **Neture /admin** | **공통** |
| 2 | **DashboardLayout** (내부 sidebar) | `services/web-glycopharm/.../layouts/DashboardLayout.tsx` · `services/web-k-cosmetics/.../layouts/DashboardLayout.tsx` | **GP /admin · KCos /admin** | 서비스별 **복제본 2개** |
| 3 | **AdminLayout** + **AdminSidebar** | `services/web-kpa-society/src/components/admin/AdminLayout.tsx` · `admin/AdminSidebar.tsx` | **KPA /admin** | 독자 |
| 4 | **StoreDashboardLayout** + **StoreSidebar** | `packages/store-ui-core/src/components/StoreSidebar.tsx` | `/store`(GP·KCos·KPA 공유) | **공통** |
| 5 | **\*HubLayout** | `GlycoPharmHubLayout` / `KCosmeticsHubLayout` / KPA `PharmacyHubLayout` | `/store-hub` | 서비스별 독자 |
| 6 | **SupplierSpaceLayout** | `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx` | `/supplier`(Neture) | 독자 |
| - | **PlatformSectionLayout** (사이드바 아님) | `services/web-neture/src/pages/admin/platform/PlatformSectionLayout.tsx` | `/admin/platform` | local nav 탭만 |

> operator 4개 서비스(KPA/GP/KCos/Neture)는 `OperatorLayoutWrapper` 가 동일 `OperatorAreaShell`+`DomainIASidebar` 를 쓰고 header·menuItems·domainIAConfig 만 주입한다(Neture 는 4-domain 커스텀 IA).

---

## 2. Route × Component Matrix

| 영역 | route | 서비스 | layout 컴포넌트 | 사이드바 |
|------|-------|--------|-----------------|:--------:|
| operator | `/operator/*` | KPA·GP·KCos·Neture | DomainIASidebar (#1) | ✓ |
| admin | `/admin/*` | Neture | DomainIASidebar (#1, menu만 admin) | ✓ |
| admin | `/admin/*` | GP·KCos | DashboardLayout (#2) | ✓ |
| admin | `/admin/*` | KPA | AdminSidebar (#3) | ✓ |
| admin platform | `/admin/platform/*` | Neture | PlatformSectionLayout (local nav) | ✗(탭) |
| 내 매장 | `/store/*` | GP·KCos·KPA | StoreDashboardLayout (#4) | ✓ |
| 매장 허브 | `/store-hub/*` | GP·KCos | \*HubLayout (#5) | ✓ |
| 매장 허브 | `/store-hub/*` | KPA | PharmacyHubLayout (#5) | ✓ |
| 공급자 | `/supplier/*` | Neture | SupplierSpaceLayout (#6) | ✓ |

---

## 3. 현재 Responsive Behavior 분석 (tailwind 실측 근거)

| 컴포넌트 | desktop | tablet | mobile | breakpoint | hamburger/drawer/overlay | 자동닫힘 | 본문 가림 위험 | 종합 |
|----------|---------|--------|--------|:----------:|:------------------------:|:--------:|:--------------:|------|
| **#1 DomainIASidebar** | `w-60 hidden md:block` **sticky** top-20 | 고정 사이드바 | `md:hidden` drawer `w-72`(`-translate-x-full`↔`translate-x-0`)+`bg-black/40` | **md(768)** | ✓/✓/✓ | ✓(`onClick=closeMobile`) | 낮음(flex `md:flex-row`) | **Full** |
| **#2 DashboardLayout(GP/KCos)** | `fixed w-64 lg:translate-x-0` | 고정 사이드바 | drawer(`-translate-x-full`)+`bg-black/50`+`lg:hidden` 햄버거 | **lg(1024)** | ✓/✓/✓ | — (group toggle만) | **높음**(`lg:ml-64` 본문 margin) | Full(단 본문margin·lg) |
| **#3 AdminSidebar(KPA)** | `fixed w-[260px] md:translate-x-0` | 고정 사이드바 | drawer+`bg-black/40`+`md:hidden` sticky 햄버거 | **md(768)** | ✓/✓/✓ | — | 낮음(`md:ml-[260px]`) | Full |
| **#4 StoreDashboardLayout** | `lg:sticky` in-flow `w-64` | sticky→drawer | `fixed -translate-x-full`↔`translate-x-0`+backdrop `lg:hidden` | **lg(1024)** | ✓/✓/✓ | — | 낮음(flex, 고정margin 없음) | Full(단 lg) |
| **#5a \*HubLayout(GP/KCos)** | `sticky top-20 w-52` | sticky(미대응) | **drawer 없음** | 없음 | ✗/✗/✗ | — | **높음**(모바일 압박·가로스크롤) | **Broken(mobile)** |
| **#5b PharmacyHubLayout(KPA)** | `static` flex | static | `fixed top-16 -translate-x-full`+backdrop+`md:hidden` 토글 | md(768) | ✓/✓/✓ | — | 낮음 | Full |
| **#6 SupplierSpaceLayout(Neture)** | in-flow `w-60` collapsible | in-flow | **drawer/hamburger 없음**(텍스트 메뉴만) | sm/md/lg 혼재 | ✗/✗/✗ | — | **중~높음**(모바일 압박) | **Partial/Broken(mobile)** |
| **PlatformSectionLayout** | `max-w-5xl` local 탭 | 동일 | 명시 반응형 없음 | 없음 | ✗/✗/✗ | — | 중(고정 너비) | local nav only |

### 메뉴 계층 스타일 현황 (불일치)
| | top-level | group | child 들여쓰기 | domain heading |
|---|---|---|---|---|
| #1 DomainIASidebar | `text-sm`(14) `py-3` medium | `py-3` medium + chevron | `pl-11`(44) `py-2` `text-sm` | ✓ `text-[11px]` uppercase |
| #3 KPA Admin | `text-sm` `px-5 py-3` border-l-2 | border-l-2 | `pl-12`(48) `py-2` | 그룹 라벨 |
| #2 GP/KCos Admin | `px-4 py-2.5` | `py-2.5` | `ml-8`(32) | ✗ 없음 |

→ 제안하신 사양(top 14/42-44/500, group 14/42-44/**600**, child **13**/34-36/400, desktop pl 50-56, mobile pl 40-44)과 **어느 것도 정확히 일치하지 않음**. #1 이 가장 근접(단 child 가 14px·pl-44, group weight 500).

---

## 4. 문제점 (정리)

1. **모바일 미대응 2영역(최우선)**: `store-hub`(GP/KCos `*HubLayout`), `supplier`(Neture) — drawer 부재로 모바일에서 사이드바가 본문을 가리거나 가로스크롤 유발.
2. **Breakpoint 분열**: md(768) vs lg(1024) 혼재 → tablet(768~1023) 에서 화면마다 동작이 다름(어떤 곳은 고정 사이드바, 어떤 곳은 본문 margin).
3. **본문 가림 패턴**: GP/KCos admin 의 `lg:ml-64` 고정 margin 은 breakpoint 경계/모바일에서 본문 가림·잘림 위험. flex 기반(#1/#3/#4)이 안전.
4. **desktop sticky vs fixed 혼재**: #1 sticky / #2#3 fixed / #4 hybrid → 짧은 콘텐츠에서 sticky 가 따라 내려가는 시각 차이.
5. **메뉴 계층 스타일 drift**: operator·KPA admin 은 정돈(domain heading/border/pl-12), GP/KCos admin 은 미정돈(ml-8, heading 없음). KPA operator 글자/간격이 "정리 안 됨"이라는 최초 지적의 실체 = 표준 부재.
6. **복제 코드**: GP/KCos `DashboardLayout` 은 거의 동일한 복제본 2개(공통화 안 됨).
7. **platform section**: 사이드바 없이 local 탭 + 고정 `max-w-5xl` → 모바일 탭 overflow 가능(경미).

---

## 5. 권장 Responsive Sidebar Navigation 표준

### 5.1 ⚠️ 먼저 정할 결정: 표준 breakpoint (md vs lg)

| 옵션 | tablet(768~1023) 동작 | 장점 | 비용 |
|------|----------------------|------|------|
| **md(768)** = 현 공통 컴포넌트 유지 | tablet 도 **고정 사이드바** | DomainIASidebar/KPA 다수 무변경, 회귀 적음 | 요청하신 "tablet=drawer(안 B)" 와 다름 |
| **lg(1024)** = 요청 사양 | tablet 도 **drawer** | 모바일/태블릿 UX 통일(안 B) | 공통 `DomainIASidebar`(md) 를 lg 로 변경 → operator 4개+Neture admin 회귀 표면 큼 |

> 본 IR 권장: **표준 베이스 = `DomainIASidebar`/`OperatorAreaShell` 패턴**(이미 공통·drawer 완비). breakpoint 는 **요청 사양대로 lg(1024)** 로 통일하되, 공통 컴포넌트 md→lg 변경은 Shared Module Change Protocol 대상이므로 **operator/admin 전 서비스 동시 회귀 검증** 후 적용. (md 유지가 회귀는 적지만, 요청 표준과 어긋나므로 사용자 확정 필요 — §9 결정요청)

### 5.2 표준 동작 (확정안)
```
Desktop (>= 1024px)
- 왼쪽 사이드바 항상 표시, width 240~264px
- 본문은 flex 기반으로 폭 확보 (고정 ml-* margin 금지 → 본문 가림 방지)
- top-level / collapsible group / nested child 계층 전체 표시

Tablet/Mobile (< 1024px)
- 사이드바 기본 숨김
- 상단 hamburger 버튼
- 클릭 시 좌측 drawer(slide-in) + overlay(z-index 본문/header 위)
- 외부 클릭 / ESC / 메뉴 선택 시 자동 close
- active 메뉴 표시 유지, 가로 스크롤·본문 가림 0
```

### 5.3 메뉴 계층 토큰 (표준)
```
top-level : font 14px / height 42~44px(py-3) / weight 500
group     : font 14px / height 42~44px / weight 600 / chevron right-aligned
child     : font 13px / height 34~36px / weight 400
            desktop padding-left 50~56px / mobile padding-left 40~44px
domain heading: 11px uppercase tracking (operator 패턴 유지)
active: 좌측 border 또는 bg-blue-50/text-blue-600 (현 #1 패턴 표준화)
```
→ 현 `DomainIASidebar` 기준 조정 포인트: child `text-sm`→`text-[13px]`, group weight `medium`→`semibold`, desktop child pl `pl-11`→`pl-13~14`(52~56), mobile pl 유지(44).

---

## 6. V1 적용 전략

1. **표준 베이스 채택**: `DomainIASidebar`+`OperatorAreaShell` 를 canonical 패턴으로 선언(이미 operator+Neture admin 사용 중).
2. **깨진 영역부터 수리**(회귀 최소·효과 최대): `store-hub`(GP/KCos) → mobile drawer 도입(KPA `PharmacyHubLayout` 패턴 이식), `supplier`(Neture) → mobile drawer 도입.
3. **본문 margin 제거**: GP/KCos admin `DashboardLayout` 의 `lg:ml-64` → flex 레이아웃으로 교체(또는 #1 패턴 흡수). 복제본 2개 공통화 검토.
4. **breakpoint 통일**: §5.1 결정에 따라 일괄(권장 lg). 공통 컴포넌트 변경 시 전 서비스 동시 smoke.
5. **메뉴 계층 토큰 적용**: §5.3 토큰을 공통 컴포넌트에 1회 반영 → 전 서비스 자동 정렬.
6. **platform section**: 사이드바 미도입(local 탭 유지) — 단 모바일 탭 overflow 만 보정(경미, 선택).

---

## 7. 적용 우선순위

| 순위 | 대상 | 사유 |
|:---:|------|------|
| **P0** | store-hub(GP/KCos) mobile drawer | 모바일 실파손 |
| **P0** | supplier(Neture) mobile drawer | 모바일 실파손 |
| **P1** | GP/KCos admin `lg:ml-64` 본문 가림 제거 + 복제본 공통화 | 본문 가림·중복 |
| **P1** | breakpoint 통일(§5.1 결정) | tablet 일관성 |
| **P2** | 메뉴 계층 토큰 표준 적용(공통 컴포넌트) | 글자/들여쓰기 정리(최초 요청) |
| **P3** | platform section 모바일 탭 보정 | 경미 |

---

## 8. 예상 변경 파일 (후속 WO 기준 — 본 IR 에서 변경 없음)
```
packages/operator-ux-core/src/sidebar/DomainIASidebar.tsx      (계층 토큰·breakpoint)
packages/operator-ux-core/src/layout/OperatorAreaShell.tsx     (breakpoint·flex)
packages/store-ui-core/src/components/StoreSidebar.tsx         (breakpoint 통일)
services/web-glycopharm/.../GlycoPharmHubLayout(.tsx)           (mobile drawer 도입) [P0]
services/web-k-cosmetics/.../KCosmeticsHubLayout(.tsx)          (mobile drawer 도입) [P0]
services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx (mobile drawer 도입) [P0]
services/web-glycopharm/.../layouts/DashboardLayout.tsx         (ml-64 제거·flex) [P1]
services/web-k-cosmetics/.../layouts/DashboardLayout.tsx        (동) [P1]
services/web-kpa-society/.../admin/AdminSidebar.tsx             (토큰 정렬, 선택)
```

## 9. 검증 계획 (후속 WO smoke)
```
desktop+mobile 각각:
- KPA /operator , /store (또는 /store-hub)
- GlycoPharm /operator , /store , /store-hub
- K-Cosmetics /operator , /store , /store-hub
- Neture /supplier , /admin , /admin/platform
체크: console error 0 / route broken 0 / horizontal scroll 0 /
      drawer open·close(외부클릭·ESC·메뉴선택) 정상 / active 메뉴 표시 / 본문 가림 0
```

### 사용자 결정 요청
1. **표준 breakpoint = lg(1024, tablet=drawer/요청사양) vs md(768, tablet=고정/현 공통)** — §5.1.
2. 메뉴 child 폰트 13px·desktop pl 52~56 적용 범위(공통 컴포넌트 일괄 vs admin 한정).
3. P0(깨진 store-hub/supplier)만 먼저 빠른 WO 로 분리할지, 표준 전체를 한 WO 로 갈지.

---

## 10. 본 IR 준수 확인
```
✅ 문서 1개 생성 (본 파일)
✅ 코드/route/권한/menu visibility/backend/DB/package/lock 변경 없음
✅ sidebar inventory · route matrix · responsive 분석 · 문제점 · 표준안 · V1 전략 · 우선순위 · 예상 변경파일 · 검증계획 포함
```

---

*read-only investigation. 핵심: 반응형이 "되게" 만드는 것이 중심(글자/들여쓰기는 그 하위). 표준 베이스 = DomainIASidebar 패턴, P0 = store-hub·supplier 모바일 drawer. breakpoint(md/lg)·계층토큰 범위는 사용자 확정 후 WO.*
