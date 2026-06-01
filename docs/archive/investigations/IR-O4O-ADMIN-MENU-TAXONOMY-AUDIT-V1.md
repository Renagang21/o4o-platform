# IR-O4O-ADMIN-MENU-TAXONOMY-AUDIT-V1

> **Admin 좌측 메뉴 분류 조사 (taxonomy audit)**
> 작성일: 2026-05-07
> 상태: READ-ONLY 조사 완료
> 목적: `admin.neture.co.kr/admin` 좌측 메뉴의 실제 성격(workspace 소속)·사용 상태·이전/제거 후보를 식별하기 위한 기초 inventory를 만드는 것
>
> ⚠️ **이번 단계는 "분류 조사"만 수행한다. 메뉴/route 이동·삭제·리팩토링은 후속 WO에서 진행한다.**

---

## 0. 조사 방법

| 항목 | 내용 |
|------|------|
| 1차 소스 | `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx` (static fallback, 744 lines, 70개 메뉴 항목) |
| 동적 메뉴 통합 | `apps/admin-dashboard/src/hooks/useAdminMenu.ts` (Navigation API + 정적 fallback + CPT 주입 + role 필터) |
| Route 등록 검증 | `apps/admin-dashboard/src/routes/*.routes.tsx` (11개 파일) |
| Permission 매트릭스 | `apps/admin-dashboard/src/config/rolePermissions.ts` |
| 검증 방식 | 각 메뉴의 `path` → `*.routes.tsx`에서 `<Route path>` 매칭 → 컴포넌트 파일 존재 확인 → 파일 헤더에서 deprecated/legacy/experimental 신호 검색 |

**Workspace 분류 기준 (사용자 정의):**
- **ADMIN** — 플랫폼 운영/정책/감시 (Admin이 본인 업무로 사용)
- **OPERATOR** — 서비스 운영자 (KPA Operator, Neture Operator 등)
- **SUPPLIER** — 공급자
- **STORE** — 매장 실행 (POP 출력, 태블릿 노출 설정 등)
- **PARTNER** — 제휴/파트너 (예: K-Cosmetics 어필리에이트)
- **SHARED** — 다수 워크스페이스 공유 (예: Forum, Digital Signage)
- **LEGACY** — 사용 중단/실험 잔재

**Status:**
- `active` — 정상 동작, route 등록됨
- `partial` — route는 등록되었으나 페이지가 stub/skeleton 수준
- `experimental` — 작업 중 (Phase 1/dev 표기 등)
- `deprecated` — 명시적으로 hold/legacy 표시
- `dead` — 메뉴엔 있으나 route 미등록 → 클릭 시 404

**Action:**
- `KEEP` — 현 위치 유지
- `MOVE` — 다른 workspace로 이동 필요
- `HIDE` — 일단 숨김(role 필터로) — 후속 결정 보류
- `DEPRECATE` — 명시적 deprecated 마킹
- `REMOVE_CANDIDATE` — 제거 후보 (dead route, 중복 등)

---

## 1. Inventory — 전체 메뉴 분류표

### 1-1. OVERVIEW

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Overview | `/admin` | admin | ADMIN | active | KEEP | — |

### 1-2. CORE

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Users & Roles | `/users` | admin | ADMIN | active | KEEP | path에 `/admin` prefix 누락 — 일관성 점검 권장 |
| Service Operators | `/operators` | admin | ADMIN | active | KEEP | 위와 동일 |
| Membership | `/admin/membership/dashboard` | admin | ADMIN | active | KEEP | — |
| Members | `/admin/membership/members` | admin | ADMIN | active | KEEP | — |
| Verifications | `/admin/membership/verifications` | admin | ADMIN | active | KEEP | — |
| Platform Settings | `/settings` | admin | ADMIN | active | KEEP | path prefix 누락 |

### 1-3. CONTENT (Platform Content)

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Overview | `/content` | admin | ADMIN | active | KEEP | — |
| Assets | `/content/assets` | admin | ADMIN | active | KEEP | — |
| Collections | `/content/collections` | admin | ADMIN | active | KEEP | — |
| Policies | `/content/policies` | admin | ADMIN | active | KEEP | — |
| Analytics | `/content/analytics` | admin | ADMIN | active | KEEP | — |

### 1-4. PARTICIPATION ⚠️ **DEAD GROUP**

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Overview | `/admin/participation` | admin | ADMIN | active | KEEP | — |
| 설문 목록 | `/admin/participation/surveys` | admin | LEGACY | **dead** | **REMOVE_CANDIDATE** | route 미등록 — 클릭 시 404 |
| 응답 현황 | `/admin/participation/responses` | admin | LEGACY | **dead** | **REMOVE_CANDIDATE** | route 미등록 — 클릭 시 404 |

### 1-5. LEARNING (Flow) ⚠️ **DEAD GROUP**

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Overview | `/admin/learning` | admin | ADMIN | active | KEEP | — |
| Flow 목록 | `/admin/learning/flows` | admin | LEGACY | **dead** | **REMOVE_CANDIDATE** | route 미등록 |
| 진행 현황 | `/admin/learning/progress` | admin | LEGACY | **dead** | **REMOVE_CANDIDATE** | route 미등록 |

### 1-6. CMS

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Contents | `/admin/cms/contents` | admin | ADMIN | active | KEEP | — |
| Slots | `/admin/cms/slots` | admin | ADMIN | active | KEEP | — |
| Channels | `/admin/cms/channels` | admin | ADMIN | active | KEEP | — |
| Channel Ops | `/admin/cms/channels/ops` | admin | ADMIN | active | KEEP | 정상 등록 |
| Post Types | `/admin/cms/cpts` | admin | ADMIN | active | KEEP | — |
| Fields | `/admin/cms/fields` | admin | ADMIN | active | KEEP | — |
| Views | `/admin/cms/views` | admin | ADMIN | active | KEEP | — |
| Pages | `/admin/cms/pages` | admin | ADMIN | active | KEEP | — |

### 1-7. APPSTORE

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Browse Apps | `/apps/store` | admin | ADMIN | active | KEEP | — |
| Installed Apps | `/admin/appstore/installed` | admin | ADMIN | active | KEEP | 동일 컴포넌트(`AppStorePage`)에 `defaultTab`만 다름 |

### 1-8. FORUM (Top-level)

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Dashboard | `/forum` | shared | SHARED | active | KEEP | 플랫폼 공통 Forum (§13 O4O 공통 구조) |
| Boards | `/forum/boards` | shared | SHARED | active | KEEP | — |
| Categories | `/forum/categories` | shared | SHARED | active | KEEP | — |

### 1-9. SERVICES — Yaksa (KPA)

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Service Dashboard | `/admin/yaksa-hub` | admin | ADMIN | active | KEEP | KPA를 admin이 보는 hub. 적정. |
| Forum | `/forum` | shared | SHARED | active | **REMOVE_CANDIDATE** | **글로벌 Forum과 100% 중복** — 제거 후보 |
| AI Insight | `/pharmacy-ai-insight` | operator/store | OPERATOR | active | **MOVE** | 약사용 AI 도구 — admin이 쓸 일 없음 → KPA Operator 또는 Pharmacist Workspace로 |
| CGM Patient Care | `/cgm-pharmacist` | operator/store | STORE | **experimental** | **MOVE** | `@o4o/cgm-pharmacist-app` Phase 1 dev. 약사 환자관리 도구. |

### 1-10. SERVICES — Glycopharm

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Pharmacies | `/glycopharm/pharmacies` | admin | ADMIN | active | KEEP | — |
| Products | `/glycopharm/products` | admin | ADMIN | active | KEEP | — |
| Applications | `/admin/service-applications/glycopharm` | admin | ADMIN | active | KEEP | — |

### 1-11. SERVICES — GlucoseView

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| CGM Vendors | `/glucoseview/vendors` | admin | ADMIN | active | KEEP | — |
| View Profiles | `/glucoseview/view-profiles` | admin | ADMIN | active | KEEP | — |
| Connections | `/glucoseview/connections` | admin | ADMIN | active | KEEP | — |
| Applications | `/admin/service-applications/glucoseview` | admin | ADMIN | active | KEEP | — |

### 1-12. SERVICES — K-Cosmetics ⚠️ **PARTNER WORKSPACE 혼입**

> 그룹 전체 `roles: ['admin', 'super_admin', **'partner'**]` — partner도 같은 메뉴를 보는 구조.
> 그러나 메뉴 path는 모두 `/cosmetics-partner/*` (= partner 자기 작업화면). **Admin이 partner 작업화면을 보고 있는 셈.**

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Dashboard | `/cosmetics-partner/dashboard` | partner | PARTNER | active | **MOVE** | Partner Workspace로 이동 |
| Partner Links | `/cosmetics-partner/links` | partner | PARTNER | active | **MOVE** | 동일 |
| Routines | `/cosmetics-partner/routines` | partner | PARTNER | active | **MOVE** | 동일 |
| Earnings | `/cosmetics-partner/earnings` | partner | PARTNER | active | **MOVE** | 동일 |
| Commission Policies | `/cosmetics-partner/commission-policies` | partner | PARTNER | active | **MOVE** | 동일 |

### 1-13. SERVICES — Neture

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Products | `/neture/products` | admin | ADMIN | active | KEEP | — |
| Product Approvals | `/neture/approvals` | admin | ADMIN | active | KEEP | — |
| Suppliers | `/neture/suppliers` | admin | ADMIN | active | KEEP | — |
| Partners | `/neture/partners` | admin | ADMIN | active | KEEP | — |

### 1-14. SERVICES — Digital Signage

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Operations | `/admin/digital-signage/operations` | admin | SHARED | active | KEEP | DigitalSignageRouter로 통합 |
| Displays | `/admin/digital-signage/displays` | admin | SHARED | active | KEEP | — |
| Media Sources | `/admin/digital-signage/media/sources` | admin | SHARED | active | KEEP | — |
| Schedules | `/admin/digital-signage/schedules` | admin | SHARED | active | KEEP | — |

### 1-15. SUPPLIER (공급자 대시보드) ⚠️ **SUPPLIER + STORE 혼입**

> 그룹 전체 `roles: ['supplier', 'admin', 'super_admin']` — supplier도 같은 메뉴를 본다.
> 그런데 KPA STORE 경로(`/kpa/my-store-contents`, `/kpa/content-workspace`)가 **supplier 그룹 안에** 들어 있음 — 명백한 분류 오류.

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| 대시보드 | `/supplierops/dashboard` | supplier | SUPPLIER | active | **MOVE** | Supplier Workspace로 |
| 마케팅 자료 | `/supplierops/marketing-materials` | supplier | SUPPLIER | active | **MOVE** | 동일 |
| 제품 목록 | `/supplierops/products` | supplier | SUPPLIER | active | **MOVE** | 동일 |
| **내 매장 콘텐츠** | `/kpa/my-store-contents` | **store** | **STORE** | active | **MOVE** | KPA Store Workspace로 — supplier 그룹에 있을 이유 없음 |
| **콘텐츠 작업 공간** | `/kpa/content-workspace` | **store** | **STORE** | active | **MOVE** | KPA Store Workspace로 — 동일 |
| 사이니지 리포트 | `/supplierops/signage-reports` | supplier | SUPPLIER | active | **MOVE** | Supplier Workspace로 |
| 사이니지 캠페인 요청 | `/supplierops/signage-campaign-requests` | supplier | SUPPLIER | active | **MOVE** | 동일 |

### 1-16. INSIGHTS — Top items

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Ops Metrics | `/admin/ops/metrics` | admin | ADMIN | active | KEEP | — |
| Store Network | `/admin/store-network` | admin | ADMIN | active | KEEP | 매장망 관리 — admin 영역 적정 |
| Physical Stores | `/admin/physical-stores` | admin | ADMIN | active | KEEP | 동일 |
| Content Manager | `/admin/service-content-manager` | admin | ADMIN | active | KEEP | platform_admin 포함 |

### 1-17. INSIGHTS — Store Content ⚠️ **OPERATOR/STORE 혼입**

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| 콘텐츠 관리 | `/store-content` | shared(?) | SHARED | active | **HIDE** | 위치 검토 필요. admin 자체 작업이 아닌 매장 콘텐츠 관리 |
| 템플릿 라이브러리 | `/store-content/templates` | shared | SHARED | active | KEEP | 템플릿 라이브러리는 공통 |
| **HUB 콘텐츠** | `/operator/hub-contents` | **operator** | **OPERATOR** | active | **MOVE** | Operator Workspace로 — 경로가 이미 `/operator/`인데 admin 사이드바에 노출됨 |
| **HUB 공지 관리** | `/operator/hub-notices` | **operator** | **OPERATOR** | active | **MOVE** | 동일 |

### 1-18. INSIGHTS — POP 제작 ⚠️ **STORE WORKSPACE**

> 최근 커밋 `WO-O4O-KPA-STORE-SIDEBAR-MENU-RESTRUCTURE-V1` (b03236d1b)에서 KPA Store 사이드바 '매장 실행' 그룹에 POP가 정식 배치됨.
> Admin 사이드바에도 동일 항목이 남아있는 상태 — **이중 노출**.

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| POP 목록 | `/store/pop` | store | STORE | active | **MOVE** | KPA Store에 이미 있음 — admin에서 제거 후보 |
| 새 POP 만들기 | `/store/pop/create` | store | STORE | active | **MOVE** | 동일 |

### 1-19. INSIGHTS — 타블렛 채널 ⚠️ **STORE WORKSPACE**

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| 노출 상품 설정 | `/store/tablet/settings` | store | STORE | active | **MOVE** | 매장 내부 설정 — admin 영역 아님 |

### 1-20. INSIGHTS — Reports

| Menu | Route | Actual Owner | Workspace | Status | Action | 비고 |
|------|-------|--------------|-----------|--------|--------|------|
| Overview | `/admin/reporting/dashboard` | admin | ADMIN | active | KEEP | — |
| Submissions | `/admin/reporting/reports` | admin | ADMIN | active | KEEP | — |
| Templates | `/admin/reporting/templates` | admin | ADMIN | active | KEEP | — |

---

## 2. 우선 식별: "이미 중지(deprecated/hold)되었는데 메뉴에 남아 있는 것"

사용자가 가장 우선시한 카테고리. **Dead route(클릭 시 404) + 명시적 중복**.

| 우선순위 | Menu | Route | 증상 | Action |
|----------|------|-------|------|--------|
| 🔴 P0 | Learning > Flow 목록 | `/admin/learning/flows` | route 미등록 → 404 | **REMOVE_CANDIDATE** |
| 🔴 P0 | Learning > 진행 현황 | `/admin/learning/progress` | route 미등록 → 404 | **REMOVE_CANDIDATE** |
| 🔴 P0 | Participation > 설문 목록 | `/admin/participation/surveys` | route 미등록 → 404 | **REMOVE_CANDIDATE** |
| 🔴 P0 | Participation > 응답 현황 | `/admin/participation/responses` | route 미등록 → 404 | **REMOVE_CANDIDATE** |
| 🟠 P1 | Yaksa > Forum | `/forum` | 글로벌 Forum 그룹과 100% 동일 경로 (중복) | **REMOVE_CANDIDATE** |

**참고**: `admin-menu.static.tsx` 헤더 주석에 "This file replaces the deprecated wordpressMenuFinal.tsx" — 직전 메뉴 정의(wordpressMenuFinal.tsx)가 이미 deprecated 처리된 것을 확인. 이번 정적 메뉴 자체는 active이나, 그 안의 구체 항목이 stale인 상태.

---

## 3. 우선 식별: "관리자와 무관한 매장(Store) / 파트너 / 운영자 기능"

사용자가 두 번째로 우선시한 카테고리. **Workspace 분류 오류**.

### 3-1. STORE 워크스페이스가 Admin 사이드바에 노출

| Menu | Route | 진짜 위치 | 현재 그룹 | 비고 |
|------|-------|-----------|-----------|------|
| POP 목록 / 새 POP 만들기 | `/store/pop`, `/store/pop/create` | KPA Store > 매장 실행 | Admin > Insights > POP 제작 | KPA Store에 이미 정식 배치됨(b03236d1b) — admin은 이중노출 |
| 타블렛 채널 노출 상품 설정 | `/store/tablet/settings` | KPA Store > 매장 실행 | Admin > Insights > 타블렛 채널 | 매장 내부 설정 |
| 내 매장 콘텐츠 | `/kpa/my-store-contents` | KPA Store > 내 자료함 | Admin > 공급자 대시보드 | "공급자 대시보드" 안에 store 항목이 들어있는 분류 오류 |
| 콘텐츠 작업 공간 | `/kpa/content-workspace` | KPA Store > 내 자료함 | Admin > 공급자 대시보드 | 동일 |

### 3-2. PARTNER 워크스페이스가 Admin 사이드바에 노출

| Menu | Route | 진짜 위치 | 현재 그룹 |
|------|-------|-----------|-----------|
| Dashboard / Links / Routines / Earnings / Commission Policies | `/cosmetics-partner/*` (5개 항목) | Partner Portal | Admin > Services > K-Cosmetics |

### 3-3. OPERATOR 워크스페이스가 Admin 사이드바에 노출

| Menu | Route | 진짜 위치 | 현재 그룹 |
|------|-------|-----------|-----------|
| HUB 콘텐츠 | `/operator/hub-contents` | KPA Operator | Admin > Insights > Store Content |
| HUB 공지 관리 | `/operator/hub-notices` | KPA Operator | Admin > Insights > Store Content |

### 3-4. SUPPLIER 워크스페이스가 Admin 사이드바에 노출

| Menu | Route | 진짜 위치 | 현재 그룹 |
|------|-------|-----------|-----------|
| 대시보드 / 마케팅 자료 / 제품 목록 / 사이니지 리포트 / 사이니지 캠페인 요청 | `/supplierops/*` (5개 항목) | Supplier Workspace | Admin > 공급자 대시보드 |

### 3-5. PHARMACIST(STORE) 도구가 Admin Services 안에 노출

| Menu | Route | 진짜 위치 | 현재 그룹 |
|------|-------|-----------|-----------|
| AI Insight | `/pharmacy-ai-insight` | KPA Pharmacist | Admin > Services > Yaksa |
| CGM Patient Care | `/cgm-pharmacist` (Phase 1 dev) | KPA Pharmacist | Admin > Services > Yaksa |

---

## 4. 서비스 전환 성격 메뉴 — 분석

사용자가 세 번째로 우선시한 카테고리: "Yaksa, Glycopharm, K-Cosmetics, Neture가 진짜 admin 메뉴인가, workspace switcher인가?"

**현재 상태:**
- 5개 서비스(Yaksa, Glycopharm, GlucoseView, K-Cosmetics, Neture, Digital Signage)는 단순 메뉴 그룹으로 존재.
- 정적 메뉴 안에 인라인 정의 — 동적 service switcher 컴포넌트 없음.
- 각 서비스 내부 항목은 **혼합 성격**:
  - Glycopharm, GlucoseView, Neture → 거의 순수 ADMIN 영역 (admin이 해당 서비스를 운영/감독)
  - Yaksa(KPA) → 일부 ADMIN(`yaksa-hub`) + 일부 PHARMACIST(AI Insight, CGM)가 섞임
  - K-Cosmetics → 거의 PARTNER 영역(role에 'partner' 포함된 점이 결정적 단서)

**판정**: 현재 구조는 "서비스 전환 switcher"라기보다 "admin이 각 서비스를 들여다보는 hub 모음"에 가까움. 다만 **K-Cosmetics와 Yaksa의 일부 항목은 admin이 아닌 다른 워크스페이스에 속해야 함** (§3 참조).

후속 WO에서 결정할 사항:
- Service Switcher를 별도 UI로 분리할 것인가, 아니면 admin sidebar 안의 hub 그룹으로 유지할 것인가?
- K-Cosmetics는 통째로 Partner Portal로 이전할 것인가?

---

## 5. 권한 구조 조사

### 5-1. role 분포 요약

| 그룹 (총 25개) | 가시 role | 메모 |
|--------------|-----------|------|
| Overview, Core, Content, Participation, Learning, CMS, AppStore, Forum, Yaksa, Glycopharm, GlucoseView, Neture, Digital Signage, 모든 Insights | `['admin', 'super_admin']` | 표준 admin 메뉴 |
| K-Cosmetics | `['admin', 'super_admin', 'partner']` | ⚠️ partner 추가 — partner도 admin 사이드바를 본다는 뜻 |
| 공급자 대시보드 | `['supplier', 'admin', 'super_admin']` | ⚠️ supplier 추가 — 동일 문제 |
| Content Manager | `['admin', 'super_admin', 'platform_admin']` | platform_admin 추가 |

**문제점**: admin sidebar는 본래 admin 전용이어야 하는데, **partner / supplier가 동일 사이드바를 보는 구조**가 K-Cosmetics와 공급자 대시보드 두 그룹에 끼어 있음.
- 결과: partner/supplier 로그인 시 admin 사이드바의 일부만 잘려서 보임 → UX 혼란
- 권장: 워크스페이스 분리 (별도 sidebar 정의) — Operator Dashboard 표준(§11 CLAUDE.md)에 부합

### 5-2. `rolePermissions.ts` 매트릭스

- 총 79개 menuId 정의됨, 모두 `admin-menu.static.tsx`의 menuId와 1:1 매핑.
- Dead 매핑 없음 — 다만 일부 menuId(`user-management`, `dashboard-home`, `dashboard-overview`, `dashboard-stats`, `system-settings`, `integrations`, `import-export`, `database`, `logs`, `ui-elements`, `ui-components`)는 정적 메뉴엔 직접 노출되지 않은 잠재 권한 정의 — 동적 메뉴(API)에서 사용될 가능성이 있어 후속 검증 필요.

---

## 6. 통계 요약

| 지표 | 값 |
|------|-----|
| 정적 메뉴 항목 수 (separator 포함) | 70 |
| 메뉴 그룹 수 | 25 |
| route 등록 + 컴포넌트 존재 (active) | 41 (검증한 45개 중) |
| **dead (route 미등록)** | **4** |
| **중복 노출 (동일 route)** | **1** (yaksa-forum ↔ forum-dashboard) |
| **MOVE 후보 항목** (workspace 미스매치) | **20** |
| KEEP 후보 항목 | 41 |

### MOVE 후보 분포

| 목적지 Workspace | 항목 수 |
|----------------|--------|
| → STORE (KPA Store) | 5 |
| → PARTNER (Cosmetics) | 5 |
| → SUPPLIER | 5 |
| → OPERATOR | 2 |
| → PHARMACIST workspace | 2 |
| → 결정 보류 / HIDE | 1 |

---

## 7. 후속 WO 권장 순서

> ⚠️ 이 IR에서는 어떤 변경도 수행하지 않는다. 아래는 후속 WO 제안이다.

### Phase 1 — Dead/Duplicate 정리 (최소 위험)
1. `WO-O4O-ADMIN-MENU-DEAD-ROUTE-CLEANUP-V1`
   - 대상: Learning(2), Participation(2) dead route 4건 + yaksa-forum 중복 1건 = 총 5개 메뉴 제거
   - 위험도: 낮음 — 클릭 시 404였거나 다른 메뉴와 동일

### Phase 2 — Workspace 미스매치 정리 (중간 위험, UX 검증 필요)
2. `WO-O4O-ADMIN-STORE-WORKSPACE-DEMUX-V1`
   - 대상: POP, 타블렛 채널, kpa-my-store-contents, kpa-content-workspace (총 5)
   - admin sidebar에서 제거 + Store Workspace에서만 노출 (이미 KPA Store에 정식 배치된 항목들)
3. `WO-O4O-ADMIN-OPERATOR-DEMUX-V1`
   - 대상: hub-contents, hub-notices (총 2)
4. `WO-O4O-ADMIN-PARTNER-DEMUX-K-COSMETICS-V1`
   - 대상: K-Cosmetics 그룹 5개 — Partner Portal로 이전 검토
5. `WO-O4O-ADMIN-SUPPLIER-DEMUX-V1`
   - 대상: 공급자 대시보드 그룹 — Supplier Workspace로 이전

### Phase 3 — 구조 재정의 (고위험)
6. `WO-O4O-SERVICE-SWITCHER-DESIGN-V1`
   - Yaksa/Glycopharm/GlucoseView/Neture 그룹의 admin hub 패턴을 정식 정의
   - 약사/Pharmacist 도구(yaksa-ai-insight, yaksa-cgm)는 별도 워크스페이스로 분리

---

## 8. 산출물 위치

- **이 문서**: `docs/investigations/IR-O4O-ADMIN-MENU-TAXONOMY-AUDIT-V1.md`
- **1차 소스**: `apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx`
- **참고 문서**:
  - `docs/architecture/admin-goal-state-definition.md` (admin 메뉴 정의에서 참조)
  - CLAUDE.md §11 Operator Dashboard 표준
  - CLAUDE.md §13 O4O 공통 구조 원칙

---

## 9. 주의 / 한계

1. **동적 메뉴 미반영**: Navigation API(`/v1/navigation/admin`) 응답이 fallback과 다른 경우, 본 IR은 정적 fallback만 정확하게 분류. API 응답을 별도 캡처해 비교 필요.
2. **CPT 동적 주입 미반영**: `useDynamicCPTMenu()`가 런타임에 추가하는 CPT 메뉴는 본 inventory에 포함되지 않음.
3. **Permission 매트릭스의 잠재 menuId** (`user-management`, `dashboard-home` 등 11개)는 어디서 사용되는지 후속 조사 필요.
4. **컴포넌트 내부 dead-code**는 조사 범위 밖. 본 IR은 메뉴-route-컴포넌트존재 수준까지만 다룸.
