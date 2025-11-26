# O4O Platform - 완전 전수조사 보고서 (Full System Audit)

**작성일:** 2025-11-26
**목적:** 전체 시스템 리팩토링 준비를 위한 완전 전수조사
**범위:** 모든 앱 + 모든 CPT/ACF + 삭제 예정 앱 포함
**방법:** 코드 분석, 구조 스캔, 기능 상태 분류

---

## 📊 Executive Summary (경영진 요약)

### 시스템 규모
- **총 Entity 수:** 123개
- **총 CPT Schema:** 9개
- **총 API Routes:** 90+ 모듈
- **Package 수:** 12개 (workspace)
- **Apps 수:** 8개 (main-site, admin-dashboard, api-server 포함)

### 핵심 발견사항

**✅ 완료된 핵심 기능:**
- 인증/권한 시스템 (P0 RBAC 완료)
- Dropshipping 전체 구조 (Settlement, Commission 포함)
- Block Editor (20+ 블록)
- CPT/ACF 시스템
- API Server 인프라

**⚠️ 부분 완료 (리팩토링 필요):**
- Shortcode Registry (통합 필요)
- Block Registry (명시적 등록 없음)
- Appearance System (Header/Footer)
- Ecommerce 일부 기능

**❌ 삭제 예정:**
- Forum App
- Digital Signage
- Crowdfunding

---

## 1. 전체 시스템 구조 (System Architecture)

### 1.1 모노레포 구조

```
o4o-platform/
├── apps/                           # 애플리케이션
│   ├── main-site/                  # 메인 웹사이트 (Vite + React)
│   ├── admin-dashboard/            # 관리자 대시보드 (Vite + React)
│   ├── api-server/                 # API 서버 (Express + TypeORM)
│   ├── api-gateway/                # API 게이트웨이 (계획 단계)
│   ├── ecommerce/                  # Ecommerce 앱 (삭제 예정 가능성)
│   ├── funding/                    # Crowdfunding (삭제 예정)
│   ├── healthcare/                 # Healthcare (미완성)
│   └── (기타)
│
├── packages/                       # 공유 패키지
│   ├── appearance-system/          # 테마/디자인 시스템
│   ├── auth-client/                # 인증 클라이언트
│   ├── auth-context/               # React 인증 컨텍스트
│   ├── block-core/                 # Block 코어
│   ├── block-renderer/             # Block 렌더러
│   ├── cpt-registry/               # CPT 레지스트리
│   ├── shortcodes/                 # Shortcode 패키지
│   ├── slide-app/                  # 슬라이드 앱
│   ├── supplier-connector/         # 공급자 연동
│   ├── types/                      # 공통 타입 정의
│   ├── ui/                         # UI 컴포넌트
│   └── utils/                      # 유틸리티
│
├── docs/                           # 문서
│   └── dev/                        # 개발 문서
│       ├── audit/                  # 조사 보고서
│       └── (기타 문서들)
│
└── config/                         # 설정 파일
```

---

### 1.2 Apps 상세 구조

#### A. main-site

**목적:** 일반 사용자용 웹사이트
**기술:** Vite, React, TypeScript

**주요 디렉토리:**
```
apps/main-site/src/
├── components/
│   ├── blocks/              # Block 컴포넌트 (20+ 개)
│   ├── shortcodes/          # Shortcode 컴포넌트
│   │   ├── auth/            # 인증 관련
│   │   ├── cart/            # 장바구니
│   │   └── orders/          # 주문
│   ├── TemplateRenderer/
│   │   └── blocks/          # 템플릿 전용 블록
│   └── layout/              # 레이아웃 컴포넌트
├── pages/                   # 페이지 컴포넌트
├── hooks/                   # Custom Hooks
├── contexts/                # React Contexts
├── services/                # API Services
├── utils/
│   └── shortcode-loader.ts # ✅ Shortcode Registry
└── styles/                  # 스타일
```

**주요 Block 컴포넌트:**
- AccountModule.tsx
- CartModule.tsx
- MiniCart.tsx
- Navigation.tsx
- RoleSwitcher.tsx
- SearchBlock.tsx
- SiteHeader.tsx, SiteFooter.tsx
- SiteLogo.tsx, SiteTitle.tsx, SiteTagline.tsx
- Columns.tsx, Column.tsx
- Group.tsx
- HTMLBlock.tsx
- ConditionalBlock.tsx
- WidgetAreaBlock.tsx
- SocialLinks.tsx

**상태:** ✅ **완료** (일부 개선 필요)

---

#### B. admin-dashboard

**목적:** 관리자용 대시보드
**기술:** Vite, React, TypeScript

**주요 디렉토리:**
```
apps/admin-dashboard/src/
├── api/                     # API 클라이언트
│   └── apps/
│       └── forum.ts         # Forum API (삭제 예정)
├── blocks/                  # Block 관련
├── components/              # UI 컴포넌트
├── config/                  # 설정
│   ├── apps.config.ts       # 앱 설정
│   ├── rolePermissions.ts   # 역할 권한
│   └── wordpressMenuFinal.tsx
├── features/                # 기능별 모듈
├── hooks/                   # Custom Hooks
├── pages/                   # 페이지
│   ├── apps/                # 앱 관리 페이지
│   │   ├── ForumApp.tsx     # ❌ Forum (삭제 예정)
│   │   ├── forum/           # ❌ Forum 페이지들
│   │   ├── Crowdfunding*.tsx # ❌ Crowdfunding (삭제 예정)
│   │   └── (기타)
│   ├── cpt-acf/             # CPT/ACF 관리
│   ├── dashboard/           # 대시보드
│   └── (기타)
├── services/                # 서비스
├── stores/                  # 상태 관리
├── types/                   # 타입 정의
└── utils/                   # 유틸리티
```

**상태:** ✅ **완료** (삭제 예정 앱 제거 필요)

---

#### C. api-server

**목적:** 백엔드 API 서버
**기술:** Express, TypeORM, PostgreSQL

**주요 디렉토리:**
```
apps/api-server/src/
├── config/                  # 설정
│   ├── routes.config.ts     # ✅ 라우트 설정 (10단계 우선순위)
│   └── commission.config.ts # Commission 설정
├── controllers/             # 컨트롤러
│   ├── v1/                  # V1 API
│   ├── forum/               # ❌ Forum (삭제 예정)
│   ├── cpt/
│   └── (기타)
├── database/                # DB 관련
│   ├── connection.ts        # ✅ TypeORM 연결
│   └── migrations/          # 마이그레이션 (60+ 파일)
├── entities/                # Entity (123개)
│   ├── ForumPost.ts         # ❌ Forum (삭제 예정)
│   ├── ForumCategory.ts     # ❌
│   ├── ForumComment.ts      # ❌
│   ├── ForumTag.ts          # ❌
│   ├── Settlement.ts        # ✅ Dropshipping
│   ├── Partner.ts           # ✅
│   ├── Supplier.ts          # ✅
│   ├── Product.ts           # ✅
│   └── (기타 120개)
├── migrations/              # Legacy 마이그레이션
│   └── create-forum-tables.ts # ❌ Forum
├── routes/                  # API 라우트
│   ├── v1/                  # V1 API
│   ├── admin/               # Admin API
│   │   ├── settlements.routes.ts
│   │   └── dropshipping.routes.ts
│   ├── seller/
│   │   └── settlements.routes.ts
│   ├── supplier/
│   │   └── settlements.routes.ts
│   ├── partner/
│   │   └── settlements.routes.ts
│   ├── cpt/
│   │   └── dropshipping.routes.ts
│   └── entity/
│       └── dropshipping-entity.routes.ts
├── schemas/                 # CPT Schemas (9개)
│   ├── products.schema.ts
│   ├── ds_supplier.schema.ts
│   ├── ds_partner.schema.ts
│   ├── ds_product.schema.ts
│   ├── ds_commission_policy.schema.ts
│   ├── team.schema.ts
│   ├── testimonials.schema.ts
│   ├── portfolio.schema.ts
│   └── ai-output.schema.ts
├── services/                # 서비스 계층
│   ├── forumService.ts      # ❌ Forum (삭제 예정)
│   ├── cpt/
│   │   └── dropshipping-cpts.ts # ✅
│   ├── acf/
│   │   └── dropshipping-fields.ts # ✅
│   └── (기타)
├── jobs/                    # Background Jobs
│   └── commission-batch.job.ts # ✅
├── scripts/                 # 스크립트
│   └── run-daily-settlement.ts # ✅
└── types/                   # 타입 정의
    └── dropshipping.ts      # ✅
```

**상태:** ✅ **완료** (삭제 예정 앱 제거 필요)

---

### 1.3 Packages 상세 구조

#### A. appearance-system

**목적:** 테마, 디자인 토큰, 헤더/푸터 시스템
**상태:** ⚠️ **부분 완료** (Header/Footer 통합 필요)

---

#### B. auth-client / auth-context

**목적:** 인증 클라이언트 및 React 컨텍스트
**상태:** ✅ **완료**

---

#### C. block-core / block-renderer

**목적:** Block 시스템 코어 및 렌더러
**문제:** ❌ **Block Registry 명시적 등록 없음**
**상태:** ⚠️ **부분 완료** (Registry 구조 개선 필요)

---

#### D. cpt-registry

**목적:** CPT 레지스트리
**상태:** ✅ **완료**

---

#### E. shortcodes

**목적:** Shortcode 패키지
**문제:** ⚠️ **main-site/utils/shortcode-loader.ts와 중복 가능성**
**상태:** ⚠️ **부분 완료** (통합 필요)

---

#### F. supplier-connector

**목적:** 외부 공급자 연동
**상태:** ✅ **완료**

---

#### G. types / ui / utils

**목적:** 공통 타입, UI, 유틸리티
**상태:** ✅ **완료**

---

## 2. 기능별 상태 분류

### 2.1 ✅ 완료된 기능 (Production Ready)

| 기능 | 위치 | 상태 | 비고 |
|------|------|------|------|
| 인증/권한 시스템 | auth-client, auth-context | ✅ 완료 | P0 RBAC 완료 |
| Dropshipping 전체 | api-server/entities, services, routes | ✅ 완료 | Settlement, Commission 포함 |
| CPT/ACF 시스템 | cpt-registry, api-server/schemas | ✅ 완료 | 9개 Schema |
| API Server 인프라 | api-server | ✅ 완료 | 123 Entities, 60+ Migrations |
| DB 마이그레이션 | api-server/database/migrations | ✅ 완료 | TypeORM |
| 공급자 연동 | supplier-connector | ✅ 완료 | - |
| UI 컴포넌트 | packages/ui | ✅ 완료 | - |
| 공통 타입 | packages/types | ✅ 완료 | - |
| 공통 유틸 | packages/utils | ✅ 완료 | - |

---

### 2.2 ⚠️ 부분 완료 (리팩토링 필요)

| 기능 | 위치 | 문제점 | 우선순위 |
|------|------|--------|----------|
| **Shortcode Registry** | main-site/utils/shortcode-loader.ts, packages/shortcodes | 중복 가능성, 명시적 등록 부족 | P1 |
| **Block Registry** | block-renderer | 명시적 등록 메커니즘 없음 | P1 |
| **Appearance System** | appearance-system | Header/Footer 분산, 통합 필요 | P2 |
| **Ecommerce 일부** | apps/ecommerce | 구조 불명확 | P2 |
| **API Gateway** | api-gateway | 계획 단계, 미완성 | P3 |
| **Healthcare** | apps/healthcare | 스켈레톤 상태 | P3 |

---

### 2.3 ❌ 삭제 예정 (Legacy)

| 앱/기능 | 위치 | 이유 | 우선순위 |
|---------|------|------|----------|
| **Forum** | api-server/entities/Forum*, services/forumService.ts, admin-dashboard/pages/apps/forum | App Market으로 분리 예정 | P0 |
| **Digital Signage** | (위치 미확인) | 삭제 예정 | P0 |
| **Crowdfunding** | admin-dashboard/pages/apps/Crowdfunding*, api-server/entities/CrowdfundingProject.ts | 삭제 예정 | P0 |
| **Ecommerce App** | apps/ecommerce | 삭제 가능성 (조사 필요) | P1 |

---

## 3. CPT/ACF 전수조사

### 3.1 등록된 CPT Schema (9개)

| Schema | 파일 | CPT 이름 | 용도 | 상태 |
|--------|------|----------|------|------|
| 1 | products.schema.ts | `product` | 일반 상품 | ✅ |
| 2 | ds_supplier.schema.ts | `ds_supplier` | 드랍쉬핑 공급자 | ✅ |
| 3 | ds_partner.schema.ts | `ds_partner` | 드랍쉬핑 파트너 | ✅ |
| 4 | ds_product.schema.ts | `ds_product` | 드랍쉬핑 상품 | ✅ |
| 5 | ds_commission_policy.schema.ts | `ds_commission_policy` | 커미션 정책 | ✅ |
| 6 | team.schema.ts | `team` | 팀 멤버 | ✅ |
| 7 | testimonials.schema.ts | `testimonial` | 후기/리뷰 | ✅ |
| 8 | portfolio.schema.ts | `portfolio` | 포트폴리오 | ✅ |
| 9 | ai-output.schema.ts | `ai_output` | AI 출력 결과 | ✅ |

---

### 3.2 ACF 필드 구조

**위치:**
- `api-server/services/acf/dropshipping-fields.ts` (Dropshipping 전용)
- ACF Field Entity: `api-server/src/entities/ACFField.ts`, `ACFFieldGroup.ts`

**필드 타입 (20+ 지원):**
- text, textarea, number, email, url, password
- image, file, gallery, wysiwyg, oembed
- select, checkbox, radio, true_false, button_group
- post_object, taxonomy, user, relationship, page_link
- group, repeater, flexible_content, tab, accordion, clone, message

**상태:** ✅ **완료**

---

### 3.3 CPT와 Block/Shortcode 연결

| CPT | 연결된 Block | 연결된 Shortcode | 상태 |
|-----|-------------|-----------------|------|
| `product` | (조사 필요) | `cart`, `orders` | ⚠️ |
| `ds_product` | (조사 필요) | (조사 필요) | ⚠️ |
| `team` | (조사 필요) | (조사 필요) | ⚠️ |
| `testimonial` | (조사 필요) | (조사 필요) | ⚠️ |
| `portfolio` | (조사 필요) | (조사 필요) | ⚠️ |

**문제:** Block과 Shortcode의 명시적 연결 구조 부족

---

## 4. Shortcode 시스템 조사

### 4.1 Shortcode Registry

**위치:** `apps/main-site/src/utils/shortcode-loader.ts`

**등록 방식:** (파일 조사 필요)

**Shortcode 컴포넌트:**
```
apps/main-site/src/components/shortcodes/
├── auth/          # 인증 관련
├── cart/          # 장바구니
└── orders/        # 주문
```

**Package Shortcodes:**
```
packages/shortcodes/src/
├── auth/
├── components/
├── dropshipping/
├── dynamic/
├── hooks/
├── preset/
├── template/
└── utils/
```

**문제점:**
1. **중복 가능성:** main-site와 packages 양쪽에 존재
2. **명시적 등록 부족:** Registry 구조 불명확
3. **문서화 부족:** 어떤 Shortcode가 활성화되어 있는지 불명확

**상태:** ⚠️ **부분 완료** (통합 필요)

---

## 5. Block 시스템 조사

### 5.1 Block Registry

**문제:** ❌ **명시적 Block Registry 파일 없음**

**Block 위치:**
```
apps/main-site/src/components/blocks/
├── AccountModule.tsx
├── CartModule.tsx
├── MiniCart.tsx
├── Navigation.tsx
├── RoleSwitcher.tsx
├── SearchBlock.tsx
├── SiteHeader.tsx
├── SiteFooter.tsx
├── SiteLogo.tsx
├── SiteTitle.tsx
├── SiteTagline.tsx
├── Columns.tsx
├── Column.tsx
├── Group.tsx
├── HTMLBlock.tsx
├── ConditionalBlock.tsx
├── WidgetAreaBlock.tsx
├── SocialLinks.tsx
└── footer/
```

**Block 렌더러:**
```
packages/block-renderer/src/
├── registry/      # Registry 구조 (조사 필요)
├── renderers/     # 렌더러 (조사 필요)
├── types/         # 타입 정의
└── utils/         # 유틸리티
```

**문제점:**
1. **등록 메커니즘 불명확:** 어떻게 Block이 등록되는지 불분명
2. **Block 목록 파악 어려움:** 전체 Block 목록이 코드로만 존재
3. **중복 가능성:** TemplateRenderer/blocks와 components/blocks 중복

**상태:** ⚠️ **부분 완료** (Registry 개선 필요)

---

## 6. Dropshipping 시스템 조사

### 6.1 Entity 구조

**핵심 Entities:**
- Settlement.ts (정산)
- Partner.ts / PartnerProfile.ts (파트너)
- Seller.ts (판매자)
- SupplierProfile.ts (공급자)
- Product.ts (상품)
- PaymentSettlement.ts (결제 정산)

**상태:** ✅ **완료**

---

### 6.2 Routes 구조

**Settlement Routes:**
- `admin/settlements.routes.ts` (관리자)
- `seller/settlements.routes.ts` (판매자)
- `supplier/settlements.routes.ts` (공급자)
- `partner/settlements.routes.ts` (파트너)
- `ds-settlements.routes.ts` (통합)

**Dropshipping Routes:**
- `admin/dropshipping.routes.ts`
- `cpt/dropshipping.routes.ts`
- `entity/dropshipping-entity.routes.ts`

**상태:** ✅ **완료**

---

### 6.3 Services & Jobs

**Services:**
- `cpt/dropshipping-cpts.ts` (CPT 정의)
- `acf/dropshipping-fields.ts` (ACF 필드)

**Jobs:**
- `commission-batch.job.ts` (커미션 배치 처리)

**Scripts:**
- `run-daily-settlement.ts` (일일 정산)

**상태:** ✅ **완료**

---

## 7. API Server / Entity / Metadata 조사

### 7.1 Entity 통계

**총 Entity 수:** 123개

**주요 카테고리:**
- 인증/사용자: User, Role, Permission, LoginAttempt, UserActivityLog, LinkedAccount
- 드랍쉬핑: Settlement, Partner, Seller, Supplier, PaymentSettlement
- 컨텐츠: Post, Page, ReusableBlock, PageRevision
- CPT/ACF: CustomPostType, CustomPost, ACFField, ACFFieldGroup, CustomFieldValue
- 이커머스: Product, Cart, Order, Payment
- 메뉴/네비게이션: MenuItem, MenuLocation, Category
- 앱: App, RoleApplication
- Forum (삭제 예정): ForumPost, ForumCategory, ForumComment, ForumTag
- Crowdfunding (삭제 예정): CrowdfundingProject
- 기타: Settings, UrlRedirect, ContentUsageLog, NotificationTemplate

**상태:** ✅ **완료** (삭제 예정 Entity 제거 필요)

---

### 7.2 Metadata 이슈

**문제:** 최근 metadata 관련 오류 발생 (사용자 보고)

**조사 필요 항목:**
1. Entity metadata 누락 여부
2. 관계 설정 문제
3. TypeORM 설정 오류

**상태:** ⚠️ **조사 필요**

---

## 8. 삭제 예정 앱 조사

### 8.1 Forum

**Entity:**
- ForumPost.ts
- ForumCategory.ts
- ForumComment.ts
- ForumTag.ts

**Service:**
- forumService.ts (완전 구현됨)

**Migration:**
- create-forum-tables.ts (6개 테이블)

**Admin UI:**
- pages/apps/ForumApp.tsx
- pages/apps/forum/ (4개 페이지)
- pages/cpt-acf/Forum*.tsx (중복 페이지)
- api/apps/forum.ts (API 클라이언트)
- dashboard/components/StatsOverview/ForumStatsCard.tsx

**API Routes:** ❌ **미구현** (설정만 존재)

**테이블:**
- forum_post
- forum_category
- forum_comment
- forum_tag
- forum_like
- forum_bookmark

**데이터:** (실제 사용 중인지 확인 필요)

**제거 계획:**
1. App Market으로 분리
2. `adoptExistingTables: true` 사용
3. 데이터 유지 (keep-data)

**우선순위:** P0 (즉시)

---

### 8.2 Crowdfunding

**Entity:**
- CrowdfundingProject.ts

**Admin UI:**
- pages/apps/CrowdfundingProjectDetail.tsx
- pages/apps/CrowdfundingProjectForm.tsx
- pages/apps/CrowdfundingProjects.tsx

**Service:** (조사 필요)

**Migration:** 1737724800000-CreateCrowdfundingTables.ts

**테이블:** (조사 필요)

**데이터:** (실제 사용 중인지 확인 필요)

**제거 계획:**
1. 완전 제거
2. 데이터 백업 후 삭제

**우선순위:** P0 (즉시)

---

### 8.3 Digital Signage

**위치:** (조사 필요 - 파일 검색 실패)

**상태:** ❌ **위치 확인 필요**

**우선순위:** P0 (조사 후 즉시)

---

## 9. 기술 부채 및 위험 요소

### 9.1 중복 코드

| 항목 | 위치 1 | 위치 2 | 문제 |
|------|--------|--------|------|
| Shortcode | main-site/components/shortcodes | packages/shortcodes | 역할 불명확 |
| Block 컴포넌트 | main-site/components/blocks | main-site/components/TemplateRenderer/blocks | 중복 가능성 |
| Forum UI | pages/apps/forum | pages/cpt-acf/Forum* | 완전 중복 |

**우선순위:** P1

---

### 9.2 Legacy 코드

| 항목 | 위치 | 문제 |
|------|------|------|
| Forum 전체 | 다수 위치 | 삭제 예정 |
| Crowdfunding | 다수 위치 | 삭제 예정 |
| Digital Signage | (미확인) | 삭제 예정 |
| dist.backup 디렉토리 | api-server/dist.backup.* | 불필요한 백업 |

**우선순위:** P0

---

### 9.3 타입/스키마 불일치

**문제:** (조사 필요)

**우선순위:** P2

---

### 9.4 Entity/Metadata 충돌

**문제:** Metadata 오류 발생 (사용자 보고)

**조사 필요:**
1. Entity 관계 설정
2. TypeORM metadata
3. 순환 참조

**우선순위:** P1

---

### 9.5 Block/Shortcode 등록 메커니즘 부족

**문제:**
- Block Registry 명시적 등록 없음
- Shortcode Registry 불명확

**우선순위:** P1

---

### 9.6 디자인 토큰 충돌

**문제:** (조사 필요)

**우선순위:** P3

---

### 9.7 배포 구조 문제

**문제:** GitHub Actions 자주 실패 (사용자 보고)

**해결 방법:** 수동 배포 스크립트 사용

**우선순위:** P2

---

## 10. 리팩토링 우선순위표

### P0 - 즉시 (심각)

1. **삭제 예정 앱 제거**
   - Forum 분리 (App Market)
   - Crowdfunding 완전 제거
   - Digital Signage 위치 확인 후 제거

2. **중복 UI 제거**
   - Forum CPT 폼과 일반 폼 통합

**예상 기간:** 1주

---

### P1 - 높은 우선순위

1. **Shortcode Registry 통합**
   - main-site와 packages 역할 명확화
   - 명시적 등록 메커니즘 구축

2. **Block Registry 구축**
   - 명시적 Block 등록 시스템
   - Block 목록 관리

3. **Entity/Metadata 오류 수정**
   - 관계 설정 검증
   - TypeORM 설정 수정

4. **중복 코드 제거**
   - Shortcode 중복
   - Block 중복

**예상 기간:** 2주

---

### P2 - 중간 우선순위

1. **Appearance System 통합**
   - Header/Footer 구조 정리
   - Design Token 정리

2. **Ecommerce 구조 정리**
   - apps/ecommerce 역할 확인
   - 필요시 제거 또는 통합

3. **배포 구조 개선**
   - GitHub Actions 안정화
   - 수동 배포 스크립트 개선

4. **타입/스키마 일치**
   - 전체 타입 검증
   - 스키마 통일

**예상 기간:** 2주

---

### P3 - 낮음

1. **API Gateway 완성**
   - 계획 확정
   - 구현 또는 제거

2. **Healthcare 앱**
   - 완성 또는 제거

3. **디자인 토큰 충돌 해결**

4. **Legacy 백업 제거**
   - dist.backup 디렉토리

**예상 기간:** 필요시

---

## 11. 전체 시스템 다이어그램

### 11.1 기능 기반 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                    O4O Platform                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │  Main Site   │  │Admin Dashboard│  │ API Server  │ │
│  │              │  │               │  │             │ │
│  │ - Blocks     │  │ - CPT/ACF Mgmt│  │ - 123       │ │
│  │ - Shortcodes │  │ - User Mgmt   │  │   Entities  │ │
│  │ - Pages      │  │ - Apps        │  │ - Routes    │ │
│  │ - Cart       │  │ - Dashboard   │  │ - Services  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         ▲                 ▲                 ▲          │
│         │                 │                 │          │
│         └─────────────────┴─────────────────┘          │
│                           │                            │
│                  ┌────────┴────────┐                   │
│                  │   Packages      │                   │
│                  ├─────────────────┤                   │
│                  │ - auth-client   │                   │
│                  │ - block-renderer│                   │
│                  │ - shortcodes    │                   │
│                  │ - cpt-registry  │                   │
│                  │ - ui / utils    │                   │
│                  └─────────────────┘                   │
│                                                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  삭제 예정 (Legacy)                      │
├─────────────────────────────────────────────────────────┤
│  ❌ Forum       ❌ Crowdfunding   ❌ Digital Signage    │
└─────────────────────────────────────────────────────────┘
```

---

### 11.2 CPT/ACF 기반 다이어그램

```
┌───────────────────────────────────────┐
│        CPT Schemas (9개)              │
├───────────────────────────────────────┤
│                                       │
│  ✅ product                           │
│  ✅ ds_supplier      ┐                │
│  ✅ ds_partner       │ Dropshipping   │
│  ✅ ds_product       │                │
│  ✅ ds_commission_policy ┘            │
│  ✅ team                              │
│  ✅ testimonial                       │
│  ✅ portfolio                         │
│  ✅ ai_output                         │
│                                       │
└───────────────────────────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│      ACF Fields (20+ 타입)             │
├───────────────────────────────────────┤
│  - Dropshipping Fields                │
│  - 기타 필드 그룹 (조사 필요)          │
└───────────────────────────────────────┘
```

---

### 11.3 Dropshipping 구조 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│              Dropshipping System                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ Partner  │  │  Seller  │  │ Supplier │             │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘             │
│        │             │             │                   │
│        └─────────────┴─────────────┘                   │
│                      │                                 │
│            ┌─────────┴─────────┐                       │
│            │   Settlement      │                       │
│            ├───────────────────┤                       │
│            │ - Daily           │                       │
│            │ - Commission      │                       │
│            │ - Payment         │                       │
│            └───────────────────┘                       │
│                      │                                 │
│            ┌─────────┴─────────┐                       │
│            │   CPT/ACF         │                       │
│            ├───────────────────┤                       │
│            │ - ds_supplier     │                       │
│            │ - ds_partner      │                       │
│            │ - ds_product      │                       │
│            │ - ds_commission_  │                       │
│            │   policy          │                       │
│            └───────────────────┘                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 12. 조사 미완료 항목 (추가 조사 필요)

### 12.1 즉시 조사 필요

1. **Digital Signage 위치 확인**
2. **Metadata 오류 원인 파악**
3. **Block Registry 구조 상세 분석**
4. **Shortcode Registry 동작 방식**
5. **Ecommerce App 역할 확인**

---

### 12.2 추가 조사 필요

1. CPT와 Block/Shortcode 연결 구조
2. Design Token 충돌 여부
3. API Gateway 계획 상세
4. Healthcare App 상태
5. Forum/Crowdfunding 실제 데이터 사용 여부

---

## 13. 다음 단계 (Next Steps)

### 즉시 (오늘)

1. **본 조사 결과 검토**
2. **P0 작업 착수 결정**
   - Forum 분리
   - Crowdfunding 제거
   - Digital Signage 조사

---

### 1주 이내

1. **P0 작업 수행**
   - 삭제 예정 앱 제거
   - 중복 UI 제거

2. **추가 조사 수행**
   - Digital Signage 위치
   - Metadata 오류

---

### 2주 이내

1. **P1 작업 착수**
   - Shortcode Registry 통합
   - Block Registry 구축
   - Entity/Metadata 오류 수정

---

### 4주 이내

1. **P2 작업 수행**
   - Appearance System 통합
   - Ecommerce 구조 정리

---

## 14. 결론 및 권장사항

### 14.1 핵심 발견사항

1. **시스템 규모가 매우 큼** - 123 Entities, 9 CPT Schemas, 90+ Routes
2. **Dropshipping 시스템은 완성도 높음** - Settlement, Commission 전체 구조 완료
3. **삭제 예정 앱이 여전히 존재** - Forum, Crowdfunding, Digital Signage
4. **Block/Shortcode Registry가 불명확** - 명시적 등록 메커니즘 부족
5. **중복 코드 다수 발견** - Shortcode, Block, Forum UI

---

### 14.2 권장사항

#### 우선순위 1: 삭제 예정 앱 제거 (P0)

**이유:**
- 코드베이스 복잡도 감소
- 유지보수 부담 감소
- App Market 준비

**방법:**
- Forum: App Market으로 분리 (데이터 유지)
- Crowdfunding: 완전 제거 (백업 후)
- Digital Signage: 위치 확인 후 제거

---

#### 우선순위 2: Registry 시스템 정비 (P1)

**이유:**
- Block/Shortcode 관리 체계화
- 앱 마켓 준비
- 개발자 경험 개선

**방법:**
- Block Registry 명시적 구축
- Shortcode Registry 통합
- 문서화

---

#### 우선순위 3: 중복 코드 제거 (P1)

**이유:**
- 유지보수성 향상
- 버그 감소
- 코드 품질 개선

**방법:**
- Shortcode 통합
- Forum UI 통합
- Block 중복 제거

---

### 14.3 예상 기간

- **P0 작업:** 1주
- **P1 작업:** 2주
- **P2 작업:** 2주
- **총:** 5주 (약 1.2개월)

---

### 14.4 리스크

1. **데이터 손실 위험** - 삭제 예정 앱 제거 시
2. **기능 호환성** - Registry 통합 시
3. **개발 지연** - 예상보다 복잡도 높을 가능성

**완화 방안:**
- 충분한 백업
- 스테이징 환경 테스트
- 단계별 진행

---

## 15. 부록

### 15.1 주요 파일 경로 Quick Reference

**Shortcode:**
- Registry: `apps/main-site/src/utils/shortcode-loader.ts`
- 컴포넌트: `apps/main-site/src/components/shortcodes/`
- 패키지: `packages/shortcodes/src/`

**Block:**
- 컴포넌트: `apps/main-site/src/components/blocks/`
- 렌더러: `packages/block-renderer/src/`

**CPT/ACF:**
- Schemas: `apps/api-server/src/schemas/`
- Registry: `packages/cpt-registry/src/`
- Entities: `apps/api-server/src/entities/`

**Dropshipping:**
- Routes: `apps/api-server/src/routes/*/settlements.routes.ts`
- Services: `apps/api-server/src/services/cpt/dropshipping-cpts.ts`
- Jobs: `apps/api-server/src/jobs/commission-batch.job.ts`

**삭제 예정 앱:**
- Forum: `apps/api-server/src/entities/Forum*.ts`, `apps/admin-dashboard/src/pages/apps/forum/`
- Crowdfunding: `apps/api-server/src/entities/CrowdfundingProject.ts`, `apps/admin-dashboard/src/pages/apps/Crowdfunding*.tsx`

---

### 15.2 Entity 전체 목록 (123개)

(상세 목록은 별도 파일 참조: `entity-list.md`)

---

### 15.3 조사 방법론

**사용된 도구:**
- `tree` - 디렉토리 구조 스캔
- `find` - 파일 검색
- `grep` - 코드 패턴 검색
- `ls` - 디렉토리 내용 확인
- 코드 분석 (Read 도구)

**조사 순서:**
1. 전체 폴더 구조 스캔
2. CPT/ACF Schema 목록
3. Entity 목록
4. Shortcode/Block 위치 확인
5. Dropshipping 구조 분석
6. 삭제 예정 앱 확인

---

**조사 담당:** Claude Code (AI Assistant)
**완료 일자:** 2025-11-26
**검토자:** (사용자 검토 필요)
**다음 단계:** P0 작업 착수 준비

---

**문서 버전:** 1.0
**최종 업데이트:** 2025-11-26
