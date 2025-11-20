# 📘 o4o-platform 전역 구조 조사 보고서

**버전**: 1.0
**조사일**: 2025-11-20
**목적**: o4o-platform 전체 구조를 정확하게 파악하여, 전역 리팩토링의 기반 자료를 제공

---

## 목차

1. [개요](#1-개요)
2. [전체 폴더 트리](#2-전체-폴더-트리)
3. [Frontend 구조 분석](#3-frontend-구조-분석)
4. [Backend 구조 분석](#4-backend-구조-분석)
5. [문제 구간(Hotspot) 목록](#5-문제-구간hotspot-목록)
6. [기능군별 폴더 위치 매핑표](#6-기능군별-폴더-위치-매핑표)
7. [정리 기준안(Refactoring Rules)](#7-정리-기준안refactoring-rules)
8. [권장 사항 및 다음 단계](#8-권장-사항-및-다음-단계)

---

## 1. 개요

### 1.1 조사 배경

o4o-platform은 수년 간 다양한 기능이 추가되면서 복잡한 구조를 갖게 되었습니다:

- **App Engine**: 동적 앱 시스템
- **CPT/ACF**: WordPress 스타일의 커스텀 포스트 타입 및 필드
- **Block Editor**: Gutenberg 스타일 편집기
- **Dropshipping**: Seller/Supplier/Partner 다층 구조
- **Admin Dashboard**: 관리자 대시보드
- **Main Site**: 사용자 포털

### 1.2 조사 범위

- ✅ **Apps**: main-site, admin-dashboard, api-server, forum, ecommerce, crowdfunding, digital-signage
- ✅ **Packages**: 17개 공유 패키지
- ✅ **Backend**: Entities, Services, Controllers, Routes
- ✅ **Configuration**: Build 시스템, 환경 설정

---

## 2. 전체 폴더 트리

### 2.1 Apps 구조

```
apps/
├── admin-dashboard/          # 관리자 대시보드
│   ├── src/
│   │   ├── pages/           # 37개 하위 디렉토리, 6개 페이지 파일
│   │   ├── components/      # 37개 카테고리 컴포넌트
│   │   ├── blocks/          # Block Editor 블록 정의
│   │   ├── services/        # AI, API 서비스
│   │   ├── hooks/           # 커스텀 훅
│   │   ├── stores/          # 상태 관리
│   │   └── ...
│   └── public/
│
├── main-site/                # 사용자 포털
│   ├── src/
│   │   ├── pages/           # 페이지 컴포넌트
│   │   │   ├── dashboard/   # 30개 대시보드 페이지
│   │   │   ├── auth/        # 인증 페이지
│   │   │   ├── storefront/  # 상점 페이지
│   │   │   └── ...
│   │   ├── components/      # 28개 카테고리 컴포넌트
│   │   │   ├── shortcodes/  # 18개 숏코드 컴포넌트
│   │   │   ├── dropshipping/# Dropshipping 컴포넌트
│   │   │   ├── dashboard/   # 대시보드 컴포넌트
│   │   │   └── ...
│   │   ├── services/        # API 서비스 레이어
│   │   ├── hooks/
│   │   └── ...
│   └── public/
│
├── api-server/               # 백엔드 API 서버
│   ├── src/
│   │   ├── entities/        # 80+ TypeORM 엔티티
│   │   ├── services/        # 60+ 비즈니스 로직 서비스
│   │   ├── controllers/     # 16개 도메인별 컨트롤러
│   │   ├── routes/          # API 라우트 정의
│   │   ├── modules/         # 모듈화된 기능 (cpt-acf 등)
│   │   ├── database/        # 마이그레이션, 시드
│   │   └── ...
│   ├── migrations/
│   └── uploads/
│
├── api-gateway/              # API 게이트웨이
├── forum/                    # 포럼 앱
├── ecommerce/                # 전자상거래 앱
├── crowdfunding/             # 크라우드펀딩 앱
├── digital-signage/          # 디지털 사이니지 앱
└── healthcare/               # 헬스케어 앱 (플레이스홀더)
```

### 2.2 Packages 구조

```
packages/
├── appearance-system/        # 테마 토큰 및 스타일 시스템
│   └── src/
│       ├── tokens.ts
│       ├── css-generators.ts
│       └── inject.ts
│
├── auth-client/              # 인증 클라이언트 (SSO, Cookie)
│   └── src/
│       ├── client.ts
│       ├── sso-client.ts
│       └── cookie-client.ts
│
├── auth-context/             # React 인증 컨텍스트
│   └── src/
│       ├── AuthProvider.tsx
│       ├── SSOAuthProvider.tsx
│       └── CookieAuthProvider.tsx
│
├── block-core/               # Block Editor 코어
│   └── src/
│       ├── BlockRegistry.ts
│       ├── BlockManager.ts
│       └── PluginLoader.ts
│
├── block-renderer/           # Block 렌더러
├── block-registry/           # Block 레지스트리
├── shortcodes/               # 숏코드 시스템
│   └── src/
│       ├── auth/            # 인증 숏코드
│       ├── dropshipping/    # Dropshipping 숏코드
│       ├── preset/          # 프리셋
│       └── dynamic/         # 동적 숏코드
│
├── cpt-registry/             # CPT(Custom Post Type) 레지스트리
├── types/                    # 공유 TypeScript 타입 (30+ 파일)
├── ui/                       # 공유 UI 컴포넌트
├── utils/                    # 유틸리티 함수
├── forum-types/              # 포럼 타입
├── crowdfunding-types/       # 크라우드펀딩 타입
├── slide-app/                # 슬라이드 앱
└── supplier-connector/       # 공급자 커넥터
```

---

## 3. Frontend 구조 분석

### 3.1 apps/main-site

#### 3.1.1 Pages 구조

| 디렉토리 | 파일 수 | 주요 기능 |
|----------|---------|----------|
| `/pages/dashboard` | 30개 | Seller/Supplier/Partner 대시보드 |
| `/pages/auth` | 10개 | 로그인, 회원가입, OAuth, 비밀번호 찾기 |
| `/pages/storefront` | 5개 | 상품, 장바구니, 주문 |
| `/pages/apply` | 6개 | 역할 신청 (Seller, Supplier, Partner) |
| `/pages/admin` | 1개 | 관리자 역할 신청 관리 |
| `/pages/hubs` | 3개 | Seller/Supplier/Affiliate 허브 |

#### 3.1.2 Components 구조

| 카테고리 | 설명 | 특이사항 |
|----------|------|----------|
| `components/shortcodes` | 18개 숏코드 컴포넌트 | **대용량**: SellerDashboard.tsx (946줄), SupplierDashboard.tsx (700+줄) |
| `components/dropshipping` | Dropshipping UI | Seller/Supplier/Partner 역할별 폴더 분리 |
| `components/dashboard` | 대시보드 위젯 | supplier/, seller/, partner/ 하위 폴더 |
| `components/blocks` | Universal Block | 단일 블록 시스템 |

#### 3.1.3 Services (API Layer)

| 파일명 | 역할 |
|--------|------|
| `sellerProductApi.ts` | Seller 상품 API |
| `sellerOrderApi.ts` | Seller 주문 API |
| `sellerSettlementApi.ts` | Seller 정산 API |
| `supplierProductApi.ts` | Supplier 상품 API |
| `supplierOrderApi.ts` | Supplier 주문 API |
| `supplierSettlementApi.ts` | Supplier 정산 API |
| `partnerLinkApi.ts` | Partner 링크 API |
| `partnerSettlementApi.ts` | Partner 정산 API |

### 3.2 apps/admin-dashboard

#### 3.2.1 Pages 구조

**37개 페이지 디렉토리**, 주요 카테고리:

| 디렉토리 | 설명 |
|----------|------|
| `/pages/appearance` | 테마, 헤더 빌더 |
| `/pages/cpt-acf` | CPT/ACF 관리 |
| `/pages/dropshipping` | Dropshipping 관리 |
| `/pages/partner` | Partner 대시보드 (7개 파일) |
| `/pages/dashboard/supplier` | Supplier 대시보드 |
| `/pages/dashboard/seller` | Seller 대시보드 |
| `/pages/posts` | Posts, Categories, Tags |
| `/pages/menus` | 메뉴 관리 |
| `/pages/editor` | 페이지 편집기 |
| `/pages/test` | 테스트 페이지 (8개) |

#### 3.2.2 Blocks 구조

**30개 블록 정의** in `src/blocks/definitions/`:

- 핵심 블록: paragraph, heading, image, gallery, video, button, columns, table
- 폼 블록: form-field, form-submit, universal-form
- 특수 블록: shortcode, slide, youtube, markdown, code
- **신규**: placeholder.tsx (AI 생성 블록용)

**블록 폴더 구조**:
- `definitions/` - 블록 정의
- `generated/` - AI 생성 블록 (예: TimelineChart)
- `runtime/` - 런타임 블록 로더
- `registry/` - 블록 레지스트리
- `variations/` - 블록 변형

#### 3.2.3 AI Services (신규)

| 서비스 | 역할 | 크기 |
|--------|------|------|
| `SimpleAIGenerator.ts` | 간단한 AI 생성 | 885줄 |
| `BlockAIGenerator.ts` | 블록 AI 생성 | 288줄 |
| `BlockCodeGenerator.ts` | 블록 코드 생성 | 467줄 |
| `PageAIImprover.ts` | 페이지 개선 | 335줄 |
| `SectionAIGenerator.ts` | 섹션 생성 | 318줄 |

### 3.3 Packages 분석

#### 3.3.1 Core Packages

| Package | 역할 | 주요 파일 |
|---------|------|----------|
| `appearance-system` | 테마 토큰 시스템 | tokens.ts (59줄) |
| `auth-client` | 인증 클라이언트 | client.ts, sso-client.ts |
| `auth-context` | React 인증 컨텍스트 | AuthProvider.tsx |
| `block-core` | Block Editor 코어 | BlockRegistry.ts |
| `shortcodes` | 숏코드 시스템 | parser.ts, renderer.ts |
| `types` | 공유 타입 (30+ 파일) | 모든 도메인 타입 |
| `ui` | UI 컴포넌트 | components.tsx |

#### 3.3.2 Domain Packages

| Package | 역할 |
|---------|------|
| `forum-types` | 포럼 타입 정의 |
| `crowdfunding-types` | 크라우드펀딩 타입 |
| `cpt-registry` | CPT 레지스트리 |
| `supplier-connector` | 공급자 연동 |

---

## 4. Backend 구조 분석

### 4.1 apps/api-server

#### 4.1.1 Entities (80+ 엔티티)

**주요 카테고리**:

| 카테고리 | 엔티티 예시 |
|----------|-------------|
| **User** | User, UserSession, RefreshToken, LinkedAccount |
| **Content** | Post, Page, CustomPost, Media, BlockPattern, ReusableBlock |
| **CPT/ACF** | CustomPostType, ACFField, ACFFieldGroup, CustomField |
| **Ecommerce** | Product, Cart, CartItem, Order, Payment, Commission |
| **Dropshipping** | SellerProfile, SupplierProfile, PartnerProfile, ChannelProductLink, ChannelOrderLink |
| **Settlement** | Settlement, SettlementItem, CommissionPolicy |
| **Notification** | Notification, NotificationTemplate, EmailLog |
| **Menu** | Menu, MenuItem, MenuLocation |
| **Forum** | ForumPost, ForumCategory, ForumComment |
| **Crowdfunding** | CrowdfundingProject, CrowdfundingParticipation |
| **System** | Settings, AuditLog, UserAction, Alert |

#### 4.1.2 Services (60+ 서비스)

**핵심 서비스**:

| 서비스 | 크기 | 역할 |
|--------|------|------|
| `OrderService.ts` | 1,183줄 | 주문 처리 |
| `DatabaseOptimizationService.ts` | 1,390줄 | DB 최적화 |
| `DeploymentMonitoringService.ts` | 1,257줄 | 배포 모니터링 |
| `OperationsMonitoringService.ts` | 1,188줄 | 운영 모니터링 |
| `SettlementService.ts` | 800+줄 | 정산 처리 |
| `PartnerService.ts` | 600+줄 | 파트너 관리 |
| `AuthService.ts` / `AuthServiceV2.ts` | 각 500+줄 | 인증 처리 |

**모니터링/운영 서비스**:
- AutoScalingService, AutoRecoveryService, SelfHealingService
- CDNOptimizationService, CacheService
- IncidentEscalationService, ErrorAlertService
- GracefulDegradationService, CircuitBreakerService

**CPT/ACF 서비스** in `services/cpt/`:
- `cpt.service.ts` - CPT 핵심 로직
- `modules/post.module.ts` - 포스트 모듈
- `modules/meta.module.ts` - 메타 모듈
- `modules/acf.module.ts` - ACF 모듈
- `dropshipping-cpts.ts` - Dropshipping CPT

#### 4.1.3 Controllers (16개 도메인)

```
controllers/
├── admin/          # 관리자 기능
├── analytics/      # 분석
├── content/        # 콘텐츠 (PostController 931줄)
├── cpt/            # CPT
├── crowdfunding/   # 크라우드펀딩
├── dropshipping/   # Dropshipping
├── ecommerce/      # 전자상거래
├── entity/         # 엔티티
├── forum/          # 포럼 (ForumCPTController 977줄)
├── media/          # 미디어
├── menu/           # 메뉴
├── partner/        # 파트너
├── themes/         # 테마
└── v1/             # API v1 (content.controller.ts 1,099줄)
```

#### 4.1.4 Routes 구조

**도메인별 라우트**:

| 디렉토리 | 주요 파일 |
|----------|----------|
| `/routes/admin` | enrollments.routes.ts (1,116줄), dropshipping.routes.ts, suppliers.routes.ts, seller-authorization.routes.ts |
| `/routes/seller` | Seller 관련 라우트 |
| `/routes/supplier` | Supplier 관련 라우트 |
| `/routes/partner` | Partner 라우트 |
| `/routes/v1` | settings.routes.ts (1,525줄) |
| `/routes/v2` | seller.routes.ts, supplier.routes.ts |
| `/routes/cpt` | dropshipping.routes.ts |

**특수 라우트**:
- `ai-proxy.ts` (1,182줄) - AI 프록시
- `ds-seller-authorization.routes.ts` - Seller 인증
- `seller-dashboard.routes.ts` - Seller 대시보드
- `seller-products.ts` - Seller 상품

#### 4.1.5 Modules

```
modules/
└── cpt-acf/
    ├── controllers/
    ├── services/
    ├── repositories/
    ├── errors/
    └── routes/
```

**CPT-ACF 모듈**: 완전히 모듈화된 구조, 향후 리팩토링 참고 모델

---

## 5. 문제 구간(Hotspot) 목록

### 5.1 대용량 파일 (1,000줄 이상)

**상위 10개**:

| 파일 | 줄 수 | 문제점 | 권장 사항 |
|------|-------|--------|----------|
| `admin-dashboard/src/types/dashboard-api.ts` | 1,715줄 | 타입 정의 과다 집중 | 도메인별로 분리 |
| `admin-dashboard/src/components/editor/GutenbergBlockEditor.tsx` | 1,624줄 | 편집기 로직 복잡 | 컴포넌트 분해 |
| `api-server/src/routes/v1/settings.routes.ts` | 1,525줄 | 라우트 너무 많음 | 도메인별 분리 |
| `api-server/src/services/DatabaseOptimizationService.ts` | 1,390줄 | DB 최적화 로직 집중 | 전략 패턴 적용 |
| `api-server/src/controllers/betaUserController.ts` | 1,349줄 | 컨트롤러 비대 | 서비스 레이어로 분리 |
| `api-server/src/services/DeploymentMonitoringService.ts` | 1,257줄 | 모니터링 로직 복잡 | 모듈화 |
| `api-server/src/services/OperationsMonitoringService.ts` | 1,188줄 | 운영 로직 복잡 | 모듈화 |
| `api-server/src/services/OrderService.ts` | 1,183줄 | 주문 로직 복잡 | 도메인 이벤트 패턴 |
| `api-server/src/routes/ai-proxy.ts` | 1,182줄 | AI 프록시 복잡 | 서비스 분리 |
| `admin-dashboard/src/pages/vendors/VendorsCommissionWordPress.tsx` | 1,161줄 | UI 로직 과다 | 컴포넌트 분해 |

### 5.2 중복 코드 패턴

#### 5.2.1 Dropshipping 관련 중복

**중복 경로**:

```
# Frontend
apps/main-site/src/components/dropshipping/
apps/main-site/src/pages/dashboard/[seller|supplier|partner]
apps/main-site/src/services/[seller|supplier|partner]*Api.ts
apps/admin-dashboard/src/components/shortcodes/dropshipping/[seller|supplier|partner]
apps/admin-dashboard/src/pages/dashboard/[seller|supplier]

# Backend
apps/api-server/src/controllers/dropshipping/
apps/api-server/src/routes/[seller|supplier]/
apps/api-server/src/routes/v2/[seller|supplier].routes.ts
apps/api-server/src/routes/ds-seller-*.routes.ts
```

**문제점**:
- Seller, Supplier, Partner별로 거의 동일한 구조가 3번 반복
- 공통 로직 추출 부족
- 타입 정의 중복

#### 5.2.2 Shortcode 중복

**main-site vs admin-dashboard**:

```
# main-site
apps/main-site/src/components/shortcodes/SellerDashboard.tsx (946줄)
apps/main-site/src/components/shortcodes/SupplierDashboard.tsx (700+줄)

# packages
packages/shortcodes/src/dropshipping/
```

**문제점**:
- 같은 숏코드가 여러 곳에 정의
- packages/shortcodes와 apps별 shortcodes 혼재

#### 5.2.3 타입 정의 중복

**타입 파일 분산**:

```
packages/types/src/
apps/main-site/src/types/
apps/admin-dashboard/src/types/
apps/api-server/src/types/
packages/forum-types/src/
packages/crowdfunding-types/src/
```

**문제점**:
- 동일한 엔티티에 대한 타입이 여러 곳에 정의
- 동기화 문제 발생 가능

### 5.3 구조 혼재 문제

#### 5.3.1 Components vs Pages

**admin-dashboard**:
- `pages/` 에 화면 컴포넌트와 라우트 컴포넌트 혼재
- 37개 디렉토리 중 일부는 단일 페이지, 일부는 복잡한 기능 모음
- 명확한 폴더 기준 부재

#### 5.3.2 CPT/ACF 구조 분산

**CPT/ACF 관련 코드**:

```
# Backend
apps/api-server/src/modules/cpt-acf/       # 모듈화 완료
apps/api-server/src/services/cpt/          # 일부 서비스
apps/api-server/src/services/acf/          # 일부 서비스
apps/api-server/src/controllers/cpt/       # 컨트롤러
apps/api-server/src/routes/cpt/            # 라우트
apps/api-server/src/entities/CustomPost*.ts # 엔티티

# Frontend
apps/admin-dashboard/src/pages/cpt-acf/
apps/admin-dashboard/src/pages/cpt-engine/
apps/admin-dashboard/src/pages/custom-fields/
apps/admin-dashboard/src/components/cpt/
apps/admin-dashboard/src/components/acf/

# Packages
packages/cpt-registry/
```

**문제점**:
- `modules/cpt-acf`는 모듈화되었으나, `services/cpt`와 `services/acf`는 분리
- Frontend에서 cpt-acf, cpt-engine, custom-fields 3개 폴더로 분산

---

## 6. 기능군별 폴더 위치 매핑표

### 6.1 인증 (Authentication)

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Login/Signup UI | `apps/main-site/src/pages/auth` | 단일 | ✅ 문제 없음 |
| OAuth Callback | `apps/main-site/src/pages/auth/OAuthCallback.tsx` | 단일 | ✅ 문제 없음 |
| Auth Shortcodes | `apps/main-site/src/components/shortcodes/auth` | 중복 | ⚠️ packages/shortcodes와 통합 필요 |
| Auth Services (Backend) | `apps/api-server/src/services/AuthService*.ts` | 2개 버전 | ⚠️ V1/V2 통합 또는 명확한 분리 |
| Auth Client | `packages/auth-client` | 단일 | ✅ 문제 없음 |
| Auth Context | `packages/auth-context` | 단일 | ✅ 문제 없음 |

### 6.2 Dropshipping

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Seller Dashboard (Main) | `apps/main-site/src/pages/dashboard/Seller*` (30개 중 10개) | 높음 | 🔴 Phase 2 리팩토링 필수 |
| Seller Dashboard (Admin) | `apps/admin-dashboard/src/pages/dashboard/seller` | 중복 | 🔴 역할 명확히 구분 필요 |
| Seller Shortcodes | `apps/main-site/src/components/shortcodes/Seller*.tsx` (946줄) | 높음 | 🔴 컴포넌트 분해 |
| Seller API (Backend) | `apps/api-server/src/routes/seller`, `routes/v2/seller.routes.ts` | 중복 | ⚠️ V1/V2 정리 |
| Supplier (전체) | 위와 동일 패턴 | 높음 | 🔴 Seller와 동일 문제 |
| Partner (전체) | 위와 동일 패턴 | 높음 | 🔴 Seller와 동일 문제 |

**종합 평가**: Dropshipping은 **가장 복잡도가 높은 영역**, App Engine 기반 리팩토링 최우선 대상

### 6.3 Block Editor

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Block Definitions | `apps/admin-dashboard/src/blocks/definitions` (30개) | 단일 | ✅ 문제 없음 |
| Block Core | `packages/block-core` | 단일 | ✅ 문제 없음 |
| Block Registry | `packages/block-registry` | 중복? | ⚠️ block-core와 역할 확인 필요 |
| Block Renderer | `packages/block-renderer` | 단일 | ✅ 문제 없음 |
| Gutenberg Editor | `apps/admin-dashboard/src/components/editor/GutenbergBlockEditor.tsx` (1,624줄) | 단일 | 🔴 컴포넌트 분해 필요 |
| AI Block Generator | `apps/admin-dashboard/src/services/ai/BlockAIGenerator.ts` | 신규 | ✅ 좋은 구조 |

### 6.4 CPT/ACF

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| CPT Module (Backend) | `apps/api-server/src/modules/cpt-acf` | 단일 | ✅ 모듈화 완료 (참고 모델) |
| CPT Services | `apps/api-server/src/services/cpt` | 중복 | ⚠️ modules/cpt-acf와 통합 고려 |
| ACF Services | `apps/api-server/src/services/acf` | 중복 | ⚠️ modules/cpt-acf와 통합 고려 |
| CPT Pages (Admin) | `apps/admin-dashboard/src/pages/cpt-acf`, `cpt-engine`, `custom-fields` | 분산 | 🔴 3개 폴더 통합 필요 |
| CPT Registry | `packages/cpt-registry` | 단일 | ✅ 문제 없음 |

### 6.5 Shortcodes

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Shortcode System | `packages/shortcodes` | 단일 | ✅ 핵심 시스템 |
| Auth Shortcodes | `apps/main-site/src/components/shortcodes/auth` | 중복 | ⚠️ packages로 이동 |
| Dropshipping Shortcodes | `apps/main-site/src/components/shortcodes/[Seller|Supplier|Partner]*` | 중복 | 🔴 packages로 이동 후 분해 |
| Product Shortcodes | `apps/main-site/src/components/shortcodes/Product*.tsx` | 중복 | ⚠️ packages로 이동 |

**종합 평가**: Shortcodes는 packages에 있으나, 실제 구현은 apps/main-site에 분산. **통합 필요**

### 6.6 Appearance (Theme)

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Appearance System | `packages/appearance-system` | 단일 | ✅ 중앙화 완료 |
| Theme Tokens | `packages/appearance-system/src/tokens.ts` | 단일 | ✅ 문제 없음 |
| Header Builder | `apps/admin-dashboard/src/pages/appearance/header-builder` | 단일 | ✅ 문제 없음 |
| Site Theme Settings | `apps/admin-dashboard/src/pages/appearance/SiteThemeSettings.tsx` | 단일 | ✅ 문제 없음 |

### 6.7 Notification

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Notification Service (Backend) | `apps/api-server/src/services/NotificationService.ts` | 단일 | ✅ 문제 없음 |
| Notification Entity | `apps/api-server/src/entities/Notification*.ts` (4개) | 분산 | ⚠️ 통합 고려 |
| Notification UI (Admin) | `apps/admin-dashboard/src/pages/notifications` | 단일 | ✅ 문제 없음 |
| Notification Components | `apps/admin-dashboard/src/pages/dashboard/components/Notifications` | 중복 | ⚠️ 공통 컴포넌트로 이동 |

### 6.8 Ecommerce

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Storefront Pages | `apps/main-site/src/pages/storefront` | 단일 | ✅ 문제 없음 |
| Ecommerce App | `apps/ecommerce` | 별도 앱 | ⚠️ main-site와 역할 중복 확인 필요 |
| Product Entity | `apps/api-server/src/entities/Product.ts` | 단일 | ✅ 문제 없음 |
| Order Service | `apps/api-server/src/services/OrderService.ts` (1,183줄) | 단일 | 🔴 복잡도 높음, 분해 필요 |
| Payment Service | `apps/api-server/src/services/PaymentService.ts` | 단일 | ✅ 문제 없음 |

### 6.9 Forum

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Forum App | `apps/forum` | 별도 앱 | ✅ 앱 분리 완료 |
| Forum Types | `packages/forum-types` | 단일 | ✅ 문제 없음 |
| Forum CPT Controller | `apps/api-server/src/controllers/forum/ForumCPTController.ts` (977줄) | 단일 | ⚠️ 복잡도 높음 |
| Forum Service | `apps/api-server/src/services/forumService.ts` | 단일 | ✅ 문제 없음 |
| Forum Pages (Admin) | `apps/admin-dashboard/src/pages/forum` | 단일 | ✅ 문제 없음 |

### 6.10 Crowdfunding

| 기능 | 실제 경로 | 중복 여부 | 개선 의견 |
|------|----------|----------|----------|
| Crowdfunding App | `apps/crowdfunding` | 별도 앱 | ✅ 앱 분리 완료 |
| Crowdfunding Types | `packages/crowdfunding-types` | 단일 | ✅ 문제 없음 |
| Crowdfunding Pages (Admin) | `apps/admin-dashboard/src/pages/crowdfunding` | 단일 | ✅ 문제 없음 |

---

## 7. 정리 기준안(Refactoring Rules)

### 7.1 폴더 구조 원칙

#### 원칙 1: 도메인 우선 구조 (Domain-First)

**Before**:
```
src/
├── components/
│   ├── seller/
│   ├── supplier/
│   └── partner/
├── services/
│   ├── sellerApi.ts
│   ├── supplierApi.ts
│   └── partnerApi.ts
```

**After**:
```
src/
├── domains/
│   ├── seller/
│   │   ├── components/
│   │   ├── services/
│   │   ├── pages/
│   │   └── types/
│   ├── supplier/
│   └── partner/
```

#### 원칙 2: 공통 코드는 packages로

**이동 대상**:
- ✅ UI 컴포넌트 → `packages/ui`
- ✅ 비즈니스 로직 없는 유틸리티 → `packages/utils`
- ✅ 타입 정의 → `packages/types`
- ✅ Shortcodes → `packages/shortcodes`

**유지 대상**:
- 앱별 특화 로직 → 각 앱 내부 유지

#### 원칙 3: 파일 크기 제한

| 파일 타입 | 최대 권장 줄 수 | 초과 시 조치 |
|-----------|-----------------|-------------|
| Component | 300줄 | 하위 컴포넌트로 분해 |
| Service | 500줄 | 클래스 분리 또는 모듈화 |
| Controller | 400줄 | 서비스 레이어로 로직 이동 |
| Route | 300줄 | 도메인별 분리 |
| Type 정의 | 500줄 | 파일 분할 |

#### 원칙 4: 명명 규칙

**파일명**:
- Component: `PascalCase.tsx` (예: `SellerDashboard.tsx`)
- Service: `camelCase.service.ts` (예: `sellerProduct.service.ts`)
- Hook: `use*.ts` (예: `useSellerProducts.ts`)
- Type: `kebab-case.ts` 또는 `PascalCase.ts` (예: `seller-product.ts`)

**폴더명**:
- 도메인: `kebab-case` (예: `seller-dashboard`)
- 기능: `kebab-case` (예: `auth-client`)

### 7.2 리팩토링 우선순위

#### Phase 1: 긴급 (1-2주)

1. **대용량 파일 분해** (1,000줄 이상)
   - `GutenbergBlockEditor.tsx` (1,624줄)
   - `dashboard-api.ts` (1,715줄)
   - `settings.routes.ts` (1,525줄)
   - `DatabaseOptimizationService.ts` (1,390줄)

2. **중복 코드 제거**
   - Seller/Supplier/Partner 공통 로직 추출
   - Shortcodes 통합 (`apps/main-site` → `packages/shortcodes`)

#### Phase 2: 중요 (1개월)

3. **Dropshipping 리팩토링**
   - App Engine 기반으로 재구성
   - Seller/Supplier/Partner를 별도 앱으로 분리
   - 공통 `packages/dropshipping-core` 생성

4. **CPT/ACF 통합**
   - `pages/cpt-acf`, `cpt-engine`, `custom-fields` 3개 폴더 통합
   - `services/cpt`, `services/acf` → `modules/cpt-acf` 통합

5. **타입 정의 중앙화**
   - `apps/*/types` → `packages/types` 이동
   - 도메인별 타입 파일 구조화

#### Phase 3: 개선 (2-3개월)

6. **모듈화 확대**
   - `modules/cpt-acf` 패턴을 다른 도메인에 적용
   - `modules/ecommerce`, `modules/forum`, `modules/auth` 생성

7. **App Engine 기반 구조**
   - 각 앱을 독립 실행 가능한 구조로 개선
   - 앱 간 의존성 최소화

### 7.3 App Engine 기반 재구성

#### 제안: Dropshipping을 3개 앱으로 분리

**현재 구조**:
```
apps/
├── main-site/
│   └── src/pages/dashboard/[seller|supplier|partner]
└── api-server/
    └── src/routes/[seller|supplier]
```

**제안 구조**:
```
apps/
├── seller-app/              # 독립 Seller 앱
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── services/
│   └── package.json
│
├── supplier-app/            # 독립 Supplier 앱
│   └── ...
│
├── partner-app/             # 독립 Partner 앱
│   └── ...
│
└── api-server/
    └── src/
        └── modules/
            ├── seller/
            ├── supplier/
            └── partner/

packages/
└── dropshipping-core/       # 공통 로직
    ├── types/
    ├── utils/
    └── components/
```

**장점**:
- 역할별 독립 배포 가능
- 코드 격리로 복잡도 감소
- 확장 시 신규 역할 앱 추가만으로 가능

### 7.4 코드 품질 기준

#### 7.4.1 컴포넌트 분해 기준

**분해 필요 신호**:
- [ ] 파일이 300줄 초과
- [ ] 하나의 컴포넌트에 3개 이상의 useEffect
- [ ] Props가 10개 이상
- [ ] 중첩된 조건문 3단계 이상

**분해 방법**:
1. **Presentation/Container 분리**
2. **커스텀 훅 추출** (비즈니스 로직)
3. **하위 컴포넌트 분리** (UI 조각)

#### 7.4.2 서비스 분해 기준

**분해 필요 신호**:
- [ ] 파일이 500줄 초과
- [ ] 하나의 클래스에 20개 이상 메서드
- [ ] 책임이 명확히 2개 이상

**분해 방법**:
1. **단일 책임 원칙 (SRP)** 적용
2. **전략 패턴** (복잡한 조건 로직)
3. **도메인 서비스 분리**

---

## 8. 권장 사항 및 다음 단계

### 8.1 즉시 조치 항목 (1주일 이내)

1. **문서화**
   - [ ] 각 앱의 README 작성
   - [ ] 아키텍처 다이어그램 생성
   - [ ] API 문서 업데이트

2. **린트 규칙 강화**
   - [ ] 파일 크기 제한 린트 추가
   - [ ] Import 경로 규칙 강화
   - [ ] 타입 안정성 검사 강화

3. **모니터링**
   - [ ] 번들 크기 모니터링 설정
   - [ ] 빌드 시간 추적
   - [ ] 중복 코드 감지 도구 설정

### 8.2 단기 목표 (1개월)

1. **대용량 파일 분해**
   - GutenbergBlockEditor (1,624줄) → 5개 컴포넌트로 분해
   - SellerDashboard Shortcode (946줄) → 8개 컴포넌트로 분해
   - settings.routes.ts (1,525줄) → 도메인별 라우트 파일 분리

2. **Shortcodes 통합**
   - `apps/main-site/components/shortcodes` → `packages/shortcodes` 이동
   - 카테고리별 폴더 구조 정리 (auth, ecommerce, dropshipping, content)

3. **타입 정의 중앙화**
   - 중복 타입 제거
   - `packages/types` 구조 재정립

### 8.3 중기 목표 (3개월)

1. **Dropshipping 리팩토링**
   - Seller/Supplier/Partner 앱 분리 또는
   - 도메인 기반 폴더 구조 재편

2. **CPT/ACF 통합**
   - 분산된 폴더 통합
   - 모듈 구조 강화

3. **모듈화 확대**
   - `modules/ecommerce` 생성
   - `modules/forum` 생성

### 8.4 장기 목표 (6개월)

1. **App Engine 완성**
   - 동적 앱 로딩 시스템 구축
   - 앱 간 통신 인터페이스 정의
   - 앱 마켓플레이스 준비

2. **마이크로 프론트엔드 검토**
   - 독립 배포 가능한 앱 구조
   - 모듈 페더레이션 도입 검토

3. **서비스별 확장 준비**
   - 약사회 지부/분회별 인스턴스 분리
   - 당뇨 회원약국 전용 앱 준비

---

## 부록

### A. 파일 통계

| 항목 | 수량 |
|------|------|
| 총 Apps | 8개 |
| 총 Packages | 17개 |
| 총 Entities | 80+ |
| 총 Services | 60+ |
| 총 Controllers | 16개 도메인 |
| 총 Pages (Admin) | 37개 디렉토리 |
| 총 Pages (Main) | 30개 (dashboard만) |
| 총 Blocks | 30개 정의 |
| 1,000줄 이상 파일 | 40개 |

### B. 의존성 그래프 (주요)

```
apps/main-site
├── depends on
│   ├── @o4o/auth-client
│   ├── @o4o/auth-context
│   ├── @o4o/appearance-system
│   ├── @o4o/shortcodes
│   ├── @o4o/types
│   ├── @o4o/ui
│   └── @o4o/utils

apps/admin-dashboard
├── depends on
│   ├── @o4o/auth-client
│   ├── @o4o/auth-context
│   ├── @o4o/block-core
│   ├── @o4o/appearance-system
│   ├── @o4o/types
│   ├── @o4o/ui
│   └── @o4o/cpt-registry

apps/api-server
├── depends on
│   ├── @o4o/types
│   └── (주로 npm packages)
```

### C. 기술 스택

**Frontend**:
- React 18.2.0
- TypeScript
- Vite
- TanStack Query
- Zustand
- Tailwind CSS

**Backend**:
- Node.js
- TypeORM
- Express
- PM2

**Build**:
- pnpm workspace
- Turbo (추정)

---

**조사 완료일**: 2025-11-20
**다음 리뷰**: Phase 1 완료 후 (2주 후 예상)
