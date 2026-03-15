# IR-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-RELOCATION-AUDIT-V1

> Neture Admin / Operator Dashboard 재배치 감사
> 조사일: 2026-03-15
> 상태: **조사 완료**

---

## Executive Summary

| 질문 | 답변 | 판정 |
|------|------|------|
| 정답 Admin Dashboard는? | `AdminDashboardPage` (4-Block + Partner KPI) | **확정** |
| 정답 Operator Dashboard는? | `NetureOperatorDashboard` (8-Block Copilot) | **확정** |
| 라우트가 정답 화면을 가리키는가? | YES — 둘 다 정상 연결 | **정상** |
| 레거시 Dashboard가 남아 있는가? | YES — 3개 파일 + operatorConfig.ts | **삭제 대상** |
| 재배치 필요한 기능이 있는가? | NO — Admin/Operator 기능 분리 완료 | **완료** |

---

## 1. 정답 Dashboard 확정

### Admin Dashboard — `AdminDashboardPage`

| 항목 | 내용 |
|------|------|
| 파일 | `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` |
| 라우트 | `/workspace/admin` (index route) |
| 레이아웃 | `AdminLayout` (Sidebar, 8 groups) |
| 권한 | `allowedRoles={['admin']}` |
| 구조 | 4-Block + Partner KPI |
| API | `dashboardApi.getAdminDashboardSummary()` + `dashboardApi.getPartnerKpiSummary()` |

**Block 구조:**

| Block | 이름 | 기능 |
|-------|------|------|
| A | Structure Snapshot | 등록 공급자, 활성 공급자, 파트너십 요청, 승인 대기 |
| B | Policy Overview | AI 정책, 승인 정책, 이메일 설정 |
| C | Governance Alerts | 승인 대기 경고, 파트너 요청 경고, 콘텐츠 부재 경고 |
| D | Structure Actions | 공급자/파트너/운영자/AI/이메일 관리 진입점 |
| + | Partner KPI | Active Partners, Commission, Settlements |

### Operator Dashboard — `NetureOperatorDashboard`

| 항목 | 내용 |
|------|------|
| 파일 | `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` |
| 라우트 | `/workspace/operator` (index route) |
| 레이아웃 | `OperatorLayout` (Top Nav, 7 items) |
| 권한 | `allowedRoles={['admin', 'operator']}` |
| 구조 | 8-Block AI Copilot |
| API | `operatorCopilotApi.*` (7 endpoints) |

**Block 구조:**

| Block | 이름 | 기능 |
|-------|------|------|
| 1 | 플랫폼 KPI | 총 매장, 총 공급자, 등록 상품, 최근 7일 주문 |
| 2 | AI 플랫폼 요약 | Copilot 분석 (리스크 판정, 추천 액션) |
| 3 | 신규 매장 | 최근 등록 매장 리스트 |
| 4 | 공급자 활동 | 최근 공급자 상품 등록 활동 |
| 5 | 상품 승인 대기 | 승인 필요 상품 리스트 |
| 6 | 플랫폼 트렌드 | 주문 변동, 신규 매장/공급자 성장 지표 |
| 7 | 위험 알림 | 운영 리스크 (severity: high/medium/low) |
| 8 | 운영 액션 | AI 추천 액션 + Quick Links |

---

## 2. 라우트 연결 확인

### Admin Workspace — 27개 라우트 (AdminLayout)

| 라우트 | 컴포넌트 | 상태 |
|--------|----------|:----:|
| `/workspace/admin` | AdminDashboardPage | **정답** |
| `/workspace/admin/ai` | AiAdminDashboardPage | OK |
| `/workspace/admin/ai/engines` | AiEnginesPage | OK |
| `/workspace/admin/ai/policy` | AiPolicyPage | OK |
| `/workspace/admin/ai/cost` | AiCostPage | OK |
| `/workspace/admin/ai/context-assets` | ContextAssetListPage | OK |
| `/workspace/admin/ai/context-assets/new` | ContextAssetFormPage | OK |
| `/workspace/admin/ai/context-assets/:id/edit` | ContextAssetFormPage | OK |
| `/workspace/admin/ai/composition-rules` | AnswerCompositionRulesPage | OK |
| `/workspace/admin/ai-card-rules` | AiCardExplainPage | OK |
| `/workspace/admin/ai-business-pack` | AiBusinessPackPage | OK |
| `/workspace/admin/settings/email` | EmailSettingsPage | OK |
| `/workspace/admin/operators` | OperatorsPage | OK |
| `/workspace/admin/suppliers` | AdminSupplierApprovalPage | OK |
| `/workspace/admin/products` | AdminProductApprovalPage | OK |
| `/workspace/admin/masters` | AdminMasterManagementPage | OK |
| `/workspace/admin/service-approvals` | AdminServiceApprovalPage | OK |
| `/workspace/admin/settlements` | AdminSettlementsPage | OK |
| `/workspace/admin/commissions` | AdminCommissionsPage | OK |
| `/workspace/admin/partner-settlements` | AdminPartnerSettlementsPage | OK |
| `/workspace/admin/partners` | AdminPartnerMonitoringPage | OK |
| `/workspace/admin/partners/:id` | AdminPartnerDetailPage | OK |
| `/workspace/admin/catalog-import` | CatalogImportDashboardPage | OK |
| `/workspace/admin/catalog-import/csv` | CSVImportPage | OK |
| `/workspace/admin/catalog-import/firstmall` | FirstmallImportPage | OK |
| `/workspace/admin/catalog-import/history` | ImportHistoryPage | OK |
| `/workspace/admin/contact-messages` | AdminContactMessagesPage | OK |
| `/workspace/admin/community` | CommunityManagementPage | OK |

### Operator Workspace — 16개 라우트 (OperatorLayout)

| 라우트 | 컴포넌트 | 상태 |
|--------|----------|:----:|
| `/workspace/operator` | NetureOperatorDashboard | **정답** |
| `/workspace/operator/ai-report` | OperatorAiReportPage | OK |
| `/workspace/operator/settings/notifications` | EmailNotificationSettingsPage | OK |
| `/workspace/operator/registrations` | RegistrationRequestsPage | OK |
| `/workspace/operator/forum-management` | ForumManagementPage | OK |
| `/workspace/operator/supply` | SupplyDashboardPage | OK |
| `/workspace/operator/ai-card-report` | AiCardReportPage | OK |
| `/workspace/operator/ai-operations` | AiOperationsPage | OK |
| `/workspace/operator/ai/asset-quality` | AssetQualityPage | OK |
| `/workspace/operator/signage/hq-media` | SignageHqMediaPage | OK |
| `/workspace/operator/signage/hq-media/:mediaId` | SignageHqMediaDetailPage | OK |
| `/workspace/operator/signage/hq-playlists` | SignageHqPlaylistsPage | OK |
| `/workspace/operator/signage/hq-playlists/:playlistId` | SignageHqPlaylistDetailPage | OK |
| `/workspace/operator/signage/templates` | SignageTemplatesPage | OK |
| `/workspace/operator/signage/templates/:templateId` | SignageTemplateDetailPage | OK |
| `/workspace/operator/homepage-cms` | HomepageCmsPage | OK |

### Legacy Redirects (App.tsx)

| 레거시 경로 | 리다이렉트 | 상태 |
|-------------|-----------|:----:|
| `/admin` | `/workspace/admin` | OK |
| `/admin/*` | `/workspace/admin` | OK |
| `/operator` | `/workspace/operator` | OK |
| `/operator/*` | `/workspace/operator` | OK |

---

## 3. Admin vs Operator 기능 배치 검증

### 재배치 정책 기준

| 기능 | 소속 | 현재 위치 | 판정 |
|------|------|----------|:----:|
| 플랫폼 설정 | Admin | `/workspace/admin/settings/*` | **정위치** |
| AI 정책/엔진 관리 | Admin | `/workspace/admin/ai/*` | **정위치** |
| 파트너 관리/정산 | Admin | `/workspace/admin/partners/*` | **정위치** |
| 정산/수수료 관리 | Admin | `/workspace/admin/settlements/*` | **정위치** |
| 공급자 승인 | Admin | `/workspace/admin/suppliers` | **정위치** |
| 상품 승인 | Admin | `/workspace/admin/products` | **정위치** |
| 운영자 관리 | Admin | `/workspace/admin/operators` | **정위치** |
| 가입 승인 | Operator | `/workspace/operator/registrations` | **정위치** |
| 공급 운영 | Operator | `/workspace/operator/supply` | **정위치** |
| 포럼 관리 | Operator | `/workspace/operator/forum-management` | **정위치** |
| 사이니지 | Operator | `/workspace/operator/signage/*` | **정위치** |
| AI 리포트 | Operator | `/workspace/operator/ai-report` | **정위치** |
| 홈페이지 CMS | Operator | `/workspace/operator/homepage-cms` | **정위치** |

**판정: 모든 기능이 정위치에 배치되어 있다. 재배치 불필요.**

---

## 4. Layout Navigation 검증

### AdminLayout Sidebar — 8 Groups

| 그룹 | 메뉴 항목 | 경로 | 데드링크 |
|------|----------|------|:--------:|
| Dashboard | 대시보드 | `/workspace/admin` | NO |
| 사용자 관리 | 운영자 | `/workspace/admin/operators` | NO |
| | 문의 메시지 | `/workspace/admin/contact-messages` | NO |
| 공급자 관리 | 공급자 승인 | `/workspace/admin/service-approvals` | NO |
| | 공급자 목록 | `/workspace/admin/suppliers` | NO |
| 상품 관리 | 상품 승인 | `/workspace/admin/products` | NO |
| | Product Masters | `/workspace/admin/masters` | NO |
| | 카탈로그 Import | `/workspace/admin/catalog-import` | NO |
| 파트너 관리 | 파트너 목록 | `/workspace/admin/partners` | NO |
| | 파트너 정산 | `/workspace/admin/partner-settlements` | NO |
| 주문·정산 | 정산 관리 | `/workspace/admin/settlements` | NO |
| | 수수료 관리 | `/workspace/admin/commissions` | NO |
| 커뮤니티 | 광고·스폰서 | `/workspace/admin/community` | NO |
| AI 관리 | AI 대시보드 | `/workspace/admin/ai` | NO |
| | AI 카드 규칙 | `/workspace/admin/ai-card-rules` | NO |
| | AI 비즈니스 팩 | `/workspace/admin/ai-business-pack` | NO |
| 시스템 설정 | 이메일 설정 | `/workspace/admin/settings/email` | NO |

### OperatorLayout Top Nav — 7 Items

| 메뉴 | 경로 | 데드링크 |
|------|------|:--------:|
| 대시보드 | `/workspace/operator` | NO |
| 가입 승인 | `/workspace/operator/registrations` | NO |
| 공급 현황 | `/workspace/operator/supply` | NO |
| 사이니지 | `/workspace/operator/signage/hq-media` | NO |
| 포럼 관리 | `/workspace/operator/forum-management` | NO |
| AI 리포트 | `/workspace/operator/ai-report` | NO |
| 홈페이지 CMS | `/workspace/operator/homepage-cms` | NO |

**판정: Layout Navigation에 데드링크 없음.**

---

## 5. 레거시 Dashboard 판정

### 판정 기준

| 조건 | 판정 |
|------|------|
| 라우트 연결 없음 | 삭제 대상 |
| Import 없음 | 삭제 대상 |
| 사용 API 없음 | 삭제 대상 |
| 재배치 정책과 불일치 | 삭제 대상 |

### 레거시 파일 목록

| # | 파일 | Import 여부 | 라우트 연결 | 판정 |
|---|------|:----------:|:----------:|------|
| 1 | `pages/dashboard/SupplierDashboardPage.tsx` | NO | NO | **삭제** |
| 2 | `pages/dashboard/PartnerDashboardPage.tsx` | NO | NO | **삭제** |
| 3 | `pages/dashboard/index.ts` | NO (위 2개만 export) | — | **삭제** |
| 4 | `pages/operator/operatorConfig.ts` | NO (`buildNetureOperatorConfig` 0 사용) | — | **삭제** |

### 상세 분석

#### `pages/dashboard/SupplierDashboardPage.tsx`

- `pages/dashboard/index.ts`에서 export하지만, App.tsx에서 import하지 않음
- App.tsx의 `SupplierDashboardPage`는 `pages/supplier/`에서 import (동명 별개 파일)
- **Dead code**

#### `pages/dashboard/PartnerDashboardPage.tsx`

- `pages/dashboard/index.ts`에서 export하지만, App.tsx에서 import하지 않음
- App.tsx의 partner dashboard는 `pages/partner/`에서 import
- **Dead code**

#### `pages/dashboard/index.ts`

- 위 2개 파일만 re-export
- 두 파일 모두 dead code이므로 index도 **dead code**

#### `pages/operator/operatorConfig.ts`

- `buildNetureOperatorConfig` 함수 export
- 전체 코드베이스에서 import 0건
- 구 Signal 기반 대시보드 잔존 코드 (현재는 Copilot API 방식)
- 데드링크 2개 포함: `/workspace/content`, `/workspace/suppliers`
- **Dead code**

#### `pages/dashboard/MyContentPage.tsx` — 유지

- App.tsx line 118에서 import됨
- 실제 라우트에 연결됨
- **삭제 대상 아님** (dashboard 디렉토리에 있지만 활성 코드)

---

## 6. 최종 판정표

| Dashboard | 파일 위치 | 라우트 | 판정 |
|-----------|----------|--------|------|
| **AdminDashboardPage** | `pages/admin/AdminDashboardPage.tsx` | `/workspace/admin` | **정답 — 유지** |
| **NetureOperatorDashboard** | `pages/operator/NetureOperatorDashboard.tsx` | `/workspace/operator` | **정답 — 유지** |
| SupplierDashboardPage (dashboard/) | `pages/dashboard/SupplierDashboardPage.tsx` | 없음 | **레거시 — 삭제** |
| PartnerDashboardPage (dashboard/) | `pages/dashboard/PartnerDashboardPage.tsx` | 없음 | **레거시 — 삭제** |
| dashboard/index.ts | `pages/dashboard/index.ts` | — | **레거시 — 삭제** |
| operatorConfig.ts | `pages/operator/operatorConfig.ts` | — | **레거시 — 삭제** |

---

## 7. 후속 WO 정의

### WO-O4O-NETURE-DASHBOARD-LEGACY-REMOVE-V1

**목적**: 미사용 레거시 Dashboard 파일 4개 삭제

**삭제 대상:**

```
services/web-neture/src/pages/dashboard/SupplierDashboardPage.tsx
services/web-neture/src/pages/dashboard/PartnerDashboardPage.tsx
services/web-neture/src/pages/dashboard/index.ts
services/web-neture/src/pages/operator/operatorConfig.ts
```

**유지 (삭제 금지):**

```
services/web-neture/src/pages/dashboard/MyContentPage.tsx  (활성 — App.tsx import)
```

**검증:**
1. TypeScript 빌드 통과
2. 기존 라우트 영향 없음 (삭제 파일은 import 0건)

### WO-O4O-NETURE-DASHBOARD-RELOCATION-V1

**판정: 불필요.**

현재 Admin/Operator 기능 배치가 재배치 정책과 일치한다. 이동할 기능 없음.

---

## 8. 현재 구조 아키텍처 요약

```
/workspace/admin (AdminLayout — Sidebar 8 Groups)
├── 대시보드        AdminDashboardPage (4-Block + Partner KPI)
├── 사용자 관리
│   ├── 운영자      OperatorsPage
│   └── 문의 메시지   AdminContactMessagesPage
├── 공급자 관리
│   ├── 공급자 승인   AdminServiceApprovalPage
│   └── 공급자 목록   AdminSupplierApprovalPage
├── 상품 관리
│   ├── 상품 승인    AdminProductApprovalPage
│   ├── Masters    AdminMasterManagementPage
│   └── 카탈로그     CatalogImportDashboardPage
├── 파트너 관리
│   ├── 파트너 목록   AdminPartnerMonitoringPage
│   └── 파트너 정산   AdminPartnerSettlementsPage
├── 주문·정산
│   ├── 정산 관리    AdminSettlementsPage
│   └── 수수료 관리   AdminCommissionsPage
├── 커뮤니티
│   └── 광고·스폰서   CommunityManagementPage
├── AI 관리
│   ├── AI 대시보드   AiAdminDashboardPage
│   ├── AI 카드 규칙  AiCardExplainPage
│   └── AI 비즈니스 팩 AiBusinessPackPage
└── 시스템 설정
    └── 이메일 설정   EmailSettingsPage

/workspace/operator (OperatorLayout — Top Nav 7 Items)
├── 대시보드        NetureOperatorDashboard (8-Block Copilot)
├── 가입 승인       RegistrationRequestsPage
├── 공급 현황       SupplyDashboardPage
├── 사이니지
│   ├── HQ 미디어   SignageHqMediaPage
│   ├── HQ 플레이리스트 SignageHqPlaylistsPage
│   └── 템플릿      SignageTemplatesPage
├── 포럼 관리       ForumManagementPage
├── AI 리포트       OperatorAiReportPage
│   ├── AI 카드 리포트 AiCardReportPage
│   ├── AI 운영     AiOperationsPage
│   └── 자산 품질    AssetQualityPage
├── 홈페이지 CMS    HomepageCmsPage
└── 알림 설정       EmailNotificationSettingsPage
```

---

## 관련 파일

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/App.tsx` | 전체 라우트 정의 |
| `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` | Admin 정답 대시보드 |
| `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` | Operator 정답 대시보드 |
| `services/web-neture/src/components/layouts/AdminLayout.tsx` | Admin Sidebar 레이아웃 |
| `services/web-neture/src/components/layouts/OperatorLayout.tsx` | Operator Top Nav 레이아웃 |
| `services/web-neture/src/pages/operator/operatorConfig.ts` | 레거시 (삭제 대상) |
| `services/web-neture/src/pages/dashboard/SupplierDashboardPage.tsx` | 레거시 (삭제 대상) |
| `services/web-neture/src/pages/dashboard/PartnerDashboardPage.tsx` | 레거시 (삭제 대상) |
| `services/web-neture/src/pages/dashboard/index.ts` | 레거시 (삭제 대상) |

---

*IR-O4O-NETURE-ADMIN-OPERATOR-DASHBOARD-RELOCATION-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
