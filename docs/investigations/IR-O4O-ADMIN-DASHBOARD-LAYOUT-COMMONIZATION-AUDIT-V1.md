# IR-O4O-ADMIN-DASHBOARD-LAYOUT-COMMONIZATION-AUDIT-V1

**작성 일자**: 2026-06-01
**조사 환경**: HEAD (main) `91f240411` 시점 정적 코드 (read-only)
**조사 도구**: Read / Grep / Bash
**작업 성격**: read-only 조사 — 코드/UI/API/DB/menu 수정 없음

---

## 1. 조사 개요

O4O 4개 서비스의 Admin dashboard 구조를 조사하여, 공통 `AdminDashboardLayout` 또는 admin hub 표준 패턴을 만들 수 있는지 판단한다.

**핵심 선행 발견**: `@o4o/admin-ux-core` 패키지가 **이미 존재하고 4개 서비스 모두 이미 일부 사용 중이다**. 신규 공통 레이아웃 개발은 불필요하며, 기존 표준을 완성 적용하는 것이 목표다.

---

## 2. 사전 git 상태

```
M  services/web-glycopharm/src/config/productionTemplates.ts  ← 다른 세션 WIP (미접촉)
M  services/web-k-cosmetics/src/config/productionTemplates.ts ← 다른 세션 WIP (미접촉)
?? *.png (사용자 스크린샷)
```

staged 없음. IR 문서 생성 외 수정 없음.

---

## 3. 조사 대상 서비스/파일

| 서비스 | admin pages | dashboard 파일 |
|--------|:-----------:|--------------|
| KPA | 3 pages | `KpaAdminDashboardPage.tsx` |
| GlycoPharm | 2 pages | `GlycoPharmAdminDashboard.tsx` |
| K-Cosmetics | 2 pages | `KCosmeticsAdminDashboard.tsx` |
| Neture | 22+ pages | `AdminDashboardPage.tsx` |

**공통 패키지**: `packages/admin-ux-core/` — 4-Block layout + 개별 블록 + 타입 정의

---

## 4. `@o4o/admin-ux-core` 패키지 현황

### 구조

```
packages/admin-ux-core/src/
  AdminDashboardLayout.tsx     — 4-Block 통합 레이아웃 (config 주입형)
  types.ts                     — AdminDashboardConfig 타입
  blocks/
    StructureSnapshotBlock.tsx — Block A: 구조 KPI
    PolicyOverviewBlock.tsx    — Block B: 정책 현황
    GovernanceAlertBlock.tsx   — Block C: 거버넌스 경고
    StructureActionBlock.tsx   — Block D: 빠른 액션
  index.ts
```

### AdminDashboardLayout 설계

```tsx
// 서비스는 AdminDashboardConfig만 주입
<AdminDashboardLayout config={AdminDashboardConfig}>
  // Block 순서 고정:
  Block A: StructureSnapshotBlock  (구조 KPI)
  Block B: PolicyOverviewBlock     (정책 현황)
  Block C: GovernanceAlertBlock    (거버넌스 경고)
  Block D: StructureActionBlock    (빠른 액션)
```

### AdminDashboardConfig 타입

```typescript
interface AdminDashboardConfig {
  structureMetrics: StructureMetric[];    // Block A
  policies: PolicyItem[];                 // Block B
  governanceAlerts: GovernanceAlert[];    // Block C
  structureActions: StructureAction[];    // Block D
}
```

**Operator 5-block과 완전 분리된 설계.** Admin 철학: "구조 정의자" — 일상 운영이 아닌 정책·거버넌스·금융 담당.

---

## 5. KPA admin dashboard 현황

**파일**: `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx`  
**구현 방식**: `admin-ux-core` **미사용** — 완전 커스텀 JSX

| 항목 | 내용 |
|------|------|
| 레이아웃 | `max-w-5xl mx-auto` div 직접 구성 |
| 색상 테마 | indigo (#4f46e5) — operator blue(#2563eb)와 시각 구분 |
| Block A 해당 | 3개 KPI 카드 (활성 회원, 승인 대기, 등록 분회) |
| Block B 해당 | 최근 가입 신청 목록 |
| Block C | ❌ 없음 |
| Block D 해당 | 빠른 이동 링크 2개 (회원 관리, 운영 대시보드) |

**API**: `operatorApi.getDistrictSummary(10)` — KPA 분회 구조 특화 API  
**라우트**: `AdminLayout + AdminAuthGuard` → `/admin/kpa-dashboard`, `/admin/members`  
**특이점**: operator dashboard로 이동하는 링크 존재. 분회(branch) KPI는 KPA-only.

---

## 6. GlycoPharm admin dashboard 현황

**파일**: `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx`  
**구현 방식**: `admin-ux-core` 블록 **개별 사용** — `AdminDashboardLayout` wrapper 미사용

| 항목 | 내용 |
|------|------|
| 레이아웃 | `space-y-6` div 직접 (wrapper 없음) |
| Block A | `StructureSnapshotBlock` (active-pharmacies, pending-applications, active-products) |
| Block B | `PolicyOverviewBlock` (약국 승인, 정산, 청구, 인보이스, 역할 관리) |
| Block C | ❌ `GovernanceAlertBlock` 없음 |
| Block D | `StructureActionBlock` (회원관리, 약국 네트워크, 정산, 인보이스, 역할, 설정 6개) |
| Phase 2 | **로컬 `AdminBlock` 컴포넌트** — Finance, Governance, Network 3개 섹션 (admin-ux-core 외부) |

**API**: `fetchOperatorDashboard()` → `ADMIN_KPI_KEYS` 필터 재매핑 (operator API 재사용)  
**라우트**: `RoleGuard(glycopharm:admin)` → `/admin` index  
**특이점**: admin-ux-core 블록 사용하나 wrapper 미적용. 로컬 AdminBlock이 Finance/Governance/Network 상세 링크를 담당.

---

## 7. K-Cosmetics admin dashboard 현황

**파일**: `services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminDashboard.tsx`  
**구현 방식**: GlycoPharm과 **동일한 패턴** (블록 개별 사용, wrapper 미사용)

| 항목 | 내용 |
|------|------|
| 레이아웃 | `space-y-6` div 직접 |
| Block A | `StructureSnapshotBlock` (total-stores, monthly-revenue, active-products, active-orders, cms-published) |
| Block B | `PolicyOverviewBlock` (매장 관리, 회원 관리, 콘텐츠, 시스템 설정) |
| Block C | ❌ `GovernanceAlertBlock` 없음 |
| Block D | `StructureActionBlock` |
| 추가 | **로컬 `AdminBlock`** (GP와 동일 구조, 다른 링크) — Governance, Network |

**API**: `operatorApi.getDashboardSummary()` → `ADMIN_KPI_KEYS` 필터 재매핑  
**라우트**: `ProtectedRoute(cosmetics:admin)` → `/admin` index  
**특이점**: GP와 코드 구조 거의 동일. 로컬 AdminBlock 컴포넌트 중복 (서비스별 복사본).

---

## 8. Neture admin dashboard 현황

**파일**: `services/web-neture/src/pages/admin/AdminDashboardPage.tsx`  
**구현 방식**: `AdminDashboardLayout` **완전 사용** — 4-block 통합 레이아웃 적용 완료

| 항목 | 내용 |
|------|------|
| 레이아웃 | `<AdminDashboardLayout config={config} />` — wrapper 완전 적용 ✅ |
| Block A | StructureSnapshotBlock (사용자, 공급사, 승인, 파트너) |
| Block B | PolicyOverviewBlock (상품/공급사/가입/파트너 승인 현황) |
| Block C | **GovernanceAlertBlock** (AI 기반 거버넌스 경고) ✅ |
| Block D | StructureActionBlock (구조 변경 진입점) |

**API**: `/neture/admin/dashboard` **전용 admin API** (operator 재매핑 아님)  
**라우트**: `AdminRoute` → `/admin`  
**admin pages 수**: 22+ pages (dashboard는 허브, 나머지는 Neture 특수 운영 콘솔)  
**특이점**: 4개 서비스 중 `AdminDashboardLayout` 유일 완전 적용. GovernanceAlerts 활용. 전용 backend API 보유.

---

## 9. Admin navigation 구조 비교

| 항목 | KPA | GlycoPharm | K-Cosmetics | Neture |
|------|-----|-----------|------------|--------|
| admin guard | `AdminAuthGuard` | `RoleGuard(glycopharm:admin)` | `ProtectedRoute(cosmetics:admin)` | `AdminRoute` |
| admin 진입 경로 | `/admin/kpa-dashboard` | `/admin` | `/admin` | `/admin` |
| admin sidebar | `AdminLayout` (전용) | `DashboardLayout role="admin"` | `DashboardLayout role="admin"` | 전용 레이아웃 |
| operator 링크 from admin | `/operator` 빠른 이동 ✅ | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| admin pages 수 | 2 | 2 | 2 | 22+ |
| admin/operator 분리 | 완전 분리 (AdminRoutes) | App.tsx 라우트 분리 | App.tsx 라우트 분리 | 완전 분리 |

---

## 10. Admin/Operator 책임 경계 비교

| 서비스 | Admin 책임 | Operator 책임 |
|--------|-----------|-------------|
| **KPA** | 회원 완전삭제, 분회 구조 | 회원 승인/정지/관리, 운영 전반 |
| **GlycoPharm** | 회원 완전삭제, 재무/정산, 역할 관리, 약국 네트워크 거버넌스 | 약국 일상 운영, 상품/주문, 콘텐츠 |
| **K-Cosmetics** | 회원 완전삭제, 매장/콘텐츠 거버넌스, 역할 | 매장/상품/주문/콘텐츠 운영 |
| **Neture** | 공급사/파트너 승인, 정산, AI ops, 카탈로그 import, 커미션 | 매장/주문 일상 운영, 회원 관리 |

**CLAUDE.md §11 기준** (`Admin = 구조+정책+거버넌스+금융`): 4개 서비스 모두 이 경계를 준수하고 있음. ✅

---

## 11. 공통 레이아웃 후보 및 마이그레이션 분석

### 현황 요약

| 서비스 | admin-ux-core 블록 | AdminDashboardLayout wrapper | GovernanceAlerts |
|--------|:-----------------:|:---------------------------:|:---------------:|
| **Neture** | ✅ 사용 | ✅ 완전 적용 | ✅ |
| **GlycoPharm** | ✅ 사용 | ❌ 미적용 | ❌ |
| **K-Cosmetics** | ✅ 사용 | ❌ 미적용 | ❌ |
| **KPA** | ❌ 미사용 | ❌ 미적용 | ❌ |

### 마이그레이션 가능성

| 서비스 | 가능성 | 필요 작업 | 위험도 |
|--------|:------:|---------|:-----:|
| GP | ✅ 높음 | `AdminDashboardLayout` wrapper 씌우기 + 로컬 AdminBlock을 config 주입으로 전환 | 낮음 |
| KCOS | ✅ 높음 | 동일 (GP와 코드 구조 동일) | 낮음 |
| KPA | ⚠️ 중간 | 독자 구현 → admin-ux-core 블록 이식. `getDistrictSummary` KPI를 `StructureMetric`으로 매핑. `AdminAuthGuard` 유지. | 중간 |
| Neture | ✅ 이미 완료 | 없음 | — |

### 로컬 AdminBlock 중복 문제

GP와 KCOS 모두 동일한 `AdminBlock` 로컬 컴포넌트를 각자 파일에서 구현하고 있다. 이 컴포넌트는 제목/설명/링크 목록을 받아 카드 형태로 렌더링하는 범용 패턴이다. → `admin-ux-core`에 공통 컴포넌트로 추출 가능.

---

## 12. 서비스별 예외 유지 필요 영역

| 서비스 | 예외 항목 | 이유 |
|--------|---------|------|
| **KPA** | `getDistrictSummary` API (분회 KPI) | 다른 서비스에 없는 KPA-only 데이터 |
| **KPA** | `AdminAuthGuard` guard 패턴 | KPA 독자 admin 인증 로직. GP/KCOS의 RoleGuard와 다름 |
| **KPA** | indigo 색상 테마 | operator blue와의 시각적 구분 의도. 유지 가능 |
| **GlycoPharm** | Phase 2 Finance 링크 (정산/인보이스/청구 리포트) | GlycoPharm 특수 재무 경로 |
| **K-Cosmetics** | cosmetics 특화 KPI (total-stores, cms-published) | KCOS 도메인 지표 |
| **Neture** | admin 22 pages 전체 | `AdminDashboardPage` 허브 외 나머지는 Neture 특수. 강제 통합 금지 |
| **Neture** | GovernanceAlerts AI 연동 | Neture AI ops 특수 기능 |

---

## 13. 공통화 위험성

| 위험 | 영향 서비스 | 설명 |
|------|-----------|------|
| KPA AdminAuthGuard 변경 | KPA | GP/KCOS와 guard 패턴 통일 시 KPA admin 보안 로직 변경 필요 |
| Neture 22 pages 강제 통합 | Neture | 대시보드 허브 외 나머지는 Neture 특수 콘솔. 강제 공통화 금지 |
| GP/KCOS Phase 2 AdminBlock 공통화 | GP, KCOS | 링크 경로(정산/인보이스/약국 vs 매장/거버넌스) 다름. 블록 구조만 공통화하고 config는 서비스별 |
| GP/KCOS Operator API 재매핑 의존 | GP, KCOS | 전용 admin API 없이 operator API 필터링 사용 — 장기적으로 backend contract 개선 필요 (별도 IR) |

---

## 14. 우선순위 제안

### 🔴 즉시 가능 (이 채팅방, 낮은 위험도)

| 순서 | WO | 설명 |
|:---:|-----|------|
| 1 | `WO-O4O-GLYCOPHARM-ADMIN-DASHBOARD-LAYOUT-WRAPPER-V1` | `AdminDashboardLayout` wrapper 적용. Phase 2 AdminBlock을 `StructureActionBlock` config 주입으로 전환 또는 AdminBlock을 admin-ux-core 공통 컴포넌트로 추출 후 사용. |
| 2 | `WO-O4O-KCOS-ADMIN-DASHBOARD-LAYOUT-WRAPPER-V1` | GP와 동일. KCOS 서비스 링크만 다름. |
| 3 | `WO-O4O-ADMIN-UX-CORE-ADMIN-BLOCK-EXTRACTION-V1` | GP/KCOS 로컬 AdminBlock → `packages/admin-ux-core` 공통 컴포넌트 추출. 중복 해소. |

### 🟡 검토 후 진행 (중간 위험도)

| 순서 | WO | 설명 |
|:---:|-----|------|
| 4 | `WO-O4O-KPA-ADMIN-DASHBOARD-ADMIN-UX-CORE-MIGRATION-V1` | KPA 독자 구현 → admin-ux-core 블록. `getDistrictSummary` KPI를 `StructureMetric`으로 매핑. `AdminAuthGuard` 유지. |

### 🟢 장기/별도 IR

| 항목 | 설명 |
|------|------|
| GP/KCOS admin 전용 backend API | Operator API 재매핑 의존 해소 — backend contract IR 필요 |
| Neture admin pages 정렬 | 22 pages — Neture 담당 채팅방에서 |

---

## 15. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|:---:|
| **Admin = 구조+정책+거버넌스+금융** | 4개 서비스 모두 이 경계 준수. admin은 완전삭제·정산·거버넌스, operator는 일상 운영. | ✅ 충돌 없음 |
| **Admin dashboard 공통화 기반** | `@o4o/admin-ux-core` 4-Block이 이미 존재. Neture는 완전 적용. GP/KCOS는 블록은 사용하나 wrapper 미적용. KPA는 독자. **신규 개발 불필요, 정합만 필요**. | ⚠️ 정합 가능 |
| **서비스별 차이 = 도메인 차이 vs 구현 편차** | GP/KCOS 로컬 AdminBlock 중복 → **구현 편차** (정합 대상). KPA 독자 구현 → **부분 편차** (API 차이 존재). Neture 22 pages → **도메인 차이** (정당 분리). | ✅ 명확히 구분됨 |
| **동일 조작 질서** | 4-Block A→B→C→D 순서가 표준. GP/KCOS는 블록 사용하나 wrapper 없어 C(GovernanceAlerts) 누락. → 적용하면 완성. | ⚠️ GP/KCOS 정합 권장 |
| **Neture admin 특수성** | `AdminDashboardPage` 허브만 공통, 나머지 22 pages는 Neture 도메인 특수 콘솔. **의도된 분리이며 공통화 대상 아님**. | ✅ |
| **1인 개발 생산성** | GP/KCOS 로컬 AdminBlock 중복이 유지보수 비용 증가. admin-ux-core 공통 추출로 단일 소스 유지 가능. KPA 독자 구현 유지보수 비용 있음. | ⚠️ 정합 권장 |

**결론**:
1. `@o4o/admin-ux-core`가 이미 존재하여 신규 공통 레이아웃 개발 불필요.
2. GP/KCOS: `AdminDashboardLayout` wrapper 적용 + 로컬 AdminBlock 공통 추출 → 즉시 실행 가능.
3. KPA: API 차이 해결 후 admin-ux-core 블록 이식 → 중간 우선도.
4. Neture: 대시보드 허브는 완료 상태. 22 pages는 Neture 특수 영역 유지.

---

## 부록 — 조사한 주요 파일

| 파일 | 내용 |
|------|------|
| `services/web-kpa-society/src/pages/admin/KpaAdminDashboardPage.tsx` | KPA admin 독자 구현 (161줄) |
| `services/web-kpa-society/src/routes/AdminRoutes.tsx` | KPA admin 라우트 구조 |
| `services/web-glycopharm/src/pages/admin/GlycoPharmAdminDashboard.tsx` | GP admin (329줄, 블록 개별 + 로컬 AdminBlock) |
| `services/web-k-cosmetics/src/pages/admin/KCosmeticsAdminDashboard.tsx` | KCOS admin (GP와 동일 패턴) |
| `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` | Neture admin (AdminDashboardLayout 완전 적용) |
| `packages/admin-ux-core/src/AdminDashboardLayout.tsx` | 공통 4-block 레이아웃 |
| `packages/admin-ux-core/src/types.ts` | AdminDashboardConfig 타입 |
| `packages/admin-ux-core/src/index.ts` | 패키지 export |

---

*작성: Claude Code (2026-06-01)*
*read-only 조사 — 코드/DB/source/migration 수정 없음*
*다른 세션 WIP 미접촉*
