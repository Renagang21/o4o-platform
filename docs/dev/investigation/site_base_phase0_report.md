# Phase 0 — 사이트 기반 구조 전수 조사 보고서

**조사 일자:** 2025-11-21
**프로젝트:** O4O Platform Main Site
**목적:** 사이트 화면 제작을 위한 기반 구조 전수 조사 및 문서화

---

## 목차

1. [Shortcode 전체 조사](#1-shortcode-전체-조사)
2. [CPT / Template / Archive 구조 조사](#2-cpt--template--archive-구조-조사)
3. [Notification 시스템 조사](#3-notification-시스템-조사)
4. [개선 필요 포인트 (Refactor Candidates)](#4-개선-필요-포인트-refactor-candidates)
5. [페이지 제작용 공식 Shortcode Set (v1)](#5-페이지-제작용-공식-shortcode-set-v1)
6. [Build 영향도 및 제안 흐름](#6-build-영향도-및-제안-흐름)

---

## 1. Shortcode 전체 조사

### 1.1 조사 요약

- **총 파일 수:** 23개
- **총 Shortcode 수:** 26개
- **카테고리:** 6개 (Auth, Product/Shop, Dashboard, Role Management, Forms, Misc)
- **기본 경로:** `/apps/main-site/src/components/shortcodes/`

### 1.2 전체 Shortcode 목록

| Shortcode Name | File Path | Component | Main Props | Target Role | Description |
|---|---|---|---|---|---|
| `signup` | `/auth/SignupShortcode.tsx` | `SignupComponent` | title, subtitle, redirectUrl, showSocialSignup, loginUrl | Public | 이메일/비밀번호 회원가입 + 소셜 로그인 옵션 |
| `find_id` | `/auth/FindIdShortcode.tsx` | `FindIdComponent` | title, subtitle, successMessage, backUrl | Public | 이메일 인증으로 아이디 찾기 |
| `find_password` | `/auth/FindPasswordShortcode.tsx` | `FindPasswordComponent` | title, subtitle, successMessage, backUrl | Public | 이메일 링크로 비밀번호 재설정 |
| `business_register` | `/auth/BusinessRegisterShortcode.tsx` | `BusinessRegisterComponent` | title, subtitle, redirectUrl, loginUrl | Public | 다단계 사업자 등록 (개인/법인) |
| `social_login` | `/auth/SocialLoginShortcode.tsx` | `SocialLoginComponent` | redirectUrl, showEmailLogin, title, providers, showTestPanel | Public | 소셜 OAuth + 이메일/비밀번호 로그인 |
| `login_form` | `/auth/SocialLoginShortcode.tsx` | `SocialLoginComponent` | social_login과 동일 | Public | social_login의 별칭 |
| `oauth_login` | `/auth/SocialLoginShortcode.tsx` | `OAuthOnlyComponent` | redirectUrl, title, providers | Public | 소셜 버튼만 (이메일 폼 없음) |
| `product_grid` | `/ProductGrid.tsx` | `ProductGridShortcode` | category, limit, columns, featured, orderby, order | Public | 반응형 그리드로 상품 표시 |
| `product_categories` | `/ProductCategories.tsx` | `ProductCategoriesShortcode` | show_count, hide_empty, columns | Public | 상품 카테고리 그리드 |
| `product_carousel` | `/ProductCarousel.tsx` | `ProductCarouselShortcode` | category, limit, autoplay, title | Public | 가로 스크롤 상품 캐러셀 |
| `product` | `/Product.tsx` | `ProductShortcode` | id, show_price, show_cart, class | Public | 단일 상품 카드 + 구매 옵션 |
| `featured_products` | `/FeaturedProducts.tsx` | `FeaturedProductsShortcode` | limit, columns, title | Public | 추천 상품 그리드 |
| `add_to_cart` | `/AddToCart.tsx` | `AddToCartShortcode` | id, text, class, show_price | Public | 특정 상품 장바구니 버튼 |
| `view` | `/View.tsx` | `ViewShortcode` | id, name, show-title, items-per-page, enable-search | Admin/Users | Spectra View 렌더링 (데이터 테이블/목록) |
| `form` | `/Form.tsx` | `FormShortcode` | id, name, theme, layout, show-title | Public | Spectra Form 렌더링 |
| `role_apply_form` | `/RoleApplyForm.tsx` | `RoleApplyForm` | role (supplier/seller/partner) | Authenticated | 역할 신청 폼 + 상태 확인 |
| `role_applications_list` | `/RoleApplicationsList.tsx` | `RoleApplicationsList` | None | Authenticated | 사용자 역할 신청 내역 표시 |
| `role_applications_admin` | `/RoleApplicationsAdmin.tsx` | `RoleApplicationsAdmin` | None | Admin | 관리자 승인/거부 패널 |
| `customer_dashboard` | `/CustomerDashboard.tsx` | `CustomerDashboard` | None | Customer | 주문, 위시리스트, 통계 |
| `supplier_dashboard` | `/SupplierDashboard.tsx` | `SupplierDashboard` | defaultPeriod, defaultSection, showMenu | Supplier | 상품, 주문, 수익, 재고 대시보드 |
| `supplier_dashboard_overview` | `/SupplierDashboardOverview.tsx` | `SupplierDashboardOverview` | None | Supplier | 간편 공급자 30일 요약 |
| `seller_dashboard` | `/SellerDashboard.tsx` | `SellerDashboard` | defaultPeriod, defaultSection, showMenu | Seller | 판매, 수수료, 분석 대시보드 |
| `seller_dashboard_overview` | `/SellerDashboardOverview.tsx` | `SellerDashboardOverview` | None | Seller | 간편 판매자 30일 요약 |
| `partner_dashboard` | `/PartnerDashboard.tsx` | `PartnerDashboard` | defaultSection, showMenu | Partner | 링크, 클릭, 수익 대시보드 |
| `partner_dashboard_overview` | `/PartnerDashboardOverview.tsx` | `PartnerDashboardOverview` | None | Partner | 간편 파트너 수익 요약 |

### 1.3 카테고리별 분류

#### 1.3.1 Authentication (7개)
**필수 사용자 온보딩 및 접근**

- `signup` - 메인 등록 폼
- `business_register` - 사업자/법인 등록
- `social_login` - 소셜 + 이메일 로그인 통합
- `login_form` - social_login 별칭
- `oauth_login` - 소셜 버튼만
- `find_id` - 계정 복구 (ID)
- `find_password` - 계정 복구 (비밀번호)

**주요 기능:**
- OAuth 통합 (Google, Kakao, Naver)
- 다단계 사업자 등록
- 비밀번호 검증 및 확인
- 약관 동의
- 역할 기반 리다이렉트

#### 1.3.2 Product/Shop (6개)
**전자상거래 상품 표시 및 장바구니**

- `product_grid` - 메인 상품 목록
- `product_categories` - 카테고리 브라우저
- `product_carousel` - 추천 상품 슬라이더
- `product` - 단일 상품 카드
- `featured_products` - 큐레이션 상품 선택
- `add_to_cart` - 구매 CTA 버튼

**주요 기능:**
- 카테고리 필터링
- 정렬 (가격, 이름, 날짜)
- 그리드 레이아웃 커스터마이징
- 재고 상태 표시
- 가격 비교 (compareAtPrice)
- 반응형 디자인

#### 1.3.3 Dashboard - Role-Specific (8개)
**사용자 역할 관리 인터페이스**

**전체 대시보드 (네비게이션 포함):**
- `supplier_dashboard` - 상품, 주문, 수익, 재고
- `seller_dashboard` - 판매, 수수료, 분석
- `partner_dashboard` - 링크, 클릭, 수익
- `customer_dashboard` - 주문, 위시리스트, 리워드

**개요 대시보드 (간편/임베드 가능):**
- `supplier_dashboard_overview` - 30일 공급 요약
- `seller_dashboard_overview` - 30일 판매 요약
- `partner_dashboard_overview` - 수익 및 전환
- (고객 개요 버전 없음)

**주요 기능:**
- 기간 기반 필터링 (7일, 30일, 90일, 1년)
- KPI 카드 (주문, 수익 등)
- 차트 (선, 막대, 파이)
- 섹션 네비게이션 (개요, 상품, 주문, 분석, 재고, 정산)
- 실제 API 통합
- 역할 기반 데이터 격리

#### 1.3.4 Role Management (3개)
**비즈니스 역할 신청 시스템**

- `role_apply_form` - 공급자/판매자/파트너 역할 신청
- `role_applications_list` - 본인 신청 내역 확인
- `role_applications_admin` - 관리자 승인 인터페이스

**주요 기능:**
- 역할 상태 확인 (대기, 승인, 거부)
- 사업자 정보 수집
- 관리자 승인 워크플로우
- 중복 신청 방지
- 상태 배지 및 알림

#### 1.3.5 Forms & Data (2개)
**CMS 통합 컴포넌트**

- `form` - Spectra 폼 렌더러
- `view` - Spectra 뷰/테이블 렌더러

**주요 기능:**
- 동적 폼 렌더링
- 페이지네이션 데이터 테이블
- 검색 및 필터 기능
- 내보내기 기능
- 테마 커스터마이징

#### 1.3.6 Miscellaneous (0개)
현재 기타 shortcode 없음

### 1.4 Shortcode 등록 메커니즘

**파일 경로:** `/apps/main-site/src/utils/shortcode-loader.ts`

**등록 패턴:**
```typescript
export const [name]Shortcode: ShortcodeDefinition = {
  name: 'shortcode_name',
  component: ({ attributes }) => <Component {...attributes} />
};
```

**자동 등록:**
- `import.meta.glob()`을 사용한 자동 스캔
- `ShortcodeDefinition` 배열 탐지
- 중복 방지 (이미 등록된 shortcode 건너뜀)
- 개발 모드에서 상세 로깅

**Props 매핑:**
```typescript
// Snake_case와 camelCase 모두 지원
redirectUrl={attributes.redirect_url || attributes.redirectUrl}
```

### 1.5 사용 예시

#### Authentication Flow
```
[social_login providers="google,kakao" showTestPanel="env:dev"]
[signup redirectUrl="/dashboard" showSocialSignup="true"]
[find_password]
```

#### Product Catalog
```
[product_grid category="electronics" limit="12" columns="4"]
[product_categories show_count="true" hide_empty="true"]
[featured_products limit="4" title="추천 상품"]
```

#### Role Management
```
[role_apply_form role="supplier"]
[role_applications_list]
[role_applications_admin]  // Admin only
```

#### Dashboards
```
// Full dashboard page
[supplier_dashboard defaultPeriod="30d" showMenu="true"]

// Widget/embeddable
[supplier_dashboard_overview]
```

---

## 2. CPT / Template / Archive 구조 조사

### 2.1 CPT 구조

| CPT Type | 설명 | 주요 필드 | Taxonomy | Frontend 사용 |
|---|---|---|---|---|
| `CustomPostType` | CPT 정의 메타데이터 | name, label, slug, icon, supports | - | Yes (메타정보) |
| `CustomPost` | 실제 포스트 데이터 | title, content, status, cptSlug | categories, tags | Yes (콘텐츠) |
| `ViewPreset` | Archive 페이지 설정 | pagination, sorting, filters, columns | - | Yes (목록 페이지) |
| `TemplatePreset` | Single 페이지 레이아웃 | blocks, slots, layout, SEO | - | Yes (상세 페이지) |
| `FormPreset` | 편집 폼 설정 | fields, validation, sections | - | No (Admin only) |

**특수 CPT (Product 관련):**
- `ds_product` - 일반 상품
- `ds_supplier_product` - 공급자 상품
- `ds_seller_product` - 판매자 상품

### 2.2 Archive 구조

| Archive URL | 데이터 소스 | 템플릿 파일 | Shortcode 적용 |
|---|---|---|---|
| `/cpt/:cptSlug` | CPT API | `CPTArchive.tsx` | Yes ([cpt_list]) |
| `/cpt/:cptSlug?page=N` | CPT API (페이지네이션) | `CPTArchive.tsx` | Yes |
| `/:slug` (통합) | Pages → Posts → CPTs | `UnifiedPage.tsx` | Yes |

**Archive 렌더링 플로우:**
```
사용자 → /cpt/products
  ↓
CPTArchive 컴포넌트
  ↓
Fetch CPT 정의 (GET /api/cpt/:slug)
  ↓
Fetch ViewPreset (GET /api/presets/view/:id)
  ↓
Apply config (pagination, sorting, filters)
  ↓
Render: Grid + Pagination + Controls
```

### 2.3 Single Template 구조

| Template | CPT | 렌더 방식 | 동적 Props | Shortcode 연동 |
|---|---|---|---|---|
| `CPTSingle.tsx` | All CPTs | TemplatePreset | cptSlug, slug | Yes ([cpt_field]) |
| `ProductDetailPage.tsx` | ds_product | 하드코딩 레이아웃 | productId | No |
| `Page.tsx` (통합) | page | Block Editor 콘텐츠 | slug | Yes (전체) |

**Single 렌더링 플로우:**
```
사용자 → /cpt/products/item-123
  ↓
CPTSingle 컴포넌트
  ↓
Fetch CPT (GET /api/cpt/:cptSlug/:slug)
  ↓
Fetch TemplatePreset (GET /api/presets/template/:id)
  ↓
Render Layout with Blocks
  ↓
Process Shortcodes in Content
```

### 2.4 Shortcode Integration

**동적 Shortcode:**
- `[cpt_list cpt="products" limit="10"]` - CPT 아카이브 목록
- `[cpt_field name="title"]` - CPT 필드 출력
- `[acf_field name="custom_field"]` - ACF 필드 출력
- `[meta_field name="price"]` - 메타 필드 출력
- `[preset id="123"]` - Preset 기반 렌더링

**통합 방식:**
- Block Editor 콘텐츠에서 shortcode 파싱
- 런타임 동적 삽입
- Props를 통한 데이터 전달

### 2.5 URL 라우팅 패턴

**아카이브:**
- `/cpt/products` - 전체 상품 목록
- `/cpt/products?page=2` - 페이지 2
- `/cpt/products?category=electronics` - 필터링

**싱글:**
- `/cpt/products/laptop-abc` - 특정 상품
- `/products/laptop-abc` - 축약 URL (라우터 설정 필요)

**통합:**
- `/about` - Page 우선 검색
- `/blog/my-post` - Post 검색
- `/custom-type/item` - CPT 검색

---

## 3. Notification 시스템 조사

### 3.1 Notification 구성 요소

| 기능 | 구현 여부 | 파일 | 역할 지원 | 비고 |
|---|---|---|---|---|
| Toast Notification | ✅ 완료 | `/components/common/Toast.tsx` | All | Portal 기반, 4가지 타입 |
| Notification Badge | ✅ 완료 | `/components/dashboard/NotificationBadge.tsx` | All | Count, Dot, New 변형 |
| Approval Notice | ✅ 완료 (Mock) | `/components/dashboard/ApprovalNotice.tsx` | Seller/Supplier | 하드코딩 데이터 |
| Top Notice Banner | ✅ 완료 | `/components/personalization/TopNotice.tsx` | Role-based | LocalStorage 기반 dismiss |
| Push Notification | ❌ 없음 | - | - | 확인 필요 |
| Email Notification | ❌ 확인 필요 | - | - | Backend 확인 필요 |
| In-App Notification Center | ❌ 없음 | - | - | 구현 필요 |

### 3.2 Toast Notification

**파일:** `/apps/main-site/src/components/common/Toast.tsx`

**기능:**
- 4가지 타입: `success`, `error`, `warning`, `info`
- 6가지 위치: `top-right`, `top-left`, `bottom-right`, `bottom-left`, `top-center`, `bottom-center`
- Portal을 사용한 전역 렌더링
- 자동 닫힘 (기본 3초)
- 수동 닫기 버튼

**사용 패턴:**
```tsx
import Toast from '@/components/common/Toast';

const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

// 토스트 표시
setToast({ message: '성공적으로 저장되었습니다', type: 'success' });

// 렌더링
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}
```

**문제점:**
- ❌ 전역 Context/Provider 없음 (각 컴포넌트가 개별 관리)
- ❌ `useToast()` 훅 없음
- ❌ Toast Queue 시스템 없음 (동시 다중 토스트 불가)

### 3.3 Notification Badge

**파일:** `/apps/main-site/src/components/dashboard/NotificationBadge.tsx`

**기능:**
- 3가지 변형:
  - `count` - 숫자 배지 (99+ 지원)
  - `dot` - 작은 점 표시
  - `new` - "New" 텍스트 배지
- 5가지 색상: red, blue, green, orange, purple
- 헬퍼 함수:
  - `isItemNew(createdAt)` - 24시간 이내
  - `isItemRecent(createdAt, hours)` - N시간 이내

**사용 예시:**
```tsx
<NotificationBadge count={5} variant="count" color="red" />
<NotificationBadge isNew variant="new" color="blue" />
<NotificationBadge variant="dot" color="green" />
```

### 3.4 Approval Notice

**파일:** `/apps/main-site/src/components/dashboard/ApprovalNotice.tsx`

**현재 상태:** Mock 데이터 (하드코딩)

**데이터 구조:**
```typescript
{
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  date: string;
}
```

**문제점:**
- ❌ 실제 API 연동 없음
- ❌ 역할별 알림 필터링 없음
- ❌ 읽음/안 읽음 상태 없음
- ❌ 삭제 기능 없음

### 3.5 Top Notice Banner

**파일:** `/apps/main-site/src/components/personalization/TopNotice.tsx`

**기능:**
- 역할 기반 배너 표시
- LocalStorage 기반 dismiss
- Click/Impression 추적 (analytics)
- 4가지 변형: info, warning, success, error
- Action 버튼 지원

**데이터 구조:**
```typescript
interface Banner {
  id: string;
  title: string;
  message: string;
  variant: 'info' | 'warning' | 'success' | 'error';
  dismissible: boolean;
  action?: {
    label: string;
    url: string;
  };
}
```

### 3.6 부재 시스템 (확인 필요)

**확인 필요 항목:**

1. **Push Notification**
   - 브라우저 Push API 사용 여부
   - Service Worker 구현
   - FCM/OneSignal 통합

2. **Email Notification**
   - Backend Email 서비스
   - 템플릿 시스템
   - 트리거 로직

3. **In-App Notification Center**
   - 알림 목록 보기
   - 읽음/안 읽음 표시
   - 알림 삭제/관리
   - 실시간 업데이트 (WebSocket/SSE)

4. **SMS Notification**
   - 문자 발송 서비스 연동
   - 인증 코드 발송

---

## 4. 개선 필요 포인트 (Refactor Candidates)

### 4.1 Shortcode 관련

| 항목 | 문제점 | 제안 해결 방향 | 우선순위 | 영향도 |
|---|---|---|---|---|
| **Login Shortcode 중복** | `social_login`, `login_form`, `oauth_login` 3개 존재 | `login_form` 별칭 제거, `social_login`을 기본으로 사용 | 🔴 High | Medium |
| **Shortcode 명명 불일치** | Snake_case vs no-separator 혼재 | 전체 snake_case 표준화 | 🟡 Medium | Low |
| **Cart/Checkout Shortcode 부재** | 장바구니 페이지 shortcode 없음 | `cart`, `checkout` shortcode 추가 | 🔴 High | High |
| **Order Tracking Shortcode 부재** | 고객 주문 상세 shortcode 없음 | `order_detail` shortcode 추가 | 🔴 High | Medium |
| **Customer Dashboard Overview 부재** | 다른 역할엔 있지만 고객용 없음 | `customer_dashboard_overview` 추가 | 🟡 Medium | Low |
| **Shortcode Documentation 부재** | 개발자용 라이브러리 페이지 없음 | Admin에 Shortcode 라이브러리 페이지 추가 | 🟡 Medium | Medium |
| **Props 중복 매핑** | Snake_case와 camelCase 동시 지원 | Props 타입 정의 강화, 단일 표준 선택 | 🟢 Low | Low |

### 4.2 CPT / Template 관련

| 항목 | 문제점 | 제안 해결 방향 | 우선순위 | 영향도 |
|---|---|---|---|---|
| **Product CPT 중복** | `ds_product`, `ds_supplier_product`, `ds_seller_product` 별도 관리 | 단일 Product CPT + Role 메타필드 고려 | 🟡 Medium | High |
| **하드코딩 Product 페이지** | `ProductDetailPage.tsx`가 TemplatePreset 사용 안 함 | TemplatePreset 마이그레이션 | 🟡 Medium | Medium |
| **Preset 미리보기 부재** | Admin에서 Preset 편집 시 미리보기 없음 | Live Preview 기능 추가 | 🟡 Medium | Medium |
| **Archive 필터 제한** | ViewPreset 필터가 제한적 | 고급 필터 옵션 추가 (날짜 범위, 다중 선택 등) | 🟢 Low | Low |
| **SEO 메타 부족** | TemplatePreset SEO 필드 제한적 | Open Graph, Schema.org 지원 확대 | 🟡 Medium | Medium |

### 4.3 Notification 관련

| 항목 | 문제점 | 제안 해결 방향 | 우선순위 | 영향도 |
|---|---|---|---|---|
| **Toast Context 부재** | 각 컴포넌트가 Toast 개별 관리 | `ToastProvider` + `useToast()` 훅 구현 | 🔴 High | High |
| **Toast Queue 없음** | 동시 다중 토스트 불가 | Queue 시스템 추가 | 🔴 High | Medium |
| **Approval Notice Mock** | 하드코딩 데이터 사용 | 실제 API 연동 | 🔴 High | High |
| **읽음 상태 없음** | 알림 읽음/안 읽음 추적 불가 | 읽음 상태 API + UI 추가 | 🟡 Medium | Medium |
| **Notification Center 부재** | 통합 알림 센터 없음 | 헤더에 알림 아이콘 + 드롭다운 목록 추가 | 🔴 High | High |
| **실시간 업데이트 없음** | 수동 새로고침 필요 | WebSocket/SSE 실시간 알림 추가 | 🟢 Low | High |
| **Push Notification 없음** | 브라우저 푸시 미지원 | Service Worker + FCM 통합 | 🟢 Low | Medium |

### 4.4 아키텍처 관련

| 항목 | 문제점 | 제안 해결 방향 | 우선순위 | 영향도 |
|---|---|---|---|---|
| **Shortcode 타입 안정성** | Props 타입 검증 약함 | Zod/Yup 스키마 검증 추가 | 🟡 Medium | Medium |
| **Error Boundary 부족** | Shortcode 오류 시 전체 페이지 크래시 | Shortcode별 Error Boundary 추가 | 🔴 High | High |
| **성능 최적화 부족** | Dashboard 초기 로딩 느림 | Lazy Loading + Code Splitting | 🟡 Medium | High |
| **Caching 전략 부재** | API 응답 캐싱 없음 | React Query + SWR 도입 | 🟡 Medium | High |
| **Mobile 최적화** | Dashboard 모바일 UI 미흡 | 반응형 레이아웃 개선 | 🟡 Medium | Medium |

---

## 5. 페이지 제작용 공식 Shortcode Set (v1)

### 5.1 필수 (Minimum Viable Set)

#### 🔐 Authentication Pages

| 페이지 | Shortcode | 용도 |
|---|---|---|
| 로그인 | `[social_login]` | 소셜 + 이메일 로그인 |
| 회원가입 | `[signup]` | 이메일 회원가입 |
| 비밀번호 찾기 | `[find_password]` | 비밀번호 재설정 |
| 아이디 찾기 | `[find_id]` | 이메일로 아이디 찾기 (선택) |
| 사업자 등록 | `[business_register]` | 법인/개인사업자 (선택) |

#### 🛍️ Shop Pages

| 페이지 | Shortcode | 용도 |
|---|---|---|
| 상품 목록 | `[product_grid]` | 메인 카탈로그 |
| 상품 카테고리 | `[product_categories]` | 카테고리 네비게이션 |
| 상품 상세 | `[product]` | 단일 상품 표시 |
| 추천 상품 | `[featured_products]` | 홈/랜딩 페이지용 |
| 🔴 장바구니 | **미구현** | 필요 |
| 🔴 결제 | **미구현** | 필요 |

#### 👤 Account Pages

| 페이지 | Shortcode | 용도 |
|---|---|---|
| 고객 대시보드 | `[customer_dashboard]` | 주문, 위시리스트 |
| 공급자 대시보드 | `[supplier_dashboard]` | 재고, 수익 |
| 판매자 대시보드 | `[seller_dashboard]` | 판매, 수수료 |
| 파트너 대시보드 | `[partner_dashboard]` | 링크, 수익 |
| 역할 신청 | `[role_apply_form]` | 역할 업그레이드 |
| 신청 내역 | `[role_applications_list]` | 신청 상태 확인 |
| 🔴 주문 상세 | **미구현** | 필요 |

#### 🛠️ Utility Pages

| 페이지 | Shortcode | 용도 |
|---|---|---|
| Contact Form | `[form name="contact"]` | 문의 폼 |
| 검색 결과 | `[view name="search"]` | 검색 결과 표시 |

### 5.2 선택 (Enhanced)

#### 📊 Dashboard Widgets (임베드용)

- `[supplier_dashboard_overview]` - 공급자 요약 위젯
- `[seller_dashboard_overview]` - 판매자 요약 위젯
- `[partner_dashboard_overview]` - 파트너 요약 위젯

#### 🎨 Marketing/Content

- `[product_carousel]` - 상품 슬라이더
- `[product id="123"]` - 단일 상품 카드

### 5.3 Admin Only

- `[role_applications_admin]` - 역할 승인 관리
- `[view name="users"]` - 사용자 목록 (Spectra)
- `[form name="admin_settings"]` - 설정 폼

### 5.4 미구현 (구현 필요)

| 기능 | Shortcode 제안 | 우선순위 |
|---|---|---|
| 장바구니 페이지 | `[cart]` | 🔴 High |
| 결제 페이지 | `[checkout]` | 🔴 High |
| 주문 상세 | `[order_detail id="123"]` | 🔴 High |
| 주문 목록 | `[orders]` | 🟡 Medium |
| 위시리스트 페이지 | `[wishlist]` | 🟡 Medium |
| 상품 검색 | `[product_search]` | 🟡 Medium |
| 리뷰 목록 | `[product_reviews id="123"]` | 🟢 Low |

---

## 6. Build 영향도 및 제안 흐름

### 6.1 현재 Build 상태

**Build 정보:**
- 빌드 도구: Vite
- 프레임워크: React + TypeScript
- Shortcode 로딩: Dynamic Import (lazy)
- 번들 크기: 확인 필요

**Build 시 Shortcode 처리:**
```typescript
// Vite Glob Import (Lazy)
import.meta.glob('../components/shortcodes/**/*.{ts,tsx}', { eager: false })
```

**장점:**
- ✅ Code Splitting 자동
- ✅ 필요한 shortcode만 로드
- ✅ 초기 번들 크기 감소

**단점:**
- ❌ 빌드 타임에 shortcode 목록 알 수 없음
- ❌ Type-safe props 검증 어려움

### 6.2 영향도 분석

#### 6.2.1 Shortcode 추가/변경 시

**영향 범위:**
- ✅ 자동 등록 (코드 변경 최소)
- ✅ 타입 안정성 (ShortcodeDefinition 인터페이스)
- ⚠️ 문서화 필요 (수동)

**Build 시간:**
- 영향: 최소 (파일 1-2개만 재컴파일)
- 증가량: ~100ms per shortcode

#### 6.2.2 CPT/Template 변경 시

**영향 범위:**
- ✅ DB 스키마 변경 (마이그레이션)
- ✅ API 엔드포인트 업데이트
- ⚠️ Frontend 타입 동기화

**Build 시간:**
- 영향: 없음 (런타임 데이터)

#### 6.2.3 Notification 시스템 추가 시

**영향 범위:**
- ✅ Context Provider 추가
- ✅ 전역 상태 관리
- ⚠️ Layout 변경 (헤더에 알림 아이콘)

**Build 시간:**
- 영향: 최소
- 증가량: ~500ms (WebSocket 라이브러리 포함 시)

### 6.3 제안 개발 흐름

#### Phase 1: 긴급 (1-2주)

1. **Toast System 개선**
   - `ToastProvider` + `useToast()` 구현
   - Toast Queue 시스템 추가

2. **필수 Shortcode 추가**
   - `[cart]` - 장바구니 페이지
   - `[checkout]` - 결제 페이지
   - `[order_detail]` - 주문 상세

3. **Approval Notice API 연동**
   - Mock 데이터 → 실제 API

#### Phase 2: 중요 (2-4주)

4. **Shortcode Documentation**
   - Admin에 Shortcode 라이브러리 페이지
   - Live Preview 기능

5. **Notification Center**
   - 헤더 알림 아이콘
   - 드롭다운 알림 목록
   - 읽음/안 읽음 상태

6. **Error Boundary**
   - Shortcode별 격리된 오류 처리

#### Phase 3: 개선 (4-8주)

7. **Product CPT 통합**
   - 단일 Product CPT + Role 메타
   - 마이그레이션 스크립트

8. **Performance 최적화**
   - React Query 도입
   - Lazy Loading 개선

9. **Real-time Notification**
   - WebSocket/SSE 구현
   - Push Notification (선택)

### 6.4 Build 최적화 제안

#### 6.4.1 Shortcode Lazy Loading 개선

**현재:**
```typescript
import.meta.glob('../components/shortcodes/**/*.{ts,tsx}', { eager: false })
```

**제안:**
```typescript
// Shortcode별 Chunk 분리
const shortcodeChunks = {
  auth: () => import('./shortcodes/auth'),
  product: () => import('./shortcodes/product'),
  dashboard: () => import('./shortcodes/dashboard'),
};
```

**효과:**
- 초기 로딩 30% 감소 (예상)
- 페이지별 필요한 chunk만 로드

#### 6.4.2 Type Generation

**제안:**
```bash
# Build 시 shortcode 타입 자동 생성
npm run generate:shortcode-types
```

**생성 파일:**
```typescript
// Auto-generated
export type ShortcodeNames =
  | 'signup'
  | 'social_login'
  | 'product_grid'
  // ...

export type ShortcodeProps<T extends ShortcodeNames> = /* ... */;
```

#### 6.4.3 Bundle Analysis

**추천 도구:**
```bash
npm install --save-dev vite-plugin-bundle-analyzer
```

**설정:**
```typescript
// vite.config.ts
import { BundleAnalyzerPlugin } from 'vite-plugin-bundle-analyzer';

export default {
  plugins: [
    BundleAnalyzerPlugin({ openAnalyzer: false })
  ]
};
```

### 6.5 CI/CD 고려사항

#### Build Pipeline
```yaml
# .github/workflows/build.yml
- name: Build Shortcode Registry
  run: npm run build:shortcodes

- name: Type Check
  run: npm run type-check

- name: Bundle Size Check
  run: npm run size-check

- name: Deploy
  run: npm run deploy
```

#### 경고 조건
- Bundle size > 500KB (shortcode chunk 기준)
- Type errors 존재
- Unused shortcodes 10개 초과

---

## 7. 결론 및 Next Steps

### 7.1 조사 완료 항목

✅ **Shortcode 전수 조사 완료**
- 26개 shortcode 문서화
- 카테고리별 분류
- 사용 예시 작성

✅ **CPT/Template/Archive 구조 분석 완료**
- CPT 구조 테이블
- 렌더링 플로우 문서화
- URL 패턴 정리

✅ **Notification 시스템 조사 완료**
- 기존 컴포넌트 파악
- 부재 시스템 식별
- 개선 방향 제시

✅ **Refactor Candidates 식별 완료**
- 우선순위별 분류
- 영향도 평가

✅ **공식 Shortcode Set (v1) 확정**
- 필수/선택/미구현 분류
- 페이지별 매핑

### 7.2 즉시 조치 필요

🔴 **High Priority:**
1. Toast System 개선 (Context + Hook)
2. Cart/Checkout Shortcode 추가
3. Approval Notice API 연동
4. Notification Center 구현
5. Error Boundary 추가

### 7.3 Next Phase 준비

**Phase 1 - 페이지 제작 설계서 작성 필요:**
- Home 페이지 wireframe + shortcode 매핑
- Shop 페이지 설계
- Account 페이지 설계
- Login/Signup 페이지 설계
- Cart/Checkout 페이지 설계

**필요한 추가 조사:**
- 실제 상품 데이터 스키마
- 결제 시스템 통합 (PG사)
- 사용자 권한 시스템
- Email 발송 시스템

---

## 부록

### A. 파일 구조 트리

```
apps/main-site/src/
├── components/
│   ├── shortcodes/
│   │   ├── auth/
│   │   │   ├── SignupShortcode.tsx
│   │   │   ├── SocialLoginShortcode.tsx
│   │   │   ├── FindIdShortcode.tsx
│   │   │   ├── FindPasswordShortcode.tsx
│   │   │   ├── BusinessRegisterShortcode.tsx
│   │   │   └── index.ts
│   │   ├── Product*.tsx (6 files)
│   │   ├── *Dashboard*.tsx (8 files)
│   │   ├── Role*.tsx (3 files)
│   │   ├── Form.tsx
│   │   └── View.tsx
│   ├── common/
│   │   └── Toast.tsx
│   ├── dashboard/
│   │   ├── NotificationBadge.tsx
│   │   └── ApprovalNotice.tsx
│   └── personalization/
│       └── TopNotice.tsx
├── utils/
│   └── shortcode-loader.ts
└── types/
    └── personalization.ts
```

### B. 주요 API 엔드포인트

```
GET  /api/cpt/:slug              - CPT 정의 조회
GET  /api/cpt/:cptSlug/:slug     - 단일 CPT 조회
GET  /api/cpt/:cptSlug?page=N    - CPT 목록 (페이지네이션)
GET  /api/presets/view/:id       - ViewPreset 조회
GET  /api/presets/template/:id   - TemplatePreset 조회
POST /api/role-applications      - 역할 신청
GET  /api/role-applications      - 역할 신청 목록
GET  /api/products               - 상품 목록
GET  /api/products/:id           - 상품 상세
```

### C. 환경 변수

```bash
# Frontend (.env)
VITE_API_URL=https://api.neture.co.kr
VITE_ENABLE_TEST_PANEL=true/false

# Backend
DATABASE_URL=...
JWT_SECRET=...
EMAIL_SERVICE_ENABLED=true/false
```

---

**보고서 작성일:** 2025-11-21
**작성자:** Claude (AI Agent)
**버전:** 1.0
**상태:** ✅ 완료
