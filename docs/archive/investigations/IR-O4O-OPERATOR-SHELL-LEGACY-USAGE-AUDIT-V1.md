# IR-O4O-OPERATOR-SHELL-LEGACY-USAGE-AUDIT-V1

**작성 일자**: 2026-05-31
**조사 환경**: HEAD (main) `adf6310f5` 시점 정적 코드 (read-only)
**조사 도구**: Grep / Read / Glob
**작업 성격**: read-only 조사 — 코드/source 수정 없음
**선행 완료**: Operator UX 공통화 트랙 (DomainIASidebar / OperatorAreaShell / DomainIASidebar IA 파라미터화 / KPA·Glyco·KCos·**Neture operator** 이행 전부 완료)

---

## 0. 핵심 결론 (TL;DR)

> ⚠️ **판정: B — 일부 이행 후 삭제 가능 (단, 저우선 / OPTIONAL)**
>
> 1. **`OperatorShell` 컴포넌트의 런타임 소비자는 단 1곳** — `services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx` (Neture **admin** 영역). 나머지 모든 매치는 **stale 주석** (glyco/kcos DashboardLayout 의 "uses shared OperatorShell" 주석은 실제 import 없음).
> 2. **operator-shell 모듈 자체는 삭제 불가** — `STANDARD_GROUPS`(DomainIASidebar/operatorDomainIA/KPA·Neture menu 4 소비자), `OperatorGroupKey`/`OperatorMenuItem` 타입(7 파일), 액션 컴포넌트(OperatorConfirmModal/OperatorStatusBadge/useOperatorAction — 4 operator 페이지)가 **여전히 광범위 사용**. → 모듈은 **유지**, `OperatorShell.tsx` **컴포넌트만** 삭제 후보.
> 3. **AdminLayoutWrapper 는 Neture 전용** — KPA/GlycoPharm/K-Cosmetics 에는 OperatorShell 기반 AdminLayoutWrapper 없음.
> 4. **삭제 경로**: Neture AdminLayoutWrapper 를 OperatorAreaShell + DomainIASidebar(NETURE_OPERATOR_DOMAIN_IA, menuItems=getAdminMenu()) 로 이행 → OperatorShell.tsx 소비자 0 → 컴포넌트 + OperatorShellProps 삭제 가능.
> 5. **이행은 admin sidebar flat→domain 헤딩 UX 변화 + footer 제거 = admin 전용 smoke 필요** → operator 이행과 동일 성격의 실변경.
> 6. **OperatorShell 의 header/user/onLogout/dashboardLink 는 admin 사용에서도 dead** (renderHeader=null). 실효 기능 = flat sidebar + container + footer.
>
> → **즉시 삭제 불가** (1 소비자 잔존). 정리하려면 **Neture admin 이행 WO** 1건 → 그 후 컴포넌트 삭제. 우선순위 낮음 (OperatorShell 무해, 빌드 정상).

---

## 1. 조사한 파일 목록

| # | 파일 | 용도 |
|---|------|------|
| 1 | [packages/ui/.../operator-shell/OperatorShell.tsx](../../packages/ui/src/operator-shell/OperatorShell.tsx) | OperatorShell 컴포넌트 정의 |
| 2 | [packages/ui/.../operator-shell/index.ts](../../packages/ui/src/operator-shell/index.ts) | 모듈 export 목록 |
| 3 | [packages/ui/.../operator-shell/types.ts](../../packages/ui/src/operator-shell/types.ts) | OperatorShellProps / OperatorGroupKey / OperatorMenuItem |
| 4 | [packages/ui/.../operator-shell/constants.ts](../../packages/ui/src/operator-shell/constants.ts) | STANDARD_GROUPS |
| 5 | [services/web-neture/.../layouts/AdminLayoutWrapper.tsx](../../services/web-neture/src/components/layouts/AdminLayoutWrapper.tsx) | **유일한 OperatorShell 런타임 소비자** |
| 6 | (전수 grep) services/ + packages/ 의 OperatorShell / STANDARD_GROUPS / OperatorGroupKey / action 컴포넌트 참조 | 사용처 확정 |

---

## 2. OperatorShell 정의와 책임

[OperatorShell.tsx](../../packages/ui/src/operator-shell/OperatorShell.tsx) — props 와 실제 기여:

| 책임 | 구현 | Neture admin 사용 시 |
|------|------|---------------------|
| Sidebar 렌더 | STANDARD_GROUPS **flat** 11-group + capability gate + collapsible | ✅ (flat admin sidebar) |
| Header 렌더 | 내장 header (serviceName/user/logout) 또는 `renderHeader` override | ❌ `renderHeader={() => null}` 로 억제 (NetureGlobalHeader 별도) |
| Footer 렌더 | default footer (`© 2026 {serviceName}` + 메인으로) 또는 `footer` prop | ✅ default footer 렌더 |
| container layout | `max-w-[1400px] flex gap-6` + `main flex-1 min-w-0` | ✅ |
| responsive/mobile | flat 수평 탭 (헤딩 없음) | ✅ |
| `user`/`onLogout` | 내장 header 용 | ❌ header null → **dead** |
| `dashboardLink` | 내장 header 로고 링크 | ❌ header null → **dead** |
| `serviceName` | header + footer | footer 에서만 사용 |
| isAdmin | **prop 없음** (menuItems 사전 필터) | — |

→ Neture admin 사용에서 OperatorShell 의 실효 기여 = **flat sidebar + container + footer** 3가지. header/user/onLogout/dashboardLink 는 전부 dead.

---

## 3. OperatorShell 사용처 전체 목록

전수 grep 결과 — **실제 import/JSX 사용 vs 주석** 구분:

| 파일 | 형태 | 실사용? |
|------|------|:------:|
| **services/web-neture/.../AdminLayoutWrapper.tsx:18,33** | `import { OperatorShell }` + `<OperatorShell>` | ✅ **YES (유일)** |
| services/web-glycopharm/.../OperatorLayoutWrapper.tsx:8 | 주석 ("OperatorShell 우회") | ❌ |
| services/web-glycopharm/.../DashboardLayout.tsx:92 | 주석 ("uses shared OperatorShell") — **stale, import 없음** | ❌ |
| services/web-k-cosmetics/.../OperatorLayoutWrapper.tsx:6,8 | 주석 | ❌ |
| services/web-k-cosmetics/.../DashboardLayout.tsx:203 | 주석 ("uses shared OperatorShell") — **stale, import 없음** | ❌ |
| services/web-kpa-society/.../KpaOperatorLayoutWrapper.tsx:8 | 주석 | ❌ |
| services/web-kpa-society/.../OperatorRoutes.tsx:65,72 | 주석 | ❌ |
| services/web-neture/.../operatorMenuGroups.ts:227 | 주석 (이행 전 stale) | ❌ |
| services/web-neture/.../OperatorLayoutWrapper.tsx:5,7 | 주석 (이행 기록) | ❌ |
| packages/operator-ux-core/.../DomainIASidebar.tsx:103 | 주석 ("OperatorShell 와 동일") | ❌ |
| packages/ui/.../operator-shell/* | **정의 파일** | (정의) |

→ **OperatorShell 컴포넌트 런타임 소비자 = 1 (Neture AdminLayoutWrapper)**. glyco/kcos DashboardLayout 의 주석은 stale (실제 미사용).

---

## 4. 사용처별 서비스/영역/route 연결 여부

| 소비자 | 서비스 | 영역 | route 연결 | 운영 화면 사용 |
|--------|--------|------|-----------|:------:|
| AdminLayoutWrapper | Neture | **admin** | `/admin/*` (AdminRoute 하위) | ✅ (Neture admin 계정 진입 시) |

- menuItems = `getAdminMenu()` (admin 전용 slim 메뉴 — admin 항목 + "운영자 업무 →" /operator 게이트).
- header = NetureGlobalHeader (별도), OperatorShell 내장 header 억제.
- footer = default (© 2026 Neture).
- 다른 서비스 admin: KPA/Glyco/KCos 는 OperatorShell 기반 AdminLayoutWrapper **없음** (find 결과 Neture 단독).

---

## 5. 사용처별 유지/이행/삭제 가능성 판정

| 대상 | 판정 | 근거 |
|------|------|------|
| **Neture AdminLayoutWrapper** | **이행 가능** | OperatorAreaShell + DomainIASidebar(domainIAConfig) 로 이행 가능. menuItems=getAdminMenu(), header=NetureGlobalHeader slot, capabilities=ENABLED_CAPABILITIES. domain IA 는 NETURE_OPERATOR_DOMAIN_IA 재사용 가능(admin 메뉴 group key 가 동일 — dashboard/users/approvals/products/orders/content/analytics/system → 동일 4-domain 매핑). 단 flat→domain UX 변화 + footer 제거 = admin smoke 필요 |
| **OperatorShell.tsx 컴포넌트** | **이행 후 삭제 가능** | 소비자 1 → AdminLayoutWrapper 이행 시 0 → 삭제 가능 (OperatorShellProps 동반) |
| **operator-shell 모듈 (STANDARD_GROUPS/types/actions)** | **유지 필수** | DomainIASidebar 등 공통 컴포넌트 + 4 operator 페이지가 사용 (§7) |
| glyco/kcos DashboardLayout 주석 | **주석 정리(선택)** | stale 주석 — dead code 아님(이미 미사용), 문서 위생 차원 |

---

## 6. admin 영역과 operator 영역 구분

| 구분 | operator (이행 완료) | admin (잔존) |
|------|---------------------|-------------|
| wrapper | OperatorLayoutWrapper (4 서비스) | AdminLayoutWrapper (Neture 전용) |
| shell | **OperatorAreaShell + DomainIASidebar** | **OperatorShell (legacy)** |
| menu | UNIFIED_MENU + filterMenuByRole(_, false) | getAdminMenu() |
| sidebar | domain 헤딩 (서비스별 IA) | flat STANDARD_GROUPS |
| footer | 없음 | 있음 (default) |
| route | /operator/* | /admin/* |

→ **operator 는 공통화 완료, admin(Neture)만 legacy OperatorShell 잔존**. OperatorShell 은 사실상 "Neture admin 전용 legacy shell" 로 축소됨.

---

## 7. footer / header / user / onLogout / isAdmin 의존성 분석

| 기능 | OperatorShell 보유 | 실제 의존 (Neture admin) |
|------|:-----------------:|------------------------|
| sidebar (flat) | ✅ | ✅ 사용 |
| container layout | ✅ | ✅ 사용 |
| footer (default) | ✅ | ✅ 렌더 중 (이행 시 제거 결정 필요) |
| header (내장) | ✅ | ❌ renderHeader=null (NetureGlobalHeader 별도) |
| user | ✅ prop | ❌ dead (header null) |
| onLogout | ✅ prop | ❌ dead (NetureGlobalHeader 가 logout 처리) |
| dashboardLink | ✅ prop | ❌ dead (header null) |
| isAdmin | ❌ (prop 없음) | — (menuItems 사전 필터) |

**operator-shell 모듈 잔존 필수 export** (OperatorShell 컴포넌트와 별개):

| export | 소비자 |
|--------|--------|
| `STANDARD_GROUPS` | DomainIASidebar / operatorDomainIA / KPA·Neture operatorMenuGroups (4) |
| `OperatorGroupKey` / `OperatorMenuItem` | 7 파일 (모든 서비스 operatorMenuGroups + operator-ux-core) |
| `OperatorConfirmModal` / `OperatorStatusBadge` / `useOperatorAction` | glyco/kpa×2/neture operator 페이지 (4) |
| `StandardGroup` | constants 소비 |

→ **모듈은 유지, OperatorShell.tsx + OperatorShellProps 만 삭제 후보**.

---

## 8. 삭제 또는 이행 시 위험 요소

| 위험 | 수준 | 분석 |
|------|:----:|------|
| OperatorShell.tsx 즉시 삭제 | **차단** | 소비자 1 잔존 (Neture admin) — 즉시 삭제 시 build 실패 |
| Neture admin sidebar flat→domain UX 변화 | 중간 | 의도적 변화 (operator 이행과 동일). admin 전용 smoke 필요 |
| admin footer 제거 | 낮음 | © 2026 Neture footer 사라짐 — operator 와 정합. smoke 확인 |
| getAdminMenu() ↔ domain IA 매핑 | 낮음 | admin group key 가 NETURE_GROUP_TO_DOMAIN 에 전부 존재 → 매핑 OK. "운영자 업무 →"(system) → 운영 공통 |
| operator-shell 모듈 삭제 | **금지** | STANDARD_GROUPS/types/actions 광범위 사용 — 모듈은 유지 |
| build 영향 (모듈 유지 시) | 없음 | 컴포넌트만 제거, 나머지 export 유지 |
| route 영향 | 없음 | /admin/* route 불변 (wrapper 내부 shell 만 교체) |
| mobile/responsive | 낮음 | DomainIASidebar 도 mobile 탭 보유 (동등) |

---

## 9. 후속 WO 후보

| 순서 | WO (가칭) | 범위 | 우선 |
|:---:|-----------|------|:----:|
| 1 | **WO-O4O-NETURE-ADMIN-LAYOUT-OPERATORAREASHELL-MIGRATION-V1** | Neture AdminLayoutWrapper: OperatorShell → OperatorAreaShell + DomainIASidebar(NETURE_OPERATOR_DOMAIN_IA, menuItems=getAdminMenu()). footer 제거. + Neture **admin** 전용 smoke | 낮음 |
| 2 | **WO-O4O-UI-OPERATOR-SHELL-COMPONENT-REMOVAL-V1** | 1 완료 후 OperatorShell.tsx + OperatorShellProps 삭제. STANDARD_GROUPS/types/action 컴포넌트는 operator-shell 모듈에 유지. index.ts export 정리 | 낮음 (1 의존) |
| 3 (선택) | 주석 정리 | glyco/kcos DashboardLayout 의 stale "uses shared OperatorShell" 주석 + Neture operatorMenuGroups:227 stale 주석 제거 | 매우 낮음 |
| (대안) | **유지 결정** | OperatorShell 을 "Neture admin 전용 legacy shell" 로 명시적 유지. 무해(1 소비자, 빌드 정상). 이행 비용 대비 이득 낮으면 현행 유지 | — |

> 1+2 를 한 사이클로 묶을 수 있으나, 1 은 admin UX 변화 + smoke 동반 실변경이므로 별도 WO 권장.

---

## 10. 최종 판정

### ⚠️ **B — 일부 이행 후 삭제 가능 (저우선 / OPTIONAL)**

| 기준 | 결과 |
|------|------|
| 즉시 삭제 | ❌ (소비자 1 잔존) |
| 모듈 삭제 | ❌ (STANDARD_GROUPS/types/actions 광범위 사용) |
| 컴포넌트 삭제 | ✅ **Neture admin 이행 후 가능** |
| 이행 난이도 | 낮음 (operator 이행과 동일 패턴, NETURE IA 재사용) |
| 이행 비용 | admin 전용 smoke 1건 |
| 긴급도 | 낮음 (OperatorShell 무해, 빌드 정상, 1 소비자) |

→ **OperatorShell 은 이제 "Neture admin 전용 legacy shell"**. 완전 제거하려면 (1) Neture admin 이행 WO → (2) 컴포넌트 삭제 WO 2단계. 단, **즉시 진행 불필요** — operator 공통화 트랙의 핵심 목표(4 서비스 operator 정렬)는 이미 달성. admin 정리는 후속 OPTIONAL.

---

## 11. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 판정 |
|------|------|
| O4O 공통 구조 §13 (메커니즘 공통화) | ⚠️ 부분 — operator 는 공통 메커니즘 합류 완료, **admin(Neture)만 legacy 잔존**. 완전 정합은 admin 이행 후. 단 admin 은 Neture 전용·내부 영역이라 drift 영향 제한적 |
| Operator OS Freeze (F1) | OperatorShell 은 @o4o/ui(operator-shell) 소속 — 컴포넌트 삭제 시 Freeze 영역 변경이나 **소비자 0 확인 후 dead component 제거**이므로 안전. 모듈 유지로 다른 export 무영향 |
| Twin Axis | ✅ admin 이행 시에도 NETURE_OPERATOR_DOMAIN_IA(Supplier/B2B 축) 재사용 → KPA 축 오염 없음 |
| 1인 개발 속도 | ✅ 즉시 작업 불필요. OperatorShell 무해 잔존 — 우선순위 낮은 후속으로 분리 |
| Drift 방지 | ⚠️ stale 주석(glyco/kcos DashboardLayout) 이 "OperatorShell 사용" 오해 유발 가능 — 주석 정리(선택)로 해소 |

**결론**: 철학상 admin 까지 공통 메커니즘으로 합류하는 것이 이상적이나, admin 은 Neture 전용·내부 영역이고 OperatorShell 이 무해하게 동작하므로 **긴급 정리 불필요**. 완전 정합을 원하면 admin 이행 WO → 컴포넌트 삭제 2단계. 현 시점 **유지도 정당** (1 소비자, 빌드 정상, drift 영향 제한적).

---

## 12. Working tree 격리 / commit 정책

- 조사 시작 시점 working tree clean (HEAD `adf6310f5`, 다른 세션 WIP 0).
- 본 IR 문서 1개만 생성. **read-only — 코드/OperatorShell/wrapper/공통 컴포넌트 미변경.**
- commit 시 본 IR 문서 1개만 path-restricted. `git add .` / `-am` 금지.

---

> **상태**: read-only 조사 완료. 판정 = **B (일부 이행 후 삭제 가능, 저우선)**. OperatorShell 컴포넌트는 **Neture AdminLayoutWrapper 단일 소비자**로 축소 — admin 이행 WO 후 삭제 가능. operator-shell **모듈**(STANDARD_GROUPS/types/actions)은 유지 필수. 즉시 작업 불필요, OperatorShell 무해 잔존. 완전 정합 원하면 후속 2단계(admin 이행 → 컴포넌트 삭제).
