# IR-GLYCOPHARM-OPERATOR-FUNCTION-AUDIT-V1

> **GlycoPharm / GlucoseView Operator 기능 전수 조사**
>
> Date: 2026-03-16
> Status: Complete
> Scope: Operator Dashboard, 메뉴 구조, Care 시스템, AI 기능, DB 엔티티
> 목적: **이 채팅방에서 바로 Operator 보완 작업을 진행하기 위한 기준 문서**

---

## 제외 범위

다음 영역은 **플랫폼 전체 정비 채팅방에서 처리**한다.

- users 시스템 / RBAC 구조
- service membership
- platform extension layer
- Guard 패턴 통일

---

## 1. GlycoPharm Operator 메뉴 구조

### 1-1. 현재 Sidebar (11-Capability Group)

파일: `services/web-glycopharm/src/components/layouts/DashboardLayout.tsx`

| # | Capability | 메뉴 항목 | 경로 |
|:-:|-----------|----------|------|
| 1 | **Dashboard** | 대시보드 | `/operator` |
| 2 | **Users** | 회원 관리 | `/operator/users` |
| 3 | **Approvals** | 신청 관리 | `/operator/applications` |
|   |  | 매장 승인 | `/operator/store-approvals` |
| 4 | **Products** | 상품 관리 | `/operator/products` |
| 5 | **Stores** | 매장 관리 | `/operator/stores` |
|   |  | 매장 템플릿 | `/operator/store-template` |
| 6 | **Orders** | 주문 관리 | `/operator/orders` |
| 7 | **Finance** | 정산 관리 | `/operator/settlements` |
|   |  | 청구 리포트 | `/operator/reports` |
|   |  | 청구 미리보기 | `/operator/billing-preview` |
|   |  | 인보이스 | `/operator/invoices` |
| 8 | **Signage** | HQ 미디어 | `/operator/signage/hq-media` |
|   |  | HQ 플레이리스트 | `/operator/signage/hq-playlists` |
|   |  | 템플릿 | `/operator/signage/templates` |
|   |  | 콘텐츠 허브 | `/operator/signage/content` |
|   |  | 콘텐츠 라이브러리 | `/operator/signage/library` |
|   |  | 내 사이니지 | `/operator/signage/my` |
| 9 | **Forum** | 포럼 관리 | `/operator/forum-management` |
|   |  | 포럼 신청 | `/operator/forum-requests` |
|   |  | 커뮤니티 관리 | `/operator/community` |
| 10 | **Analytics** | AI 리포트 | `/operator/ai-report` |
| — | **Settings** | (없음) | — |

### 1-2. 누락된 Operator 메뉴

| 항목 | 현재 상태 | 설명 |
|------|----------|------|
| **약국 관리** | 메뉴 없음 | PharmaciesPage.tsx 존재하나 메뉴 미등록 |
| **Care 관리** | 메뉴 없음 | Care 전체 시스템이 Operator 메뉴에 없음 |
| **설정** | 메뉴 없음 | SettingsPage.tsx 존재하나 메뉴 미등록 |

---

## 2. GlucoseView Operator 메뉴 구조

### 2-1. 현재 Navigation (수평 상단 바)

파일: `services/web-glucoseview/src/components/layouts/OperatorLayout.tsx`

| # | 메뉴 | 경로 |
|:-:|------|------|
| 1 | 대시보드 | `/operator` |
| 2 | 회원 관리 | `/operator/users` |
| 3 | 신청 관리 | `/operator/applications` |
| 4 | 상품 관리 | `/operator/products` |
| 5 | 매장 관리 | `/operator/stores` |
| 6 | AI 리포트 | `/operator/ai-report` |

### 2-2. 레이아웃 차이

| 항목 | GlycoPharm | GlucoseView |
|------|-----------|-------------|
| 메뉴 위치 | 좌측 사이드바 | 상단 수평 바 |
| 메뉴 수 | 23개 항목 | 6개 항목 |
| Capability Group | 11그룹 | 없음 (플랫) |
| 뱃지 | 운영자 | 운영자 |

---

## 3. GlycoPharm Operator Route 전체 목록

파일: `services/web-glycopharm/src/App.tsx`

```
/operator                              → GlycoPharmOperatorDashboard
/operator/applications                 → ApplicationsPage
/operator/applications/:id             → ApplicationDetailPage
/operator/products                     → ProductsPage
/operator/products/:productId          → ProductDetailPage
/operator/stores                       → OperatorStoresPage
/operator/stores/:storeId              → OperatorStoreDetailPage
/operator/orders                       → OrdersPage
/operator/settlements                  → SettlementsPage
/operator/reports                      → ReportsPage
/operator/billing-preview              → BillingPreviewPage
/operator/invoices                     → InvoicesPage
/operator/forum-requests               → ForumRequestsPage
/operator/forum-management             → OperatorForumManagementPage
/operator/community                    → CommunityManagementPage
/operator/store-approvals              → StoreApprovalsPage
/operator/store-approvals/:id          → StoreApprovalDetailPage
/operator/store-template               → StoreTemplateManagerPage
/operator/users                        → UsersPage
/operator/users/:id                    → UserDetailPage
/operator/ai-report                    → AiReportPage
/operator/signage/library              → ContentLibraryPage
/operator/signage/content              → ContentHubPage
/operator/signage/playlist/:id         → SignagePlaylistDetailPage
/operator/signage/media/:id            → SignageMediaDetailPage
/operator/signage/my                   → MySignagePage
/operator/signage/preview              → SignagePreviewPage
/operator/signage/hq-media             → HqMediaPage
/operator/signage/hq-media/:mediaId    → HqMediaDetailPage
/operator/signage/hq-playlists         → HqPlaylistsPage
/operator/signage/hq-playlists/:playlistId → HqPlaylistDetailPage
/operator/signage/templates            → SignageTemplatesPage
/operator/signage/templates/:templateId → SignageTemplateDetailPage
```

**보호:** `ProtectedRoute allowedRoles={['admin', 'operator']}`

---

## 4. GlucoseView Operator Route 전체 목록

파일: `services/web-glucoseview/src/App.tsx`

```
/operator                              → GlucoseViewOperatorDashboard
/operator/applications                 → OperatorApplicationsPage
/operator/applications/:id             → OperatorApplicationDetailPage
/operator/users                        → OperatorUsersPage
/operator/users/:id                    → OperatorUserDetailPage
/operator/products                     → OperatorProductsPage
/operator/products/:productId          → OperatorProductDetailPage
/operator/stores                       → OperatorStoresPage
/operator/stores/:storeId              → OperatorStoreDetailPage
/operator/ai-report                    → OperatorAiReportPage
```

**보호:** `RoleGuard roles={['admin', 'operator']}`

---

## 5. Care 시스템 (GlycoPharm 내)

### 5-1. Care 페이지 구조

위치: `services/web-glycopharm/src/pages/care/`

| 페이지 | 역할 |
|--------|------|
| **CareDashboardPage** | AI Care Control Tower (메인 진입점) |
| **PatientsPage** | 환자 목록 관리 |
| **PatientDetailPage** | 개별 환자 워크스페이스 (탭) |
| **AnalysisPage** | 모집단 분석 |
| **CoachingPage** | 코칭 관리 |

### 5-2. 환자 상세 탭

| 탭 | 내용 |
|----|------|
| DataTab | 건강 데이터 입력 (혈당, 혈압, 체중) + 최근 측정 |
| AnalysisTab | Care 분석 결과 (TIR, CV, 위험도, 추세) |
| CoachingTab | 코칭 세션 + AI 초안 |
| HistoryTab | 환자 이벤트 타임라인 |
| SummaryTab | 환자 요약 |

### 5-3. Care API 전체 목록

**Dashboard & 요약:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/dashboard` | Care Dashboard 요약 (총 환자, 위험 카운트, 코칭 수) |
| GET | `/api/v1/care/population-dashboard` | 모집단 Dashboard (위험 분포, 평균 지표, 코칭 통계) |

**환자 위험도 & 우선순위:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/risk-patients` | 위험 환자 목록 (고위험/주의 구분) |
| GET | `/api/v1/care/priority-patients` | 규칙 기반 우선순위 환자 |
| GET | `/api/v1/care/ai-priority-patients` | AI 조정 우선순위 (AI 점수 + 근거) |
| GET | `/api/v1/care/today-priority` | 오늘의 우선순위 환자 |

**알림 시스템:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/alerts` | 활성 알림 (open/acknowledged/resolved) |
| POST | `/api/v1/care/alerts/:id/ack` | 알림 확인 처리 |
| POST | `/api/v1/care/alerts/:id/resolve` | 알림 해결 처리 |

**환자 분석 & KPI:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/analysis/:patientId` | 환자 분석 (TIR, CV, 위험도, 인사이트) |
| GET | `/api/v1/care/kpi/:patientId` | KPI 비교 (TIR/CV 추세, 위험 추세) |
| GET | `/api/v1/care/llm-insight/:patientId` | AI 인사이트 (약사용 + 환자용 메시지) |

**건강 데이터:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/health-readings/:patientId` | 건강 측정 기록 (혈당, 혈압, 체중) |
| POST | `/api/v1/care/health-readings` | 건강 측정 기록 생성 |

**코칭:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/v1/care/coaching` | 코칭 세션 생성 |
| GET | `/api/v1/care/coaching/:patientId` | 환자별 코칭 세션 목록 |
| GET | `/api/v1/care/coaching-drafts/:patientId` | AI 코칭 초안 |
| POST | `/api/v1/care/coaching-drafts/:draftId/approve` | AI 초안 승인 |
| POST | `/api/v1/care/coaching-drafts/:draftId/discard` | AI 초안 폐기 |

**타임라인 & AI Chat:**

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/v1/care/timeline/:patientId` | 환자 이벤트 타임라인 |
| POST | `/api/v1/care/ai-chat` | AI 채팅 (환자 인사이트 + 액션 제안) |

### 5-4. Care Route → Operator 메뉴 매핑 현황

**현재 상태: Care 시스템이 Operator 사이드바에 없음**

Care 페이지는 존재하지만 Operator 메뉴에서 접근 경로가 없음.
이는 **Care가 약국(Pharmacy) 레벨 기능으로 설계**되었기 때문.

```
Care = 약사가 약국 내에서 사용하는 도구
Operator = 서비스 전체를 관리하는 도구
```

따라서 Operator Dashboard에서 Care 데이터를 **모니터링**할 수 있어야 하지만,
Care 기능 자체는 Pharmacy 레벨에서 운영됨.

---

## 6. DB 엔티티 전체 목록

### 6-1. GlycoPharm 테이블

| 테이블 | 핵심 컬럼 | 역할 |
|--------|----------|------|
| `glycopharm_pharmacies` | id, name, code, business_number, slug, status, enabled_services | 약국 관리 |
| `glycopharm_products` | id, pharmacy_id, name, sku, category, price, stock_quantity, status | 혈당 상품 |
| `glycopharm_featured_products` | id, product_id, service, context, position | 추천 상품 큐레이션 |
| `glycopharm_pharmacy_extensions` | organization_id(PK), enabled_services, hero_image, logo | 약국 서비스 확장 |
| `glycopharm_product_logs` | id, product_id, action, before_data, after_data | 상품 변경 감사 로그 |
| `glycopharm_events` | id, pharmacy_id, event_type, source_type, purpose | 행동 이벤트 (노출/클릭/QR) |
| `glycopharm_applications` | id, user_id, organization_name, business_number, status | 약국 참여 신청 |

**상품 카테고리:** cgm_device, test_strip, lancet, meter, accessory, other
**신청 상태:** draft → submitted → reviewing/supplementing → approved/rejected

### 6-2. GlucoseView 테이블

| 테이블 | 핵심 컬럼 | 역할 |
|--------|----------|------|
| `glucoseview_pharmacies` | id, glycopharm_pharmacy_id, user_id, name, business_number, slug, status | CGM View 약국 |
| `glucoseview_pharmacists` | id, user_id, license_number, real_name, chapter_id, role, approval_status | 약사 프로필 |
| `glucoseview_customers` | id, organization_id, pharmacist_id, name, phone, sync_status, data_sharing_consent | 환자 레코드 |
| `glucoseview_branches` | id, name, code, sort_order | 약사회 지부 |
| `glucoseview_chapters` | id, branch_id, name, code | 약사회 분회 |
| `glucoseview_vendors` | id, name, code, supported_devices, integration_type, status | CGM 벤더 (Abbott, Dexcom 등) |
| `glucoseview_connections` | id, pharmacy_id, vendor_id, status, config | 약국-벤더 연결 |
| `glucoseview_applications` | id, user_id, pharmacy_name, business_number, status | CGM View 서비스 신청 |
| `glucoseview_view_profiles` | id, name, code, summary_level, chart_type, target_low/high | CGM 표시 프로필 |

### 6-3. Care 모듈 테이블

| 테이블 | 핵심 컬럼 | 역할 |
|--------|----------|------|
| `care_appointments` | id, patient_id, pharmacy_id, pharmacist_id, scheduled_at, status | 약사-환자 상담 예약 |
| `care_coaching_sessions` | id, pharmacy_id, patient_id, pharmacist_id, summary, action_plan | 코칭 세션 |
| `care_coaching_drafts` | id, patient_id, snapshot_id, pharmacy_id, draft_message, status | AI 코칭 초안 |
| `care_alerts` | id, pharmacy_id, patient_id, alert_type, severity, message, status | 건강 알림 |
| `care_kpi_snapshots` | id, pharmacy_id, patient_id, tir, cv, risk_level, metadata | KPI 스냅샷 (TIR/CV/위험도) |
| `care_llm_insights` | id, snapshot_id, pharmacy_id, patient_id, pharmacy_insight, patient_message | AI 인사이트 캐시 |
| `care_pharmacy_link_requests` | id, patient_id, pharmacy_id, status, message | 환자→약국 연결 요청 |
| `health_readings` | id, patient_id, metric_type, value_numeric, unit, measured_at, source_type, pharmacy_id | 건강 측정 기록 |
| `patient_health_profiles` | id, user_id, diabetes_type, treatment_method, height, weight, target_hba1c | 환자 건강 프로필 |

---

## 7. Dashboard KPI 데이터 소스

### 7-1. GlycoPharm Operator Dashboard (5-Block)

API: `GET /api/v1/glycopharm/operator/dashboard`

| Block | KPI 항목 | 데이터 소스 |
|:-----:|---------|-----------|
| KPI | 활성 약국 / 비활성 약국 | organizations + organization_service_enrollments |
| KPI | 대기 신청 | glycopharm_applications (submitted) |
| KPI | 활성/초안/전체 상품 | glycopharm_products |
| KPI | 게시된/전체 콘텐츠 | cms_contents (serviceKey='glycopharm') |
| AI Summary | 상태 기반 인사이트 | 동적 생성 |
| Action Queue | 즉시 처리 항목 | 대기 신청 등 |
| Activity Log | 최근 활동 | glycopharm_applications (recent) |
| Quick Actions | 바로가기 링크 | 정적 |

### 7-2. GlucoseView Operator Dashboard (5-Block)

API: `GET /api/v1/glucoseview/operator/dashboard`

| Block | KPI 항목 | 데이터 소스 |
|:-----:|---------|-----------|
| KPI | 약국 상태 분포 | glucoseview_pharmacies |
| KPI | 약사 승인 상태 분포 | glucoseview_pharmacists |
| KPI | 총 고객 수 | glucoseview_customers |
| KPI | 활성 벤더 수 | glucoseview_vendors |
| KPI | 대기 신청 | glucoseview_applications (submitted) |
| KPI | 게시된 콘텐츠 | cms_contents (serviceKey='glucoseview') |
| AI Summary | 상태 기반 인사이트 | 동적 생성 |
| Action Queue | 즉시 처리 항목 | 대기 신청 등 |
| Activity Log | 최근 활동 | glucoseview_applications (recent) |
| Quick Actions | 바로가기 링크 | 정적 |

---

## 8. AI 기능 현황

### 8-1. GlycoPharm AI 기능 (Care 내장)

| 기능 | API | 상태 |
|------|-----|:----:|
| AI 우선순위 환자 | GET /care/ai-priority-patients | ✅ |
| AI 코칭 초안 | GET /care/coaching-drafts/:patientId | ✅ |
| AI 인사이트 (LLM) | GET /care/llm-insight/:patientId | ✅ |
| AI Chat | POST /care/ai-chat | ✅ |
| AI 모집단 요약 | 프론트엔드 컴포넌트 | ✅ |
| AI 리포트 (Operator) | /operator/ai-report | ✅ |

### 8-2. GlucoseView AI 기능

| 기능 | API | 상태 |
|------|-----|:----:|
| AI 리포트 (Operator) | /operator/ai-report | ⚠️ Mock only |

**GlucoseView AI Report Mock 데이터 구조:**

| 섹션 | 내용 |
|------|------|
| KPI Cards | 총 AI 응답, 총 노출, 유니크 Asset, 평균 노출/응답 (7d/30d/90d) |
| Asset Type 요약 | Device / Pharmacy / Content / Guide 4유형 |
| 노출 사유 분포 | 기기 사용법(43.7%), 혈당 관리(23.8%), 약국 문의(16.0%) 등 |
| 일별 추세 | 7일 바 차트 |
| Context Asset 테이블 | Asset별 노출·사용자·추세·사유 |
| 품질 인사이트 | Fallback 비율(HIGH), 과다 노출(MEDIUM), 저활용(LOW) |
| 개선 요청 | 모달 UI (API 미연결) |

**필요한 Backend:**
- `GET /api/v1/glucoseview/operator/ai-report` — AI/Context Asset 메트릭
- `POST /api/v1/glucoseview/operator/ai-report/improvement-request` — 개선 요청

---

## 9. GlucoseView 환자 시스템

### 9-1. 환자 Route

```
/patient                    → PatientMainPage (홈)
/patient/profile            → ProfilePage
/patient/glucose-input      → GlucoseInputPage
/patient/data-analysis      → DataAnalysisPage
/patient/pharmacist-coaching → PharmacistCoachingPage
/patient/select-pharmacy    → SelectPharmacyPage
/patient/appointments       → AppointmentsPage
/patient/care-guideline     → CareGuidelinePage
```

### 9-2. 환자 Mobile Bottom Nav (5탭)

| # | 메뉴 | 아이콘 |
|:-:|------|-------|
| 1 | 홈 | Home |
| 2 | 입력 | ClipboardEdit |
| 3 | 분석 | BarChart3 |
| 4 | 코칭 | MessageCircle |
| 5 | 내정보 | User |

### 9-3. 혈당 데이터 구조

```typescript
// 측정 유형
metric_type: 'glucose' | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'weight'

// 식사 타이밍
mealTiming: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random'

// 위험도
risk_level: 'low' | 'moderate' | 'high'

// TIR 기준: 70-180 mg/dL
```

---

## 10. 데이터 흐름 (Integration)

```
약국 온보딩:
  glycopharm_applications → glycopharm_pharmacies

약사 등록:
  glucoseview_applications → glucoseview_pharmacies + glucoseview_pharmacists

환자 등록:
  care_pharmacy_link_requests → glucoseview_customers

건강 데이터:
  health_readings → care_kpi_snapshots

코칭 워크플로우:
  care_kpi_snapshots → care_coaching_drafts (AI) → care_coaching_sessions (약사 승인)

위험도 평가:
  composite risk = glucose + BP + weight + metabolic
  high (≥4) | caution (2-3) | normal (0-1)
```

---

## 11. Operator 보완 작업 기준

### 즉시 가능한 작업

| # | 작업 | 서비스 | 설명 |
|:-:|------|--------|------|
| 1 | **GlycoPharm 약국 관리 메뉴 추가** | GlycoPharm | PharmaciesPage 존재, 메뉴만 추가 |
| 2 | **GlycoPharm 설정 메뉴 추가** | GlycoPharm | SettingsPage 존재, 메뉴만 추가 |
| 3 | **GlycoPharm Care 모니터링 메뉴 추가** | GlycoPharm | Care Dashboard를 Operator에서 접근 가능하게 |
| 4 | **GlucoseView AI Report Backend** | GlucoseView | Mock → 실 API 연결 |
| 5 | **Dead Code 삭제** | GlycoPharm | 5개 deprecated 페이지 삭제 |

### 설계 필요한 작업

| # | 작업 | 서비스 | 설명 |
|:-:|------|--------|------|
| 6 | **GlucoseView Operator 확장** | GlucoseView | 6개 → 11개 메뉴 확장 여부 결정 |
| 7 | **Care KPI → Operator Dashboard 통합** | GlycoPharm | Operator Dashboard에 Care 지표 추가 |
| 8 | **GlycoPharm Admin 4-Block → 5-Block** | GlycoPharm | Admin Dashboard 표준화 |

---

*Generated: 2026-03-16*
*Investigation: READ-ONLY (코드 수정 없음)*
