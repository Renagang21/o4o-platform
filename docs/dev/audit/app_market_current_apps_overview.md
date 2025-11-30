# AM1-A: App Market 현 상태 조사 결과 - 앱 후보 기능 전반

**작성일**: 2025-11-28
**조사 수행자**: Claude
**관련 Phase**: AM1 – App Market 조사
**상태**: ✅ 조사 완료

---

## 문서 개요

### 목적

이 문서는 AM1 Phase의 **조사 항목 A (A-1 ~ A-5)**에 대한 조사 결과를 정리한 것이다.

* O4O 플랫폼에서 "앱"으로 분리될 가능성이 있는 기능들을 식별
* 각 앱 후보의 코드 위치, 라우팅, 권한, 데이터 구조, 설정 등을 조사
* 향후 App Market 인프라 설계의 기초 자료로 활용

### 범위

* **포함**: apps/main-site, apps/admin-dashboard, apps/api-server 내 앱 후보 기능들
* **제외**: Forum 상세 조사 (별도 문서 `forum_current_state.md`), 실제 리팩토링

### 전제

* 조사 시점: 2025-11-28
* Git 커밋: d4d7085188d1f97fe260b48037bbb40a3ce89e67
* 운영 데이터: 서비스 시작 전

---

## A-1. 앱 후보 기능 목록 및 코드 위치

### 앱 후보 식별 기준

다음 기준으로 "앱 후보"를 식별했다:

* [x] 독립적인 도메인 로직을 가진 기능 단위
* [x] 별도의 라우트(URL) 세트를 점유
* [x] 특정 역할/권한과 강하게 연결
* [x] 설치/비활성화가 가능한 기능
* [x] CPT/ACF 스타일의 독립적인 데이터 구조

### 앱 후보 목록

| # | 앱 후보명 | 주요 역할/기능 요약 | 현재 사용 여부 | 비고 |
|---|-----------|-------------------|---------------|------|
| 1 | **Forum** | 게시판/커뮤니티 기능. 토픽 생성, 댓글, 카테고리, 태그, 모더레이션 | ⏸️ Entity만 존재 | 앱 후보 1호, 별도 상세 조사 문서 있음 |
| 2 | **Dropshipping/Seller/Supplier** | 판매자/공급자/파트너 드롭십 기능 | ✅ 사용 중 | 여러 Entity로 분산 (Seller, Supplier, Partner, SellerAuthorization 등) |
| 3 | **Settlement** | 정산/수수료 관리 | ✅ 사용 중 | PaymentSettlement Entity 사용 |
| 4 | **Partner (Affiliate)** | 제휴/어필리에이트 마케팅 | ✅ 사용 중 | Partner, Commission, ConversionEvent 등 |
| 5 | **Notification** | 알림/메시징 시스템 | ✅ 사용 중 | Notification Entity, NotificationService |
| 6 | **Wishlist** | 위시리스트 | ✅ 사용 중 | Wishlist Entity, R-6-5 구현 |
| 7 | **Analytics** | 분석/리포팅 기능 | ⏸️ Entity만 존재 | AnalyticsReport Entity, 실제 사용 여부 불명 |

---

### 앱 후보별 상세 정보

#### 1. Forum (게시판)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 게시판 시스템. 카테고리별 토픽(게시글) 작성, 댓글, 태그, 좋아요, 조회수 추적, 모더레이션 기능 포함. |
| **프론트엔드 코드 위치** | **❌ 없음** (Entity와 Service만 존재, UI 미구현) |
| **백엔드 코드 위치** | `apps/api-server/src/services/forumService.ts` (612라인)<br>`apps/api-server/src/entities/ForumPost.ts`<br>`apps/api-server/src/entities/ForumComment.ts`<br>`apps/api-server/src/entities/ForumCategory.ts`<br>`apps/api-server/src/entities/ForumTag.ts` |
| **API 라우트** | **❌ 없음** (라우트 파일 발견되지 않음) |
| **Admin UI 위치** | **❌ 없음** |
| **현재 사용 여부** | ⏸️ **미사용** (백엔드 코드만 존재, API 노출 안 됨) |
| **비고** | 완전한 백엔드 로직 존재하나 프론트엔드 없음. 별도 상세 조사 문서: `forum_current_state.md` |

---

#### 2. Dropshipping/Seller/Supplier (판매자/공급자)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 드롭십핑 기능. Seller(판매자)가 Supplier(공급자)의 제품을 승인받아 판매. 수수료/정산 시스템 포함. |
| **프론트엔드 코드 위치** | `apps/main-site/src/pages/dashboard/SellerDashboardPage.tsx`<br>`apps/main-site/src/pages/dashboard/SellerProductsPage.tsx`<br>`apps/main-site/src/pages/dashboard/SupplierDashboardPage.tsx`<br>`apps/main-site/src/pages/dashboard/SupplierProductsPage.tsx`<br>`apps/main-site/src/pages/dashboard/SupplierProductAuthorizationsPage.tsx` |
| **백엔드 코드 위치** | `apps/api-server/src/entities/Seller.ts`<br>`apps/api-server/src/entities/Supplier.ts`<br>`apps/api-server/src/entities/SellerProduct.ts`<br>`apps/api-server/src/entities/SellerAuthorization.ts`<br>`apps/api-server/src/services/SellerService.ts`<br>`apps/api-server/src/services/SellerProductService.ts`<br>`apps/api-server/src/services/SellerAuthorizationService.ts` |
| **API 라우트** | `apps/api-server/src/routes/ds-seller-authorization.routes.ts`<br>`apps/api-server/src/routes/ds-seller-authorization-v2.routes.ts`<br>`apps/api-server/src/routes/ds-seller-product.routes.ts`<br>`apps/api-server/src/routes/seller-dashboard.routes.ts`<br>`apps/api-server/src/routes/seller-products.ts` |
| **Admin UI 위치** | Admin Dashboard 내 통합 관리 (정확한 경로 추가 조사 필요) |
| **현재 사용 여부** | ✅ **사용 중** (핵심 비즈니스 로직) |
| **비고** | 매우 복잡한 구조. "Dropshipping"이라는 단일 앱보다는 "Seller App", "Supplier App"으로 분리 고려 필요. |

---

#### 3. Settlement (정산)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 정산 관리. Supplier/Seller/Partner에 대한 수수료 계산 및 지급 관리. |
| **프론트엔드 코드 위치** | `apps/main-site/src/pages/dashboard/SellerSettlementsPage.tsx`<br>`apps/main-site/src/pages/dashboard/SupplierSettlementsPage.tsx`<br>`apps/main-site/src/pages/dashboard/PartnerSettlementsPage.tsx`<br>`apps/main-site/src/pages/dashboard/admin/AdminSettlementsPage.tsx` |
| **백엔드 코드 위치** | `apps/api-server/src/entities/PaymentSettlement.ts`<br>`apps/api-server/src/entities/Settlement.ts` (있다면)<br>`apps/api-server/src/services/SettlementService.ts`<br>`apps/api-server/src/services/SettlementBatchService.ts`<br>`apps/api-server/src/services/SettlementReadService.ts`<br>`apps/api-server/src/services/SettlementManagementService.ts` |
| **API 라우트** | `apps/api-server/src/routes/ds-settlements.routes.ts` |
| **Admin UI 위치** | `apps/main-site/src/pages/dashboard/admin/AdminSettlementsPage.tsx` (Admin 페이지는 main-site에 통합) |
| **현재 사용 여부** | ✅ **사용 중** (Phase 4-2 구현 완료) |
| **비고** | 역할별로 라우트 분산 (`/dashboard/seller/settlements`, `/dashboard/supplier/settlements`, `/dashboard/partner/settlements`) |

---

#### 4. Partner (Affiliate)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 제휴/어필리에이트 마케팅. 파트너가 추천 링크로 주문 유도 시 수수료 지급. 클릭/전환 추적, 정산. |
| **프론트엔드 코드 위치** | `apps/main-site/src/pages/dashboard/PartnerDashboardPage.tsx`<br>`apps/main-site/src/pages/dashboard/PartnerLinksPage.tsx`<br>`apps/main-site/src/pages/dashboard/PartnerAnalyticsPage.tsx`<br>`apps/main-site/src/pages/apply/ApplyPartner.tsx` |
| **백엔드 코드 위치** | `apps/api-server/src/entities/Partner.ts` (411라인, 복잡한 비즈니스 로직 포함)<br>`apps/api-server/src/entities/Commission.ts`<br>`apps/api-server/src/entities/ConversionEvent.ts`<br>`apps/api-server/src/entities/ReferralClick.ts`<br>`apps/api-server/src/entities/CommissionPolicy.ts`<br>`apps/api-server/src/services/PartnerService.ts`<br>`apps/api-server/src/services/CommissionEngine.ts`<br>`apps/api-server/src/services/TrackingService.ts`<br>`apps/api-server/src/services/AttributionService.ts` |
| **API 라우트** | `apps/api-server/src/routes/partners.ts`<br>`apps/api-server/src/routes/partner.routes.ts` |
| **Admin UI 위치** | Admin Dashboard (Partner 관리, 승인, 정산 등) |
| **현재 사용 여부** | ✅ **사용 중** (Phase 2.1 구현 완료, 문서 #66) |
| **비고** | Partner 앱은 매우 독립적. 환경변수 `ENABLE_PARTNER_SETTLEMENT=false`가 `.env.example`에 존재 → Feature Flag 이미 일부 구현 |

---

#### 5. Notification (알림)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 인앱 알림 및 이메일 알림. 주문 상태 변경, 정산 완료, 재고 부족 등 이벤트 발생 시 알림 발송. |
| **프론트엔드 코드 위치** | 헤더/레이아웃 컴포넌트 내 알림 아이콘 (정확한 경로 추가 조사 필요) |
| **백엔드 코드 위치** | `apps/api-server/src/entities/Notification.ts` (105라인, PD-7 Phase)<br>`apps/api-server/src/services/NotificationService.ts` |
| **API 라우트** | `apps/api-server/src/routes/notifications.routes.ts` |
| **Admin UI 위치** | (알림 관리 페이지 존재 여부 불명) |
| **현재 사용 여부** | ✅ **사용 중** (PD-7 Phase 구현) |
| **비고** | NotificationType enum: `order.new`, `order.status_changed`, `settlement.new_pending`, `settlement.paid`, `price.changed`, `stock.low`, `role.approved`, `role.application_submitted`, `custom` |

---

#### 6. Wishlist (위시리스트)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 고객이 좋아하는 제품을 저장하여 나중에 구매할 수 있는 기능. |
| **프론트엔드 코드 위치** | (정확한 경로 추가 조사 필요) |
| **백엔드 코드 위치** | `apps/api-server/src/entities/Wishlist.ts` (50라인, R-6-5 Phase)<br>`apps/api-server/src/services/WishlistService.ts` |
| **API 라우트** | `apps/api-server/src/routes/wishlist.routes.ts` |
| **Admin UI 위치** | **❌ 없음** (고객 전용 기능) |
| **현재 사용 여부** | ✅ **사용 중** (R-6-5 Phase 구현) |
| **비고** | 매우 단순한 구조. Entity에 `userId`, `productId`, `notes` 필드만 존재. |

---

#### 7. Analytics (분석/리포팅)

| 항목 | 내용 |
|------|------|
| **기능 요약** | 시스템 분석 리포트 생성. 사용자 활동, 시스템 성능, 콘텐츠 사용, 피드백 분석, 비즈니스 메트릭 등. |
| **프론트엔드 코드 위치** | (정확한 경로 추가 조사 필요, Partner Analytics 페이지는 존재) |
| **백엔드 코드 위치** | `apps/api-server/src/entities/AnalyticsReport.ts` (389라인, 복잡한 구조)<br>`apps/api-server/src/services/AnalyticsService.ts` |
| **API 라우트** | `apps/api-server/src/routes/analytics.ts` |
| **Admin UI 위치** | Admin Dashboard (Analytics 관리, 리포트 생성) |
| **현재 사용 여부** | ⏸️ **불명** (Entity 존재, 실제 사용 여부 확인 필요) |
| **비고** | ReportType: `daily`, `weekly`, `monthly`, `custom`. ReportCategory: `user_activity`, `system_performance`, `content_usage`, `feedback_analysis`, `error_analysis`, `business_metrics`, `comprehensive` |

---

## A-2. 라우팅 구조와 앱 단위의 관계

### 프론트엔드 라우팅 (React Router v6)

#### 라우트 정의 파일 구조

| 파일 경로 | 역할 | 비고 |
|----------|------|------|
| `apps/main-site/src/App.tsx` | 메인 라우터 정의 (420라인) | 모든 라우트가 한 파일에 정의됨 |
| `apps/main-site/src/routes/...` | **❌ 없음** (별도 라우트 설정 파일 없음) | |

---

#### 앱 후보별 URL 패턴

| 앱 후보명 | URL 패턴 | 정의 위치 | 비고 |
|----------|---------|----------|------|
| **Forum** | **❌ 없음** | - | 라우트 미정의 |
| **Seller (Dropshipping)** | `/dashboard/seller`<br>`/dashboard/seller/products`<br>`/dashboard/seller/orders`<br>`/dashboard/seller/settlements` | `App.tsx:294-310` | 명확한 prefix `/dashboard/seller/*` |
| **Supplier (Dropshipping)** | `/dashboard/supplier`<br>`/dashboard/supplier/products`<br>`/dashboard/supplier/orders`<br>`/dashboard/supplier/settlements` | `App.tsx:276-292` | 명확한 prefix `/dashboard/supplier/*` |
| **Partner** | `/dashboard/partner`<br>`/dashboard/partner/analytics`<br>`/dashboard/partner/links`<br>`/dashboard/partner/settlements` | `App.tsx:312-326` | 명확한 prefix `/dashboard/partner/*` |
| **Settlement (Admin)** | `/dashboard/admin/settlements`<br>`/dashboard/admin/settlements/:id` | `App.tsx:338-355` | Admin 전용 정산 관리 |
| **Wishlist** | (추가 조사 필요) | - | 라우트 발견 안 됨 (API만 존재?) |
| **Notification** | (추가 조사 필요) | - | 헤더 컴포넌트 내 통합? |
| **Analytics** | `/dashboard/partner/analytics` | `App.tsx:320` | Partner Dashboard 내 통합 |

---

### 백엔드 라우팅 (Express/Node)

#### API 라우트 정의 파일 구조

| 파일 경로 | 역할 | 비고 |
|----------|------|------|
| `apps/api-server/src/index.ts` 또는 `app.ts` | **❌ 찾을 수 없음** (파일 없음) | 메인 라우터 설정 파일 위치 불명 |
| `apps/api-server/src/routes/*.routes.ts` | 개별 라우트 모듈들 (70+ 파일) | 라우트 파일 매우 많음 |

---

#### 앱 후보별 API 엔드포인트

| 앱 후보명 | API 경로 패턴 | 라우트 파일 | 비고 |
|----------|-------------|-----------|------|
| **Forum** | **❌ 없음** | - | API 라우트 미등록 |
| **Seller** | `/api/seller/*` (추정) | `seller-dashboard.routes.ts`<br>`seller-products.ts`<br>`ds-seller-product.routes.ts` | 여러 파일로 분산 |
| **Supplier** | `/api/supplier/*` (추정) | (파일 목록에 supplier-specific 라우트 없음, 조사 필요) | |
| **Partner** | `/api/partners/*` | `partners.ts`<br>`partner.routes.ts` | |
| **Settlement** | `/api/settlements/*` | `ds-settlements.routes.ts` | "ds-" prefix는 "dropshipping" 의미 |
| **Notification** | `/api/notifications/*` | `notifications.routes.ts` | |
| **Wishlist** | `/api/wishlist/*` | `wishlist.routes.ts` | |
| **Analytics** | `/api/analytics/*` | `analytics.ts` | |

---

### 라우팅 경계 분석

#### 앱별 라우트 Prefix 명확성

| 앱 후보명 | 프론트엔드 Prefix | 백엔드 Prefix | 경계 명확도 | 비고 |
|----------|-----------------|-------------|-----------|------|
| **Forum** | **❌ 없음** | **❌ 없음** | N/A | 미구현 |
| **Seller** | `/dashboard/seller` | (추정) `/api/seller` 또는 `/api/v1/seller` | ✅ 명확 | 역할별 대시보드로 명확히 분리 |
| **Supplier** | `/dashboard/supplier` | (추정) `/api/supplier` | ✅ 명확 | 역할별 대시보드로 명확히 분리 |
| **Partner** | `/dashboard/partner` | `/api/partners` | ✅ 명확 | 역할별 대시보드로 명확히 분리 |
| **Settlement** | `/dashboard/*/settlements` (여러 역할) | `/api/settlements` | ⚠️ 일부 혼재 | 여러 역할이 동일 Settlement 앱 공유 |
| **Notification** | (불명) | `/api/notifications` | ❓ 불명 | 프론트엔드 라우트 조사 필요 |
| **Wishlist** | (불명) | `/api/wishlist` | ❓ 불명 | 프론트엔드 라우트 조사 필요 |
| **Analytics** | `/dashboard/partner/analytics` (일부) | `/api/analytics` | ⚠️ 일부 혼재 | Partner 전용인지, 전역인지 불명확 |

---

### 관찰/발견사항

#### 라우팅 구조 관련

1. **라우트가 앱 단위로 잘 분리되어 있는가?**
   - ✅ **YES**: Seller, Supplier, Partner 등 역할별 대시보드는 `/dashboard/{role}/*` 패턴으로 명확히 분리
   - ❌ **NO**: 모든 라우트가 `App.tsx` 한 파일에 정의됨 → 앱 분리 시 라우트 동적 등록 메커니즘 필요

2. **공통 라우트와 앱 라우트가 혼재되어 있는가?**
   - Settlement: 여러 역할(`/dashboard/seller/settlements`, `/dashboard/supplier/settlements`, `/dashboard/partner/settlements`)이 동일 Settlement 기능 사용
   - Analytics: Partner Dashboard 내 통합되어 있으나, Admin/전역 Analytics도 필요할 수 있음

3. **역할별 대시보드 라우트가 여러 앱에 걸쳐 있는가?**
   - ✅ YES: Seller Dashboard는 Products, Orders, Settlements 등 여러 기능 통합
   - 앱 분리 시, 각 역할의 Dashboard가 여러 앱의 UI를 통합하는 방식 필요 (App Market의 "Dashboard Widget" 개념)

4. **앱 비활성화 시 라우트 제어가 쉬운 구조인가?**
   - ❌ **NO**: 현재는 모든 라우트가 하드코딩됨
   - AppManager가 라우트를 동적으로 등록/제거하는 메커니즘 필요

---

## A-3. RBAC(역할/권한)과 앱의 연결 상태

### RBAC 시스템 개요

#### 역할 목록

| 역할 코드 | 역할명 (한글) | 설명 | 정의 위치 |
|---------|-------------|------|----------|
| `guest` | 비회원 | 로그인하지 않은 사용자 | (추가 조사 필요) |
| `customer` | 고객 | 일반 구매 고객 | User Entity role 필드 |
| `seller` | 판매자 | 상품 판매자 | Seller Entity |
| `supplier` | 공급자 | 재고 공급자 | Supplier Entity |
| `partner` | 파트너 | 제휴/어필리에이트 | Partner Entity |
| `operator` | 운영자 | 중간 관리자 (추정) | (추가 조사 필요) |
| `administrator` | 관리자 | 최고 관리자 | User Entity role 필드 |

---

#### 권한 키 네이밍 규칙

현재 사용 중인 권한 키 네이밍 패턴:

* **패턴 1**: `{domain}.{action}` (예: `forum.read`, `forum.write`) - **추정 (Forum Entity 메서드 기반)**
* **패턴 2**: Role-based access (역할 자체로 권한 판단) - **실제 사용됨 (RoleGuard 컴포넌트)**
* **패턴 3**: Entity 메서드 기반 권한 체크 (예: `ForumPost.canUserEdit(userId, userRole)`) - **실제 사용됨**

권한 정의 위치:

* **코드**: Entity 메서드 (`ForumPost.ts`, `ForumComment.ts`, `ForumCategory.ts` 등)
* **DB**: `Permission` Entity 존재 (`apps/api-server/src/entities/Permission.ts`) - 추가 조사 필요

---

### 앱 후보별 권한 키 목록

#### Forum 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `forum.read` | 게시판 읽기 | all (guest 포함) 또는 authenticated | ForumCategory.accessLevel 필드 | `accessLevel` enum: `all`, `member`, `business`, `admin` |
| `forum.write` | 토픽/댓글 작성 | customer 이상 (authenticated) | ForumPost.canUserComment() | |
| `forum.edit_own` | 본인 글 수정 | 본인 + !isLocked | ForumPost.canUserEdit(userId, userRole) | 24시간 제한 (ForumComment) |
| `forum.delete_own` | 본인 글 삭제 | 본인 | ForumComment.canUserEdit() | |
| `forum.moderate` | 모더레이션 (모든 글 수정/삭제/고정/잠금) | admin, manager | ForumPost.canUserEdit(userId, userRole) | |
| `forum.admin` | 포럼 전역 설정 관리 | admin, manager | ForumCategory.canUserPost() | |

---

#### Dropshipping (Seller/Supplier) 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `seller.view_dashboard` | 판매자 대시보드 접근 | seller | RoleGuard (App.tsx:296) | |
| `seller.manage_products` | 상품 관리 | seller | (추가 조사 필요) | |
| `supplier.view_dashboard` | 공급자 대시보드 접근 | supplier | RoleGuard (App.tsx:278) | |
| `supplier.manage_products` | 공급자 상품 관리 | supplier | (추가 조사 필요) | |
| `supplier.authorize_sellers` | 판매자 승인 | supplier | SupplierProductAuthorizationsPage | |

**비고**: 현재는 Role 자체로 권한을 판단 (`<RoleGuard role="seller">`) → 세밀한 권한 키 시스템은 미구현

---

#### Settlement 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `settlement.view_own` | 본인 정산 내역 조회 | seller, supplier, partner | (App.tsx 라우트 + RoleGuard) | 각 역할별 라우트 분리 |
| `settlement.admin` | 전체 정산 관리 | administrator | RoleGuard (App.tsx:340) | Admin 전용 `/dashboard/admin/settlements` |

---

#### Partner 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `partner.view_dashboard` | 파트너 대시보드 접근 | partner | RoleGuard (App.tsx:314) | |
| `partner.manage_links` | 추천 링크 관리 | partner | PartnerLinksPage | |
| `partner.view_analytics` | 파트너 분석 조회 | partner | PartnerAnalyticsPage | |
| `partner.view_settlements` | 파트너 정산 조회 | partner | PartnerSettlementsPage | |

---

#### Notification 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `notification.read` | 알림 읽기 | all (authenticated) | Notification.userId 필드 | 본인 알림만 조회 가능 (추정) |
| `notification.send` | 알림 발송 (시스템) | system/admin | NotificationService | |

---

#### Wishlist 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `wishlist.manage_own` | 본인 위시리스트 관리 | customer | Wishlist.userId 필드 | 본인 위시리스트만 CRUD |

---

#### Analytics 관련 권한

| 권한 키 | 설명 | 필요 역할 | 정의 위치 | 비고 |
|--------|------|---------|----------|------|
| `analytics.view_partner` | 파트너 분석 조회 | partner | PartnerAnalyticsPage | 본인 데이터만 |
| `analytics.admin` | 전체 분석 데이터 조회 | administrator | (추가 조사 필요) | |

---

### 권한 키 앱별 그룹핑 상태

| 앱 후보명 | 권한 키가 앱별로 잘 묶여 있는가? | 다른 앱과 공유하는 권한이 있는가? | 비고 |
|----------|----------------------------|--------------------------|------|
| **Forum** | ✅ 잘 묶임 (Entity 메서드 기반) | 없음 | Forum Entity 내 권한 로직 캡슐화 |
| **Seller/Supplier** | ⚠️ Role 기반만 존재 | 없음 | 세밀한 권한 키 시스템 미구현 |
| **Partner** | ⚠️ Role 기반만 존재 | 없음 | 세밀한 권한 키 시스템 미구현 |
| **Settlement** | ⚠️ Role 기반만 존재 | **✅ 여러 역할이 공유** (seller, supplier, partner, admin) | Settlement는 여러 역할의 공통 기능 |
| **Notification** | ⚠️ userId 기반만 존재 | **✅ 모든 역할이 사용** | 공통 인프라 성격 |
| **Wishlist** | ⚠️ userId 기반만 존재 | 없음 (customer 전용) | |
| **Analytics** | ⚠️ Role 기반만 존재 | **✅ partner, admin** | |

---

### 관찰/발견사항

#### 권한 시스템 관련

1. **권한 키가 앱 단위로 네임스페이스되어 있는가?**
   - ❌ **NO**: 대부분 Role-based access만 사용 (`<RoleGuard role="seller">`)
   - ✅ **Forum만 예외**: Entity 메서드로 세밀한 권한 로직 구현

2. **여러 앱이 동일한 권한 키를 공유하는 경우가 있는가?**
   - ✅ **Settlement**: seller, supplier, partner, admin 모두 사용
   - ✅ **Notification**: 모든 역할이 사용 (공통 인프라)
   - ✅ **Analytics**: partner, admin 사용

3. **앱 삭제 시 관련 권한도 함께 정리할 수 있는 구조인가?**
   - ❌ **NO**: 현재는 Role 기반이므로, 앱 삭제 시 권한 정리 개념 없음
   - Forum처럼 Entity 메서드 기반 권한이라면 Entity 삭제 시 자동으로 권한도 사라짐

4. **역할과 권한의 매핑이 코드/DB 어디에 정의되어 있는가?**
   - **코드**: RoleGuard 컴포넌트, Entity 메서드
   - **DB**: Permission Entity 존재하나 실제 사용 여부 불명

---

## A-4. CPT/ACF 스타일 데이터 구조 및 앱 연관성

### CPT/ACF 시스템 개요

현재 O4O 플랫폼의 CPT/ACF 스타일 구조:

* **CPT 역할**: TypeORM Entity로 구현 (122개 Entity 파일 발견)
* **ACF 역할**: JSONB 또는 별도 메타 테이블 (`metadata` 필드, `PostMeta` Entity 등)
* **관련 문서**: `docs/dev/CPT_ACF_GUIDE.md`, `docs/dev/REGISTRY_ARCHITECTURE.md` (추정)

---

### 앱 후보별 CPT/Entity 목록

#### Forum 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `forum_post` | 게시판 토픽 | id, title, slug, content, type, status, categoryId, authorId, isPinned, isLocked, allowComments, viewCount, commentCount, likeCount, tags, metadata, publishedAt, lastCommentAt, lastCommentBy | `ForumPost.ts` (162라인) | PostType enum: `discussion`, `question`, `announcement`, `poll`, `guide` |
| `forum_comment` | 댓글/답글 | id, postId, content, authorId, parentId, status, likeCount, replyCount, isEdited | `ForumComment.ts` (116라인) | Self-reference (parentId) 지원 |
| `forum_category` | 포럼 카테고리 | id, name, slug, description, color, sortOrder, isActive, requireApproval, accessLevel, postCount, createdBy | `ForumCategory.ts` (100라인) | accessLevel enum: `all`, `member`, `business`, `admin` |
| `forum_tag` | 태그 | id, name, slug, description, color, usageCount, isActive | `ForumTag.ts` (56라인) | |

**외래 키 관계**:
- `ForumPost.authorId` → `User.id` (ManyToOne)
- `ForumPost.categoryId` → `ForumCategory.id` (ManyToOne)
- `ForumComment.postId` → `ForumPost.id` (ManyToOne)
- `ForumComment.authorId` → `User.id` (ManyToOne)
- `ForumComment.parentId` → `ForumComment.id` (ManyToOne, self-reference)

---

#### Dropshipping 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `sellers` | 판매자 | id, userId, businessInfo, status, ... | `Seller.ts` | One-to-One with User |
| `suppliers` | 공급자 | id, userId, businessInfo, status, ... | `Supplier.ts` | One-to-One with User |
| `seller_products` | 판매자 상품 | id, sellerId, productId, ... | `SellerProduct.ts` | |
| `seller_authorizations` | 판매자 승인 | id, supplierId, sellerId, productId, status, ... | `SellerAuthorization.ts` | 승인 워크플로우 |
| `seller_authorization_audit_logs` | 승인 감사 로그 | id, authorizationId, action, ... | `SellerAuthorizationAuditLog.ts` | |

---

#### Partner 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `partners` | 파트너 | id, userId, sellerId, status, tier, referralCode, referralLink, totalEarnings, availableBalance, pendingBalance, paidOut, payoutInfo, totalClicks, totalOrders, conversionRate, ... | `Partner.ts` (411라인, 매우 복잡) | PartnerTier: `bronze`, `silver`, `gold`, `platinum` |
| `commissions` | 수수료 | id, partnerId, productId, orderId, conversionId, referralCode, status, commissionAmount, orderAmount, policyId, holdUntil, ... | `Commission.ts` (259라인) | CommissionStatus: `pending`, `confirmed`, `paid`, `cancelled` |
| `conversion_events` | 전환 이벤트 | id, partnerId, referralCode, orderId, ... | `ConversionEvent.ts` | |
| `referral_clicks` | 추천 클릭 | id, partnerId, referralCode, ... | `ReferralClick.ts` | |
| `commission_policies` | 수수료 정책 | id, name, type, rate, ... | `CommissionPolicy.ts` | |

---

#### Settlement 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `payment_settlements` | 정산 내역 | id, paymentId, recipientType, recipientId, recipientName, amount, currency, fee, tax, netAmount, status, scheduledAt, processedAt, completedAt, bankAccount, transactionId, ... | `PaymentSettlement.ts` (152라인) | RecipientType: `supplier`, `partner`, `platform` |

---

#### Notification 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `notifications` | 알림 | id, userId, channel, type, title, message, metadata, isRead, readAt | `Notification.ts` (105라인) | NotificationChannel: `in_app`, `email`. NotificationType: `order.new`, `order.status_changed`, `settlement.new_pending`, `settlement.paid`, `price.changed`, `stock.low`, `role.approved`, `role.application_submitted`, `custom` |

---

#### Wishlist 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `wishlists` | 위시리스트 | id, userId, productId, notes | `Wishlist.ts` (50라인, 매우 단순) | Unique index: `(userId, productId)` |

---

#### Analytics 관련 Entity

| Entity/테이블명 | 역할 | 주요 필드 | 파일 위치 | 비고 |
|---------------|------|---------|----------|------|
| `analytics_reports` | 분석 리포트 | id, reportType, reportCategory, reportName, status, reportPeriodStart, reportPeriodEnd, generatedBy, summary, userMetrics, systemMetrics, contentMetrics, feedbackMetrics, businessMetrics, reportFilePath, ... | `AnalyticsReport.ts` (389라인, 매우 복잡) | ReportType: `daily`, `weekly`, `monthly`, `custom`. ReportCategory: `user_activity`, `system_performance`, `content_usage`, `feedback_analysis`, `error_analysis`, `business_metrics`, `comprehensive` |

---

### 앱 후보별 ACF/메타 구조

#### Forum 관련 메타/JSONB

| Entity | 필드명 | 타입 | 저장 내용 | 비고 |
|--------|-------|------|----------|------|
| `ForumPost` | `metadata` | JSONB | `Record<string, unknown>` | 확장 가능한 메타 필드 |
| `ForumPost` | `tags` | simple-array | `string[]` | 태그 배열 (ForumTag와 별개) |

---

#### Partner 관련 메타/JSONB

| Entity | 필드명 | 타입 | 저장 내용 | 비고 |
|--------|-------|------|----------|------|
| `Partner` | `profile` | JSON | `{ bio, website, socialMedia, audience, marketingChannels }` | 파트너 프로필 정보 |
| `Partner` | `metrics` | JSON | `{ totalClicks, totalOrders, totalRevenue, totalCommission, conversionRate, averageOrderValue, ... }` | 성과 지표 |
| `Partner` | `payoutInfo` | JSON | `{ method, bankName, accountNumber, accountHolder, paypalEmail, cryptoAddress, currency }` | 출금 정보 |
| `Commission` | `metadata` | JSON | `{ policyCode, policyName, attributionModel, attributionWeight, adjustmentHistory, cancellationReason, ... }` | 수수료 메타데이터 |

---

#### Settlement 관련 메타/JSONB

| Entity | 필드명 | 타입 | 저장 내용 | 비고 |
|--------|-------|------|----------|------|
| `PaymentSettlement` | `bankAccount` | JSONB | `{ bankCode, bankName, accountNumber, holderName }` | 계좌 정보 |
| `PaymentSettlement` | `metadata` | JSONB | `Record<string, any>` | 확장 가능한 메타 필드 |

---

#### Notification 관련 메타/JSONB

| Entity | 필드명 | 타입 | 저장 내용 | 비고 |
|--------|-------|------|----------|------|
| `Notification` | `metadata` | JSONB | `{ orderId, settlementId, productId, ... }` | 알림 관련 추가 데이터 |

---

#### Analytics 관련 메타/JSONB

| Entity | 필드명 | 타입 | 저장 내용 | 비고 |
|--------|-------|------|----------|------|
| `AnalyticsReport` | `summary` | JSON | `{ totalUsers, activeUsers, newUsers, totalSessions, avgSessionDuration, totalPageViews, totalActions, totalFeedback, totalErrors, systemUptime, avgResponseTime, ... }` | 요약 지표 |
| `AnalyticsReport` | `userMetrics` | JSON | `{ demographics, engagement, behavior }` | 사용자 지표 |
| `AnalyticsReport` | `systemMetrics` | JSON | `{ performance, resources, errors }` | 시스템 지표 |
| `AnalyticsReport` | `contentMetrics` | JSON | `{ usage, signage, performance }` | 콘텐츠 지표 |
| `AnalyticsReport` | `feedbackMetrics` | JSON | `{ overview, categories, trends, insights }` | 피드백 지표 |
| `AnalyticsReport` | `businessMetrics` | JSON | `{ conversion, growth, roi }` | 비즈니스 지표 |

---

### 앱 삭제 시 데이터 정리 범위

| 앱 후보명 | 삭제 대상 Entity/테이블 | 관련 메타/JSONB | 연관 데이터 | 비고 |
|----------|---------------------|--------------|-----------|------|
| **Forum** | `forum_post`, `forum_comment`, `forum_category`, `forum_tag` | post.metadata, post.tags | User (authorId), (CASCADE 정책 추가 조사 필요) | |
| **Seller/Supplier** | `sellers`, `suppliers`, `seller_products`, `seller_authorizations`, `seller_authorization_audit_logs` | - | User, Product, Order | **⚠️ 매우 위험**: 핵심 비즈니스 로직 |
| **Partner** | `partners`, `commissions`, `conversion_events`, `referral_clicks`, `commission_policies` | partner.profile, partner.metrics, partner.payoutInfo, commission.metadata | User, Product, Order | **⚠️ 위험**: 정산 데이터 포함 |
| **Settlement** | `payment_settlements` | settlement.bankAccount, settlement.metadata | Payment, User (여러 역할) | **⚠️ 매우 위험**: 금융 데이터 |
| **Notification** | `notifications` | notification.metadata | User (여러 역할) | 비교적 안전 (히스토리 성격) |
| **Wishlist** | `wishlists` | - | User, Product | 안전 (사용자 편의 기능) |
| **Analytics** | `analytics_reports` | 모든 metrics 필드들 | User (generatedBy) | 안전 (리포트 파일만 삭제) |

---

### 관찰/발견사항

#### 데이터 구조 관련

1. **앱별로 Entity가 잘 분리되어 있는가?**
   - ✅ **Forum**: `forum_*` prefix로 명확히 분리
   - ✅ **Partner**: `partners`, `commissions`, `conversion_events`, `referral_clicks` 등 명확히 분리
   - ⚠️ **Seller/Supplier**: 여러 Entity로 분산 (`sellers`, `suppliers`, `seller_products`, `seller_authorizations`, ...) - "Dropshipping" 단일 앱보다는 "Seller App + Supplier App" 분리 고려
   - ✅ **Notification, Wishlist**: 단일 Entity로 단순

2. **여러 앱이 동일한 Entity를 공유하는 경우가 있는가?**
   - ✅ **User**: 모든 앱이 공유 (authorId, userId)
   - ✅ **Product**: Seller, Supplier, Partner, Wishlist가 공유
   - ✅ **Order**: Seller, Supplier, Partner, Settlement가 공유
   - ✅ **Payment**: Settlement가 사용

3. **앱 삭제 시 데이터 정리가 명확하게 가능한가?**
   - ✅ **Forum**: 독립적이므로 삭제 용이 (CASCADE 정책만 확인 필요)
   - ❌ **Seller/Supplier**: 핵심 비즈니스 로직이므로 삭제 불가능
   - ⚠️ **Partner**: 정산 데이터 포함, 삭제 시 주의 필요
   - ❌ **Settlement**: 금융 데이터이므로 삭제 불가능
   - ✅ **Notification**: 히스토리 성격, 삭제 가능
   - ✅ **Wishlist**: 사용자 편의 기능, 삭제 가능
   - ✅ **Analytics**: 리포트 파일만 삭제, 원본 데이터는 유지

4. **외래 키(Foreign Key) CASCADE 정책이 잘 정의되어 있는가?**
   - TypeORM 데코레이터에 `{ onDelete: 'CASCADE' }` 명시적으로 정의된 경우 많음
   - 예: `Partner.user` → `{ onDelete: 'CASCADE' }`
   - 예: `Commission.partner` → `{ onDelete: 'CASCADE' }`
   - ⚠️ Forum Entity는 CASCADE 정책 명시 안 됨 (기본값 사용)

5. **JSONB/메타 필드가 앱 단위로 독립적인가, 아니면 여러 앱이 섞여 있는가?**
   - ✅ **독립적**: Partner, AnalyticsReport 등의 JSONB 필드는 해당 앱에만 속함
   - ✅ **확장 가능**: 대부분 `metadata: Record<string, any>` 형태로 확장 가능하게 설계

---

## A-5. 설정/Feature Flag/환경변수와 앱 의존성

### 설정 시스템 개요

현재 O4O 플랫폼의 설정/플래그 관리 방식:

* **환경변수**: `.env` 파일 (프론트/백엔드 별도)
* **Feature Flag**: 일부 존재 (`ENABLE_PARTNER_SETTLEMENT`, `ENABLE_DROPSHIPPING_CPT_WRITES` 등)
* **런타임 설정**: DB 테이블 `settings` 또는 유사 (추가 조사 필요)

---

### 앱 후보별 설정/플래그 목록

#### Forum 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| `ENABLE_FORUM` | 환경변수 (boolean) | (없음) | 포럼 기능 활성화 여부 | **❌ 미정의** | 추가 필요 |

**사용 위치:**

* **❌ 없음** (프론트/백엔드 모두 미사용)

---

#### Dropshipping 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| `ENABLE_DROPSHIPPING_CPT_WRITES` | 환경변수 (boolean) | `false` | 드롭십 CPT 쓰기 작업 활성화 | `DropshippingCPTController.ts:15` | 현재 false 시 모든 쓰기 작업 차단 |

**사용 위치:**

* 백엔드: `apps/api-server/src/controllers/cpt/DropshippingCPTController.ts`
* 프론트: (조사 필요)

---

#### Partner 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| `ENABLE_PARTNER_SETTLEMENT` | 환경변수 (boolean) | `false` | 파트너 정산 기능 활성화 | `.env.example:64` | PaymentService.ts에서 사용 |

**사용 위치:**

* 백엔드: `apps/api-server/src/services/PaymentService.ts` (정산 시 파트너 수수료 계산 여부)
* 프론트: (조사 필요)

---

#### Notification 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| (없음) | - | - | - | - | 환경변수 없음 (항상 활성) |

---

#### Wishlist 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| (없음) | - | - | - | - | 환경변수 없음 (항상 활성) |

---

#### Analytics 관련 설정

| 설정 키 | 타입 | 기본값 | 설명 | 정의 위치 | 비고 |
|--------|------|-------|------|----------|------|
| `ENABLE_METRICS` | 환경변수 (boolean) | `true` | 메트릭 수집 활성화 | `.env.example:53` | Analytics와 연관성 추정 |

**사용 위치:**

* 백엔드: (조사 필요)

---

### 설정/플래그 재사용 가능성

| 앱 후보명 | 기존 플래그 재사용 가능? | 새로운 플래그 필요 여부 | AppManager 연동 방안 | 비고 |
|----------|---------------------|------------------|------------------|------|
| **Forum** | ❌ 없음 | ✅ `ENABLE_FORUM` 추가 필요 | AppManager가 `app_registry.is_active` → `ENABLE_FORUM` 연동 | |
| **Seller/Supplier** | ✅ `ENABLE_DROPSHIPPING_CPT_WRITES` 존재 | ⚠️ `ENABLE_SELLER`, `ENABLE_SUPPLIER` 분리 고려 | 동일 | 현재는 CPT 쓰기만 제어 |
| **Partner** | ✅ `ENABLE_PARTNER_SETTLEMENT` 존재 | ⚠️ `ENABLE_PARTNER` 전역 플래그 추가 고려 | 동일 | 현재는 정산만 제어 |
| **Settlement** | ❌ 없음 | ⚠️ 필요 여부 검토 | Settlement는 여러 역할의 공통 기능이므로 앱 비활성화 개념 적용 어려움 | |
| **Notification** | ❌ 없음 | ⚠️ `ENABLE_NOTIFICATION` 추가 고려 | 알림은 공통 인프라 성격, 비활성화 시 영향 범위 매우 큼 | |
| **Wishlist** | ❌ 없음 | ✅ `ENABLE_WISHLIST` 추가 필요 | AppManager 연동 | |
| **Analytics** | ✅ `ENABLE_METRICS` 존재 | ⚠️ `ENABLE_ANALYTICS` 명확화 | `ENABLE_METRICS`와 `ENABLE_ANALYTICS` 관계 정리 필요 | |

---

### 관찰/발견사항

#### 설정/플래그 시스템 관련

1. **대부분의 앱 후보가 `ENABLE_{APP}` 형태의 환경변수를 가지고 있는가?**
   - ❌ **NO**: 대부분 없음. 일부만 존재 (`ENABLE_PARTNER_SETTLEMENT`, `ENABLE_DROPSHIPPING_CPT_WRITES`)
   - 앱 비활성화 메커니즘이 체계적으로 구현되지 않음

2. **Feature Flag가 코드 또는 DB 어디에 정의되어 있는가?**
   - **코드**: `.env.example` 파일 + 일부 서비스/컨트롤러에서 `process.env.ENABLE_*` 체크
   - **DB**: (추가 조사 필요)

3. **AppManager와 설정 시스템의 연동 지점이 명확한가?**
   - ❌ **NO**: 현재는 AppManager 개념 자체가 없음
   - 설계 필요: AppManager가 `app_registry.is_active` → 환경변수 동기화 메커니즘

4. **앱 활성/비활성 시 설정값 변경만으로 충분한가, 아니면 추가 로직이 필요한가?**
   - ⚠️ **추가 로직 필요**:
     - 라우트 동적 등록/제거
     - 메뉴/링크 표시/숨김
     - API 엔드포인트 활성/비활성
     - Guard/Middleware 적용
   - 단순 환경변수 토글만으로는 부족

---

## 종합 관찰 및 발견사항

### 앱 후보 전반에 대한 관찰

1. **앱 후보 식별**
   * 총 **7개의 앱 후보** 식별: Forum, Seller/Supplier, Settlement, Partner, Notification, Wishlist, Analytics
   * 각 앱의 독립성 수준:
     - **높음**: Forum (완전 독립, 미사용), Wishlist (단순 독립), Partner (매우 독립적)
     - **중간**: Analytics (리포트 성격)
     - **낮음**: Seller/Supplier (핵심 비즈니스, 분리 어려움), Settlement (여러 역할 공유), Notification (공통 인프라)

2. **라우팅 구조**
   * 앱별 라우트 prefix가 명확한 경우: **4개** (Seller, Supplier, Partner, Settlement-Admin)
   * 여러 경로로 분산된 경우: **1개** (Settlement - 여러 역할)
   * 라우트 미정의: **2개** (Forum, Analytics 일부)
   * **문제점**: 모든 라우트가 `App.tsx` 한 파일에 하드코딩됨 → 동적 등록 메커니즘 필요

3. **권한 시스템**
   * 권한 키가 앱 단위로 잘 그룹핑: **1개** (Forum만 Entity 메서드 기반)
   * 공유 권한: **3개** (Settlement, Notification, Analytics - 여러 역할 사용)
   * **문제점**: 대부분 Role-based만 사용, 세밀한 권한 키 시스템 미구현

4. **데이터 구조**
   * 앱별 Entity 명확히 분리: **3개** (Forum, Partner, Wishlist)
   * 여러 Entity로 분산: **2개** (Seller/Supplier, Partner Commission 시스템)
   * 외래 키 CASCADE 정책 잘 정의: **대부분** (TypeORM 데코레이터 사용)
   * 앱 삭제 시 데이터 정리:
     - **용이**: Forum, Notification, Wishlist, Analytics
     - **위험**: Partner (정산 데이터 포함)
     - **불가능**: Seller/Supplier, Settlement (핵심 비즈니스/금융 데이터)

5. **설정/플래그**
   * `ENABLE_{APP}` 패턴: **2개** (일부만, `ENABLE_PARTNER_SETTLEMENT`, `ENABLE_DROPSHIPPING_CPT_WRITES`)
   * **문제점**: 체계적인 Feature Flag 시스템 미구현, AppManager 연동 개념 없음

---

## 권장사항 및 다음 단계

### 권장사항

1. **라우팅 정리**
   * 라우트 동적 등록 메커니즘 구현 (React Router v6 `<Routes>` 동적 생성)
   * 앱별 라우트 모듈 분리 (`apps/main-site/src/app-routes/forum.routes.tsx` 등)
   * AppManager가 활성 앱의 라우트만 등록

2. **권한 시스템 개선**
   * 세밀한 권한 키 시스템 도입 (`{app}.{resource}.{action}` 네이밍)
   * Forum처럼 Entity 메서드 기반 권한 체크 확대
   * AppManager가 앱 비활성화 시 관련 권한도 자동 비활성화

3. **데이터 구조 정리**
   * 외래 키 CASCADE 정책 명확화 (Forum Entity도 명시적으로 추가)
   * 앱 삭제 시 데이터 정리 절차 문서화
   * "삭제 불가능 앱" 개념 도입 (Seller/Supplier, Settlement는 Core App으로 분류)

4. **설정/플래그 표준화**
   * 모든 앱에 `ENABLE_{APP}` 환경변수 추가
   * AppManager가 `app_registry.is_active` ↔ 환경변수 동기화
   * Feature Flag 중앙 관리 시스템 구현 (코드 + DB 통합)

5. **앱 분류 체계 수립**
   * **Core Apps** (삭제 불가능): Seller, Supplier, Settlement, Notification
   * **Business Apps** (비활성화 가능): Partner, Analytics
   * **Optional Apps** (설치/삭제 가능): Forum, Wishlist
   * 각 분류별 앱 관리 정책 수립

---

### 다음 단계

1. **AM1-B 조사 완료**
   * `forum_current_state.md` 작성 (Forum 상세 조사)

2. **AM2 설계 시작**
   * App manifest v1 스펙 정의
   * `app_registry` 스키마 설계 (is_core, is_active, can_uninstall 등)
   * AppManager 설계 (라우트 동적 등록, 권한 관리, 환경변수 동기화)

3. **AM3 Forum 분리 설계**
   * Forum을 첫 번째 "설치 가능한 앱"으로 만드는 설계
   * Forum App Manifest 작성
   * Forum 라우트 동적 등록 구현
   * Forum 프론트엔드 UI 구현 (현재 Entity만 존재)

---

## 부록

### 조사 방법

* **코드 검색 도구**: Grep, Glob, Read (Claude Code CLI Tools)
* **조사 범위**: apps/main-site, apps/admin-dashboard, apps/api-server
* **조사 기간**: 2025-11-28 (1일)

### 참고 문서

* AM1 조사 요청서: (User의 요청 메시지)
* Forum 상세 조사: `forum_current_state.md`
* 관련 Phase 문서: PD-7 (Notification), R-6-5 (Wishlist), Phase 2.1 (Partner), Phase 4-2 (Settlement)

### 주요 발견 통계

* **총 Entity 파일 수**: 122개
* **총 API 라우트 파일 수**: 70+ 개
* **식별된 앱 후보**: 7개
* **프론트엔드 페이지 파일 수**: 70+ 개 (apps/main-site/src/pages)
* **Forum Entity**: 4개 (ForumPost, ForumComment, ForumCategory, ForumTag)
* **Forum 백엔드 코드**: 612라인 (forumService.ts)
* **Forum 프론트엔드 코드**: **0라인** (미구현)

---

**End of Document**
