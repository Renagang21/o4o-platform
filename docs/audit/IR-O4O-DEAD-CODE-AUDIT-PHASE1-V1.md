# IR-O4O-DEAD-CODE-AUDIT-PHASE1-V1

**날짜:** 2026-03-20
**범위:** api-server, web-neture, web-glycopharm, web-glucoseview, web-k-cosmetics, web-kpa-society, packages
**유형:** 조사 전용 (수정 없음)

---

## 1. 전체 요약

| 서비스 | SAFE REMOVE | HOLD | NEEDS REVIEW | 합계 |
|--------|:-----------:|:----:|:------------:|:----:|
| **api-server** | 17 | 1 | 5 | 23 |
| **web-neture** | 3 | 1 | 0 | 4 |
| **web-glycopharm** | 2 | 1 | 0 | 3 |
| **web-glucoseview** | 1 | 0 | 0 | 1 |
| **web-k-cosmetics** | 5 | 1 | 0 | 6 |
| **web-kpa-society** | 3 | 0 | 0 | 3 |
| **packages** | 5 | 0 | 2 | 7 |
| **합계** | **36** | **4** | **7** | **47** |

### 핵심 수치

- **즉시 제거 가능**: 36건 (~3,500줄 추정)
- **보류 (확인 후 판단)**: 4건
- **추가 조사 필요**: 7건
- **중요 발견**: 이전 WO에서 수정한 파일 2건이 dead code (`adminController.ts`, `approval-workflow.service.ts` + `approvalController.ts` 체인)

---

## 2. 상세 표

### 2.1 Backend — api-server

#### 2.1.1 미등록 v1 라우트 (main.ts에 import 없음)

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 영향 |
|---|----------|----------|------|------|------|
| B1 | `routes/v1/acf.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건, 소비자: acfController만 사용 | 없음 |
| B2 | `routes/v1/admin.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건, admin/* 하위 라우트로 대체됨 | 없음 |
| B3 | `routes/v1/approval.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건, approvalController+approval-workflow 전체 체인 dead | 없음 |
| B4 | `routes/v1/apps.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건, `routes/admin/apps.routes.ts`가 실제 마운트 | 없음 |
| B5 | `routes/v1/customizer.routes.ts` | route | NEEDS REVIEW | main.ts에 import 0건, 완전한 구현 존재 (~250줄), 프론트엔드 호출 여부 확인 필요 | 낮음 |
| B6 | `routes/v1/customizer-presets.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건 | 없음 |
| B7 | `routes/v1/plugins.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건 | 없음 |
| B8 | `routes/v1/preview.routes.ts` | route | NEEDS REVIEW | main.ts에 import 0건, iframe preview proxy 구현, 프론트엔드 호출 확인 필요 | 낮음 |
| B9 | `routes/v1/smtp.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건 | 없음 |
| B10 | `routes/v1/theme.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건 | 없음 |
| B11 | `routes/v1/users.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건, `routes/users.routes.ts`가 실제 마운트 (line 434) | 없음 |
| B12 | `routes/v1/widget-areas.routes.ts` | route | SAFE REMOVE | main.ts에 import 0건 | 없음 |

> **참고**: `routes/v1/platformInquiry.routes.ts`는 main.ts line 74에서 import → **ACTIVE**

#### 2.1.2 Dead 컨트롤러

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 영향 |
|---|----------|----------|------|------|------|
| B13 | `controllers/acfController.ts` | controller | SAFE REMOVE | 소비자: acf.routes.ts만 (미등록). import 0건 | 없음 |
| B14 | `controllers/approvalController.ts` | controller | SAFE REMOVE | 소비자: approval.routes.ts만 (미등록). import 0건 | 없음 |
| B15 | `controllers/SmtpController.ts` | controller | SAFE REMOVE | 소비자: smtp.routes.ts만 (미등록). import 0건 | 없음 |
| B16 | `controllers/ThemeController.ts` | controller | SAFE REMOVE | 소비자: theme.routes.ts만 (미등록). import 0건 | 없음 |
| B17 | `controllers/adminController.ts` | controller | SAFE REMOVE | 어떤 라우트에서도 import 안 됨. `approveUser`/`rejectUser` 등 named export가 라우트에서 직접 import 안 됨 (users.routes.ts는 별도 UserManagementController 사용) | 없음 |
| B18 | `controllers/formController.ts` | controller | SAFE REMOVE | 자기 참조만 존재. 라우트 import 0건 | 없음 |
| B19 | `controllers/autoRecoveryController.ts` | controller | NEEDS REVIEW | 라우트 import 0건이나 glycopharm 관련 잠재적 동적 import 가능성 확인 필요 | 낮음 |

#### 2.1.3 Dead 서비스

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 영향 |
|---|----------|----------|------|------|------|
| B20 | `services/approval-workflow.service.ts` | service | SAFE REMOVE | 소비자: approvalController.ts만 (B14, dead). import 0건 | 없음 |
| B21 | `services/refreshToken.service.ts` | service | SAFE REMOVE | 이전 WO에서 확인: 어디서도 import 안 됨 (RefreshTokenService.ts와 별도 파일) | 없음 |

#### 2.1.4 미등록 Admin/Partner/v2 라우트

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 영향 |
|---|----------|----------|------|------|------|
| B22 | `routes/admin/seller-authorization.routes.ts` | route | HOLD | Feature flag `ENABLE_SELLER_AUTHORIZATION` (default false). 501 stub. WO Phase 9 예정 | 낮음 |
| B23 | `routes/v2/query.routes.ts` | route | NEEDS REVIEW | main.ts에 import 0건. 동적 로딩 가능성 확인 필요 | 낮음 |

---

### 2.2 Frontend — web-neture

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 대체 파일 | 영향 |
|---|----------|----------|------|------|----------|------|
| N1 | `pages/partners/PartnersApplyPage.tsx` | page | SAFE REMOVE | App.tsx 라우트 0건, import 0건 | — | 없음 |
| N2 | `pages/supplier/product/SupplierProductSettingsPage.tsx` | page | SAFE REMOVE | App.tsx 라우트 0건, "API 연동 준비 중" stub | — | 없음 |
| N3 | `pages/dashboard/PartnerDashboardPage.tsx` | page | SAFE REMOVE | App.tsx 라우트 0건, PartnerHubDashboardPage로 대체됨 | PartnerHubDashboardPage | 없음 |
| N4 | `pages/partner/ReferralLinkModal.tsx` | component | HOLD | import 0건이나 WO-O4O-PARTNER-LINK-CREATION-UX-V1 미완성 기능 가능성 | — | 낮음 |

> **삭제 시 index.ts 정리 필요**: `pages/supplier/product/index.ts`, `pages/dashboard/index.ts`

---

### 2.3 Frontend — web-glycopharm

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 대체 파일 | 영향 |
|---|----------|----------|------|------|----------|------|
| G1 | `pages/HomeLivePage.tsx` | page | SAFE REMOVE | App.tsx 라우트 0건, import 0건 | LandingPage/CareDashboardPage | 없음 |
| G2 | `pages/community/CommunityHubPage.tsx` | page | SAFE REMOVE | App.tsx 라우트 0건, CommunityMainPage로 대체됨 | CommunityMainPage | 없음 |
| G3 | `pages/care/patient-tabs/SummaryTab.tsx` | component | HOLD | index.ts에서 export되나 PatientDetailPage에서 미사용 | — | 낮음 |

---

### 2.4 Frontend — web-glucoseview

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 대체 파일 | 영향 |
|---|----------|----------|------|------|----------|------|
| V1 | `services/health.ts` | service | SAFE REMOVE | `checkHealth()` export, import 0건 | — | 없음 |

---

### 2.5 Frontend — web-k-cosmetics

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 대체 파일 | 영향 |
|---|----------|----------|------|------|----------|------|
| C1 | `pages/operator/InventoryPage.tsx` | page | SAFE REMOVE | App.tsx에서 import 주석 처리. WO-O4O-OPERATOR-COMMON-CAPABILITY-REFINE-V1 deprecated | — | 없음 |
| C2 | `pages/operator/SettlementsPage.tsx` | page | SAFE REMOVE | 동일 WO deprecated | — | 없음 |
| C3 | `pages/operator/AnalyticsPage.tsx` | page | SAFE REMOVE | 동일 WO deprecated | — | 없음 |
| C4 | `pages/operator/MarketingPage.tsx` | page | SAFE REMOVE | 동일 WO deprecated | — | 없음 |
| C5 | `pages/operator/SupportPage.tsx` | page | SAFE REMOVE | 동일 WO deprecated | — | 없음 |
| C6 | `pages/operator/operatorConfig.ts` | config | HOLD | KCosmeticsOperatorDashboard에서 import하지만 실제 호출 여부 확인 필요 | — | 낮음 |

---

### 2.6 Frontend — web-kpa-society

| # | 파일 경로 | 코드 유형 | 상태 | 근거 | 대체 파일 | 영향 |
|---|----------|----------|------|------|----------|------|
| K1 | `pages/pharmacy/PharmacyDashboardPage.tsx` | page | SAFE REMOVE | App.tsx/라우트 import 0건. StoreMarketingDashboardPage로 대체됨 | StoreMarketingDashboardPage | 없음 |
| K2 | `pages/pharmacy/StoreOverviewPage.tsx` | page | SAFE REMOVE | App.tsx/라우트 import 0건. WO-STORE-ADMIN-CONSOLIDATION-V1에서 분리됨 | StoreChannelsPage 등 | 없음 |
| K3 | `pages/platform/HomePage.tsx` | page | SAFE REMOVE | export 안 됨, import 0건. CommunityHomePage로 대체됨 | CommunityHomePage | 없음 |

> **삭제 시 index.ts 정리 필요**: `pages/pharmacy/index.ts` (PharmacyDashboardPage, StoreOverviewPage export 제거)

---

### 2.7 Packages — 공유 패키지

> **중요 보정**: 초기 에이전트 조사에서 다수 패키지를 "dead"로 분류했으나, api-server의 app manifest 시스템(`appsCatalog.ts`, `connection.ts`, `disabled-apps.registry.ts` 등)에서 import하고 있어 대부분 제거 불가. 아래는 **api-server 포함 전체 검증 결과**.

#### 진짜 Dead (api-server + 모든 web 서비스에서 import 0건)

| # | 패키지 | 상태 | 근거 | 영향 |
|---|--------|------|------|------|
| P1 | `@o4o/design-system-cosmetics` | SAFE REMOVE | api-server 0건, web 0건 | 없음 |
| P2 | `@o4o/corner-display-extension` | SAFE REMOVE | api-server 0건, web 0건 | 없음 |
| P3 | `@o4o/signage-pharmacy-extension` | SAFE REMOVE | api-server 0건, web 0건 | 없음 |
| P4 | `@o4o/member-yaksa` | SAFE REMOVE | api-server 0건, web 0건 | 없음 |
| P5 | `@o4o/yaksa-accounting` | SAFE REMOVE | api-server 0건, web 0건 | 없음 |
| P6 | `@o4o/yaksa-admin` | NEEDS REVIEW | api-server 0건, web 0건. 단 admin-dashboard 확인 필요 | 낮음 |
| P7 | `@o4o/cgm-pharmacist-app` | NEEDS REVIEW | api-server 0건, web 0건. CGM 도메인 의도 확인 필요 | 낮음 |

#### App Manifest 시스템에서 참조 (제거 불가)

다음 패키지는 `appsCatalog.ts`, `connection.ts`, `main.ts` 등에서 import/참조되므로 단독 제거 불가:
- `@o4o/dropshipping-cosmetics` (15 files)
- `@o4o/forum-cosmetics` (1 file)
- `@o4o/cosmetics-seller-extension` (5 files)
- `@o4o/cosmetics-partner-extension` (5 files)
- `@o4o/cosmetics-supplier-extension` (4 files)
- `@o4o/cosmetics-sample-display-extension` (4 files)
- `@o4o/health-extension` (3 files)
- `@o4o/reporting-yaksa` (8 files)
- `@o4o/yaksa-scheduler` (19 files + admin-dashboard)
- `@o4o/organization-forum` (5 files)
- `@o4o/organization-lms` (1 file)
- `@o4o/membership-yaksa` (2 files)
- `@o4o/cgm-glucoseview` (1 file)
- `@o4o/partnerops` (8 files)
- `@o4o/supplierops` (9 files)

---

## 3. 우선순위 분류

### P0: 즉시 제거 가능 (영향 없음, 참조 0건 확인 완료)

**Backend (17건)**:
- B1~B4, B6~B7, B9~B12: 미등록 v1 라우트 11건
- B13~B18: Dead 컨트롤러 6건 (acf, approval, smtp, theme, admin, form)
- B20~B21: Dead 서비스 2건 (approval-workflow, refreshToken)

**Frontend (14건)**:
- N1~N3: web-neture 3건
- G1~G2: web-glycopharm 2건
- V1: web-glucoseview 1건
- C1~C5: web-k-cosmetics 5건
- K1~K3: web-kpa-society 3건

**Packages (5건)**:
- P1~P5: 진짜 dead 패키지 5건

**P0 합계: 36건**

### P1: 제거 가능하나 연관 파일 함께 확인 필요

- B5: `routes/v1/customizer.routes.ts` — 프론트엔드 `/api/v1/customizer/*` 호출 여부
- B8: `routes/v1/preview.routes.ts` — 프론트엔드 iframe preview 프록시 호출 여부
- B19: `controllers/autoRecoveryController.ts` — glycopharm 동적 import 가능성
- B23: `routes/v2/query.routes.ts` — 모듈 로더 동적 import 가능성

### P2: Legacy 의심이나 추가 조사 필요

- B22: `routes/admin/seller-authorization.routes.ts` — Feature flag stub, 향후 기능
- N4: `pages/partner/ReferralLinkModal.tsx` — 미완성 WO 기능
- G3: `pages/care/patient-tabs/SummaryTab.tsx` — 미구현 탭
- C6: `pages/operator/operatorConfig.ts` — 실제 호출 여부 확인 필요
- P6: `@o4o/yaksa-admin` — admin-dashboard 사용 여부
- P7: `@o4o/cgm-pharmacist-app` — CGM 도메인 의도

### SKIP: 현재 사용 중 또는 판단 불가

- App manifest 시스템에서 참조되는 모든 패키지 (15개)

---

## 4. 별도 정리

### 4.1 이전 WO에서 수정했으나 Dead Code로 판명된 파일

> **중요**: 아래 파일들은 이전 RBAC 정비 WO에서 수정했으나 실제로는 dead code였음.
> 기능적 영향은 없으나 기록으로 남김.

| WO | 파일 | 수정 내용 | Dead 근거 |
|----|------|----------|----------|
| WO-O4O-APPROVAL-WORKFLOW-RBAC-FIX-V1 | `services/approval-workflow.service.ts` | `canApprove()` → roleAssignmentService | 소비자 approvalController.ts가 미등록 라우트에만 사용됨 |
| WO-O4O-USER-ROLES-RUNTIME-FIELD-CLEANUP-V1 | `controllers/adminController.ts` | 승인 이메일 role fix | 어떤 라우트에서도 import 안 됨 |

### 4.2 Oversized File 정비와 연결되는 항목

| 항목 | 연결 |
|------|------|
| `routes/v1/*.ts` 12건 일괄 제거 | main.ts import 정리와 동시 진행 가능 |
| `controllers/admin*.ts` 정리 | admin 라우트 구조 재편과 연결 |
| dead 패키지 5건 | pnpm workspace, tsconfig paths 정리 필요 |

### 4.3 Role/Redirect/Legacy Route 정비와 연결되는 항목

| 항목 | 연결 |
|------|------|
| B17 `adminController.ts` | admin 역할 체계 정비 시 함께 제거 |
| B22 `seller-authorization.routes.ts` | seller 역할 활성화 시 판단 |
| B3+B14+B20 approval 체인 | approval 기능 재구현 시 clean slate 확보 |

### 4.4 한 번에 묶어 제거 가능한 그룹

**그룹 A: v1 Legacy Routes + Controllers (19건)**
```
routes/v1/acf.routes.ts
routes/v1/admin.routes.ts
routes/v1/approval.routes.ts
routes/v1/apps.routes.ts
routes/v1/customizer-presets.routes.ts
routes/v1/plugins.routes.ts
routes/v1/smtp.routes.ts
routes/v1/theme.routes.ts
routes/v1/users.routes.ts
routes/v1/widget-areas.routes.ts
controllers/acfController.ts
controllers/approvalController.ts
controllers/adminController.ts
controllers/SmtpController.ts
controllers/ThemeController.ts
controllers/formController.ts
services/approval-workflow.service.ts
services/refreshToken.service.ts
```
> `routes/v1/platformInquiry.routes.ts`는 ACTIVE — 삭제 금지

**그룹 B: K-Cosmetics Deprecated Pages (5건)**
```
pages/operator/InventoryPage.tsx
pages/operator/SettlementsPage.tsx
pages/operator/AnalyticsPage.tsx
pages/operator/MarketingPage.tsx
pages/operator/SupportPage.tsx
```
> App.tsx 주석 처리된 import도 함께 제거

**그룹 C: Frontend Orphan Pages (8건)**
```
web-neture: pages/partners/PartnersApplyPage.tsx
web-neture: pages/supplier/product/SupplierProductSettingsPage.tsx
web-neture: pages/dashboard/PartnerDashboardPage.tsx
web-glycopharm: pages/HomeLivePage.tsx
web-glycopharm: pages/community/CommunityHubPage.tsx
web-glucoseview: services/health.ts
web-kpa-society: pages/pharmacy/PharmacyDashboardPage.tsx
web-kpa-society: pages/pharmacy/StoreOverviewPage.tsx
web-kpa-society: pages/platform/HomePage.tsx
```
> index.ts export 정리 필수 동반

**그룹 D: Dead Packages (5건)**
```
packages/design-system-cosmetics/
packages/corner-display-extension/
packages/signage-pharmacy-extension/
packages/member-yaksa/
packages/yaksa-accounting/
```
> pnpm-workspace.yaml, tsconfig paths 정리 동반 필요

---

## 5. 주의사항

1. **이번 단계에서는 코드 수정, 삭제, 이동, 이름 변경 금지**
2. 삭제 가능 판정은 현재 기준 실제 참조 0건일 때만
3. 패키지 제거 시 app manifest 시스템(`appsCatalog.ts`, `disabled-apps.registry.ts`) 연쇄 정리 필요
4. Core 변경, 구조 재설계, API 계약 수정이 필요해 보이면 즉시 중단하고 별도 검토
5. `routes/v1/platformInquiry.routes.ts`는 유일한 active v1 라우트 — 혼동 주의

---

*Generated: 2026-03-20*
*Audit Method: 4 parallel agents + manual cross-verification*
*Verification: grep import/export cross-reference, main.ts route mount check, App.tsx route tree mapping*
