# IR-OPERATOR-DASHBOARD-STATUS-V1 조사 결과 보고서

> **조사일**: 2026-02-10
> **상태**: 완료
> **원칙**: 사실 기반, 판단 금지, 중립 유지

---

## 목차

1. [플랫폼 관리자 (admin-dashboard)](#1-플랫폼-관리자-admin-dashboard)
2. [서비스 admin 대시보드](#2-서비스-admin-대시보드)
3. [서비스 operator 대시보드](#3-서비스-operator-대시보드)
4. [역할/권한 체계 현황](#4-역할권한-체계-현황)
5. [흐름 기반 조사](#5-흐름-기반-조사)
6. [종합 현황표](#6-종합-현황표)

---

## 1. 플랫폼 관리자 (admin-dashboard)

**URL**: admin.neture.co.kr
**소스**: `apps/admin-dashboard/`
**라우트 정의**: `apps/admin-dashboard/src/App.tsx`
**메뉴 설정**: `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx`
**권한 로직**: `apps/admin-dashboard/src/config/rolePermissions.ts`

### 1-1. 메뉴/페이지 전수 목록

#### Overview / 대시보드

| 페이지 | 라우트 | 컴포넌트 | 기능 요약 | 조회/조작 |
|--------|--------|----------|-----------|-----------|
| Overview | `/admin` | WordPressDashboard | 메인 대시보드 | 조회 |
| 통합 대시보드 | `/dashboard` | UnifiedDashboard | 컨텍스트 기반 대시보드 v1 | 조회 |
| 운영 대시보드 | `/admin/dashboard/operations` | OperationsDashboard | Phase 2.4 운영 대시보드 | 조회 |
| OPS 메트릭 | `/admin/ops/metrics` | OpsMetricsDashboard | 운영 KPI | 조회 |

#### 사용자 / 역할 관리

| 페이지 | 라우트 | 기능 요약 | 조회/조작 | 권한 |
|--------|--------|-----------|-----------|------|
| 사용자 목록 | `/users` | 전체 사용자 목록 | 조회 | `users:read` |
| 사용자 생성 | `/users/add` | 신규 사용자 생성 | **조작** | `users:create` |
| 사용자 상세 | `/users/:id` | 사용자 상세 조회 | 조회 | `users:read` |
| 사용자 편집 | `/users/:id/edit` | 사용자 정보 수정 | **조작** | `users:update` |
| 역할 관리 | `/users/roles` | 역할 할당/변경 | **조작** | `users:update` |
| 사용자 통계 | `/users/statistics` | 사용자 분석 | 조회 | `users:read` |
| 활성 사용자 | `/active-users` | 현재 접속 사용자 | 조회 | `admin` |
| 운영자 관리 | `/operators` | 서비스 운영자 CRUD | **조작** | `admin`, `super_admin` |
| 등록 관리 (P0) | `/enrollments` | 역할 신청 승인/반려 | **조작** | `users:update` |
| 역할 신청 (P4) | `/admin/role-applications` | 역할 신청 승인/반려 | **조작** | `users:update` |

#### 회원 관리 (Yaksa)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 | 권한 |
|--------|--------|-----------|-----------|------|
| 회원 대시보드 | `/admin/membership/dashboard` | 회원 현황 개요 | 조회 | `membership:view` |
| 회원 관리 | `/admin/membership/members` | 회원 CRUD | **조작** | `membership:manage` |
| 회원 상세 | `/admin/membership/members/:id` | 개별 회원 상세 | 조회 | `membership:view` |
| 인증 관리 | `/admin/membership/verifications` | 인증 승인/반려 | **조작** | `membership:verify` |
| 카테고리 | `/admin/membership/categories` | 회원 분류 관리 | **조작** | `membership:manage` |
| 감사 로그 | `/admin/membership/audit-logs` | 변경 이력 조회 | 조회 | `membership:view` |
| 소속 관리 | `/admin/membership/affiliations` | 소속 CRUD | **조작** | `membership:manage` |

#### CMS (콘텐츠 관리 시스템)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| CMS 대시보드 | `/admin/cms/*` | CMS 중앙 관리 | **조작** |
| 콘텐츠 목록 | `/admin/cms/contents` | 콘텐츠 CRUD | **조작** |
| 슬롯 관리 | `/admin/cms/slots` | 콘텐츠 슬롯 | **조작** |
| 채널 관리 | `/admin/cms/channels` | CMS 채널 | **조작** |
| 채널 Ops | `/admin/cms/channels/ops` | 채널 운영 메트릭 | 조회 |
| 포스트 타입 | `/admin/cms/cpts` | CPT CRUD | **조작** |
| 필드 관리 | `/admin/cms/fields` | 커스텀 필드 CRUD | **조작** |
| 뷰 관리 | `/admin/cms/views` | CMS 뷰 CRUD | **조작** |
| 뷰 디자이너 | `/admin/cms/views/:id/designer` | 비주얼 뷰 편집 | **조작** |
| 페이지 관리 | `/admin/cms/pages` | CMS 페이지 CRUD | **조작** |

#### Content Core Shell

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 콘텐츠 개요 | `/content` | 콘텐츠 관리 진입 | 조회 |
| 콘텐츠 자산 | `/content/assets` | 자산 라이브러리 | 조회 |
| 컬렉션 | `/content/collections` | 콘텐츠 컬렉션 | **조작** |
| 정책 | `/content/policies` | 접근 정책 | **조작** |
| 분석 | `/content/analytics` | 콘텐츠 사용 분석 | 조회 |

#### 외관 / 디자인

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 헤더 빌더 | `/appearance/header-builder` | 사이트 헤더 편집 | **조작** |
| 네비게이션 | `/appearance/menus/*` | 메뉴 관리 | **조작** |
| 테마 설정 | `/appearance/theme` | 테마 및 외관 | **조작** |
| 일반 설정 | `/appearance/settings` | 사이트 설정 | **조작** |
| 템플릿 파츠 | `/appearance/template-parts` | 재사용 블록 | **조작** |

#### 서비스별 관리

| 서비스 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| GlycoPharm | `/glycopharm/*` | 약국/제품 관리 | **조작** |
| GlucoseView | `/glucoseview/*` | CGM 벤더/프로필 | **조작** |
| K-Cosmetics 제품 | `/cosmetics-products/*` | 브랜드/제품 관리 | **조작** |
| K-Cosmetics 파트너 | `/cosmetics-partner/*` | 파트너 대시보드 | **조작** |
| Neture | `/neture/*` | 제품/파트너 관리 | **조작** |
| 디지털 사이니지 | `/admin/digital-signage/*` | 디스플레이/미디어 | **조작** |
| Yaksa Hub | `/admin/yaksa-hub` | 통합 서비스 대시보드 | 조회 |

#### 서비스 신청 관리 (공통)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 서비스 신청 목록 | `/admin/service-applications/:service` | 서비스별 신청 조회 | 조회 |
| 신청 상세 | `/admin/service-applications/:service/:id` | 승인/반려 | **조작** |

#### 비즈니스 대시보드 (역할별)

| 역할 | 라우트 | 기능 요약 | 조회/조작 |
|------|--------|-----------|-----------|
| 판매자 카탈로그 | `/dashboard/seller/catalog` | 상품 관리 | **조작** |
| 판매자 주문 | `/dashboard/seller/orders` | 주문 조회 | 조회 |
| 판매자 정산 | `/dashboard/seller/settlements` | 정산 조회 | 조회 |
| 공급자 주문 | `/dashboard/supplier/orders` | 공급 주문 조회 | 조회 |
| 공급자 정산 | `/dashboard/supplier/settlements` | 공급자 정산 조회 | 조회 |
| SellerOps | `/sellerops/*` | 판매자 운영 앱 | **조작** |
| SupplierOps | `/supplierops/*` | 공급자 운영 앱 | **조작** |
| PartnerOps | `/partnerops/*` | 파트너 운영 앱 | **조작** |

#### Yaksa 관리자 기능

| 페이지 | 라우트 | 기능 요약 | 조회/조작 | 권한 |
|--------|--------|-----------|-----------|------|
| Yaksa 대시보드 | `/admin/yaksa` | 서비스 대시보드 | 조회 | `yaksa-admin.access` |
| 회원 승인 | `/admin/yaksa/members` | 승인/반려 | **조작** | `yaksa-admin.members.approve` |
| 신고 검토 | `/admin/yaksa/reports` | 승인/반려 | **조작** | `yaksa-admin.reports.review` |
| 임원 관리 | `/admin/yaksa/officers` | 역할 할당 | **조작** | `yaksa-admin.officers.assign` |
| 교육 개요 | `/admin/yaksa/education` | 교육 프로그램 | 조회 | `yaksa-admin.education.view` |
| 회비 개요 | `/admin/yaksa/fees` | 회비 관리 | 조회 | `yaksa-admin.fees.view` |
| 회계 | `/admin/yaksa/accounting` | 재무 대시보드 | 조회 | `yaksa-admin.access` |
| 비용 관리 | `/admin/yaksa/accounting/expenses` | 비용 CRUD | **조작** | `yaksa-admin.access` |
| 기간 마감 | `/admin/yaksa/accounting/close` | 회계 기간 마감 | **조작** | `yaksa-admin.access` |

#### 주문 / E-Commerce

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 주문 목록 | `/admin/orders` | 전체 주문 조회 | 조회 |
| 주문 상세 | `/admin/orders/:id` | 단일 주문 조회 | 조회 |
| 드롭쉬핑 릴레이 | `/admin/dropshipping/order-relays` | 릴레이 조회 | 조회 |
| 드롭쉬핑 정산 | `/admin/dropshipping/settlements` | 정산 조회 | 조회 |
| 공동구매 캠페인 | `/admin/groupbuy` | 캠페인 조회 | 조회 |

#### 포럼 / 커뮤니티

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 포럼 대시보드 | `/forum` | 포럼 개요 | 조회 |
| 포럼 게시판 | `/forum/boards` | 게시판 관리 | **조작** |
| 포럼 카테고리 | `/forum/categories` | 카테고리 관리 | **조작** |
| 글 상세 | `/forum/posts/:id` | 글 상세 조회 | 조회 |
| 글 작성/편집 | `/forum/posts/new`, `/:id/edit` | 글 CRUD | **조작** |

#### 모니터링 / 분석

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 통합 모니터링 | `/monitoring` | 시스템 모니터링 | 조회 |
| 성능 대시보드 | `/monitoring/performance` | 성능 메트릭 | 조회 |
| 서비스 상태 | `/admin/services` | 서비스 헬스 | 조회 |
| 분석 | `/analytics/*` | 분석 대시보드 | 조회 |
| 리포팅 | `/admin/reporting` | 리포트 관리 | **조작** |

#### 미디어 / 도구

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 미디어 라이브러리 | `/media/*` | 파일 업로드/관리 | **조작** |
| 미디어 교체 | `/tools/media-replace` | 일괄 교체 | **조작** |
| 앱스토어 | `/apps/store` | 앱 탐색 | 조회 |
| 설치된 앱 | `/admin/appstore/installed` | 설치 앱 조회 | 조회 |

#### 약사 확장 (CGM, AI)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 | 권한 |
|--------|--------|-----------|-----------|------|
| AI 인사이트 | `/pharmacy-ai-insight` | 약국 AI 분석 | 조회 | `pharmacy-ai-insight.read` |
| CGM 환자 목록 | `/cgm-pharmacist/patients` | 환자 관리 | 조회 | `cgm-pharmacist.patients.read` |
| CGM 코칭 | `/cgm-pharmacist/patients/:id/coaching` | 코칭 기록 | **조작** | `cgm-pharmacist.coaching.write` |
| CGM 알림 | `/cgm-pharmacist/alerts` | 환자 알림 | 조회 | `cgm-pharmacist.alerts.read` |

#### 디버그 / 테스트 (개발용)

| 페이지 | 라우트 | 기능 요약 | 접근 |
|--------|--------|-----------|------|
| Auth Bootstrap | `/__debug__/auth-bootstrap` | 인증 진단 | Public |
| Auth State | `/debug/auth` | 인증 상태 JSON | Public |
| UI Showcase | `/ui-showcase` | UI 컴포넌트 | admin |
| 에디터 테스트 | `/admin/test/*` | 개발 도구 | admin |

### 1-2. 역할 경계 분석

**플랫폼 관리자가 운영 실행을 직접 수행 가능한 UI:**
- 사용자 생성/편집/역할 변경
- 회원 승인/반려, 인증 승인/반려
- CMS 콘텐츠/슬롯/채널/포스트타입 CRUD
- 서비스 신청 승인/반려
- 포럼 게시판/카테고리 관리
- 디지털 사이니지 관리
- 외관/테마/헤더/메뉴 편집

---

## 2. 서비스 admin 대시보드

### 2-1. GlucoseView

**소스**: `services/web-glucoseview/src/pages/AdminPage.tsx`
**라우트**: `/admin` (단일 페이지, 탭 구조)

| 탭 | 기능 요약 | 조회/조작 |
|----|-----------|-----------|
| 회원 관리 | 약사 승인/반려, 대기 수 | **조작** |
| 통계 | 등록 약사, 분회 분포 | 조회 |
| 배너 관리 | 슬라이드 배너 CRUD | **조작** |
| 파트너 관리 | 파트너 회사 CRUD | **조작** |
| 사이트 설정 | 사이트 정보 조회 | 조회 |

- **운영자 관리**: 불가
- **API 관리자 엔드포인트**: 없음 (localStorage 기반)
- **가드**: 단순 `isAdmin` 체크

### 2-2. GlycoPharm

**소스**: `services/web-glycopharm/src/pages/operator/*.tsx`
**라우트**: `/operator/*`

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 대시보드 | `/operator` | 운영 현황 종합 | 조회 |
| 약국 신청 | `/operator/applications` | 신청 승인/반려 | **조작** |
| 사용자 관리 | `/operator/users` | 운영자 추가/삭제/활성화 | **조작** |
| 매장 승인 | `/operator/store-approvals` | 매장 승인 | **조작** |
| 매장 템플릿 | `/operator/store-template` | 템플릿 관리 | **조작** |
| 제품 관리 | `/operator/products` | 카탈로그 관리 | **조작** |
| 주문 관리 | `/operator/orders` | 주문 처리 | **조작** |
| 분석 | `/operator/analytics` | 비즈니스 메트릭 | 조회 |
| 리포트 | `/operator/reports` | 청구/거래 리포트 | 조회 |
| 청구 미리보기 | `/operator/billing-preview` | 청구서 미리보기 | **조작** |
| 인보이스 | `/operator/invoices` | 인보이스 확정 | **조작** |
| 마케팅 | `/operator/marketing` | 프로모션 관리 | **조작** |
| 설정 | `/operator/settings` | 서비스 설정 | **조작** |
| AI 리포트 | `/operator/ai-report` | AI 운영 요약 | 조회 |
| 포럼 관리 | `/operator/forum-management` | 포럼 모더레이션 | **조작** |
| 사이니지 | `/operator/signage/content` | 사이니지 콘텐츠 | **조작** |

- **운영자 관리**: 가능 (`/operator/users`)
- **API 엔드포인트**: 6개 이상 (`glycopharm:admin`, `glycopharm:operator`, `platform:admin`)
- **가드**: `ProtectedRoute` + `allowedRoles={['operator']}`

### 2-3. K-Cosmetics

**소스**: `services/web-k-cosmetics/src/pages/operator/*.tsx`
**라우트**: `/operator/*`

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 대시보드 | `/operator` | 운영 현황 | 조회 |
| 매장 관리 | `/operator/stores` | 매장 관리 | **조작** |
| 신청 관리 | `/operator/applications` | 신청 처리 | **조작** |
| 제품 관리 | `/operator/products` | 카탈로그 관리 | **조작** |
| 주문 관리 | `/operator/orders` | 주문 처리 | **조작** |
| 재고 관리 | `/operator/inventory` | 재고 추적 | **조작** |
| 정산 | `/operator/settlements` | 정산 조회 | 조회 |
| 분석 | `/operator/analytics` | 메트릭 | 조회 |
| 마케팅 | `/operator/marketing` | 프로모션 | **조작** |
| 사용자 관리 | `/operator/users` | 운영자 관리 | **조작** |
| 지원 | `/operator/support` | 지원 티켓 | **조작** |
| 설정 | `/operator/settings` | 서비스 설정 | **조작** |
| AI 리포트 | `/operator/ai-report` | AI 요약 | 조회 |
| 사이니지 | `/operator/signage/content` | 사이니지 콘텐츠 | **조작** |

- **운영자 관리**: 가능 (`/operator/users`)
- **가드**: `ProtectedRoute` + `allowedRoles={['operator']}`

### 2-4. Neture

**소스**: `services/web-neture/src/pages/admin/*.tsx`, `pages/operator/*.tsx`
**라우트**: `/workspace/admin/*`, `/workspace/operator/*`

#### Admin 라우트 (`/workspace/admin/*`)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 관리자 대시보드 | `/workspace/admin` | 통계, 대기항목, AI 관리 | 조회 + **조작** |
| AI 제어판 | `/workspace/admin/ai` | AI 엔진/정책/비용 설정 | **조작** |
| AI 엔진 | `/workspace/admin/ai/engines` | AI 엔진 설정 | **조작** |
| AI 정책 | `/workspace/admin/ai/policy` | 사용 정책 | **조작** |
| AI 자산 품질 | `/workspace/admin/ai/asset-quality` | 컨텍스트 자산 품질 | **조작** |
| AI 비용 | `/workspace/admin/ai/cost` | 비용 추적 | 조회 |
| AI 컨텍스트 자산 | `/workspace/admin/ai/context-assets` | 컨텍스트 자산 관리 | **조작** |
| AI 조합 규칙 | `/workspace/admin/ai/composition-rules` | 답변 조합 규칙 | **조작** |
| AI 카드 규칙 | `/workspace/admin/ai-card-rules` | AI 카드 규칙 설정 | **조작** |
| AI 카드 리포트 | `/workspace/admin/ai-card-report` | AI 카드 성과 | 조회 |
| AI 비즈팩 | `/workspace/admin/ai-business-pack` | AI 비즈니스 패키지 | **조작** |
| AI 운영 | `/workspace/admin/ai-operations` | AI 시스템 운영 | **조작** |
| 이메일 설정 | `/workspace/admin/settings/email` | SMTP 설정 | **조작** |

#### Operator 라우트 (`/workspace/operator/*`)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 운영자 대시보드 | `/workspace/operator` | APP 통계, 서비스 현황 | 조회 |
| AI 리포트 | `/workspace/operator/ai-report` | AI 운영 인사이트 | 조회 |
| 포럼 관리 | `/workspace/operator/forum-management` | 포럼 모더레이션 | **조작** |
| 가입 요청 | `/workspace/operator/registrations` | 가입 승인 관리 | **조작** |
| 공급 대시보드 | `/workspace/operator/supply` | 공급망 운영 | **조작** |
| 알림 설정 | `/workspace/operator/settings/notifications` | 이메일 알림 | **조작** |

- **운영자 관리**: 명시적 UI 없음 (암묵적)
- **특이사항**: Admin Vault (`/admin-vault/*`) — 아키텍처 문서, 운영 노트, 문의 관리

### 2-5. KPA Society

**소스**: `services/web-kpa-society/src/routes/AdminRoutes.tsx`, `BranchAdminRoutes.tsx`, `OperatorRoutes.tsx`
**라우트**: `/demo/admin/*`, `/demo/branch/:branchId/admin/*`, `/demo/operator/*`

#### 지부 Admin 라우트 (`/demo/admin/*`)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 대시보드 | `/demo/admin/dashboard` | 조직 통계 개요 | 조회 |
| KPA 대시보드 | `/demo/admin/kpa-dashboard` | 플랫폼 관리 대시보드 | 조회 |
| 조직 관리 | `/demo/admin/divisions` | 지부/분회 관리 | **조작** |
| 조직 상세 | `/demo/admin/divisions/:id` | 조직 편집 | **조작** |
| 회원 관리 | `/demo/admin/members` | 회원 관리/승인 | **조작** |
| 위원회 요청 | `/demo/admin/committee-requests` | 위원회 신청 처리 | **조작** |
| 조직 가입 요청 | `/demo/admin/organization-requests` | 조직 가입 처리 | **조작** |
| 서비스 등록 | `/demo/admin/service-enrollments` | 서비스 등록 승인 | **조작** |
| 간사 관리 | `/demo/admin/stewards` | 간사 관리 | **조작** |
| 연차 보고 | `/demo/admin/annual-report` | 연간 보고서 | **조작** |
| 회비 관리 | `/demo/admin/fee` | 회비 설정 | **조작** |
| 뉴스 관리 | `/demo/admin/news` | 공지사항 CRUD | **조작** |
| 자료 관리 | `/demo/admin/docs` | 자료실 관리 | **조작** |
| 사이니지 | `/demo/admin/signage/content` | 사이니지 관리 | **조작** |
| 포럼 관리 | `/demo/admin/forum` | 포럼 모더레이션 | **조작** |
| 임원 관리 | `/demo/admin/officers` | 임원 할당 | **조작** |
| 설정 | `/demo/admin/settings` | 지부 설정 | **조작** |

#### 분회 Admin 라우트 (`/demo/branch/:branchId/admin/*`)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 | 범위 |
|--------|--------|-----------|-----------|------|
| 대시보드 | `/demo/branch/:id/admin/` | 분회 개요 | 조회 | 분회 한정 |
| 뉴스 관리 | `/demo/branch/:id/admin/news` | 분회 뉴스 CRUD | **조작** | 분회 한정 |
| 포럼 관리 | `/demo/branch/:id/admin/forum` | 분회 포럼 | **조작** | 분회 한정 |
| 자료 관리 | `/demo/branch/:id/admin/docs` | 분회 자료 | **조작** | 분회 한정 |
| 임원 관리 | `/demo/branch/:id/admin/officers` | 분회 임원 | **조작** | 분회 한정 |

**범위 제한**: 분회 admin은 콘텐츠(뉴스/포럼/자료/임원)만 관리 가능. 회원 관리/설정 불가 (지부 전용).

#### Operator 라우트 (`/demo/operator/*`)

| 페이지 | 라우트 | 기능 요약 | 조회/조작 |
|--------|--------|-----------|-----------|
| 대시보드 | `/demo/operator` | APP 통계, 콘텐츠/사이니지/포럼 요약 | 조회 |
| AI 리포트 | `/demo/operator/ai-report` | AI 운영 요약 | 조회 |
| 포럼 관리 | `/demo/operator/forum-management` | 포럼 모더레이션 | **조작** |
| 사이니지 | `/demo/operator/signage/content` | 사이니지 콘텐츠 | **조작** |
| 법률 관리 | `/demo/operator/legal` | 약관/정책 관리 | **조작** |
| 운영자 관리 | `/demo/operator/operators` | 운영자 추가/삭제 | **조작** |

- **운영자 관리**: 가능 (`/demo/operator/operators`)
- **가드**: `AdminAuthGuard`, `BranchAdminAuthGuard`
- **역할**: `kpa:admin`, `kpa:operator`, `kpa:district_admin`, `kpa:branch_admin`

---

## 3. 서비스 operator 대시보드

### 3-1. Neture Operator 대시보드

#### 공급자 대시보드 (`/workspace/supplier/dashboard`)

| 기능 | 파일 | 설명 | 시간 단위 |
|------|------|------|-----------|
| 프로필 완성도 | SupplierDashboardPage.tsx | 8개 항목 체크리스트 | 실시간 |
| 운영 요약 카드 | SupplierSummaryCards | 활성 제품, 대기 요청, 승인, 콘텐츠, 연결 서비스 | 실시간 |
| 서비스 상태판 | SupplierServiceStatusBoard | GlycoPharm/K-Cosmetics/GlucoseView별 현황 | 실시간 |
| 활동 타임라인 | SupplierActivityTimeline | 승인/거절 이벤트 | 실시간 |
| 기본 통계 | SupplierBasicStats | 승인율, 서비스 분포, 전환 | 실시간 |
| 대기 요청 미리보기 | 인라인 | 최근 3건 | 실시간 |
| 행동 신호 | 인라인 | 활동 가능한 판매자 알림 + 제안 링크 | 세션 1회 |

**액션**: 프로필 관리 링크, 요청 전체보기 링크, 새로고침

#### 공급자 서브 페이지

| 페이지 | 라우트 | 기능 요약 | 시간 단위 |
|--------|--------|-----------|-----------|
| 요청 관리 | `/workspace/supplier/requests` | 판매자 요청 승인/반려 | 일별 |
| 제품 관리 | `/workspace/supplier/products` | 제품 재고 관리 | 일별 |
| 주문 관리 | `/workspace/supplier/orders` | 주문 추적 (조회 전용) | 일별 |
| 콘텐츠 관리 | `/workspace/supplier/contents` | 콘텐츠 작성/편집 (TipTap) | 주별 |
| 사이니지 | `/workspace/supplier/signage/content` | 사이니지 자산 관리 | 주별 |
| 프로필 | `/workspace/supplier/profile` | 프로필 편집 | 필요 시 |
| 공급 요청 | `/workspace/supplier/supply-requests` | 공급망 요청 관리 | 일별 |

#### 파트너 대시보드 (`/workspace/partner`)

| 기능 | 파일 | 설명 | 시간 단위 |
|------|------|------|-----------|
| 허브 개념 안내 | PartnerOverviewPage.tsx | Neture 조율 허브 소개 | — |
| 요약 통계 | 인라인 | 연결 서비스 수, 공급자 수, 열린 요청 | 실시간 |
| 알림 섹션 | 인라인 | 성공/대기 항목 + 액션 링크 | 실시간 |
| 내 소개 제품 | 인라인 | 서비스별 제품 카드, 상태 토글, 콘텐츠 연결 | 실시간 |
| 서비스별 섹션 | 인라인 | 외부 서비스 링크 | — |
| 빠른 액션 | 인라인 | 협업/프로모션/정산 | — |

**액션**: 상태 토글(낙관적 업데이트), 콘텐츠 연결 모달(탐색/연결/해제/순서변경/대표 설정), 정렬

#### 파트너 서브 페이지

| 페이지 | 라우트 | 기능 요약 |
|--------|--------|-----------|
| 협업 | `/workspace/partner/collaboration` | 공급자 파트너십 관리 |
| 프로모션 | `/workspace/partner/promotions` | 캠페인 관리 |
| 정산 | `/workspace/partner/settlements` | 커미션/정산 추적 |

#### 운영자 대시보드 (`/workspace/operator`)

| 기능 | 설명 | 시간 단위 |
|------|------|-----------|
| 통계 | 활성 공급자, 총 요청, 콘텐츠 수, 대기 요청 | 실시간 |
| 서비스 상태판 | 서비스별 공급자+파트너 상태 | 실시간 |
| 최근 신청 | 상태 배지 포함 | 실시간 |
| 최근 활동 | 승인/거절/주문 이벤트 | 실시간 |
| APP 관리 | 콘텐츠/사이니지/포럼 통계 + 최근 항목 | 실시간 |
| 빠른 액션 | 공급자/파트너/콘텐츠/AI 리포트/공급요청 | — |
| 등록/설정 | 가입요청, 알림, 포럼관리, 볼트 | — |

### 3-2. KPA Society Operator 대시보드

#### 운영자 대시보드 (`/demo/operator`)

| 기능 | 설명 | 시간 단위 |
|------|------|-----------|
| APP 통계 | 콘텐츠, 미디어, 플레이리스트, 포럼 글 수 | 실시간 |
| 콘텐츠 요약 | 공개 수, 최근 항목 (핀 배지) | 실시간 |
| 사이니지 요약 | 미디어+플레이리스트 수, 타입 아이콘 | 실시간 |
| 포럼 요약 | 총 글 수, 최근 글 (작성자) | 실시간 |

**서브 페이지**: AI 리포트, 포럼 관리, 사이니지, 법률 관리, 운영자 관리

#### 사용자 대시보드 (`/dashboard`)

| 기능 | 설명 | 시간 단위 |
|------|------|-----------|
| 내 콘텐츠 (MyContentPage) | 허브 복사 콘텐츠 관리, KPI, 일괄 관리 | 실시간 |
| 행동 신호 | 승인된 공급자 알림 + 제안 링크 | 세션 1회 |

### 3-3. GlycoPharm Operator 대시보드

#### 약국 대시보드 (`/pharmacy`)

| 페이지 | 라우트 | 기능 요약 | 시간 단위 |
|--------|--------|-----------|-----------|
| 제품 관리 | `/pharmacy/products` | 재고 관리 | 일별 |
| 주문 관리 | `/pharmacy/orders` | 주문 처리 | 일별 |
| 환자 관리 | `/pharmacy/patients` | 환자 기록 | 일별 |
| 설정 | `/pharmacy/settings` | 약국 설정 | 필요 시 |
| 사이니지 | `/pharmacy/signage/*` | 매장 디지털 사이니지 | 주별 |
| 마켓 트라이얼 | `/pharmacy/market-trial` | 시장 진입 시범 | 필요 시 |
| B2B 주문 | `/pharmacy/b2b-order` | B2B 주문 | 필요 시 |
| 매장 신청 | `/pharmacy/store-apply` | 매장 개설 신청 | 1회 |
| 고객 요청 | `/pharmacy/requests` | 공통 요청 시스템 | 일별 |
| 퍼널 시각화 | `/pharmacy/funnel` | 전환 분석 | 주별 |
| B2B 제품 관리 | `/pharmacy/management` | B2B 제품 | 주별 |

#### 세미프랜차이즈 운영 (`/operator`)

| 기능 범주 | 포함 기능 | 시간 단위 |
|-----------|-----------|-----------|
| 네트워크 관리 | 약국/매장 승인, 템플릿 | 일별 |
| 상품/재고 | 카탈로그, 재고 | 일별 |
| 주문/정산 | 주문 집계, 정산, 청구, 인보이스 | 일별/월별 |
| 마케팅 | 프로모션 관리 | 주별 |
| 콘텐츠 | 포럼 관리, 사이니지 | 주별 |
| 관리 | 사용자, 지원, 설정, AI 리포트 | 필요 시 |

### 3-4. K-Cosmetics Operator 대시보드

운영자 라우트 구조는 GlycoPharm과 동일한 패턴.

| 기능 범주 | 포함 기능 | 시간 단위 |
|-----------|-----------|-----------|
| 매장 관리 | 매장 CRUD, 신청 처리 | 일별 |
| 상품/재고 | 카탈로그, 재고 추적 | 일별 |
| 주문/정산 | 주문 처리, 정산 조회 | 일별/월별 |
| 마케팅 | 프로모션 관리 | 주별 |
| 사이니지 | 사이니지 콘텐츠 허브 | 주별 |
| 관리 | 사용자, 지원, 설정, AI 리포트 | 필요 시 |

### 3-5. GlucoseView Operator 대시보드

**라우트**: `/operator/glucoseview`

| 페이지 | 라우트 | 기능 요약 | 시간 단위 |
|--------|--------|-----------|-----------|
| 신청 관리 | `/operator/glucoseview/applications` | 제공자 신청 처리 | 필요 시 |
| 신청 상세 | `/operator/glucoseview/applications/:id` | 개별 신청 검토 | 필요 시 |
| AI 리포트 | `/operator/glucoseview/ai-report` | AI 운영 인사이트 | 필요 시 |

### 3-6. 매장/디바이스 상태 확인 현황

| 서비스 | 디바이스 상태 UI | 설명 |
|--------|------------------|------|
| GlycoPharm | 존재 | 사이니지 라이브러리/콘텐츠/내 목록/미리보기 (`/pharmacy/signage/*`) |
| K-Cosmetics | 존재 | 사이니지 콘텐츠 허브 (`/operator/signage/content`) |
| Neture | 존재 | 공급자/운영자 사이니지 콘텐츠 허브 |
| KPA Society | 존재 | Admin/Operator 사이니지 콘텐츠 허브 |
| GlucoseView | 없음 | 사이니지 관련 기능 없음 |

### 3-7. 예외/장애 대응 기능

| 서비스 | 에러 로그 | 재시도 버튼 | 디버그 정보 |
|--------|-----------|------------|------------|
| admin-dashboard | 존재 (`/__debug__/*`) | 없음 | Auth Bootstrap, Auth State JSON |
| GlycoPharm | 없음 | 없음 | 없음 |
| K-Cosmetics | 없음 | 없음 | 없음 |
| Neture | 없음 | 새로고침 버튼 | 없음 |
| KPA Society | 없음 | 새로고침 버튼 | 없음 |
| GlucoseView | 없음 | 없음 | 없음 |

---

## 4. 역할/권한 체계 현황

### 4-1. 역할 정의 (현재)

#### Legacy 역할 (단계적 폐지 중)

| 역할 | 레벨 | 용도 |
|------|------|------|
| `user` | 1 | 기본 사용자 |
| `member` | 2 | 확장 회원 |
| `contributor` | 3 | 콘텐츠 기여자 |
| `seller` | 10 | E-커머스 판매자 |
| `vendor` | 11 | 벤더 |
| `supplier` | 12 | 공급자 |
| `affiliate` | 20 | 제휴 파트너 |
| `partner` | 25 | 파트너 |
| `manager` | 50 | 매니저 |
| `operator` | 55 | 운영자 |
| `admin` | 90 | 관리자 |
| `super_admin` | 100 | 최고 관리자 |

#### 서비스 접두사 역할 (Phase 1+, 현행)

| 서비스 | Admin | Operator | 기타 |
|--------|-------|----------|------|
| Platform | `platform:super_admin`, `platform:admin` | `platform:operator` | `platform:member`, `platform:contributor` |
| KPA | `kpa:admin` | `kpa:operator` | `kpa:district_admin`, `kpa:branch_admin`, `kpa:branch_operator`, `kpa:pharmacist` |
| Neture | `neture:admin` | — | `neture:supplier`, `neture:partner`, `neture:user` |
| GlycoPharm | `glycopharm:admin` | `glycopharm:operator` | `glycopharm:pharmacy`, `glycopharm:supplier`, `glycopharm:partner`, `glycopharm:consumer` |
| K-Cosmetics | `cosmetics:admin` | `cosmetics:operator` | `cosmetics:supplier`, `cosmetics:seller`, `cosmetics:partner` |
| GlucoseView | `glucoseview:admin` | `glucoseview:operator` | — |

### 4-2. 인증 체계

**토큰 추출 우선순위**:
1. Authorization 헤더: `Bearer {token}`
2. httpOnly 쿠키: `accessToken`
3. 없음 → 401

**미들웨어 체인**:
- `requireAuth` → JWT 검증 + User 조회 + isActive 체크
- `requireAdmin` → requireAuth + RoleAssignment 테이블 조회
- `requireRole(roles)` → requireAuth + 특정 역할 확인
- `optionalAuth` → 실패해도 계속 진행

### 4-3. 서비스 격리 정책

**핵심 원칙**: 서비스별 라우트는 자기 서비스 접두사 역할만 신뢰

```
kpa:admin → KPA 라우트 접근 ✅
admin (Legacy) → KPA 라우트 접근 ❌ (DENY + LOG)
platform:admin → KPA 라우트 접근 ❌ (자동 승격 없음)
```

### 4-4. 데이터베이스 구조

| 테이블 | 상태 | 용도 |
|--------|------|------|
| `users.role` | **DEPRECATED** | 단일 역할 (하위 호환) |
| `users.roles` | **DEPRECATED** | 역할 배열 (하위 호환) |
| `user_roles` | **DEPRECATED** | ManyToMany (레거시) |
| `role_assignments` | **현행 (P0 RBAC)** | 활성 역할 추적, 유효기간, 감사 추적 |

### 4-5. 프론트엔드 역할 확인

**패키지**: `@o4o/auth-client`
- `useRBAC(user)` → `hasRole`, `hasPermission`, `isAdmin`, `activeRoles`
- `useRole(role)`, `usePermission(permission)` 개별 훅
- `createRoleGuard(roles)`, `createPermissionGuard(permission)` 가드 팩토리

---

## 5. 흐름 기반 조사

### 5-1. 사용자 서비스 신청 → 승인/반려

| 단계 | 실제 구현 | 위치 |
|------|-----------|------|
| 사용자 신청 | 서비스별 신청 폼 (GlycoPharm: `/pharmacy/store-apply`, GlucoseView: `/admin` 탭) | 각 서비스 |
| 대기열 진입 | `status: 'pending'`으로 DB 저장 | API 서버 |
| 승인/반려 처리 | GlycoPharm: `/operator/applications`, KPA: `/demo/admin/members`, GlucoseView: `/admin` 탭 | 각 서비스 admin/operator |
| 자동 처리 | GlycoPharm: 승인 시 Pharmacy 자동 생성 | API admin controller |
| 이후 운영자 개입 | GlycoPharm: 매장 승인(`/operator/store-approvals`), 제품 활성화 필요 | operator 화면 |
| 플랫폼 admin | `/admin/service-applications/:service` 에서 조회 및 승인/반려 가능 | admin-dashboard |

### 5-2. 공급자 요청 → 승인 → 허브 이동 → 판매자 선택

| 단계 | 실제 구현 | 위치 |
|------|-----------|------|
| 공급자 요청 | `neture_supplier_requests` 테이블에 기록 | API 서버 |
| 승인 처리 | Neture 공급자 `/workspace/supplier/requests` | Neture 서비스 |
| 허브 이동 | 판매자 MyContentPage에 행동 신호 표시 ("승인된 공급자 연결") | KPA/Neture |
| 판매자 선택 | 신호 내 제안 링크로 콘텐츠/뉴스 페이지 이동 유도 | 프론트엔드 |
| 신호 소멸 | 공개/보관 액션 수행 시 또는 명시적 닫기 | sessionStorage |

### 5-3. 판매/성과 화면

| 서비스 | 구현 형태 | 판단 유도 여부 |
|--------|-----------|---------------|
| GlycoPharm | `/operator/analytics` (조회), `/operator/reports` (조회) | 단순 조회 |
| K-Cosmetics | `/operator/analytics` (조회), `/operator/settlements` (조회) | 단순 조회 |
| Neture | 운영자 대시보드 통계 카드 (조회), 파트너 정산 (조회) | 단순 조회 |
| KPA | 지부 admin 통계 (조회) | 단순 조회 |
| GlucoseView | `/admin` 통계 탭 (조회) | 단순 조회 |
| MyContentPage | KPI 카드 + 제안 액션 (Phase 4B) | **운영 판단 유도** (공개/보관/설명수정 제안) |

---

## 6. 종합 현황표

### 6-1. 서비스별 기능 매트릭스

| 기능 | admin-dashboard | GlycoPharm | K-Cosmetics | Neture | KPA | GlucoseView |
|------|----------------|------------|-------------|--------|-----|-------------|
| **운영자 관리** | ✅ `/operators` | ✅ `/operator/users` | ✅ `/operator/users` | ❌ 명시적 없음 | ✅ `/demo/operator/operators` | ❌ |
| **신청 승인/반려** | ✅ 서비스 신청 | ✅ 약국 신청 | ✅ 매장 신청 | ✅ 가입 요청 | ✅ 회원/위원회/조직 | ✅ 약사 승인 |
| **제품/카탈로그** | ✅ 서비스별 | ✅ 제품 관리 | ✅ 제품 관리 | ❌ | ❌ | ❌ |
| **주문 관리** | ✅ 조회 전용 | ✅ 주문 처리 | ✅ 주문 처리 | ❌ | ❌ | ❌ |
| **정산** | ✅ 드롭쉬핑 | ✅ 정산+청구+인보이스 | ✅ 정산 조회 | ✅ 파트너 정산 | ❌ | ❌ |
| **포럼 관리** | ✅ 플랫폼 | ✅ 모더레이션 | ❌ | ✅ 모더레이션 | ✅ admin+operator | ❌ |
| **사이니지** | ✅ 디스플레이 | ✅ 라이브러리 | ✅ 콘텐츠허브 | ✅ 콘텐츠허브 | ✅ 콘텐츠허브 | ❌ |
| **AI 리포트** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **콘텐츠 CRUD** | ✅ CMS 전체 | ❌ | ❌ | ✅ 공급자 콘텐츠 | ✅ 뉴스/자료 | ❌ |
| **분석/메트릭** | ✅ 모니터링 | ✅ Analytics | ✅ Analytics | ✅ 대시보드 통계 | ✅ 대시보드 통계 | ✅ 통계 탭 |
| **마케팅** | ✅ LMS-Marketing | ✅ 프로모션 | ✅ 프로모션 | ❌ | ❌ | ❌ |
| **행동 신호** | ❌ | ❌ | ❌ | ✅ 판매자+공급자 | ✅ 판매자 | ❌ |
| **대시보드 자산** | ❌ | ❌ | ❌ | ✅ MyContentPage | ✅ MyContentPage | ❌ |

### 6-2. 역할-기능 접근 매트릭스

| 역할 | 플랫폼 admin | 서비스 admin | 서비스 operator | 비즈니스 대시보드 |
|------|-------------|-------------|----------------|-----------------|
| `platform:super_admin` | ✅ 전체 | ❌ 서비스 격리 | ❌ | ❌ |
| `platform:admin` | ✅ 전체 | ❌ 서비스 격리 | ❌ | ❌ |
| `{service}:admin` | ❌ | ✅ 해당 서비스 | ✅ 해당 서비스 | ❌ |
| `{service}:operator` | ❌ | ✅ 해당 서비스 | ✅ 해당 서비스 | ❌ |
| `supplier` | ❌ | ❌ | ❌ | ✅ 공급자 대시보드 |
| `seller` | ❌ | ❌ | ❌ | ✅ 판매자 대시보드 |
| `partner` | ❌ | ❌ | ❌ | ✅ 파트너 대시보드 |

### 6-3. 설정 vs 운영 혼재 현황

| 서비스 | 설정 전용 화면 | 운영 혼재 여부 |
|--------|---------------|---------------|
| GlucoseView | 사이트 설정 탭 | 혼재 (단일 `/admin` 페이지) |
| GlycoPharm | `/operator/settings` | 혼재 (동일 `/operator` 하위) |
| K-Cosmetics | `/operator/settings` | 혼재 (동일 `/operator` 하위) |
| Neture | `/workspace/admin/ai/*`, `/settings/email` | 분리 (admin vs operator 별도 라우트) |
| KPA Society | `/demo/admin/settings` | 혼재 (admin에 설정+운영 공존) |

---

## 조사 종료 조건 체크

| 조건 | 충족 여부 |
|------|-----------|
| 현재 구현된 기능이 빠짐없이 나열되었는가 | ✅ 5개 서비스 + 플랫폼 admin 전수 조사 |
| 역할 기준과 어긋나는 지점이 판단 없이 식별되었는가 | ✅ 혼재 현황, 접근 매트릭스로 식별 |
| 객관적 현황표가 만들어졌는가 | ✅ 6개 종합 표 작성 |

---

*조사 완료: 2026-02-10*
*조사자: Claude (자동 에이전트 4개 병렬 투입)*
