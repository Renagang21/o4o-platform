# K-Cosmetics Site Structure Audit Report

**Work Order ID:** WO-KCOS-SITE-STRUCTURE-AUDIT-P0
**Status:** Completed
**Target Platform:** k-cosmetics.site
**Date:** 2026-01-10

---

## 1. URL 라우팅 구조 (Site Structure Map)

### 1.1 전체 URL 목록

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/` | HomePage | 공용 | 플랫폼 | S2S 플랫폼 입구, 3갈래 CTA |
| `/login` | LoginPage | 공용 | 플랫폼 | 로그인 |
| `/about` | AboutPage | 공용 | 플랫폼 | 플랫폼 소개 |
| `/contact` | ContactPage | 공용 | 플랫폼 | 문의 |

### 1.2 매장 디렉토리 (Store Directory)

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/stores` | StoresPage | 소비자 | 서비스 | 매장 목록 (영어 기본) |
| `/stores/:storeSlug` | StoreDetailPage | 소비자 | 서비스 | 개별 매장 상세 |

### 1.3 Consumer Commerce (Store-based)

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/store/:storeId` | StoreFront | 소비자 | 서비스 | 전자상거래 홈 |
| `/store/:storeId/products` | ProductListPage | 소비자 | 서비스 | 상품 목록 (PLP) |
| `/store/:storeId/products/:productId` | ProductDetailPage | 소비자 | 서비스 | 상품 상세 (PDP) |
| `/store/:storeId/cart` | StoreCart | 소비자 | 서비스 | 장바구니 |

### 1.4 관광객 안내 (Tourist)

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/tourists` | TouristsLandingPage | 소비자 | 서비스 | 관광객 진입 분기 |
| `/tourists/individual` | IndividualTouristPage | 소비자 | 서비스 | 개인 관광객 안내 |
| `/tourists/individual/how-it-works` | IndividualHowItWorksPage | 소비자 | 서비스 | 이용 방법 |
| `/tourists/individual/stores` | IndividualStoresPage | 소비자 | 서비스 | 매장 찾기 |
| `/tourists/group` | GroupTouristPage | 소비자/사업자 | 혼합 | 단체/가이드 안내 |

### 1.5 사업자 안내 (B2B Entry)

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/partners` | PartnersPage | 사업자 | 플랫폼 | 파트너 매장 가입 안내 |
| `/suppliers` | SuppliersPage | 사업자 | 플랫폼 | 공급사 참여 안내 |

### 1.6 대시보드 (Dashboard)

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `/admin/*` | AdminDashboardPage | 사업자 (관리자) | 플랫폼 | 플랫폼 관리자 |
| `/seller/*` | SellerDashboardPage | 사업자 (매장) | 플랫폼 | 매장 운영자 |
| `/supplier/*` | RoleNotAvailablePage | - | 플랫폼 | Neture 이동 안내 |
| `/partner/*` | RoleNotAvailablePage | - | 플랫폼 | Neture 이동 안내 |

### 1.7 기타

| URL | 화면 이름 | 주요 대상 | 화면 성격 | 비고 |
|-----|----------|----------|----------|------|
| `*` (404) | HomePage | 공용 | 플랫폼 | 홈으로 리다이렉트 |

---

## 2. 화면 성격 분류 요약

### 2.1 성격별 분류

| 화면 성격 | 화면 수 | URL 예시 |
|----------|---------|---------|
| **플랫폼** | 10 | `/`, `/about`, `/partners`, `/admin/*` |
| **서비스** | 9 | `/stores`, `/store/:storeId/*`, `/tourists/*` |
| **혼합** | 1 | `/tourists/group` |

### 2.2 대상별 분류

| 주요 대상 | 화면 수 | URL 예시 |
|----------|---------|---------|
| **공용** | 4 | `/`, `/login`, `/about`, `/contact` |
| **소비자** | 9 | `/stores`, `/store/:storeId/*`, `/tourists/*` |
| **사업자** | 6 | `/partners`, `/suppliers`, `/admin/*`, `/seller/*` |
| **혼합** | 1 | `/tourists/group` |

---

## 3. 전자상거래 관련 구조

### 3.1 Consumer Commerce 경로

```
/store/:storeId          → StoreFront (스토어 홈)
/store/:storeId/products → ProductListPage (상품 목록)
/store/:storeId/products/:productId → ProductDetailPage (상품 상세)
/store/:storeId/cart     → StoreCart (장바구니)
```

### 3.2 특징
- Glycopharm 패턴 적용 (`/store/:storeId`)
- 소비자 직접 접근 가능
- 결제 흐름은 장바구니까지 존재 (Checkout 페이지 미구현)

---

## 4. 관광객/여행자 관련 구조

### 4.1 Tourist 경로

```
/tourists                        → 진입 분기 (개인/단체)
/tourists/individual             → 개인 관광객 안내
/tourists/individual/how-it-works → 이용 방법
/tourists/individual/stores       → 매장 찾기
/tourists/group                  → 단체/가이드 안내
```

### 4.2 특징
- 안내 중심 화면
- 전자상거래 화면(`/store/:storeId`)과 직접 연결 없음
- `/tourists/group`은 사업자(가이드/투어오퍼레이터) 대상 포함

---

## 5. 사업자 관련 구조

### 5.1 매장 운영자
- `/seller/*` → 매장 대시보드

### 5.2 파트너
- `/partners` → 가입 안내 (Entry UI)
- `/partner/*` → Neture 이동 안내

### 5.3 공급사
- `/suppliers` → 참여 안내 (Entry UI)
- `/supplier/*` → Neture 이동 안내

### 5.4 관리자
- `/admin/*` → 플랫폼 관리 대시보드

---

## 6. 혼합/애매 영역 리스트

### 6.1 `/tourists/group`
- **현상**: 단체 관광객과 투어 오퍼레이터 모두 대상으로 표시
- **사실**: 화면 내용이 "단체 관광 지원"과 "가이드/오퍼레이터 문의" 모두 포함

### 6.2 `/` (HomePage)
- **현상**: 3갈래 CTA로 소비자/사업자 모두 진입 가능
- **사실**: "플랫폼 입구"로서 의도된 혼합 성격

### 6.3 `/stores` vs `/store/:storeId`
- **현상**: 두 경로가 유사하지만 다른 역할
  - `/stores` = 매장 디렉토리 (정보 제공)
  - `/store/:storeId` = 전자상거래 (구매 가능)
- **사실**: URL 패턴이 단수/복수로 구분됨

---

## 7. 디렉토리 구조 (pages/)

```
pages/
├── HomePage.tsx
├── LoginPage.tsx
├── AboutPage.tsx
├── ContactPage.tsx
├── PartnersPage.tsx
├── SuppliersPage.tsx
├── RoleNotAvailablePage.tsx
├── dashboard/
│   ├── AdminDashboardPage.tsx
│   └── SellerDashboardPage.tsx
├── stores/
│   ├── StoresPage.tsx
│   └── StoreDetailPage.tsx
├── store/
│   ├── StoreFront.tsx
│   ├── StoreProducts.tsx
│   ├── StoreProductDetail.tsx
│   ├── StoreCart.tsx
│   └── index.ts
└── tourists/
    ├── TouristsLandingPage.tsx
    ├── IndividualTouristPage.tsx
    ├── IndividualHowItWorksPage.tsx
    ├── IndividualStoresPage.tsx
    └── GroupTouristPage.tsx
```

---

## 8. 네비게이션 구조

### 8.1 메인 네비게이션 (nav)

| 메뉴 | 링크 | 노출 조건 |
|------|------|----------|
| 홈 | `/` | 항상 |
| 매장 | `/stores` | 항상 |
| 관광객 | `/tourists` | 항상 |
| 소개 | `/about` | 항상 |
| 로그인 | `/login` | 비로그인 시 |
| RoleSwitcher | - | 로그인 시 |
| 로그아웃 | - | 로그인 시 |

---

## 9. 기준 문장

> **"본 문서는 k-cosmetics.site의 현재 사이트 구조를
> 판단 없이 기록한 조사 문서이며,
> 이후 모든 구조 정비 논의의 기준 자료로 사용된다."**

---

*Work Order: WO-KCOS-SITE-STRUCTURE-AUDIT-P0*
*Completed: 2026-01-10*
