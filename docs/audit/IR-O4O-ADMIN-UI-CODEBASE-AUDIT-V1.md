# IR-O4O-ADMIN-UI-CODEBASE-AUDIT-V1

> **조사 전용 작업** — 코드 수정 없음
> 일자: 2026-03-05

---

## 1. Executive Summary

O4O 플랫폼 코드베이스 전면 조사 결과:

| 영역 | COMPLETE | UI_ONLY | API_ONLY | UNUSED | 합계 |
|------|:--------:|:-------:|:--------:|:------:|:----:|
| **Neture Admin** | 2 | 1 | 3 | 0 | 6 |
| **Operator (KPA)** | 11 | 2 | 0 | 0 | 13 |
| **Supplier Dashboard** | 8 | 2 | 0 | 0 | 10 |
| **Store HUB** | 61+ | 0 | 0 | 0 | 61+ |
| **합계** | **82+** | **5** | **3** | **0** | **90+** |

**핵심 결론:**
- Store HUB / KPA Operator / Supplier Dashboard → **대부분 COMPLETE**, 즉시 운영 가능
- **Neture Admin 승인 UI만 부재** (API는 완비) — 이것이 유일한 구조적 갭

---

## 2. 상세 분류

### 2.1 Neture Admin UI

| 기능 | UI | API | 상태 | 파일 / 비고 |
|------|:---:|:---:|------|-------------|
| Admin Dashboard | YES | YES | **COMPLETE** | `web-neture/pages/admin/AdminDashboardPage.tsx` → `GET /neture/admin/dashboard/summary` |
| Operator 관리 | YES | YES | **COMPLETE** | `web-neture/pages/admin/OperatorsPage.tsx` → `GET/PATCH /neture/admin/operators` |
| 등록 요청 관리 | YES | NO | **UI_ONLY** | `web-neture/pages/operator/registrations/RegistrationRequestsPage.tsx` — **mock 데이터만 사용**, API 미연동 |
| Supplier 승인 | NO | YES | **API_ONLY** | `POST /neture/admin/suppliers/:id/approve\|reject\|deactivate` |
| Product Offer 승인 | NO | YES | **API_ONLY** | `POST /neture/admin/products/:id/approve\|reject` |
| ProductMaster 관리 | NO | YES | **API_ONLY** | `GET/POST/PATCH /neture/admin/masters` |

### 2.2 Operator UI (KPA Society)

| 기능 | UI | API | 상태 | 파일 |
|------|:---:|:---:|------|------|
| KPA Operator 대시보드 (5-Block) | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/KpaOperatorDashboard.tsx` |
| 상품 판매 신청 관리 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/ProductApplicationManagementPage.tsx` |
| 회원 관리 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/MemberManagementPage.tsx` |
| 운영자 관리 (Admin) | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/OperatorManagementPage.tsx` |
| 포럼 카테고리 요청 관리 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/ForumManagementPage.tsx` |
| 포럼 통계 대시보드 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/ForumAnalyticsDashboard.tsx` |
| 콘텐츠 관리 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/ContentManagementPage.tsx` |
| 약국 서비스 신청 관리 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/PharmacyRequestManagementPage.tsx` |
| 감사 로그 | YES | YES | **COMPLETE** | `web-kpa-society/pages/operator/AuditLogPage.tsx` |
| KPA Admin 대시보드 (분회용) | YES | YES | **COMPLETE** | `web-kpa-society/pages/admin/KpaOperatorDashboardPage.tsx` |
| 분회 운영자 대시보드 | YES | YES | **COMPLETE** | `web-kpa-society/pages/branch-operator/BranchOperatorDashboard.tsx` |
| AI/Context Asset 리포트 | YES | NO | **UI_ONLY** | `web-kpa-society/pages/operator/OperatorAiReportPage.tsx` — mock 데이터 |
| 인트라넷 운영자 대시보드 | YES | NO | **UI_ONLY** | `web-kpa-society/pages/intranet/OperatorDashboardPage.tsx` — mock 데이터 |

### 2.3 Supplier Dashboard (web-neture)

| 기능 | UI | API | 상태 | 파일 |
|------|:---:|:---:|------|------|
| Supplier 대시보드 | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplierDashboardPage.tsx` |
| 셀러 요청 목록 | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SellerRequestsPage.tsx` |
| 셀러 요청 상세 (승인/반려/정지/해지) | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SellerRequestDetailPage.tsx` |
| 상품 관리 (Active/Distribution 토글) | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplierProductsPage.tsx` |
| Operations Hub (서비스별 연결) | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplierOrdersPage.tsx` |
| 연락처/프로필 관리 | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplierProfilePage.tsx` |
| 라이브러리 관리 (CRUD) | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplierLibraryPage.tsx` + `FormPage` |
| 공급 요청 관리 (카드형 UX) | YES | YES | **COMPLETE** | `web-neture/pages/supplier/SupplyRequestsPage.tsx` |
| B2B 상품 설정 | YES | NO | **UI_ONLY** | `web-neture/pages/supplier/product/SupplierProductSettingsPage.tsx` — console.log만 |
| Supplier Overview | YES | NO | **UI_ONLY** | `web-neture/pages/supplier/SupplierOverviewPage.tsx` — 빈 skeleton |

### 2.4 Store HUB UI

#### GlycoPharm (web-glycopharm) — 18 pages, 전부 COMPLETE

| 주요 기능 | 파일 |
|-----------|------|
| 공개 매장 (StoreFront) | `pages/store/StoreFront.tsx` |
| B2B 카탈로그 | `pages/hub/HubB2BCatalogPage.tsx` |
| 약국 상품 관리 | `pages/pharmacy/PharmacyProducts.tsx` |
| B2B 주문 | `pages/pharmacy/b2b-order/B2BOrderPage.tsx` |
| 매장 설정 | `pages/pharmacy/PharmacySettings.tsx` |
| 매장 신청 | `pages/pharmacy/StoreApplyPage.tsx` |
| 디지털 자산 | `pages/store/StoreAssetsPage.tsx` |

#### K-Cosmetics (web-k-cosmetics) — 11 pages, 전부 COMPLETE

| 주요 기능 | 파일 |
|-----------|------|
| Store Cockpit (5-Block) | `pages/operator/StoreCockpitPage.tsx` |
| 서비스 HUB | `pages/hub/KCosmeticsHubPage.tsx` |
| B2B Supply | `pages/b2b/SupplyPage.tsx` |
| 사이니지 콘텐츠 | `pages/signage/ContentHubPage.tsx` |

#### KPA Society (web-kpa-society) — 37+ pages, 전부 COMPLETE

| 주요 기능 | 파일 |
|-----------|------|
| 약국 대시보드 (5-Block) | `pages/pharmacy/PharmacyDashboardPage.tsx` |
| **채널 관리 (B2C/KIOSK/TABLET/SIGNAGE)** | `pages/pharmacy/StoreChannelsPage.tsx` |
| **QR 코드 생성/분석** | `pages/pharmacy/StoreQRPage.tsx` |
| B2B 카탈로그 | `pages/pharmacy/HubB2BCatalogPage.tsx` |
| 콘텐츠 라이브러리 | `pages/pharmacy/HubContentLibraryPage.tsx` |
| 사이니지 라이브러리 | `pages/pharmacy/HubSignageLibraryPage.tsx` |
| POP 생성기 | `pages/pharmacy/StorePopPage.tsx` |
| 레이아웃 빌더 | `pages/pharmacy/LayoutBuilderPage.tsx` |
| 마케팅 분석 | `pages/pharmacy/MarketingAnalyticsPage.tsx` |
| 공개 매장 홈 | `pages/store/StorefrontHomePage.tsx` |

---

## 3. Mock 데이터 기반 페이지 (API 연동 필요)

| # | 파일 | 서비스 | 현재 상태 | API 연동 난이도 |
|---|------|--------|----------|---------------|
| 1 | `RegistrationRequestsPage.tsx` | web-neture | Mock data, approve/reject 버튼 있음 | **중** — 백엔드 endpoint 신규 필요 |
| 2 | `OperatorAiReportPage.tsx` | web-kpa-society | 3개 기간 mock data | **중** — analytics API 필요 |
| 3 | `OperatorDashboardPage.tsx` (Intranet) | web-kpa-society | 전면 mock (회원/임원/재정) | **높음** — 복수 API 신규 필요 |
| 4 | `SupplierProductSettingsPage.tsx` | web-neture | Form skeleton, console.log | **낮음** — API 존재, 연결만 필요 |
| 5 | `SupplierOverviewPage.tsx` | web-neture | 빈 skeleton | **중** — dashboard API 활용 가능 |

---

## 4. 사용되지 않는 관리자 페이지

조사 결과, **라우팅되지 않은 미사용 관리자 페이지는 발견되지 않았습니다.**
모든 존재하는 페이지가 라우터에 등록되어 있고 접근 가능합니다.

---

## 5. 최소 수정으로 활성화 가능한 UI

| 우선순위 | 대상 | 수정 내용 | 예상 작업량 |
|---------|------|----------|-----------|
| **P0** | `RegistrationRequestsPage.tsx` | mock → 실제 API 연동 (approve/reject 로직 존재) | 1일 |
| **P1** | `SupplierProductSettingsPage.tsx` | console.log → API 호출 (endpoint 이미 존재) | 반일 |
| **P2** | `SupplierOverviewPage.tsx` | 빈 skeleton → dashboard API 데이터 연결 | 반일 |
| **P3** | `OperatorAiReportPage.tsx` | mock → analytics API 신규 개발 + 연동 | 2-3일 |

---

## 6. 신규 UI 제작이 필요한 기능

| 우선순위 | 기능 | 이유 | 예상 작업량 |
|---------|------|------|-----------|
| **P0** | **Neture Admin Supplier 승인 페이지** | API 완비 (`/neture/admin/suppliers`), UI 전무 | 1-2일 |
| **P0** | **Neture Admin Product Offer 승인 페이지** | API 완비 (`/neture/admin/products`), UI 전무 | 1-2일 |
| **P1** | **Neture Admin ProductMaster 관리 페이지** | API 완비 (`/neture/admin/masters`), UI 전무 | 1일 |
| **P2** | Product 등록 Form (ProductMaster 생성) | Supplier가 직접 상품 등록하는 UI 없음 | 2-3일 |
| **P2** | SupplierProductOffer 생성 Form | Offer 생성 UI 없음 (API는 존재) | 1-2일 |
| **P3** | 인트라넷 운영자 대시보드 API | mock 대시보드 UI는 있으나 복수 backend API 필요 | 3-5일 |

---

## 7. 브라우저 운영 환경 구축 로드맵

### Phase 1: 즉시 운영 가능 (변경 불필요)
```
✅ KPA Operator 대시보드 + 상품 승인/반려
✅ KPA 약국 서비스 신청 관리
✅ KPA 포럼 카테고리 요청 관리
✅ KPA 회원 관리
✅ Store HUB 전체 (채널, QR, 카탈로그, 매장)
✅ Supplier Dashboard (요청 관리, 상품 관리, 프로필)
✅ Neture Admin Dashboard + Operator 관리
```

### Phase 2: 최소 수정으로 활성화 (1-2일)
```
🔧 RegistrationRequestsPage → API 연동
🔧 SupplierProductSettingsPage → API 연결
🔧 SupplierOverviewPage → 데이터 연결
```

### Phase 3: 신규 Admin UI 제작 (3-5일)
```
🆕 Neture Admin Supplier 승인 페이지
🆕 Neture Admin Product Offer 승인 페이지
🆕 Neture Admin ProductMaster 관리 페이지
```

### Phase 4: 확장 (선택)
```
🆕 Product 등록 Form (Supplier용)
🆕 SupplierProductOffer 생성 Form
🔧 AI Report / 인트라넷 대시보드 API 개발
```

---

## 8. Admin/Operator UI 코드 구조 요약

```
services/
├── web-neture/src/pages/
│   ├── admin/                    ← Neture Admin (2 COMPLETE)
│   │   ├── AdminDashboardPage.tsx
│   │   └── OperatorsPage.tsx
│   ├── operator/                 ← Neture Operator
│   │   ├── registrations/RegistrationRequestsPage.tsx  (UI_ONLY)
│   │   └── SupplyDashboardPage.tsx  (COMPLETE)
│   ├── supplier/                 ← Supplier Dashboard (8 COMPLETE, 2 UI_ONLY)
│   │   ├── SupplierDashboardPage.tsx
│   │   ├── SellerRequestsPage.tsx
│   │   ├── SellerRequestDetailPage.tsx
│   │   ├── SupplierProductsPage.tsx
│   │   ├── SupplierOrdersPage.tsx
│   │   ├── SupplierProfilePage.tsx
│   │   ├── SupplierLibraryPage.tsx + FormPage.tsx
│   │   ├── SupplyRequestsPage.tsx
│   │   ├── SupplierOverviewPage.tsx      (UI_ONLY)
│   │   └── product/SupplierProductSettingsPage.tsx (UI_ONLY)
│   ├── suppliers/                ← Public Supplier Directory (COMPLETE)
│   └── hub/                      ← HUB Page (COMPLETE)
│
├── web-kpa-society/src/pages/
│   ├── operator/                 ← KPA Operator (11 COMPLETE, 2 UI_ONLY)
│   │   ├── KpaOperatorDashboard.tsx
│   │   ├── ProductApplicationManagementPage.tsx
│   │   ├── MemberManagementPage.tsx
│   │   ├── OperatorManagementPage.tsx
│   │   ├── ForumManagementPage.tsx
│   │   ├── ForumAnalyticsDashboard.tsx
│   │   ├── ContentManagementPage.tsx
│   │   ├── PharmacyRequestManagementPage.tsx
│   │   ├── AuditLogPage.tsx
│   │   ├── OperatorAiReportPage.tsx        (UI_ONLY)
│   │   └── LegalManagementPage.tsx
│   ├── admin/                    ← KPA Admin (COMPLETE)
│   │   └── KpaOperatorDashboardPage.tsx
│   ├── branch-operator/          ← Branch Operator (COMPLETE)
│   │   └── BranchOperatorDashboard.tsx
│   ├── intranet/                 ← Intranet (UI_ONLY)
│   │   └── OperatorDashboardPage.tsx
│   └── pharmacy/                 ← Store HUB (37+ pages, ALL COMPLETE)
│       ├── PharmacyDashboardPage.tsx
│       ├── StoreChannelsPage.tsx
│       ├── StoreQRPage.tsx
│       ├── HubB2BCatalogPage.tsx
│       └── ... (33+ more)
│
├── web-glycopharm/src/pages/     ← 18 pages, ALL COMPLETE
│   ├── store/
│   ├── hub/
│   ├── pharmacy/
│   └── b2b/
│
├── web-k-cosmetics/src/pages/    ← 11 pages, ALL COMPLETE
│   ├── store/
│   ├── operator/
│   ├── hub/
│   └── signage/
│
└── web-glucoseview/src/pages/    ← Store overview (COMPLETE)
    └── store/
```

---

## 9. 결론

**전체 90+ 페이지 중 82+가 COMPLETE 상태**로, 코드베이스의 관리자/운영자 UI 자산은 매우 풍부합니다.

유일한 구조적 갭은 **Neture Admin 승인 UI 3건** (Supplier, Product Offer, ProductMaster)이며, 이들은 백엔드 API가 이미 완비되어 있어 **프론트엔드 페이지만 제작하면 됩니다.**

기존 코드 자산을 최대한 활용하면:
- **Phase 1 (즉시)**: 전체 운영 플로우의 ~90% 브라우저 운영 가능
- **Phase 2 (1-2일)**: mock 페이지 3건 API 연동
- **Phase 3 (3-5일)**: Admin 승인 UI 3건 신규 제작 → **100% 운영 가능**

---

*IR-O4O-ADMIN-UI-CODEBASE-AUDIT-V1 | 조사 완료: 2026-03-05*
