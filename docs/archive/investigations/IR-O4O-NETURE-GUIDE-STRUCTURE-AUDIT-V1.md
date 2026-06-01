# IR-O4O-NETURE-GUIDE-STRUCTURE-AUDIT-V1

> Neture 공개 이용 가이드(Guide) 구축을 위한 사전 구조 조사.
> 실제 코드 기준으로 메뉴/역할/공급자 흐름/파트너 구조/AI 기능/Event Offer·Trial 을 전수 점검하고,
> 공개 Guide 가능 범위와 KPA Guide 공통화 가능성을 판정한다. **코드 변경 없음 (조사 only).**

| 항목 | 값 |
|------|------|
| 작성일 | 2026-05-11 |
| 대상 서비스 | services/web-neture + apps/api-server 의 neture 모듈 |
| 비교 기준선 | KPA-Society Guide (canonical reference implementation) |
| 사전 동기화 | `git pull origin main` 완료, working tree 변경 1건(AiContentModal.tsx, 본 조사와 무관) |
| 선행 IR | [IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1](IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1.md) |
| 관련 Freeze | NETURE-PARTNER-CONTRACT-FREEZE-V1, NETURE-DISTRIBUTION-ENGINE-FREEZE-V1, NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3 |

---

## 0. 결론 (요약 먼저)

1. **Neture 의 핵심 정체성은 "공급자 중심의 콘텐츠·계약 기반 유통 허브"** 이며, 일반 쇼핑몰과 달리 매장 실행(KPA/K-Cosmetics)과 분리된 **지원 허브 역할**을 한다. 본 조사로 이 정체성이 코드에서 일관되게 구현되어 있음을 확인했다.
2. **Guide 인프라는 이미 준비 완료**:
   - `@o4o/shared-space-ui` 의 8개 Guide 페이지 컴포넌트 + GuideBlock + GuideEditableSection 가 service-neutral 로 추상화되어 있음.
   - Neture 에 [GuideEditableSection wrapper](../../services/web-neture/src/components/guide/GuideEditableSection.tsx), [guideClient](../../services/web-neture/src/api/guideContent.ts) 가 이미 존재.
   - GuideBlock 은 Neture 내 **8+ 개 페이지에서 이미 사용 중**.
3. **누락된 것은 "콘텐츠(copy)와 wrapper 페이지"** 뿐. copy/neture.ts + pages/guide/* 7~8 개 페이지만 추가하면 KPA Guide 와 동일 골격의 Neture Guide 가 완성된다.
4. **공개 Guide 가능 범위는 분명히 갈린다**:
   - ✅ Public-safe: 플랫폼 소개(O4O), 회원/역할 구조, Forum/Notice, 공급자 가입 안내, Event Offer/Market Trial 개념, AI 운영자/공급자 분석
   - ⚠️ 제한 공개: 공급자 상품 등록 상세, Distribution Tier 정책, Partner Commission
   - ❌ 비공개(미구현/미정): Partner 자동 정산, Trial↔Event Offer 연계, GlycoPharm Event Offer, AiContentModal Neture 통합
5. **dead/legacy 정리는 이미 끝남** — `/manual/*` → `/o4o/*` redirect, ProductCuration 완전 제거, Blog public route 제거 등이 명시적 WO 로 처리됨. Guide 작성 시점에 별도 정리 필요 없음.
6. **다음 작업 우선순위**: Phase 1 (copy/neture.ts + wrapper 페이지) → Phase 2 (공급자 가입 UI 보강) → Phase 3 (Event Offer/Trial 가이드 통합).

---

## 1. 현재 Neture 메뉴 구조 조사

### 1-1. Route 카테고리 분류 (150+ 라우트)

소스: [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx)

| 카테고리 | 개수 | 가드 | 대표 경로 |
|---------|------|------|----------|
| **Public / Landing** | 35+ | None | `/`, `/supplier`, `/partner`, `/contact`, `/terms`, `/privacy` |
| **O4O 플랫폼 소개** | 16 | None | `/o4o`, `/o4o/intro`, `/o4o/concepts`, `/o4o/structure`, `/o4o/principles`, `/o4o/services`, `/o4o/targets/{pharmacy,clinic,salon,optical,dental}`, `/o4o/business-inquiry`, `/o4o/consultation`, `/o4o/channel-map`, `/o4o/channels/{pharmacy,optical,medical,dental}` |
| **Forum / Notice / Content / Resources (공개 읽기)** | 10 | None (write 만 Auth) | `/forum`, `/forum/posts`, `/forum/post/:slug`, `/notices`, `/content`, `/resources` |
| **Market Trial 허브** | 3 | optional auth | `/market-trial`, `/market-trial/my`(auth), `/market-trial/:id` |
| **Store (B2C)** | 7 | None / StoreOwner | `/store/product/:offerId`, `/store/cart`, `/store/orders`, `/store/manage/*` (오너) |
| **Auth pages** | 7 | None | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/qr/:slug` |
| **Supplier Space** | 25+ | SupplierRoute | `/supplier/dashboard`, `/supplier/products*`, `/supplier/orders`, `/supplier/library*`, `/supplier/event-offers`, `/supplier/market-trial*`, `/supplier/b2b-content`, `/supplier/csv-import`, `/supplier/profile`, `/supplier/my-forum` 등 |
| **Partner Space** | 15+ | PartnerRoute | `/partner/dashboard`, `/partner/products`, `/partner/links`, `/partner/settlements`, `/partner/contents*`, `/partner/stores`, `/partner/commissions`, `/partner/promotions` |
| **MyPage** | 3 | implicit Auth | `/mypage`, `/mypage/profile`, `/mypage/settings` (WO-O4O-NETURE-MYPAGE-SPLIT-V1) |
| **Account Sub-space** | 9 | role guard | `/account/supplier/*`, `/account/partner/*` |
| **Workspace (공급자 운영 공통)** | 8+ | SupplierOpsLayout | `/workspace/partners/requests*`, `/workspace/forum*`, `/workspace/hub`, `/workspace/my-content` |
| **Operator Dashboard** | 28+ | OperatorRoute | `/operator/*` (대시보드, 사용자/매장/주문/AI 리포트/포럼/사이니지/가이드 콘텐츠 등) |
| **Admin Dashboard** | 50+ | AdminRoute | `/admin/*` (Operator 권한 + 추가) |
| **Admin Vault (내부 문서)** | 5 | ProtectedRoute(['neture:admin','platform:super_admin']) | `/admin-vault/*` |
| **Legacy Redirect** | 20+ | redirect | `/manual/*` → `/o4o/*`, `/channel/*` → `/o4o/*` |

### 1-2. 글로벌 헤더 메뉴 (모든 사용자)

소스: [services/web-neture/src/config/navigation.ts](../../services/web-neture/src/config/navigation.ts)

| 라벨 | 경로 | 비고 |
|------|------|------|
| Home | `/` | 커뮤니티 홈 (WO-O4O-NETURE-HOME-COMMUNITY-PROMOTION-V1) |
| 유통 참여형 펀딩 | `/market-trial` | Market trial hub |
| Supplier | `/supplier` | 공급자 landing |
| Partner | `/partner` | 파트너 landing |
| Contact Us | `/contact` | 문의 form |
| O4O 플랫폼 소개 | `/o4o` | O4O main (WO-O4O-GLOBAL-MENU-UPDATE-V1) |

→ **공개 메뉴는 단순하고 명확.** 가이드 진입점은 헤더에 미노출 (현재 Guide 컴포넌트는 운영자 가이드 콘텐츠 관리 페이지로만 사용 중).

### 1-3. Supplier 사이드바 (SupplierSpaceLayout)

소스: [services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx](../../services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx)

```
Overview     → Dashboard
Products     → 상품 관리 / 상품 등록 도우미 / CSV Import / B2B 콘텐츠
Orders       → 주문 현황
유통 참여형 펀딩 → 유통 참여형 펀딩 (Market Trial)
Finance      → Partner Commissions
Content      → Library (자료실)
Community    → Forum / 내 포럼
```

### 1-4. Operator 통합 메뉴 (Admin/Operator 공용)

소스: [services/web-neture/src/config/operatorMenuGroups.ts](../../services/web-neture/src/config/operatorMenuGroups.ts) (WO-O4O-OPERATOR-UI-UNIFICATION-V1)

10개 그룹: `dashboard`, `users`, `approvals`, `products`, `stores`, `orders`, `content`, `signage`, `forum`, `analytics`, `system`. 그룹별로 `adminOnly` 플래그로 Admin 전용 항목 표시. **"안내 문구 관리"(`/operator/guide-contents`)** 가 content 그룹에 이미 존재 — 운영자 가이드 콘텐츠 편집 entry point.

### 1-5. Guide 관련 기존 구조 (Neture 측)

| 항목 | 위치 | 상태 |
|------|------|------|
| OperatorGuideContentsPage | [services/web-neture/src/pages/operator/OperatorGuideContentsPage.tsx](../../services/web-neture/src/pages/operator/OperatorGuideContentsPage.tsx) | ✅ 운영자가 LMS 강좌 가이드 콘텐츠 관리하는 페이지 (WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1) |
| GuideEditableSection wrapper | [services/web-neture/src/components/guide/GuideEditableSection.tsx](../../services/web-neture/src/components/guide/GuideEditableSection.tsx) | ✅ shared-space-ui wrapper, `serviceKey='neture'` 고정, `isOperatorOrAbove` 권한 |
| guideClient | [services/web-neture/src/api/guideContent.ts](../../services/web-neture/src/api/guideContent.ts) | ✅ createGuideClient + getAccessToken 주입 |
| SellerQRGuidePage | [services/web-neture/src/pages/SellerQRGuidePage.tsx](../../services/web-neture/src/pages/SellerQRGuidePage.tsx) | ✅ QR 배치 문안 가이드 (공개) — WO-NETURE-O4O-SELLER-ENABLEMENT-MASTER-V1 |
| GuideBlock 적용 | 8+ 개 페이지 | ✅ MyParticipationsPage, BrandManagementPage, ForumDeleteRequestsPage, OperatorProductApprovalPage, StoreOrdersPage, SupplierEventOfferPage, SupplierLibraryPage, SupplierProductCreatePage 등 |
| **공개 사용자용 Guide 페이지** | 없음 | ❌ `/guide/intro` `/guide/usage` `/guide/features` 같은 KPA 패턴 페이지 미존재 |

> **핵심 발견**: Guide *인프라*(컴포넌트·클라이언트·권한·DB API)는 이미 Neture 에서 잘 작동. 빠진 것은 *사용자용 공개 가이드 페이지(IA + copy)* 뿐.

### 1-6. Dead / Placeholder 정리

| 영역 | 상태 | WO Reference |
|------|------|-------------|
| `/manual/*` | 🔴 Legacy redirect | `/o4o/*` 으로 흡수 (WO-O4O-ABOUT-URL-SEMANTIC-ALIGNMENT-V1) |
| `/channel/*` | 🔴 Legacy redirect | `/o4o/*` 으로 흡수 |
| ProductCurationPage | 🔴 완전 제거 | WO-NETURE-CURATION-PHASE3-FULL-REMOVAL-V1 |
| `/admin/curation`, `/admin/supply` | 🔴 제거 | WO-NETURE-OPERATOR-SUPPLY-MENU-REMOVE-V1 |
| Neture 블로그 public route | 🔴 제거 | WO-O4O-NETURE-BLOG-RETIRE-V1 (canonical: Forum + Content + AI editor) |
| Mock data 페이지 | ⚠️ PromotionsPage (`TODO: API 연동 필요`) | 의도적 placeholder, 후속 WO 필요 |

→ **추가 정리 필요한 dead code 없음.** Legacy 는 모두 명시적 WO 로 redirect/제거 처리됨.

---

## 2. 실제 사용자 역할 구조 조사

소스: [services/web-neture/src/components/auth/RoleGuard.tsx](../../services/web-neture/src/components/auth/RoleGuard.tsx)

### 2-1. NETURE_ROLES 정의

```typescript
NETURE_ROLES = {
  PLATFORM_SUPER_ADMIN: 'platform:super_admin',
  ADMIN:                'neture:admin',
  OPERATOR:             'neture:operator',
  SUPPLIER:             'neture:supplier',
  PARTNER:              'neture:partner',
  SELLER:               'neture:seller',
}
```

Legacy 역할(`supplier`, `partner`, `seller` — prefix 없음)도 SUPPLIER_ROLES 집합에 포함되어 호환 유지.

### 2-2. 역할별 실제 접근 영역

| 역할 | 진입 가능 영역 | 핵심 기능 | Guide 대상 적합도 |
|------|---------------|----------|-------------------|
| **Guest (비로그인)** | 공개 35+ 라우트 (`/`, `/o4o/*`, `/forum 읽기`, `/market-trial 읽기`, `/supplier`(landing), `/partner`(landing), `/contact`, `/terms`, `/privacy`, `/notices`, `/content`, `/resources`, `/store/product/:id`) | 플랫폼 둘러보기, 콘텐츠 읽기, 가입 신청 | ✅ **최우선 Guide 대상** |
| **Supplier (`neture:supplier`)** | `/supplier/*`, `/account/supplier/*`, `/workspace/*`, `/mypage/*` | 상품 등록·관리, B2B 콘텐츠, Event Offer 제안, Market Trial 생성, 자료실, 파트너 커미션 조회, 프로필 관리 | ✅ **공급자 Guide 대상** |
| **Partner (`neture:partner`)** | `/partner/*`, `/account/partner/*`, `/mypage/*` | 콘텐츠 제작, 레퍼럴 링크, 매장·상품 풀 탐색, 커미션 조회 | ⚠️ 일부 미완성 (PromotionsPage placeholder), Guide 가능하나 범위 제한 |
| **Seller (`neture:seller`)** | `/store/manage/*`, `/seller/overview/*`, `/seller/qr-guide` | 매장 운영 (sellerships), QR 가이드 | ⚠️ 별도 매장 흐름 (KPA/K-Cos 와 겹침), Guide 별도 처리 권장 |
| **Operator (`neture:operator`)** | `/operator/*`, MyPage | 사용자/매장/주문 모니터링, AI 운영 리포트, 가이드 콘텐츠 편집, 포럼 관리 | ⚠️ **내부용 Guide** (공개 부적합) |
| **Admin (`neture:admin`)** | `/admin/*`, `/admin-vault/*`, Operator 권한 + 추가 | 시스템 설정, 역할 관리, 카탈로그 import, 마스터 관리, 운영자 관리 | ❌ **비공개** |

→ **Public Guide 핵심 대상은 Guest + Supplier + Partner 3 역할.**

---

## 3. 공급자 흐름 조사

소스: [supplier-management.controller.ts](../../apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts), [supplier.service.ts](../../apps/api-server/src/modules/neture/services/supplier.service.ts), [services/web-neture/src/pages/supplier/](../../services/web-neture/src/pages/supplier/) (21개 페이지)

### 3-1. 공급자 가입/승인 흐름 (코드 기준)

```
1. POST /api/v1/neture/supplier/register
   └─ Body: { name, slug, contactEmail }
   └─ NetureSupplier.status = PENDING
   └─ organizations 테이블에 bridge 생성
   └─ ServiceMembership(status=inactive) 연결

2. Operator/Admin 승인
   └─ approveSupplier(supplierId, approvedByUserId)
   └─ status: PENDING → ACTIVE
   └─ ServiceMembership.status = active
   └─ Role 'supplier' 할당 (WO-NETURE-ROLE-NORMALIZATION-V1)

3. 거절 시
   └─ status: PENDING → REJECTED
   └─ rejectedReason 기록, role 제거
```

⚠️ **공급자 가입 폼 UI 미구현** — `POST /api/v1/neture/supplier/register` API 만 존재하고 web-neture 에 가입 form 페이지 없음. 외부 시스템 또는 관리자 수동 등록에 의존.

→ Guide 작성 시 **"가입 신청은 Contact / Business Inquiry 통해 진행"** 으로 안내해야 함.

### 3-2. 상품 등록 흐름

페이지: [SupplierProductCreatePage.tsx](../../services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx), [SupplierProductImportPage.tsx](../../services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx), [SupplierProductsPage.tsx](../../services/web-neture/src/pages/supplier/SupplierProductsPage.tsx)

**주요 입력 필드**:

| 필드 | 의미 | 비고 |
|------|------|------|
| barcode (GTIN) | ProductMaster auto-resolve key | 동일 barcode → 동일 master, master:offer = 1:N |
| name, brandName, categoryId | 기본 정보 | |
| distributionType | `PUBLIC` / `SERVICE` / `PRIVATE` | NETURE-DISTRIBUTION-ENGINE-FREEZE-V1 |
| serviceKeys[] | 공급 대상 서비스 | neture, glycopharm 등 |
| priceGeneral / priceGold / pricePlatinum | 가격 등급 | 등급별 차등 |
| consumerShortDescription, consumerDetailDescription | B2C 설명 (HTML) | RichTextEditor |
| businessShortDescription, businessDetailDescription | B2B 설명 (HTML) | 별도 Drawer (WO-NETURE-B2B-CONTENT-MANAGEMENT-V1) |

**외부 상품 정보 활용 — Import Assistant**:
- 자체 파서 [services/web-neture/src/lib/product-import/parser.ts](../../services/web-neture/src/lib/product-import/parser.ts) — 정규식 + DOM 파싱 (LLM 미사용)
- `/api/ai/url-to-blocks` 미사용

### 3-3. 상품 승인 다층 구조

```
Layer 1: SupplierProductOffer.approvalStatus
  PENDING (초안)
  → APPROVED (operator 품질 검수 통과, 유통 가능)
  → REJECTED

Layer 2 (SERVICE tier 만): OfferServiceApproval
  PENDING / APPROVED / REJECTED / REVOKED
  → 각 서비스(KPA, K-Cos)별 상품 노출 승인
```

### 3-4. 공급자 콘텐츠 운영

| 영역 | 페이지 | 상태 |
|------|--------|------|
| 자료실 | SupplierLibraryPage, SupplierLibraryFormPage | ✅ CRUD 완성 |
| 포럼 | MyForumDashboardPage, RequestCategoryPage | 🟡 요청 조회 OK, 삭제 승인 흐름 backend 미완성 |
| B2B 콘텐츠 | SupplierB2BContentPage | ✅ B2C 폴백 + B2B 별도 관리 |
| AI 콘텐츠 자동 생성 | (없음) | ❌ AiContentModal 미통합 (§7 참조) |

### 3-5. 공급자 대시보드 (SupplierDashboardPage 8-Block Copilot)

소스: [neture.service.ts](../../apps/api-server/src/modules/neture/neture.service.ts) `getSupplierDashboardSummary()` + `getSupplierDashboardAiInsight()`

WO-O4O-SUPPLIER-COPILOT-DASHBOARD-V1:
1. 공급자 KPI (총 요청/승인/거절/대기)
2. AI 공급자 요약 (LLM → Rule-based fallback)
3. 상품 성과
4. 매장 확산
5. AI 상품 분석
6. 인기 상품
7. 성장 상품 (Emerald)
8. 추천 전략 (Violet, AI 액션)

### 3-6. 공급자 핵심 차별화 포인트 (코드에서 단서)

기준선 [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) 4 Layer Gate:

```
Layer 1: Supplier Gate (ACTIVE 여부 검증)
Layer 2: Offer ↔ ProductMaster Gate (barcode UNIQUE, 단일 master 생성 파이프라인)
Layer 3: Distribution Gate (Tier별 확산 정책, allowedSellerIds)
Layer 4: Order Gate (DB 가격 재조회, quantity 트랜잭션 검증)
```

**기존 쇼핑몰과의 차별**:
- ✅ **콘텐츠 기반 유통**: B2B/B2C 콘텐츠 분리, AI 콘텐츠 보조 (KPA 측), Forum/Library 통합
- ✅ **공급자 주도 의사결정**: 공급자가 distributionType / serviceKeys / Event Offer / Trial 직접 제안
- ✅ **다층 승인**: 가입 승인 → 상품 품질 승인 → 서비스별 노출 승인 → 계약 승인 (단계적 신뢰)
- ✅ **오프라인 실행 연결**: Market Trial 의 `salesScenarioContent`(진열·고객안내·할인·기대효과), StoreSignagePage, QR 매장 배치
- ✅ **계약 기반 협력**: neture_seller_partner_contracts (commission_rate 스냅샷), Active 계약 unique 보장

### 3-7. 미구현/제약 사항

| 항목 | 상태 |
|------|------|
| 공급자 가입 UI | ❌ 미구현 (API only) |
| 주문 현황 상세 페이지 | ⚠️ SupplierOrdersPage 존재, 실 구현 미확인 |
| 정산 자동화 (Payout) | ❌ commission_rate 저장만, NETURE-PARTNER-CONTRACT-FREEZE-V1 의도적 미구현 |
| AI 콘텐츠 통합 (AiContentModal) | ❌ 미통합 (§7 참조) |
| 포럼 카테고리 삭제 승인 backend | 🟡 frontend 요청만 존재 |

---

## 4. 파트너 구조 조사

소스: [PartnerApplication.ts](../../apps/api-server/src/modules/partner/entities/PartnerApplication.ts), [partner-application.routes.ts](../../apps/api-server/src/modules/partner/partner-application.routes.ts), [services/web-neture/src/pages/partner/](../../services/web-neture/src/pages/partner/) (13 페이지)

### 4-1. 파트너 정의 (Neture Partner = 공급자 제품의 마케팅 협력자)

- 공급자(Supplier)와 **독립적인 1:N 계약 관계** (`neture_seller_partner_contracts`)
- Commission 기반 보상 (Affiliate 구조)
- 콘텐츠(text/image/link) + 이벤트(region/period) + Referral Link 기반 홍보

### 4-2. 파트너 가입 경로 (3 경로 공존)

| 경로 | 인증 | 상태 |
|------|------|------|
| **공개 파트너 신청** `POST /api/v1/partner/applications` | None (공개) | ✅ 구현. 업체명/사업자번호/담당자/이메일/희망서비스/메시지 입력. 응답 `{ status: 'submitted' }` only (승인 흐름 별도) |
| **파트너십 요청** `/partners/requests/create` | Auth | ✅ 구현. 더 상세한 매장 제안 (sellerName, storeUrl, period, revenueStructure, promotionChannels, 상품 2개) |
| **모집 공고 신청** (`neture_partner_applications`) | Auth | ✅ DB 모델 + API. recruitment_id 기반 신청, status: pending → approved → rejected. Unique(recruitment_id, partner_id) |

→ **3 경로의 운영적 차이**: 공개 신청은 lead 수집 only (status 필드 없음), 파트너십 요청은 매장-공급자 매칭 협상용, 모집 공고는 SPO 단위 affiliate 매칭. **Guide 작성 시 3 경로 명확히 구분 필요.**

### 4-3. 파트너 핵심 기능

| 기능 | API | Frontend | 구현 상태 |
|------|-----|----------|----------|
| Overview Dashboard | `GET /api/v1/partner/overview` | PartnerOverviewPage | ✅ 완성 (KPI: activeContentCount, activeEventCount, status). **"매출/성과 금지" 명시** |
| 콘텐츠 (text/image/link) | `GET/POST/PATCH /api/v1/partner/content` | PartnerContentsPage | ⚠️ API 완성, Frontend 는 mock data 기반 |
| 이벤트 (region/period 홍보 조건) | `GET/POST/PATCH /api/v1/partner/events` | PromotionsPage | ⚠️ API 완성, Frontend 는 `TODO: API 연동 필요` placeholder |
| 홍보 대상 (PartnerTarget) | `GET /api/v1/partner/targets` | Read-only | ✅ Read only, 시스템 할당 |
| Commission 조회 | `GET /commissions` (`partnerCommissionApi`) | SettlementsPage | ✅ 완성 (KPI, 목록, 상세, 상태 필터) |
| Referral Link | `partnerAffiliateApi` | ReferralLinksPage + ReferralLinkModal | ✅ 완성 (Product pool 조회 + 고유 링크 생성) |
| Content Linking (대시보드 아이템) | `addItem/getItems/linkContent/...` | PartnerOverviewPage modal | ✅ 완성 (WO-PARTNER-CONTENT-LINK-PHASE1-V1) |
| **자동 정산 (Payout)** | (미구현) | (미구현) | ❌ NETURE-PARTNER-CONTRACT-FREEZE-V1 의도적 미구현 |

### 4-4. 파트너 계약 (NETURE-PARTNER-CONTRACT-FREEZE-V1)

```
neture_seller_partner_contracts:
  seller_id, partner_id, recruitment_id, application_id
  commission_rate (decimal, 스냅샷 — 변경 불가, 신규 계약으로만 변경)
  contract_status: active | terminated | expired
  Partial Unique: (seller_id, partner_id) WHERE status = 'active'
  Foreign Key 없음 (Neture 독립 패턴)
```

권한:
- Seller terminate: 해당 seller 만
- Partner terminate: 해당 partner 만
- Commission 변경: Seller 만 (active 종료 → 새 계약)
- 조회: 각자 본인 것만

### 4-5. 결론 (파트너가 실제로 하는 일)

✅ **완전 구현**: 콘텐츠 CRUD, Referral Link, Content Linking, Commission 조회, 계약 관리
🟡 **부분 구현**: 이벤트(API 만, UI placeholder), Frontend 일부 mock data
❌ **미구현**: 자동 정산, 매출/전환 측정, 성과 분석

→ **Guide 가능 영역**: 가입 경로 3종, 콘텐츠/Referral/Commission 사용법
→ **Guide 보류 영역**: 이벤트 운영(UI 미완성), 자동 정산 일정/금액 계산

---

## 5. Product 구조 조사

### 5-1. 핵심 엔티티 관계

```
ProductMaster (barcode UNIQUE)
   ↑ N:1
SupplierProductOffer (SPO)
   ├ approvalStatus: PENDING/APPROVED/REJECTED
   ├ distributionType: PUBLIC/SERVICE/PRIVATE
   ├ serviceKeys[]
   ├ priceGeneral/Gold/Platinum
   └ allowedSellerIds[] (PRIVATE 만)
       ↓ 1:N
OrganizationProductListing (조직별 노출)
   ├ status: pending/approved/rejected/canceled
   ├ Event Offer 필드: start_at, end_at, total/per_store/per_order_limit
   └ is_active (관리자 활성화 별도)
```

### 5-2. AI 상품 정보 생성

| 기능 | 위치 | 상태 |
|------|------|------|
| AI 상품 description 자동 생성 (KPA 패턴) | productAiContent.ts (KPA) | ✅ KPA, ❌ Neture 미적용 |
| Import Assistant URL 파싱 | parser.ts | ✅ Neture 자체 구현 (LLM 미사용) |
| AiContentModal 통합 | (없음) | ❌ Neture 미적용 (§7 참조) |

### 5-3. 외부 상품 정보 활용

- **bar code 기반 ProductMaster 자동 해석** — `resolveOrCreateMaster()` 단일 파이프라인
- 외부 masterId 직접 주입 금지 (WO-NETURE-LAYER2-MASTER-PIPELINE-ENFORCEMENT-V1)
- 동일 barcode 의 여러 공급자 offer 가능, master 공유

### 5-4. 콘텐츠 연결 / Event Offer / Trial 연결

| 연결 | 상태 |
|------|------|
| 상품 ↔ Forum | ✅ 구현 (Forum post 작성 시 product 참조) |
| 상품 ↔ Blog Article | ❌ 미구현 |
| 상품 ↔ Event Offer | ✅ 완전 (SupplierProductOffer → OrganizationProductListing → Event Offer 컬럼) |
| 상품 ↔ Market Trial | 🟡 부분 (Trial 의 `outcomeSnapshot` 에 product 정보, 직접 FK 없음) |

→ **Guide 작성 가능 수준**: 상품 등록 → master 자동 해석 → 가격 등급 → 유통 정책 선택 → Event Offer 제안까지 명확히 설명 가능. Blog 추천 연결은 미구현이므로 가이드 제외.

---

## 6. Event Offer / Market Trial 구조 조사

### 6-1. Event Offer (이벤트 오퍼)

소스: [event-offer.service.ts](../../apps/api-server/src/routes/kpa/services/event-offer.service.ts), Migration `20260906100000-AddEventOfferColumnsToListings`

**상태 머신**:
```
DB status: pending | approved | rejected | canceled
runtime status (resolveEventStatus):
  approved + start_at > now    → upcoming
  approved + now ∈ [start, end] + quantity > 0  → active
  approved + total_quantity ≤ 0 → sold_out
  approved + end_at < now      → ended
```

**서비스별 Event Offer 구현 매트릭스**:

| 서비스 | service_key | 매장 연결 | 상태 |
|--------|------------|---------|------|
| KPA Society | `kpa-groupbuy` | SERVICE_KEYS.KPA | ✅ Production (참여→매장 상품 등록 자동 연결) |
| K-Cosmetics | `k-cosmetics-event-offer` | SERVICE_KEYS.K_COSMETICS | ✅ Production |
| Neture | `neture-event-offer` | 미연결 (의도적 — Neture 는 허브) | ✅ Production (지원 허브 only) |
| GlycoPharm | (미정의) | - | ❌ 미구현 |

**Neture Event Offer 라우트** (전체 인증 required):
- `GET /api/v1/neture/event-offers` / `/enriched` / `/:id`
- `POST /api/v1/neture/event-offers/:id/participate`
- `POST /api/v1/neture/supplier/event-offer-proposals` — **다중 서비스 동시 제안** (KPA + K-Cos), 부분 실패 허용 (WO-O4O-EVENT-OFFER-MULTI-SERVICE-PROPOSAL-V1)

### 6-2. Market Trial (유통 참여형 펀딩)

소스: [marketTrialController.ts](../../apps/api-server/src/controllers/market-trial/marketTrialController.ts)

**상태 머신**:
```
DRAFT → SUBMITTED → RECRUITING → (FULFILLED | CLOSED)
```

**핵심 필드**:
- `title`, `oneLiner`, `videoUrl`, `description`
- `outcomeSnapshot` — 참여 결과 (product/cash)
- `maxParticipants`, `fundingStartAt`, `fundingEndAt`, `trialPeriodDays`
- `targetAmount`, `trialUnitPrice`, `rewardRate`
- `salesScenarioContent` — **4 섹션** (진열 위치, 고객 안내멘트, 할인/프로모션, 기대 효과)

**역할 분담**:
- 공급자: Trial 초안 작성 → 제출 (`PATCH /api/market-trial/:id/submit`)
- Operator: 승인 (RECRUITING 진입)
- 약국(또는 매장): 참여 신청 → 정산 선택 (제품/현금) (WO-MARKET-TRIAL-PHASE2-PARTICIPANT-DASHBOARD-AND-SETTLEMENT-STATE-V1)

**Forum 연결**: Trial 의 `forumPostId` (WO-MARKET-TRIAL-KPA-DETAIL-AND-FORUM-DEEP-LINK-V1)

### 6-3. 공개 범위 판정 (Event Offer / Trial)

| 영역 | Guide 공개 가능성 | 비고 |
|------|------------------|------|
| Event Offer 기본 개념 / 상태 머신 | ✅ Public-safe | EVENT-OFFER-COMMON-DOMAIN-V1 기반 |
| 서비스별 적용 차이 (KPA vs K-Cos vs Neture) | ✅ Public-safe | EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1 |
| 공급자 다중 서비스 제안 경로 | ✅ Public-safe | UX 안내 중심 |
| Market Trial 참여 모델 + 정산 선택 | ✅ Public-safe | 사용자 관점 안내 |
| GlycoPharm Event Offer | ❌ 비공개 | 미구현 |
| Event Offer ↔ Blog 추천 연결 | ❌ 비공개 | 미구현 |
| SELECT FOR UPDATE 동시성 처리 | ❌ 비공개 | 내부 구현 |
| Trial 정산 계산 알고리즘 | ⚠️ 제한 공개 | Phase2 진행 중, 변경 가능성 |
| Commission/수수료 구조 | ❌ 비공개 | 미정의 |

---

## 7. AI 콘텐츠 기능 조사

선행 IR [IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1](IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1.md) 가 AiContentModal 의 7 outputType 백엔드 지원(`product_detail`, `blog`, `pop`, `summary`, `title_suggest`, `store_qr`, `store_sns`) 을 이미 확인. 본 절은 **Neture 측 사용 현황** 만 추가 조사.

### 7-1. Neture AiContentModal 사용 현황

**결과: 모든 페이지에서 미사용.** RichTextEditor 만 마운트되어 텍스트 편집 기능만 제공.

| 페이지 | RichTextEditor | showStoreSave | showCommunitySave | aiRequestHeaders |
|--------|----------------|---------------|-------------------|------------------|
| SupplierProductCreatePage.tsx (Step 3) | ✅ | ❌ false | ❌ false | ❌ none |
| ProductDetailDrawer.tsx | ✅ | ❌ | ❌ | ❌ |
| B2BContentDrawer.tsx | ✅ | ❌ | ❌ | ❌ |
| SupplierLibraryFormPage.tsx | ✅ | ❌ | ❌ | ❌ |
| SupplierTrialCreatePage.tsx | ✅ | ❌ | ❌ | ❌ |
| SupplierProductImportPage.tsx | ✅ | ❌ | ❌ | ❌ |
| ForumWritePage.tsx (Neture) | ✅ | ❌ | ❌ | ❌ |

→ **의도적 비활성화** 상태로 추정. B2B/공급자 중심 정확한 정보 입력 우선.

### 7-2. Neture 전용 AI 기능

| 서비스 | 위치 | 용도 | 상태 |
|--------|------|------|------|
| OperatorAiActionService | [apps/api-server/src/modules/neture/services/operator-ai-action.service.ts](../../apps/api-server/src/modules/neture/services/operator-ai-action.service.ts) | 운영자 Dashboard 액션 추천 (Rule + LLM 3-tier) | ✅ Beta |
| OperatorAiLlmService | [apps/api-server/src/modules/neture/services/operator-ai-llm.service.ts](../../apps/api-server/src/modules/neture/services/operator-ai-llm.service.ts) | LLM 기반 운영자 추천 | ✅ Beta |
| SupplierCopilotService | [apps/api-server/src/modules/neture/services/supplier-copilot.service.ts](../../apps/api-server/src/modules/neture/services/supplier-copilot.service.ts) | 공급자 KPI/성과 분석 | ✅ Production (LLM 미사용, 순수 데이터 쿼리) |
| URL 파싱 | [services/web-neture/src/lib/product-import/parser.ts](../../services/web-neture/src/lib/product-import/parser.ts) | 외부 URL → 상품 정보 추출 | ✅ Production (LLM 미사용, 정규식+DOM) |

### 7-3. Neture AI 기능별 Guide 작성 가능 매트릭스

| AI 기능 | 사용 가능 | Production 안정성 | Guide 작성 가능 |
|---------|----------|-------------------|----------------|
| 상품 설명 AI 생성 (product_detail) | ❌ | - | ❌ (미통합) |
| 블로그/POP/QR 텍스트 AI | ❌ | - | ❌ (미통합) |
| 제목 추천 AI | ❌ | - | ❌ |
| URL → 콘텐츠 변환 | ⚠️ 자체 파서만 | Beta | 🟡 제한 공개 (Import Assistant 사용법) |
| 운영자 액션 추천 | ⚠️ | Beta | ❌ (내부용) |
| 공급자 KPI 분석 (Copilot Dashboard) | ✅ | Production | ✅ 공급자 Guide 가능 |

---

## 8. 공개 Guide 대상 범위 판정

### 8-1. 4 단계 분류

| 분류 | 영역 |
|------|------|
| ✅ **공개 Guide 가능** | (a) O4O 플랫폼 소개 (목적/구조/철학/타겟/채널), (b) 회원/역할 구조, (c) Forum/Notice/Content/Resources 사용법, (d) 공급자 가입 경로 안내, (e) 공급자 상품 등록 (barcode/master/유통정책/가격등급), (f) 공급자 B2B 콘텐츠 작성, (g) 공급자 자료실, (h) 파트너 가입 경로(3종), (i) 파트너 콘텐츠/Referral Link 사용법, (j) Event Offer 개념과 매장 실행 흐름, (k) Market Trial 참여형 펀딩 구조, (l) 공급자 다중 서비스 제안, (m) Copilot Dashboard 활용, (n) Seller QR 가이드 |
| ⚠️ **제한적 Guide 가능** | (1) Distribution Tier 3단계 정책(공급자 입장 설명 가능, 운영 정책은 내부), (2) Partner Commission 조회(자동 정산 미구현 명시 필요), (3) Market Trial 정산 계산(Phase2 진행 중 명시), (4) Import Assistant URL 파싱(LLM 미사용 명시), (5) Event Offer 다중 서비스 제안 UX(진행 중 명시), (6) Trial 의 salesScenarioContent 작성법 |
| 🔒 **내부용** | (1) Operator/Admin Dashboard 상세, (2) Admin Vault, (3) SQL/DB 구조, (4) SELECT FOR UPDATE 동시성, (5) Service Key 매핑 내부 로직, (6) Operator AI 액션 추천 알고리즘 |
| ❌ **미구현/비공개** | (1) GlycoPharm Event Offer, (2) Neture 자동 정산 (Payout), (3) Trial ↔ Event Offer 연계, (4) Event Offer ↔ Blog Article 추천, (5) AiContentModal Neture 통합, (6) 공급자 가입 폼 UI (현재 API only), (7) PartnerEvent UI (placeholder) |

### 8-2. dead/legacy 정리 필요 영역 — **없음**

모든 legacy 는 명시적 WO 로 redirect/제거 완료. Guide 작성 시점에 별도 정리 작업 불필요.

---

## 9. Neture Guide IA(Information Architecture) 초안

KPA Guide 패턴 (8 페이지 구조) 을 그대로 따르되, Neture 정체성에 맞춰 카테고리 조정.

### 9-1. URL 패턴 (KPA 패턴 그대로)

```
/guide                           — Guide Home (카드 그리드)
/guide/intro                     — Neture 개요
/guide/intro/structure           — 공급자·운영자·매장 3자 구조 (KPA 와 유사, props 변경)
/guide/intro/neture              — Neture 의 위치/역할 (KPA 의 /intro/kpa 대응, props 신규)
/guide/intro/operation           — 운영자·매장·커뮤니티 운영 구조 (props 변경)
/guide/intro/concept             — O4O 핵심 개념: 소규모 사업자 연대 (props 변경 또는 그대로)
/guide/usage                     — Neture 사용 흐름 (가입→상품등록→유통정책→이벤트제안)
/guide/features                  — Neture 기능 카테고리
/guide/features/supplier-onboarding   — 공급자 가입 안내
/guide/features/product-registration  — 상품 등록 & Master 자동 해석
/guide/features/b2b-content           — B2B 콘텐츠 작성
/guide/features/event-offer           — Event Offer 제안 (다중 서비스)
/guide/features/market-trial          — Market Trial 작성 & 운영
/guide/features/partner-program       — 파트너 가입 (3 경로)
/guide/features/forum-resources       — Forum & 자료실 사용법
/guide/features/copilot-dashboard     — 공급자 Copilot 활용
```

### 9-2. Home 카드 구조 (Neture Guide Home 신규 카드)

| 카드 | 대상 | 진입 경로 |
|------|------|----------|
| **Neture 둘러보기** | Guest | `/guide/intro` |
| **공급자 시작하기** | Supplier 지망 | `/guide/features/supplier-onboarding` |
| **상품 등록 & 유통** | Supplier | `/guide/features/product-registration` |
| **Event Offer 제안하기** | Supplier | `/guide/features/event-offer` |
| **유통 참여형 펀딩 (Market Trial)** | Supplier / 참여자 | `/guide/features/market-trial` |
| **파트너로 협력하기** | Partner 지망 | `/guide/features/partner-program` |
| **Forum & 자료실** | 모든 사용자 | `/guide/features/forum-resources` |
| **공급자 Copilot Dashboard** | Active Supplier | `/guide/features/copilot-dashboard` |

### 9-3. 공급자 중심 핵심 가치 (Guide 메시지 톤)

코드에서 일관되게 발견되는 메시지:
1. **콘텐츠 기반 유통** — 단순 상품 노출이 아닌 B2B/B2C 콘텐츠 + Forum + Library 통합 운영
2. **공급자 주도 의사결정** — distributionType, serviceKeys, Event Offer/Trial 제안권을 공급자에게
3. **다층 신뢰 모델** — 가입 → 상품 → 서비스 노출 → 계약의 단계적 승인
4. **오프라인 실행 연결** — 매장 진열·고객안내·할인·기대효과까지 시나리오화
5. **계약 기반 1:N 협력** — Active 계약 unique, commission_rate 스냅샷, 독립적 종료권

→ Guide 작성 시 이 5가지를 반복 강조해야 함.

---

## 10. KPA Guide 공통화 가능 범위

### 10-1. 즉시 재사용 가능 (코드 변경 0)

| 컴포넌트 | 위치 | 적용 방식 |
|---------|------|----------|
| GuideBlock | `@o4o/shared-space-ui` | 그대로 사용 (이미 Neture 8+ 페이지 적용 중) |
| GuideEditableSection | shared-space-ui + Neture wrapper | Neture wrapper [components/guide/GuideEditableSection.tsx](../../services/web-neture/src/components/guide/GuideEditableSection.tsx) 이미 존재 |
| createGuideClient | shared-space-ui | Neture [api/guideContent.ts](../../services/web-neture/src/api/guideContent.ts) 이미 존재 |
| 8개 Guide 페이지 컴포넌트 | shared-space-ui/src/guide/ | service-neutral, props 만 주입 |
| 스타일/레이아웃 | shared-space-ui/src/guide/styles.ts | 그대로 사용 (heroStyles, sectionStyles, cardStyles, bottomNavStyles) |
| GuideTextRenderer 타입 | shared-space-ui/src/guide/types.ts | 모든 페이지에서 지원 |

### 10-2. Props 만 변경하면 재사용 (컴포넌트 코드 변경 0)

| 컴포넌트 | 신규 props 파일 | 작업량 |
|---------|---------------|--------|
| GuideIntroPage | `copy/neture.ts` → `netureGuideIntroProps` | 중간 (콘텐츠 작성) |
| GuideIntroStructurePage | 동일 파일 | 중간 |
| GuideIntroOperationPage | 동일 파일 | 중간 |
| GuideIntroConceptPage | 동일 파일 | 중간 |
| GuideUsagePage | 동일 파일 | 중간 |
| GuideFeaturesPage | 동일 파일 | 중간 |
| GuideFeatureManualPage × 8 | 동일 파일 (기능별 props) | 큼 (각 기능 매뉴얼) |

### 10-3. 신규 필요 (Neture 전용)

| 항목 | 위치 | 이유 |
|------|------|------|
| `GuideIntroNeturePageProps` 타입 | shared-space-ui/src/guide/types.ts | KPA 의 `GuideIntroKpaPageProps` 대응. Neture 의 위치/역할 설명용 |
| `pages/guide/*` wrapper (7~8개) | services/web-neture/src/pages/guide/ | 각 페이지 20~30줄 보일러플레이트 |
| App.tsx 라우팅 등록 | services/web-neture/src/App.tsx | 8 라우트 추가 |

### 10-4. 예상 작업량

| 단계 | 파일 수 | 난이도 |
|------|--------|--------|
| 1. GuideIntroNeturePageProps 정의 (옵션) | 1 (shared-space-ui types) | 낮음 |
| 2. copy/neture.ts 작성 | 1 (shared-space-ui) | **중간~높음 (콘텐츠 작성, 2000~3000줄)** |
| 3. pages/guide/* wrapper 페이지 | 7~8 | 낮음 (보일러플레이트) |
| 4. App.tsx 라우팅 | 1 수정 | 낮음 |
| 5. Header 메뉴에 "이용 가이드" 진입점 추가 | 1 수정 (navigation.ts) | 낮음 |
| **합계** | **11~14 파일** | **중간 (콘텐츠 작성이 주)** |

**예상 개발 기간**: 콘텐츠 작성 포함 2~3주 (KPA Guide 의 약 80% 분량).

---

## 11. Neture 차별화 포인트 (코드 기반 단서)

기존 쇼핑몰/유통 플랫폼과 Neture 의 구조적 차이:

| 항목 | 일반 쇼핑몰/유통 플랫폼 | Neture |
|------|------------------------|--------|
| 진입 모델 | 입점 → 상품 등록 → 판매 | 가입 승인 → 상품 등록 + B2B/B2C 콘텐츠 → **유통 정책 선택** → **공급자가 주도적으로 매장에 제안** |
| 상품-매장 관계 | 1:N 단순 노출 | **다층 승인** (PUBLIC 자동/SERVICE 신청·승인/PRIVATE allowedSellerIds) |
| 가격 모델 | 단일 가격 | **3단 가격 등급** (general/gold/platinum) + 소비자 참고가 |
| 콘텐츠 | 상품 상세 설명만 | B2B/B2C 분리, Forum, Library, AI Copilot, 시나리오(진열·안내·할인·기대) |
| 파트너/협력 | Affiliate 단일 모델 | **3 경로** (공개 신청 / 파트너십 요청 / 모집 공고) + 계약 기반 1:N + commission_rate 스냅샷 |
| 이벤트/프로모션 | 마켓 주도 일괄 | **공급자가 다중 서비스 동시 제안** (KPA + K-Cos) |
| 매장 실행 | 온라인 종결 | **오프라인 시나리오 명시** (진열·고객안내·할인·기대효과) — Market Trial 의 salesScenarioContent |
| 분석 | 일반 분석 도구 | **공급자 Copilot Dashboard 8-Block** (Rule + LLM 추천) |

→ Guide 의 핵심 메시지로 강조 가능.

---

## 12. 다음 구현 우선순위 제안

### Phase 1 — Guide 인프라 활용 (즉시 가능)

| # | 작업 | 우선순위 | 비고 |
|---|------|---------|------|
| 1 | **WO-O4O-NETURE-GUIDE-IA-AND-WRAPPER-PAGES-V1** | High | pages/guide/* wrapper + App.tsx 라우팅 + Header 메뉴 추가 |
| 2 | **WO-O4O-NETURE-GUIDE-COPY-CONTENT-V1** | High | shared-space-ui/copy/neture.ts 작성 (KPA copy 기반 + Neture 특화) |
| 3 | **WO-O4O-NETURE-GUIDE-INTRO-NETURE-PROPS-V1** | Medium | GuideIntroNeturePageProps 타입 정의 (필요 시) |

### Phase 2 — 미완성 영역 채우기 (Guide 작성 가능 영역 확장)

| # | 작업 | 우선순위 | 비고 |
|---|------|---------|------|
| 4 | **WO-O4O-NETURE-SUPPLIER-REGISTRATION-UI-V1** | High | 공급자 가입 폼 UI (현재 API only). Guide 와 함께 가입 entry 확보 |
| 5 | **WO-O4O-NETURE-PARTNER-EVENT-UI-V1** | Medium | PromotionsPage placeholder → 실제 UI 연결 |
| 6 | **WO-O4O-NETURE-CONTENT-LINKING-CONTENT-EDITOR-V1** | Medium | PartnerContentsPage mock data → API 연결 |

### Phase 3 — AI 기능 통합 (선택)

| # | 작업 | 우선순위 | 비고 |
|---|------|---------|------|
| 7 | **WO-O4O-NETURE-AI-CONTENT-MODAL-INTEGRATION-V1** | Low | 공급자 상품 등록 Step 3 에 AiContentModal 통합 (KPA 패턴 참조). 단, 정확한 정보 우선 정책 재확인 필요 |

### Phase 4 — Guide 검증 및 운영

| # | 작업 | 우선순위 | 비고 |
|---|------|---------|------|
| 8 | **WO-O4O-NETURE-GUIDE-OPERATOR-EDITING-V1** | High | GuideEditableSection 으로 운영자가 현장 편집 가능하도록 sectionKey 카탈로그 정리 |
| 9 | **WO-O4O-NETURE-GUIDE-BROWSER-VERIFICATION-V1** | High | Guide IA 8 페이지 브라우저 검증, 역할별 진입 경로 확인 |

---

## 13. 참조 문서

| 문서 | 관련성 |
|------|--------|
| [IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1](IR-O4O-KPA-STORE-PRODUCTION-AI-EDITOR-REUSE-V1.md) | AiContentModal canonical, 7 outputType 백엔드 지원 |
| [NETURE-PARTNER-CONTRACT-FREEZE-V1](../baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md) | 파트너 계약 모델 |
| [NETURE-DISTRIBUTION-ENGINE-FREEZE-V1](../baseline/NETURE-DISTRIBUTION-ENGINE-FREEZE-V1.md) | 3-Tier 유통 정책 |
| [NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3](../baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md) | 4-Layer Gate |
| [EVENT-OFFER-COMMON-DOMAIN-V1](../baseline/EVENT-OFFER-COMMON-DOMAIN-V1.md) | Event Offer 도메인 |
| [EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1](../baseline/EVENT-OFFER-NETURE-ROLE-CLARIFICATION-V1.md) | Neture 의 Event Offer 역할 |
| [O4O-AI-USAGE-FLOW-BASELINE-V1](../baseline/O4O-AI-USAGE-FLOW-BASELINE-V1.md) | AI 사용 흐름 |
| [O4O-GUIDE-PAGE-KEY-CATALOG-V1](../architecture/O4O-GUIDE-PAGE-KEY-CATALOG-V1.md) | Guide pageKey 카탈로그 |
| [O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1](../architecture/O4O-GUIDE-SECTIONKEY-CONFLICT-POLICY-V1.md) | sectionKey 충돌 정책 |

---

## 14. 최종 결론

1. **실제 공개 가능한 Guide 범위**: O4O 플랫폼 소개 + 역할 구조 + 공급자 가입~상품등록~유통정책 + 파트너 3경로~Referral~Commission(조회) + Event Offer~Market Trial 개념 및 흐름 + Forum/Library/Copilot Dashboard 사용법. KPA Guide 와 거의 동일한 8 페이지 구조로 작성 가능.

2. **공급자 중심 핵심 기능**: 가입 승인 → barcode 기반 master 자동 해석으로 상품 등록 → 3단 유통 정책 (PUBLIC/SERVICE/PRIVATE) → B2B/B2C 콘텐츠 분리 → Event Offer 다중 서비스 동시 제안 → Market Trial 의 오프라인 시나리오 → Copilot Dashboard 8-Block 분석.

3. **Neture 차별화 포인트**: (a) 콘텐츠 기반 유통, (b) 공급자 주도 의사결정, (c) 다층 신뢰 모델, (d) 오프라인 실행 연결, (e) 계약 기반 1:N 협력 — §11 참조.

4. **dead/legacy 정리**: **불필요**. 이미 명시적 WO 로 모두 처리됨 (Curation 제거, Blog public 제거, /manual → /o4o 흡수 등).

5. **Home Guide 카드 추천 구조**: §9-2 의 8 카드 (둘러보기, 공급자 시작, 상품등록, Event Offer, Market Trial, 파트너, Forum/자료실, Copilot).

6. **다음 구현 우선순위**: Phase 1 (Guide IA + copy + wrapper) → Phase 2 (공급자 가입 UI 보강 + Partner Event/Content UI 완성) → Phase 4 (운영자 편집 + 검증). Phase 3 (AI Content Modal) 은 별도 정책 결정 후 진행.

7. **KPA Guide 공통화**: **11~14 파일 작업 (2~3주)** 으로 Neture 전용 Guide 완성 가능. 컴포넌트 코드 변경 없이 copy + wrapper 만 추가하면 됨.

---

*Status: Investigation Complete. No code changes performed. Awaiting Phase 1 WO.*
*Updated: 2026-05-11*
*Version: 1.0*
