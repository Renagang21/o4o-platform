# IR-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-POLICY-AUDIT-V1

> Status: **read-only investigation**, no code modified
> Scope: KPA-Society / GlycoPharm / K-Cosmetics 의 `ENABLED_CAPABILITIES` 정책 정합성 + dead-defined 그룹 판정
> Date: 2026-05-30
> Predecessor: `IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1` (sidebar 공통화 audit, Conditional GO 판정)
> Successor (candidate): `WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1` + `WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1`

## TL;DR

5 케이스 모두 **단순 capability 활성화 누락 (Accidental Gap)** 판정.
- Glyco STORE_MANAGEMENT, Glyco COMMUNITY, Glyco SETTINGS
- K-Cos ANALYTICS, K-Cos COMMUNITY

각 케이스 모두 (1) `UNIFIED_MENU` 에 그룹이 명시 정의됨 + (2) `App.tsx` 에 라우트가 실재 + (3) 페이지 컴포넌트가 lazy import 로 구현됨. capability 만 활성화 안 되어 sidebar 에서 hide. 운영자 도구로 사용될 의도였다고 보는 것이 자연스럽다.

K-Cos system 그룹만 **의도된 부재** — `UNIFIED_MENU` 에 그룹 자체 미정의.

**최종 판정: "capability 정리 후 공통화 진행"** — 공통화 자체는 기술적으로 즉시 가능하나, capability 회귀 5건이 공통화 직후 "공통 sidebar 회귀처럼" 보일 위험이 크다. 회귀 보정 WO 는 작은 변경 (3 서비스 × `ENABLED_CAPABILITIES` 배열 4-5 항목 추가) 이며 1 사이클 안에 끝남.

---

## 1. 서비스별 `ENABLED_CAPABILITIES` 비교표

출처:
- `services/web-kpa-society/src/config/operatorCapabilities.ts`
- `services/web-glycopharm/src/config/operatorCapabilities.ts`
- `services/web-k-cosmetics/src/config/operatorCapabilities.ts`

| Capability (`@o4o/types` `OperatorCapability`) | KPA | GlycoPharm | K-Cosmetics |
|------------------------------------------------|:---:|:----------:|:-----------:|
| `USER_MANAGEMENT` | ✓ | ✓ | ✓ |
| `MEMBERSHIP_APPROVAL` | ✓ | ✓ | ✓ |
| `CONTENT_MANAGEMENT` | ✓ | ✓ | ✓ |
| `COMMUNITY` | ✓ | ❌ | ❌ |
| `SIGNAGE` | ✓ | ✓ | ✓ |
| `STORE_MANAGEMENT` | ✓ | ❌ | ✓ |
| `ANALYTICS` | ✓ | ✓ | ❌ |
| `CARE` | ❌ | ✓ | ❌ |
| `SETTINGS` | ✓ | ❌ | ❌ |

총 capability: KPA 8 / Glyco 6 / K-Cos 5.

---

## 2. capability 별 영향을 받는 menu group/item 정리

기준: `packages/ui/src/operator-shell/constants.ts` 의 `STANDARD_GROUPS` (단일 source of truth).

| Capability | 영향받는 group | 차단되면 hide되는 UNIFIED_MENU 메뉴 (서비스별) |
|------------|----------------|-----------------------------------------------|
| `STORE_MANAGEMENT` | `products`, `stores`, `orders` | Glyco: 약국 관리 / 매장 관리 / 채널 관리 / 약국 HUB 블로그 / 약국 HUB POP / 약국 HUB QR / 상품 관리 / 주문 관리 (총 8) |
| `ANALYTICS` | `analytics` | K-Cos: AI 리포트 (1) |
| `COMMUNITY` | `forum` | Glyco: 포럼 관리 / 포럼 신청 / 포럼 삭제 요청 / 커뮤니티 관리 / 포럼 분석 (5) · K-Cos: 포럼 신청 / 삭제 요청 / 포럼 분석 (3) |
| `SETTINGS` | `system` | Glyco: 서비스 설정 / 회원 관리 (Admin) (2, admin-only) · K-Cos: (`UNIFIED_MENU` 에 system 그룹 자체 없음) |

빈 도메인 reject 효과:
- K-Cos `common` 도메인의 그룹은 `analytics`, `system` 둘 뿐. ANALYTICS 와 SETTINGS 둘 다 차단되면 common 도메인 자체가 빈 도메인 → `KCosOperatorSidebar` 가 도메인 헤딩까지 hide. (운영 smoke 에서 직접 확인됨)

---

## 3. GlycoPharm `STORE_MANAGEMENT` disabled 판정

### 3.1 기능 실재 여부

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `stores` 그룹 | 6 항목 정의 (`/operator/pharmacies`, `/operator/stores`, `/operator/store-channels`, `/operator/blog`, `/operator/pop`, `/operator/qr`) |
| UNIFIED_MENU `products` 그룹 | `/operator/products` |
| UNIFIED_MENU `orders` 그룹 | `/operator/orders` |
| App.tsx 라우트 | 모두 실재 (`services/web-glycopharm/src/App.tsx` 716/717/719/721/774/778/782/790) |
| 페이지 컴포넌트 lazy import | `OperatorStoresPage`, `ProductsPage`, `OrdersPage`, `OperatorBlogListPage`, `OperatorPopListPage`, `OperatorQrListPage`, `OperatorStoreChannelsPage`, `PharmaciesPage` 모두 lazy 정의 (App.tsx 상단부) |
| 최근 관련 WO | `WO-O4O-GLYCOPHARM-OPERATOR-STORE-HUB-WRITE-CAPABILITY-V1`, `WO-O4O-GLYCOPHARM-OPERATOR-STORE-CHANNELS-V1`, `WO-O4O-GLYCOPHARM-OPERATOR-MENU-ALIGN-WITH-KPA-V1` 등 stores 그룹 적극 정비 이력 |

### 3.2 판정

**Accidental Gap (회귀)** — 다음 근거 종합:
1. 매뉴 8개, 라우트 8개, 페이지 8개 모두 구현된 상태에서 sidebar 에서만 hide.
2. GlycoPharm 의 사업 본질이 "매장(약국) 운영"이며 stores 그룹 미노출은 사용자 시나리오상 비정상.
3. 최근 WO 들이 stores 그룹을 명시적으로 추가/재배치 중인데 capability 만 누락된 채 유지.
4. 운영 smoke 에서 사용자가 sidebar 에 Stores 가 안 보여 진단 cycle 발생 (본 IR 의 직접 트리거).

**suggested fix (참고용, 본 IR 외)**: `ENABLED_CAPABILITIES` 에 `OperatorCapability.STORE_MANAGEMENT` 추가. 단일 줄 변경.

---

## 4. K-Cosmetics `ANALYTICS` disabled 판정

### 4.1 기능 실재 여부

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `analytics` 그룹 | 1 항목 (`AI 리포트` → `/operator/ai-report`) |
| App.tsx 라우트 | `/operator/ai-report` 실재 (line 586) |
| 페이지 컴포넌트 | `OperatorAiReportPage` lazy import |
| 최근 관련 WO | 본 IR 의 직접 단서는 부재. `AI 리포트` 페이지가 정상 구현되어 있고 K-Cos 의 `KCosmeticsOperatorDashboard` 가 AI 인사이트를 노출하므로 analytics 그룹 의도가 명확 |

### 4.2 판정

**Accidental Gap (회귀)** — sidebar 에서 hide 될 의도가 있다고 볼 단서 없음. K-Cos common 도메인의 유일 그룹이며, hide 시 운영 공통 헤딩 자체가 사라져 IA 구조의 1/3 손실. 운영 smoke 에서 사용자가 직접 발견.

**suggested fix (참고용)**: `ENABLED_CAPABILITIES` 에 `OperatorCapability.ANALYTICS` 추가.

---

## 5. GlycoPharm / K-Cosmetics `COMMUNITY` disabled 판정

### 5.1 기능 실재 여부 — GlycoPharm

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `forum` | 5 항목 (`/operator/forum-management`, `/operator/forum-requests`, `/operator/forum-delete-requests`, `/operator/community`, `/operator/forum-analytics`) |
| App.tsx 라우트 | 모두 실재 (line 724-729) |
| 페이지 컴포넌트 | `OperatorForumManagementPage`, `ForumRequestsPage`, `ForumDeleteRequestsPage`, `CommunityManagementPage`, `ForumAnalyticsPage` 모두 lazy 정의 |

### 5.2 기능 실재 여부 — K-Cosmetics

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `forum` | 3 항목 (`/operator/forum-requests`, `/operator/forum-delete-requests`, `/operator/forum-analytics`) |
| App.tsx 라우트 | 모두 실재 (line 590-593). `forum-management` 라우트는 K-Cos 에 없음 — UNIFIED_MENU 와 정합 |
| 페이지 컴포넌트 | `ForumRequestsPage`, `ForumDeleteRequestsPage`, `ForumAnalyticsPage` 모두 lazy 정의 |

### 5.3 판정

**Accidental Gap (회귀, 두 서비스 모두)** — 다음 근거:
1. 두 서비스의 forum 페이지가 정상 구현되어 있고, 라우트도 정의됨.
2. `WO-O4O-FORUM-ANALYTICS-UNIFICATION-V1`, `WO-O4O-KCOSMETICS-OPERATOR-STORE-CHANNELS-V1` 등 forum 관련 변경이 두 서비스 모두에서 진행됨 — 운영 의도가 있음.
3. CLAUDE.md §13 "O4O 공통 구조 원칙": "forum, lms, signage 는 서비스별 기능이 아니라 플랫폼 공통 구조" → 모든 서비스가 자기 데이터에 forum 구조를 가짐. COMMUNITY capability 비활성은 이 원칙에 정면으로 어긋남.

**suggested fix (참고용)**: 두 서비스 `ENABLED_CAPABILITIES` 에 `OperatorCapability.COMMUNITY` 추가.

---

## 6. SETTINGS disabled 및 `system` group dead-defined 여부

### 6.1 GlycoPharm

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `system` | 2 항목, **모두 `adminOnly: true`** — 서비스 설정 (`/operator/settings`), 회원 관리 Admin (`/admin/members`) |
| App.tsx 라우트 | `/operator/settings` (line 795), `/admin/members` 라우트 실재 |
| 페이지 컴포넌트 | `SettingsPage`, `GlycoPharmAdminMembersPage` lazy 정의 |
| WO 단서 | `WO-GLYCOPHARM-OPERATOR-MENU-ADMIN-GUARD-V1` — system = admin 전용으로 명시 설정 |

**판정**: **Accidental Gap (회귀, admin 한정)** — admin/operator 겸용 사용자가 sidebar 에서 보아야 할 메뉴인데 capability gate 가 hide. `adminOnly` 플래그가 role 분리를 이미 수행하므로 추가 capability gate 는 over-restrictive. UNIFIED_MENU 의 system 그룹 정의 자체는 의도 있음.

**suggested fix (참고용)**: `ENABLED_CAPABILITIES` 에 `OperatorCapability.SETTINGS` 추가. admin 사용자만 항목이 보이는 동작이 보존됨.

### 6.2 K-Cosmetics

| 자원 | 확인 |
|------|------|
| UNIFIED_MENU `system` | **그룹 자체 미정의** |
| App.tsx 라우트 | `/operator/settings` 미확인 (settings 라우트 검색 결과 0 hit) |
| 페이지 컴포넌트 | settings 관련 component K-Cos operator 영역에 미정의 |

**판정**: **의도된 부재 (dead-defined 아님)** — UNIFIED_MENU 에 그룹 자체가 없으므로 capability gate 차단이 없어도 sidebar 에 나타나지 않음. 정합.

K-Cos 가 향후 service settings 메뉴를 도입한다면 별도 WO 로 UNIFIED_MENU 추가 + ENABLED_CAPABILITIES 추가가 필요. 현재 시점에서는 부재가 정상.

---

## 7. sidebar 공통화 전 선행 정리 필요 여부

### 7.1 기술적 분석

sidebar 컴포넌트는 capability 정책과 **독립**. 공통화 자체는 capability 변경 없이도 동일 동작 유지 (3개 서비스 모두 동일하게 hide → 공통화 후에도 동일하게 hide).

### 7.2 인지/UX 측면

다음 시나리오 위험:
1. **공통화 WO PR 리뷰 단계**: 리뷰어가 운영 smoke 에서 "Glyco Stores 미표시"를 보고 "공통화로 회귀 발생" 으로 오해.
2. **공통화 직후 운영자 사용**: 운영자가 sidebar 변경을 인지하고 메뉴 변화를 점검하면서 "공통화 때문에 메뉴가 사라졌다"고 보고할 가능성.
3. **운영 smoke 자동화 (`c:/tmp/smoke/smoke2.mjs`) 재실행**: 본 IR 의 5건이 그대로 미표시 → 검증 결과의 noise 가 됨.

### 7.3 권고

**capability 정리 먼저** — 회귀 5건 모두 단순 capability 배열에 항목 1-4개 추가 (3 서비스 × 1-4 라인). 변경 표면이 매우 작고 검증 사이클이 짧음. 정리 후 공통화 PR 의 리뷰가 깨끗하게 진행 가능.

회귀 보정 작업의 영향 범위:
- 변경 파일: 3개 (각 서비스 `config/operatorCapabilities.ts`)
- 변경 라인: 총 5-10 라인 추가
- 회귀 위험: 메뉴가 노출되는 효과만 발생 — 기존 노출 메뉴는 무영향
- 검증: 운영 smoke 재실행으로 5건 미표시 → 표시 전환 확인

---

## 8. 후속 WO 후보

### 8.1 (선행) WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1

- **목적**: 본 IR 의 5건 Accidental Gap 보정
- **변경**:
  - `services/web-glycopharm/src/config/operatorCapabilities.ts`:
    - `OperatorCapability.STORE_MANAGEMENT` 추가
    - `OperatorCapability.COMMUNITY` 추가
    - `OperatorCapability.SETTINGS` 추가
  - `services/web-k-cosmetics/src/config/operatorCapabilities.ts`:
    - `OperatorCapability.ANALYTICS` 추가
    - `OperatorCapability.COMMUNITY` 추가
- **검증**:
  - `tsc --noEmit` (2 서비스)
  - Vite transform (2 서비스 — 자체 .ts 파일이 transform 통과)
  - 운영 smoke `c:/tmp/smoke/smoke2.mjs` 재실행 — 5건 미표시 → 표시 전환 확인 (스크린샷 비교)
- **위험**: 매우 낮음. 메뉴 노출만 추가, hide 회귀 없음.

### 8.2 (주 작업) WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1

- 본 IR 의 선행 IR (`IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1`) §9.1.B 에 상세.
- 8.1 완료 후 진입.

### 8.3 (선택) K-Cos `system` 그룹 도입 IR

- K-Cos 가 service settings 메뉴를 도입할 시점에 별도 IR/WO.
- 본 IR 의 직접 후속은 아님 — 정책상 부재가 정상.

### 8.4 (선택) `CARE` capability 검토

- KPA: `CARE` 미보유, K-Cos: `CARE` 미보유, Glyco: `CARE` 보유.
- Glyco UNIFIED_MENU 에 `care` 그룹 미정의 (`care group removed — WO-O4O-GLYCOPHARM-CARE-REMOVAL-V1` 코멘트).
- 즉 Glyco 가 CARE capability 를 활성화하고 있으나 UNIFIED_MENU `care` 그룹은 제거됨 — **dead capability** (그룹은 없는데 capability 만 활성).
- 영향: 없음 (sidebar 그룹이 없으니 표시할 게 없음). 정리 가치는 있으나 시급성 낮음. 별도 cleanup WO 후보.

---

## 9. 최종 판정

> **capability 정리 후 공통화 진행 (Sequential GO).**
>
> 1. `WO-O4O-CROSSSERVICE-OPERATOR-CAPABILITY-GAP-FIX-V1` (선행, 1 사이클)
> 2. `WO-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMON-COMPONENT-V1` (주 작업)

판정 근거:
- 회귀 5건 모두 Accidental Gap (단순 capability 활성화 누락) — 변경 표면 작음, 회귀 위험 낮음
- 공통화 자체는 capability 와 독립이나, 공통화 직후 인지/UX 위험 차단 효과 큼
- 회귀 보정 WO 가 단일 사이클 (= 분 단위) 안에 끝남 — 선행 비용이 미미

**대안 시나리오: 즉시 공통화도 기술적 가능 — 단**, 공통화 PR 본문에 "본 PR 은 capability 정책과 무관하며, 미표시 5건은 IR-...-CAPABILITY-POLICY-AUDIT-V1 의 Accidental Gap 항목" 명시 + 별도 follow-up WO 약속. Sequential 보다 noise 큼.

---

## 10. Current Structure vs O4O Philosophy Conflict Check

CLAUDE.md SSOT Priority Chain 과의 정합:

| SSOT | 본 IR 판정과의 정합 | 비고 |
|------|---------------------|------|
| `O4O-BUSINESS-PHILOSOPHY-V1` §3.2 Operator 정의 | ⚠️ **부분 불일치** | Glyco 의 stores/products/orders 미노출은 §3.2 의 Operator 책임 ("자료 수신·등록·구성 + AI 활용 + 매장 실행 자산 제작") 와 정면 충돌. capability 보정으로 정합 회복 |
| `O4O-3-ROLE-FLOW-BASELINE-V1` §2 책임 매트릭스 | ⚠️ **부분 불일치** | 매장 운영 흐름의 시작점이 stores 그룹인데 hide. K-Cos analytics 미노출도 운영 모니터링 책임과 충돌 |
| CLAUDE.md §13 O4O 공통 구조 원칙 | ⚠️ **명시 충돌** | "forum, lms, signage 는 서비스별 기능이 아니라 플랫폼 공통 구조" — Glyco/K-Cos 의 COMMUNITY 비활성은 이 원칙 위배. forum 페이지는 다 구현되어 있는데 sidebar 진입점만 차단 |
| `O4O-OPERATOR-CANONICAL-WORKFLOW-V1` | ✅ 정합 | approvals 그룹은 세 서비스 모두 활성화 — 본 IR 영역 외 |
| `O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1` (5 Workspace) | ⚠️ **부분 영향** | "D 매장 지원" Workspace 가 stores/products/orders 그룹 진입에 의존 → Glyco STORE_MANAGEMENT 비활성이 Workspace 흐름을 잘라냄. "E 운영 수익" 도 analytics 의존 → K-Cos 도 동일 영향 |
| `O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` | ⚠️ **명시 충돌** | "RichTextEditor 기반 항목별 게시" 의 게시 대상이 stores 그룹의 매장 HUB 블로그/POP/QR. Glyco 에서 이 6 항목이 stores 그룹 안에 정렬되어 있는데 capability gate 가 stores 자체를 차단 → HUB Publishing Standard 의 운영 경로가 sidebar 상 진입 불가 |
| `O4O-STORE-MENU-CANONICAL-TREE-V1` | ⚠️ **명시 충돌** | 매장 HUB 측 6 항목 (상품 상세 / POP / QR / 블로그 / 사이니지 / 고객 안내문) 의 게시 측이 Glyco/K-Cos stores 그룹. Glyco 에서 hide |
| `BASELINE-OPERATOR-OS-V1` (Freeze F1) | ✅ 정합 | 본 IR 의 후속 WO 는 capability 배열에 항목 추가뿐 — Freeze 영역 구조 변경 없음 |
| `RBAC-FREEZE-DECLARATION-V1` (Freeze F9) | ✅ 정합 | capability 와 RBAC role 은 다른 축, role 정의 무변경 |

**충돌 결론**: 본 IR 의 회귀 5건 중 4건 (STORE_MANAGEMENT, COMMUNITY × 2, ANALYTICS) 이 **CLAUDE.md SSOT (philosophy / 공통 구조 원칙 / HUB Publishing / Store Menu Canonical) 와 명시 충돌**. 보정은 정합 회복 작업으로 분류되며 정책 변경이 아님.

본 IR 의 후속 WO `CAPABILITY-GAP-FIX-V1` 는 정책 추가가 아니라 정책 회복.

---

## Appendix A: 본 IR 의 read-only 제약

- 코드/설정/문서 (본 IR 외) 무수정
- 브랜치 신규 생성 없음
- capability 값 변경 없음
- menu group 변경 없음
- sidebar 공통화 진행 없음

산출물: 본 문서 1건 + git commit (해당 문서 단독 add).

## Appendix B: 본 IR 추적 가능 자원

| 자원 | 위치 |
|------|------|
| STANDARD_GROUPS SSOT | `packages/ui/src/operator-shell/constants.ts` |
| Glyco capabilities | `services/web-glycopharm/src/config/operatorCapabilities.ts` |
| K-Cos capabilities | `services/web-k-cosmetics/src/config/operatorCapabilities.ts` |
| KPA capabilities | `services/web-kpa-society/src/config/operatorCapabilities.ts` |
| Glyco 라우트 | `services/web-glycopharm/src/App.tsx` |
| K-Cos 라우트 | `services/web-k-cosmetics/src/App.tsx` |
| 운영 smoke 스크립트 (재실행 자산) | `c:/tmp/smoke/smoke2.mjs` |
| 선행 IR | `docs/investigations/IR-O4O-CROSSSERVICE-OPERATOR-SIDEBAR-COMMONIZATION-AUDIT-V1.md` |
