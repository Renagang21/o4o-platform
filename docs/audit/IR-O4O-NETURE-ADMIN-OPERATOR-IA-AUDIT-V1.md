# IR-O4O-NETURE-ADMIN-OPERATOR-IA-AUDIT-V1

Neture Admin / Operator 정보구조(IA) 감사 보고서

- 조사일: 2026-03-15
- 대상 서비스: **Neture (neture.co.kr)**
- 감사 범위: Workspace 역할 구조, 메뉴 IA, 라우트 연결, 데이터 API, UX 일관성
- 상태: **Complete**

---

## 1. Executive Summary

### 발견된 문제

| # | 문제 | 심각도 | 위치 |
|---|------|--------|------|
| P1 | Admin Dashboard 링크 10개 중 8개가 데드링크 | **HIGH** | AdminDashboardPage.tsx |
| P2 | AI 페이지 3개가 `pages/admin/`에 위치하지만 Operator에서만 사용 | **MEDIUM** | App.tsx routes |
| P3 | Admin/Operator 기능 경계가 불명확 | **MEDIUM** | 전체 구조 |
| P4 | Admin Dashboard `pendingRequests` ↔ Operator `registrations` 데이터 소스 불일치 가능성 | **LOW** | API layer |

### Workspace 규모 비교

| 항목 | Admin | Operator |
|------|:-----:|:--------:|
| 라우트 수 | 28 | 18 |
| 메뉴 항목 | 27 (8그룹) | 7 (flat) |
| 페이지 파일 | 36 | 14 |
| 대시보드 구조 | 4-Block + Partner KPI | 8-Block Copilot |
| Layout | Sidebar (좌측) | Top Nav (상단) |
| Role Guard | `['admin']` | `['admin', 'operator']` |

---

## 2. Admin Workspace 구조

### 2.1 Layout

**파일**: `services/web-neture/src/components/layouts/AdminLayout.tsx`

- **형태**: 좌측 Sidebar (60px, 아이콘 + 툴팁)
- **구조**: 8개 그룹, 27개 메뉴 항목
- **설정**: 인라인 하드코딩 (`ADMIN_SIDEBAR_GROUPS` 상수)

### 2.2 Sidebar 메뉴

| 그룹 | 아이콘 | 메뉴 항목 | 경로 |
|------|--------|----------|------|
| Dashboard | Home | 대시보드 | `/workspace/admin` |
| 사용자 관리 | Users | 운영자 | `/workspace/admin/operators` |
| | | 문의 메시지 | `/workspace/admin/contact-messages` |
| 공급자 관리 | Truck | 공급자 승인 | `/workspace/admin/service-approvals` |
| | | 공급자 목록 | `/workspace/admin/suppliers` |
| 상품 관리 | Package | 상품 승인 | `/workspace/admin/products` |
| | | Product Masters | `/workspace/admin/masters` |
| | | 카탈로그 Import | `/workspace/admin/catalog-import` |
| 파트너 관리 | Handshake | 파트너 목록 | `/workspace/admin/partners` |
| | | 파트너 정산 | `/workspace/admin/partner-settlements` |
| 주문/정산 | ShoppingCart | 정산 관리 | `/workspace/admin/settlements` |
| | | 수수료 관리 | `/workspace/admin/commissions` |
| 커뮤니티 | Megaphone | 광고/스폰서 | `/workspace/admin/community` |
| AI 관리 | Brain | AI 대시보드 | `/workspace/admin/ai` |
| | | AI 카드 규칙 | `/workspace/admin/ai-card-rules` |
| | | AI 비즈니스 팩 | `/workspace/admin/ai-business-pack` |
| 시스템 설정 | Settings | 이메일 설정 | `/workspace/admin/settings/email` |

### 2.3 Dashboard 구조 (AdminDashboardPage)

**파일**: `services/web-neture/src/pages/admin/AdminDashboardPage.tsx`

| Block | 이름 | 내용 |
|-------|------|------|
| A | Structure Snapshot | 4개 KPI 카드 (등록 공급자, 활성 공급자, 파트너십 요청, 승인 대기) |
| B | Policy Overview | 3개 정책 상태 (AI 엔진, 공급자 승인, 이메일 설정) |
| C | Governance Alerts | 동적 경고 (승인 대기, 파트너 요청, 콘텐츠 없음) |
| D | Structure Actions | 6개 퀵 액션 버튼 |
| E | Partner KPI | 4개 파트너 네트워크 지표 |

**API**: `GET /api/v1/neture/admin/dashboard/summary` + `getPartnerKpiSummary()`

### 2.4 전체 라우트 (28개)

```
/workspace/admin                          AdminDashboardPage
/workspace/admin/operators                OperatorsPage
/workspace/admin/contact-messages         AdminContactMessagesPage
/workspace/admin/service-approvals        AdminServiceApprovalPage
/workspace/admin/suppliers                AdminSupplierApprovalPage
/workspace/admin/products                 AdminProductApprovalPage
/workspace/admin/masters                  AdminMasterManagementPage
/workspace/admin/catalog-import           CatalogImportDashboardPage
/workspace/admin/catalog-import/csv       CSVImportPage
/workspace/admin/catalog-import/firstmall FirstmallImportPage
/workspace/admin/catalog-import/history   ImportHistoryPage
/workspace/admin/partners                 AdminPartnerMonitoringPage
/workspace/admin/partners/:id             AdminPartnerDetailPage
/workspace/admin/partner-settlements      AdminPartnerSettlementsPage
/workspace/admin/settlements              AdminSettlementsPage
/workspace/admin/commissions              AdminCommissionsPage
/workspace/admin/community                CommunityManagementPage
/workspace/admin/ai                       AiAdminDashboardPage
/workspace/admin/ai/engines               AiEnginesPage
/workspace/admin/ai/policy                AiPolicyPage
/workspace/admin/ai/cost                  AiCostPage
/workspace/admin/ai/context-assets        ContextAssetListPage
/workspace/admin/ai/context-assets/new    ContextAssetFormPage
/workspace/admin/ai/context-assets/:id/edit ContextAssetFormPage
/workspace/admin/ai/composition-rules     AnswerCompositionRulesPage
/workspace/admin/ai-card-rules            AiCardExplainPage
/workspace/admin/ai-business-pack         AiBusinessPackPage
/workspace/admin/settings/email           EmailSettingsPage
```

---

## 3. Operator Workspace 구조

### 3.1 Layout

**파일**: `services/web-neture/src/components/layouts/OperatorLayout.tsx`

- **형태**: 상단 Top Navigation (수평 탭)
- **구조**: 7개 메뉴 (flat)
- **설정**: 인라인 하드코딩

### 3.2 Top Navigation 메뉴

| 메뉴 | 경로 |
|------|------|
| 대시보드 | `/workspace/operator` |
| 가입 승인 | `/workspace/operator/registrations` |
| 공급 현황 | `/workspace/operator/supply` |
| 사이니지 | `/workspace/operator/signage/hq-media` |
| 포럼 관리 | `/workspace/operator/forum-management` |
| AI 리포트 | `/workspace/operator/ai-report` |
| 홈페이지 CMS | `/workspace/operator/homepage-cms` |

### 3.3 Dashboard 구조 (NetureOperatorDashboard — 8-Block Copilot)

**파일**: `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx`

| Block | 이름 | 색상 | 내용 |
|-------|------|------|------|
| 1 | 플랫폼 KPI | slate | totalStores, totalSuppliers, totalProducts, recentOrders |
| 2 | AI 플랫폼 요약 | indigo | insight.summary, riskLevel, provider/model/duration |
| 3 | 신규 매장 | slate | 최근 5개 매장 (name, createdAt) |
| 4 | 공급자 활동 | slate | 공급자 활동 로그 (product, supplier, createdAt) |
| 5 | 상품 승인 대기 | slate | 대기 중 상품 5개 |
| 6 | 플랫폼 트렌드 | emerald | 주문 성장률, 신규 매장/공급자 |
| 7 | 위험 알림 | red/amber | 알림 목록 (severity, link) |
| 8 | 운영 액션 | violet | AI 추천 + 6개 Quick Links |

**API**: 7개 Copilot 엔드포인트 (`/api/v1/operator/copilot/*`)

**Quick Links**:
- 가입 승인 → `/workspace/operator/registrations`
- 공급자 관리 → `/workspace/suppliers` (?)
- 공급 현황 → `/workspace/operator/supply`
- 콘텐츠 관리 → `/workspace/content` (?)
- 포럼 관리 → `/workspace/operator/forum-management`
- AI 리포트 → `/workspace/operator/ai-report`

### 3.4 전체 라우트 (18개)

```
/workspace/operator                              NetureOperatorDashboard
/workspace/operator/registrations                RegistrationRequestsPage
/workspace/operator/supply                       SupplyDashboardPage
/workspace/operator/forum-management             ForumManagementPage
/workspace/operator/ai-report                    OperatorAiReportPage
/workspace/operator/ai-card-report               AiCardReportPage
/workspace/operator/ai-operations                AiOperationsPage
/workspace/operator/ai/asset-quality             AssetQualityPage
/workspace/operator/settings/notifications       EmailNotificationSettingsPage
/workspace/operator/homepage-cms                 HomepageCmsPage
/workspace/operator/signage/hq-media             SignageHqMediaPage
/workspace/operator/signage/hq-media/:mediaId    SignageHqMediaDetailPage
/workspace/operator/signage/hq-playlists         SignageHqPlaylistsPage
/workspace/operator/signage/hq-playlists/:id     SignageHqPlaylistDetailPage
/workspace/operator/signage/templates            SignageTemplatesPage
/workspace/operator/signage/templates/:id        SignageTemplateDetailPage
```

---

## 4. 문제 분석

### P1: Admin Dashboard 데드링크 (HIGH)

**파일**: `AdminDashboardPage.tsx`

Admin Dashboard에서 사용하는 링크 중 **8개가 `/admin/...` 형식**으로, `/workspace/admin/...`이 아닙니다.

| 위치 | 링크 | 올바른 경로 | 동작 |
|------|------|-----------|------|
| Block B (line 71) | `/admin/ai` | `/workspace/admin/ai` | `/workspace/admin`으로 리다이렉트 |
| Block B (line 77) | `/admin/suppliers` | `/workspace/admin/suppliers` | `/workspace/admin`으로 리다이렉트 |
| Block B (line 83) | `/admin/settings/email` | `/workspace/admin/settings/email` | `/workspace/admin`으로 리다이렉트 |
| Block C (line 95) | `/admin/suppliers` | `/workspace/admin/suppliers` | `/workspace/admin`으로 리다이렉트 |
| Block C (line 104) | `/admin/partners` | `/workspace/admin/partners` | `/workspace/admin`으로 리다이렉트 |
| Block D (line 119) | `/admin/suppliers` | `/workspace/admin/suppliers` | `/workspace/admin`으로 리다이렉트 |
| Block D (line 120) | `/admin/partners` | `/workspace/admin/partners` | `/workspace/admin`으로 리다이렉트 |
| Block D (line 121) | `/admin/services` | **라우트 없음** | `/workspace/admin`으로 리다이렉트 |
| Block D (line 123) | `/admin/ai` | `/workspace/admin/ai` | `/workspace/admin`으로 리다이렉트 |
| Block D (line 124) | `/admin/settings/email` | `/workspace/admin/settings/email` | `/workspace/admin`으로 리다이렉트 |

**원인**: App.tsx에 레거시 리다이렉트가 있음:
```typescript
<Route path="/admin" element={<Navigate to="/workspace/admin" replace />} />
<Route path="/admin/*" element={<Navigate to="/workspace/admin" replace />} />
```

이 리다이렉트는 `/admin/*` → `/workspace/admin` (루트)로 보내므로, **특정 하위 페이지로 이동하지 못합니다.** 모든 링크가 Admin 대시보드로 돌아옵니다.

**정상 링크**: `Block D line 122` (`/workspace/admin/operators`)와 `Block E line 150` (`/workspace/admin/partners`)만 올바른 형식.

---

### P2: 페이지 디렉토리 위치 불일치 (MEDIUM)

3개 페이지가 `pages/admin/` 디렉토리에 위치하지만, **Operator 라우트에서만 사용**됩니다:

| 페이지 | 파일 위치 | 라우트 위치 |
|--------|----------|-----------|
| AiCardReportPage | `pages/admin/` | `/workspace/operator/ai-card-report` |
| AiOperationsPage | `pages/admin/` | `/workspace/operator/ai-operations` |
| AssetQualityPage | `pages/admin/ai/` | `/workspace/operator/ai/asset-quality` |

Admin 라우트에서는 이 3개 페이지를 사용하지 않습니다. 디렉토리 구조가 실제 사용처와 불일치합니다.

---

### P3: Admin/Operator 기능 경계 분석 (MEDIUM)

#### 기능별 소속 매핑

| 기능 영역 | Admin | Operator | 비고 |
|----------|:-----:|:--------:|------|
| **대시보드** | 4-Block 구조 | 8-Block Copilot | 각각 다른 API 사용 |
| **공급자 승인** | AdminSupplierApprovalPage | — | Admin 전용 |
| **공급 현황** | — | SupplyDashboardPage | Operator 전용 |
| **상품 승인** | AdminProductApprovalPage | — | Admin 전용 |
| **상품 승인 대기** | — | Dashboard Block 5 | Operator 대시보드에서 확인 |
| **파트너 관리** | AdminPartnerMonitoringPage | — | Admin 전용 |
| **정산/수수료** | AdminSettlementsPage, AdminCommissionsPage | — | Admin 전용 |
| **운영자 관리** | OperatorsPage | — | Admin 전용 |
| **가입 승인** | Dashboard에 KPI 표시 | RegistrationRequestsPage | **분산** |
| **포럼 관리** | — | ForumManagementPage | Operator 전용 |
| **사이니지** | — | Signage Console (6 pages) | Operator 전용 |
| **홈페이지 CMS** | — | HomepageCmsPage | Operator 전용 |
| **AI 관리** | AiAdminDashboard + 7 sub-pages | — | Admin 전용 |
| **AI 리포트** | — | OperatorAiReportPage | Operator 전용 |
| **AI 카드/운영** | — | AiCardReportPage, AiOperationsPage | Operator 전용 (파일은 admin/) |
| **커뮤니티** | CommunityManagementPage | — | Admin 전용 |
| **이메일 설정** | EmailSettingsPage | EmailNotificationSettingsPage | **분산** (다른 기능) |
| **카탈로그 Import** | 4 pages | — | Admin 전용 |
| **Product Masters** | AdminMasterManagementPage | — | Admin 전용 |
| **문의 메시지** | AdminContactMessagesPage | — | Admin 전용 |

#### 역할 설계 패턴 분석

현재 구조는 실질적으로:

```
Admin = 플랫폼 정책 + 비즈니스 관리 + AI 정책 설정
Operator = 일상 운영 + 콘텐츠/사이니지 + AI 운영 리포트
```

**기능 분산 지점**:
1. **가입 승인**: Admin Dashboard에 `pendingRequests` KPI 표시 + Operator에 관리 화면
2. **이메일**: Admin에 SMTP 설정 + Operator에 알림 설정 (서로 다른 기능이므로 정상)
3. **AI**: Admin에 정책/엔진 설정 + Operator에 리포트/카드/운영 (합리적 분리)

---

### P4: 데이터 소스 분석 (LOW)

| 항목 | API | 데이터 |
|------|-----|--------|
| Admin `pendingRequests` | `/api/v1/neture/admin/dashboard/summary` | 대시보드 집계 (정확한 소스는 백엔드 확인 필요) |
| Operator 가입 승인 | `/api/v1/neture/admin/requests` | 가입 요청 목록 |

두 API가 같은 테이블을 참조하는지 백엔드 검증이 필요하나, 엔드포인트 경로 구조상 같은 데이터를 참조할 가능성이 높습니다.

---

## 5. Operator Dashboard Quick Links 추가 검증

| Quick Link | 경로 | 라우트 존재 | 문제 |
|-----------|------|:---------:|------|
| 가입 승인 | `/workspace/operator/registrations` | YES | 정상 |
| 공급자 관리 | `/workspace/suppliers` | **NO** | 라우트 없음 |
| 공급 현황 | `/workspace/operator/supply` | YES | 정상 |
| 콘텐츠 관리 | `/workspace/content` | **NO** | 라우트 없음 |
| 포럼 관리 | `/workspace/operator/forum-management` | YES | 정상 |
| AI 리포트 | `/workspace/operator/ai-report` | YES | 정상 |

**2개 추가 데드링크** 발견: `/workspace/suppliers`와 `/workspace/content`

---

## 6. Role Guard 비대칭 분석

```
/workspace/admin/*    → allowedRoles={['admin']}
/workspace/operator/* → allowedRoles={['admin', 'operator']}
```

| 시나리오 | Admin 사용자 | Operator 사용자 |
|---------|:----------:|:-------------:|
| Admin 대시보드 접근 | YES | **NO** |
| Operator 대시보드 접근 | **YES** | YES |
| Operator 기능 사용 | **YES** (모두) | YES |

**Admin은 양쪽 모두 접근 가능**, Operator는 Operator workspace만 접근 가능. 이것은 의도된 설계로 보이지만, admin이 Operator에서 작업하면 역할 혼동이 발생할 수 있습니다.

---

## 7. 종합 판정

### 현재 구조의 문제

1. **데드링크가 심각** — Admin Dashboard의 거의 모든 액션 링크가 동작하지 않음
2. **파일 위치 불일치** — admin 디렉토리의 페이지가 operator에서만 사용
3. **Operator Dashboard Quick Links 2개 데드링크** — 공급자 관리, 콘텐츠 관리

### 현재 구조의 강점

1. **역할 분리 자체는 합리적** — Admin(정책), Operator(운영) 분리가 명확
2. **AI 분리가 적절** — 정책 설정(Admin) vs 운영 리포트(Operator)
3. **각 Dashboard가 목적에 맞는 구조** — Admin(4-Block 구조), Operator(8-Block Copilot)
4. **Guard 체계 일관성** — 역할 기반 접근 제어 작동 중

### 핵심 결론

```
Auth/RBAC 문제가 아니라 Navigation/Link 문제이다.
역할 구조는 올바르나, Dashboard의 링크가 잘못 연결되어 있다.
```

---

## 8. 권장 후속 작업

### WO-O4O-NETURE-ADMIN-DASHBOARD-LINK-FIX-V1 (즉시)

Admin Dashboard 데드링크 10개 수정:

| 현재 | 수정 |
|------|------|
| `/admin/ai` | `/workspace/admin/ai` |
| `/admin/suppliers` | `/workspace/admin/suppliers` |
| `/admin/partners` | `/workspace/admin/partners` |
| `/admin/settings/email` | `/workspace/admin/settings/email` |
| `/admin/services` | `/workspace/admin/service-approvals` 또는 제거 |

### WO-O4O-NETURE-OPERATOR-QUICKLINK-FIX-V1 (즉시)

Operator Dashboard Quick Links 2개 수정:

| 현재 | 수정 |
|------|------|
| `/workspace/suppliers` | `/workspace/admin/suppliers` 또는 `/workspace/operator/supply` |
| `/workspace/content` | 제거 또는 적절한 페이지 연결 |

### WO-O4O-NETURE-PAGE-DIRECTORY-CLEANUP-V1 (선택)

Operator 전용 페이지를 `pages/admin/` → `pages/operator/`로 이동:
- `AiCardReportPage.tsx`
- `AiOperationsPage.tsx`
- `ai/AssetQualityPage.tsx`

---

## 9. 관련 파일

| 파일 | 역할 |
|------|------|
| `services/web-neture/src/components/layouts/AdminLayout.tsx` | Admin Sidebar 메뉴 (8그룹 27항목) |
| `services/web-neture/src/components/layouts/OperatorLayout.tsx` | Operator Top Nav (7항목) |
| `services/web-neture/src/pages/admin/AdminDashboardPage.tsx` | Admin 4-Block Dashboard + Partner KPI |
| `services/web-neture/src/pages/operator/NetureOperatorDashboard.tsx` | Operator 8-Block Copilot Dashboard |
| `services/web-neture/src/pages/operator/operatorConfig.ts` | Operator Dashboard 설정 |
| `services/web-neture/src/App.tsx:611-671` | Admin/Operator 라우트 정의 |
| `services/web-neture/src/lib/api/dashboard.ts` | Admin Dashboard API |
| `services/web-neture/src/lib/api/operator.ts` | Operator Copilot API (7 endpoints) |
| `services/web-neture/src/lib/api/admin.ts` | Admin Registration API |

---

*IR-O4O-NETURE-ADMIN-OPERATOR-IA-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
