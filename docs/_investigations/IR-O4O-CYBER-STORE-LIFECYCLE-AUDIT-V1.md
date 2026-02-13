# IR-O4O-CYBER-STORE-LIFECYCLE-AUDIT-V1

> **O4O Platform Cyber Store Lifecycle Audit**
> Investigator: Claude Code | Date: 2026-02-13 | Status: **COMPLETE**

---

## 1. Executive Summary

O4O Platform의 "사이버 매장(Cyber Store)" 라이프사이클을 5개 축으로 전수 조사한 결과,
**GlycoPharm이 유일하게 Full-Lifecycle 설계를 보유**하고 있으며,
K-Cosmetics는 Backend 엔티티는 풍부하나 **신청 워크플로우 프론트엔드가 부재**,
나머지 서비스(Neture, KPA)는 **독립 주문 시스템 또는 조직 중심 모델**로 별도 궤도에 있다.

### 종합 성숙도 점수

| 평가 축 | GlycoPharm | K-Cosmetics | Neture | KPA | Platform |
|---------|:----------:|:-----------:|:------:|:---:|:--------:|
| 매장 엔티티 구조 | **4** | **4** | 1 | 1 | 3 |
| 신청/승인 워크플로우 | **5** | **2** | N/A | 3 | N/A |
| 템플릿 시스템 | **4** | 1 | N/A | N/A | N/A |
| 매장 대시보드 연결성 | **3** | **3** | 1 | N/A | **3** |
| 운영자 관리 기능 | **4** | **2** | 1 | 2 | 2 |
| **서비스 평균** | **4.0** | **2.4** | 1.0 | 2.0 | 2.7 |

> **채점 기준**: 1=미구현/Stub, 2=부분구현(Mock/UI only), 3=동작하나 불완전, 4=Production-ready 구조, 5=Full lifecycle 완비

---

## 2. Area 1: 매장 엔티티 구조

### 2.1 발견된 매장 관련 엔티티 전체 목록

| # | Entity | Table | Schema | Service | 주요 필드 |
|---|--------|-------|--------|---------|----------|
| 1 | `CosmeticsStore` | `cosmetics_stores` | cosmetics | K-Cosmetics | name, code, businessNumber, ownerName, status, region |
| 2 | `CosmeticsStoreApplication` | `cosmetics_store_applications` | cosmetics | K-Cosmetics | applicantUserId, storeName, businessNumber, status, rejectionReason, reviewedBy |
| 3 | `CosmeticsStoreMember` | `cosmetics_store_members` | cosmetics | K-Cosmetics | storeId, userId, role(OWNER/MANAGER/STAFF), isActive, deactivatedAt |
| 4 | `CosmeticsStoreListing` | `cosmetics_store_listings` | cosmetics | K-Cosmetics | storeId, productId, priceOverride, isVisible, sortOrder |
| 5 | `CosmeticsStorePlaylist` | `cosmetics_store_playlists` | cosmetics | K-Cosmetics | storeId, name, isActive |
| 6 | `CosmeticsStorePlaylistItem` | `cosmetics_store_playlist_items` | cosmetics | K-Cosmetics | playlistId, productId, type, sortOrder |
| 7 | `GlycopharmPharmacy` | `glycopharm_pharmacies` | public | GlycoPharm | name, code, business_number, status, enabled_services, created_by_user_id |
| 8 | `GlycopharmApplication` | `glycopharm_applications` | public | GlycoPharm | userId, organizationType, organizationName, businessNumber, serviceTypes, status |
| 9 | `GlucoseViewPharmacy` | `glucoseview_pharmacies` | public | GlucoseView | glycopharmPharmacyId, userId, name, businessNumber, enabledServices |
| 10 | `GlucoseViewApplication` | `glucoseview_applications` | public | GlucoseView | userId, pharmacyId, pharmacyName, businessNumber, serviceTypes, status |
| 11 | `PhysicalStore` | `physical_stores` | public | Platform | businessNumber(unique), storeName, region |
| 12 | `PhysicalStoreLink` | `physical_store_links` | public | Platform | physicalStoreId, serviceType, serviceStoreId |
| 13 | `KpaApplication` | `kpa_applications` | public | KPA | user_id, organization_id, type, payload, status, reviewer_id |

### 2.2 엔티티 구조 분석

#### GlycoPharm (Score: 4/5)

**강점:**
- `GlycopharmPharmacy`는 완전한 약국 엔티티 — name, code(unique), business_number, status, enabled_services(JSONB)
- `GlycopharmApplication`은 서비스 타입별 신청 지원 (dropshipping, sample_sales, digital_signage)
- GlucoseView는 `glycopharmPharmacyId`로 약국 연계 — 서비스 확장 패턴 구현
- 프론트엔드 `PharmacyStore` 타입이 slug, 영업시간, 배송정보, 정산정보까지 포함

**약점:**
- Entity에 `slug` 필드 없음 (프론트엔드 타입에만 존재)
- `GlycopharmPharmacy`에 `address`, `phone`, `email` 등이 nullable — 데이터 품질 강제 없음
- Entity와 Frontend 타입(`PharmacyStore`) 사이 간극 — Entity는 12개 필드, Frontend 타입은 30+ 필드

#### K-Cosmetics (Score: 4/5)

**강점:**
- 6개 엔티티로 가장 풍부한 구조 (Store, Application, Member, Listing, Playlist, PlaylistItem)
- `CosmeticsStoreMember`로 다중 역할(OWNER/MANAGER/STAFF) + soft-delete 패턴 구현
- `CosmeticsStoreListing`으로 매장-상품 매핑 + 가격 오버라이드 지원
- `CosmeticsStorePlaylist` + `PlaylistItem`으로 디지털 사이니지 통합
- 전체가 `cosmetics` 스키마로 격리

**약점:**
- `CosmeticsStore`에 영업시간, 배송정보, 정산정보 없음 — 커머스 필수 필드 부족
- Application → Store 자동 생성 로직이 코드에서 확인 불가

#### Platform Cross-Service (Score: 3/5)

**강점:**
- `PhysicalStore` + `PhysicalStoreLink`로 사업자번호 기반 크로스서비스 매장 연결
- `serviceType` + `serviceStoreId`의 다형적(polymorphic) 링크 패턴

**약점:**
- `PhysicalStore`에 storeName, region만 존재 — 메타데이터 빈약
- 실제 사용처가 Admin Dashboard에 국한

#### Neture / KPA (Score: 1/5)

- Neture: **매장 엔티티 자체가 없음** — 독립 주문 시스템(`neture_orders`)만 존재
- KPA: `KpaApplication`은 조직(organization) 가입 신청이지 매장 개설이 아님

### 2.3 GAP 목록

| ID | GAP | 심각도 | 서비스 |
|----|-----|--------|--------|
| E-1 | GlycoPharm Entity ↔ Frontend PharmacyStore 타입 간극 (slug, 영업시간, 정산 등 Entity에 없음) | HIGH | GlycoPharm |
| E-2 | CosmeticsStore에 커머스 필수 필드 없음 (영업시간, 배송, 정산) | MEDIUM | K-Cosmetics |
| E-3 | Neture에 매장 엔티티 자체 부재 | LOW | Neture |
| E-4 | PhysicalStore 메타데이터 빈약 (address, phone, status 없음) | MEDIUM | Platform |
| E-5 | 서비스 간 매장 엔티티 패턴 불일치 (Cosmetics=schema 격리, GlycoPharm=public, 혼재) | HIGH | Platform-wide |

---

## 3. Area 2: 신청/승인 워크플로우

### 3.1 워크플로우 비교

| 항목 | GlycoPharm | K-Cosmetics | GlucoseView | KPA |
|------|:----------:|:-----------:|:-----------:|:---:|
| Application Entity | `GlycopharmApplication` | `CosmeticsStoreApplication` | `GlucoseViewApplication` | `KpaApplication` |
| 프론트엔드 신청 UI | `StoreApplyPage` (4-step wizard) | **없음** | **없음** (글리코팜 경유) | **없음** |
| 승인 UI (Operator) | `StoreApprovalsPage` + `StoreApprovalDetailPage` | **없음** | 글리코팜 공유 | 별도 경로 |
| 보완 요청 (Supplement) | **지원** | **미구현** | **미구현** | **미구현** |
| 상태 머신 | submitted → approved/rejected | DRAFT → SUBMITTED → APPROVED/REJECTED | submitted → approved/rejected | submitted → approved/rejected/cancelled |
| 승인 후 자동 처리 | Pharmacy 생성 + enabled_services 설정 | Store 생성 (추정, 코드 미확인) | Pharmacy 생성 + enabled_services 설정 | Organization membership 갱신 |
| 체크포인트 심사 | **지원** (ReviewCheckpoint) | **미구현** | **미구현** | **미구현** |

### 3.2 GlycoPharm 워크플로우 상세 (Score: 5/5)

**Full Lifecycle 구현:**

```
[약사/약국] StoreApplyPage (4-step wizard)
    Step 1: 사업자 정보 입력
    Step 2: 약국 정보 입력
    Step 3: 정산 정보 입력
    Step 4: 약관 동의 + 제출
         ↓
[Backend] GlycopharmApplication (status: submitted)
         ↓
[Operator] StoreApprovalsPage (목록)
         ↓
[Operator] StoreApprovalDetailPage (상세 심사)
    - 체크포인트 심사 (사업자등록증, 약국개설등록증, ...)
    - 승인 / 반려 / 보완 요청
         ↓
[승인 시] GlycopharmPharmacy 생성
    - enabled_services 설정
    - created_by_user_id 기록
         ↓
[GlucoseView] GlucoseViewApplication (선택적 확장)
    - glycopharmPharmacyId로 연계
    - 별도 승인 후 GlucoseViewPharmacy 생성
```

**프론트엔드 구현 완비:**
- `services/web-glycopharm/src/pages/pharmacy/StoreApplyPage.tsx` — 4단계 마법사
- `services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx` — 승인 대기열
- `services/web-glycopharm/src/pages/operator/StoreApprovalDetailPage.tsx` — 상세 심사 + 승인/반려/보완

### 3.3 K-Cosmetics 워크플로우 상세 (Score: 2/5)

**Backend만 존재:**
- `CosmeticsStoreApplication` Entity 존재 (DRAFT → SUBMITTED → APPROVED/REJECTED)
- `CosmeticsStore` 상태: DRAFT → PENDING → APPROVED → REJECTED → SUSPENDED
- `CosmeticsStoreMember` 역할 관리 구조 있음

**프론트엔드 없음:**
- 신청 페이지 없음
- 운영자 승인 페이지 없음
- `StoreCockpitPage`는 이미 승인된 매장의 KPI 대시보드만 제공

### 3.4 GAP 목록

| ID | GAP | 심각도 | 서비스 |
|----|-----|--------|--------|
| W-1 | K-Cosmetics 매장 신청 프론트엔드 없음 | CRITICAL | K-Cosmetics |
| W-2 | K-Cosmetics 운영자 승인 프론트엔드 없음 | CRITICAL | K-Cosmetics |
| W-3 | Application → Store 자동 생성 Backend 로직 미확인 | HIGH | K-Cosmetics |
| W-4 | 보완 요청(supplement) 패턴이 GlycoPharm에만 구현 — 공통화 부재 | MEDIUM | Platform-wide |
| W-5 | 심사 체크포인트(ReviewCheckpoint) 패턴이 GlycoPharm Frontend 타입에만 존재, Backend Entity에 없음 | MEDIUM | GlycoPharm |

---

## 4. Area 3: 템플릿 시스템

### 4.1 현황

| 항목 | GlycoPharm | K-Cosmetics | Neture | KPA |
|------|:----------:|:-----------:|:------:|:---:|
| 템플릿 타입 시스템 | `StoreTemplate` + `StoreTheme` | 없음 | 없음 | 없음 |
| 섹션 구성 | 5-section (Hero, Featured, Category, Event, Footer) | 없음 | 없음 | 없음 |
| 콘텐츠 소유권 | `operator` / `pharmacy` / `readonly` | 없음 | 없음 | 없음 |
| 테마 시스템 | 4종 (professional, modern, neutral, clean) | 없음 | 없음 | 없음 |
| 운영자 콘텐츠 관리 | `StoreTemplateManagerPage` (3-tab) | 없음 | 없음 | 없음 |
| 약국 커스터마이징 | `PharmacySettings` (Hero, Category 수정) | 없음 | 없음 | 없음 |

### 4.2 GlycoPharm 템플릿 상세 (Score: 4/5)

**Franchise Standard Template 구조:**

```
Template (구조) ← → Theme (스타일) — 분리 원칙
    │                    │
    ├── Hero Section      │── professional (기본, 의료)
    │   └── managedBy: pharmacy   │── modern (키오스크 최적화)
    ├── Featured Products │── neutral (범용)
    │   └── managedBy: operator   │── clean (약사회 계열)
    ├── Category Grid     │
    │   └── managedBy: pharmacy   │
    ├── Event/Notice      │
    │   └── managedBy: operator   │
    └── Legal Footer      │
        └── managedBy: readonly   │
```

**콘텐츠 우선순위 정책:**
- Hero: `operator > pharmacy > default`
- Featured Products: `operator 지정 > Market Trial > 자동 추천`
- Event/Notice: `operator는 항상 pinned + 우선 표시`

**운영자 관리 도구:**
- `StoreTemplateManagerPage` — 3개 탭:
  1. Hero 콘텐츠 관리 (등록/수정/삭제, 일정 관리)
  2. Featured Products 지정 (운영자 추천 상품 설정)
  3. Events & Notices 관리 (공지/이벤트 콘텐츠)

**서비스 컨텍스트 분리:**
- `ServiceContext = 'glycopharm' | 'yaksa'`
- 서비스별 기본 테마 자동 적용 (glycopharm→professional, yaksa→clean)
- 카테고리/상품도 서비스 컨텍스트별 분리

**약점:**
- 모든 타입/로직이 Frontend(`store.ts`)에만 존재 — Backend Entity에 Template/Theme 관련 필드 없음
- DB에 Hero/Event 콘텐츠 저장 구조 미확인 (API 엔드포인트 기반 추정)
- 템플릿 타입이 `franchise-standard` 1종만 정의

### 4.3 K-Cosmetics (Score: 1/5)

- 디지털 사이니지(`CosmeticsStorePlaylist`)는 있으나 이것은 **매장 StoreFront 템플릿이 아님**
- 매장 전면(B2C) 페이지 자체가 없음

### 4.4 GAP 목록

| ID | GAP | 심각도 | 서비스 |
|----|-----|--------|--------|
| T-1 | 템플릿/테마 시스템이 GlycoPharm Frontend에만 존재 — Backend Entity 반영 없음 | HIGH | GlycoPharm |
| T-2 | Hero/Event 콘텐츠의 DB 저장 구조 불명 | HIGH | GlycoPharm |
| T-3 | 서비스 간 템플릿 공통화 전무 — GlycoPharm 독자 구현 | MEDIUM | Platform-wide |
| T-4 | K-Cosmetics B2C 매장 StoreFront 자체 부재 | HIGH | K-Cosmetics |

---

## 5. Area 4: 매장 대시보드 연결성

### 5.1 대시보드 현황

| 대시보드 | 위치 | 데이터 소스 | 매장 연결 |
|----------|------|------------|----------|
| GlycoPharm Operator Signal | `web-glycopharm/operator/` | Signal Engine (operatorConfig.ts) | `getStoreSignal()` — 매장 수/상태 집계 |
| K-Cosmetics StoreCockpit | `web-k-cosmetics/operator/store-cockpit` | Mock 데이터 | Multi-store 선택 → KPI 조회 |
| Admin PhysicalStores | `admin-dashboard/platform/physical-stores` | PhysicalStore + PhysicalStoreLink | 크로스서비스 매장 연결 관리 |
| Admin StoreNetwork | `admin-dashboard/platform/store-network` | 집계 (추정 Mock) | 네트워크 전체 KPI |

### 5.2 GlycoPharm (Score: 3/5)

**Operator Dashboard Signal 연결:**
- `operatorConfig.ts`에서 `getStoreSignal()` 함수로 매장 상태 집계
- 매장 수, 활성 매장 비율, 최근 신청 건수 등을 Signal로 표시
- `StoreApprovalsPage`로 승인 대기 건 즉시 이동 가능

**약점:**
- 개별 매장별 상세 KPI 대시보드 없음 (매장 목록 → 상세 진입 불가)
- 매출/주문 통계와 매장 연결 없음 (EcommerceOrder.storeId 필드 존재하나 테이블 자체 없음)
- Signal 수준의 집계만 — 드릴다운 분석 불가

### 5.3 K-Cosmetics (Score: 3/5)

**StoreCockpitPage 구현:**
- Multi-store 드롭다운으로 매장 선택
- 기간별 매출 추이 차트
- 주문 상태별 건수
- 상품별 판매 랭킹
- 매장별 KPI 비교

**약점:**
- **Mock 데이터 기반** — 실제 API 연결 없음
- 매장 목록이 하드코딩 (실제 CosmeticsStore 조회 불가)
- 신청/승인 화면과 단절 — 승인된 매장만 보이지만 승인 프로세스가 없음

### 5.4 Platform Admin (Score: 3/5)

**PhysicalStoresPage:**
- 사업자번호 기반 크로스서비스 매장 조회
- ServiceLink 연결 관리 (cosmetics, glycopharm, glucoseview)
- 매장 상세 정보 패널

**StoreNetworkPage:**
- 네트워크 전체 매장 수 집계
- 서비스별 분포 차트
- 지역별 매장 분포

**약점:**
- 매출/주문 데이터 연결 없음
- 운영 상태 모니터링 없음 (active/inactive만)

### 5.5 GAP 목록

| ID | GAP | 심각도 | 서비스 |
|----|-----|--------|--------|
| D-1 | GlycoPharm 개별 매장 상세 KPI 대시보드 없음 | HIGH | GlycoPharm |
| D-2 | K-Cosmetics StoreCockpit 전체 Mock — 실제 데이터 연결 없음 | CRITICAL | K-Cosmetics |
| D-3 | EcommerceOrder.storeId 존재하나 ecommerce_orders 테이블 자체 없음 → 매장-주문 연결 불가 | CRITICAL | Platform-wide |
| D-4 | Platform Admin 매장 네트워크에 매출/운영 데이터 없음 | MEDIUM | Platform |
| D-5 | 매장별 주문 현황(received → preparing → shipped) 추적 화면 없음 | HIGH | GlycoPharm |

---

## 6. Area 5: 운영자 관리 기능

### 6.1 운영자 기능 매트릭스

| 기능 | GlycoPharm | K-Cosmetics | Neture | KPA | Admin |
|------|:----------:|:-----------:|:------:|:---:|:-----:|
| 매장 신청 승인/반려 | **구현** | 미구현 | N/A | 별도 | N/A |
| 매장 보완 요청 | **구현** | 미구현 | N/A | 미구현 | N/A |
| 매장 목록 조회 | **구현** | Mock | N/A | N/A | **구현** |
| 매장 상태 변경 (suspend) | API 추정 | 미구현 | N/A | N/A | N/A |
| 매장 멤버 관리 | 미구현 | Entity만 | N/A | N/A | N/A |
| 템플릿 콘텐츠 관리 | **구현** (3-tab) | 미구현 | N/A | N/A | N/A |
| 매장 KPI 조회 | Signal | Mock | N/A | N/A | 기초 |
| 크로스서비스 연결 | N/A | N/A | N/A | N/A | **구현** |

### 6.2 GlycoPharm (Score: 4/5)

**구현된 운영자 기능:**
1. **매장 신청 관리**: 대기열 조회 → 상세 심사 → 승인/반려/보완 (Full cycle)
2. **템플릿 콘텐츠 관리**: Hero, Featured Products, Events/Notices (3-tab 관리자)
3. **Signal 기반 상태 모니터링**: 매장 활성 비율, 신규 신청 알림
4. **서비스 활성화 관리**: enabled_services(dropshipping, sample_sales, digital_signage) 제어

**약점:**
- 승인된 매장의 상태 변경(suspend/reactivate) UI 없음 (API만 추정)
- 매장별 멤버(약사) 관리 UI 없음
- 매장별 상품 관리(listing) 운영자 도구 없음

### 6.3 K-Cosmetics (Score: 2/5)

**구현된 기능:**
- `StoreCockpitPage` — KPI 대시보드 (Mock 데이터)
- `CosmeticsStoreMember` Entity로 역할 관리 구조 있음

**미구현:**
- 매장 신청 승인/반려 UI 없음
- 매장 목록 관리 UI 없음
- 템플릿/콘텐츠 관리 UI 없음
- 멤버 관리 UI 없음 (Entity만 존재)

### 6.4 Platform Admin (Score: 2/5)

**구현된 기능:**
- `PhysicalStoresPage` — 크로스서비스 매장 연결 관리
- `StoreNetworkPage` — 네트워크 현황 (기초 집계)

**미구현:**
- 개별 서비스 매장 직접 관리 기능 없음
- 운영자 권한 관리 (어떤 운영자가 어떤 매장을 관리하는지)
- 매장 health check / 이상 탐지

### 6.5 GAP 목록

| ID | GAP | 심각도 | 서비스 |
|----|-----|--------|--------|
| O-1 | K-Cosmetics 운영자 매장 관리 기능 전반 부재 | CRITICAL | K-Cosmetics |
| O-2 | GlycoPharm 매장 상태 변경(suspend/reactivate) 운영자 UI 없음 | MEDIUM | GlycoPharm |
| O-3 | 매장 멤버 관리 UI가 어느 서비스에도 없음 (K-Cosmetics Entity만 존재) | HIGH | Platform-wide |
| O-4 | 운영자-매장 귀속(어떤 운영자가 어떤 매장을 관리) 구조 없음 | MEDIUM | Platform-wide |
| O-5 | 서비스 간 운영자 도구 패턴 공통화 없음 — GlycoPharm 독자 구현 | MEDIUM | Platform-wide |

---

## 7. 전체 GAP 종합 (우선순위 정렬)

### CRITICAL (즉시 해결 필요)

| ID | GAP | 서비스 | 영향 |
|----|-----|--------|------|
| **D-3** | ecommerce_orders 테이블 없음 → 매장-주문 연결 불가 | Platform | 모든 서비스의 매장 KPI 차단 |
| **W-1** | K-Cosmetics 매장 신청 프론트엔드 없음 | K-Cosmetics | 매장 개설 불가 |
| **W-2** | K-Cosmetics 운영자 승인 프론트엔드 없음 | K-Cosmetics | 매장 승인 불가 |
| **D-2** | K-Cosmetics StoreCockpit 전체 Mock | K-Cosmetics | 운영 불가 |
| **O-1** | K-Cosmetics 운영자 매장 관리 기능 전반 부재 | K-Cosmetics | 매장 운영 불가 |

### HIGH (단기 해결 권장)

| ID | GAP | 서비스 | 영향 |
|----|-----|--------|------|
| **E-1** | GlycoPharm Entity ↔ Frontend 타입 간극 | GlycoPharm | 데이터 정합성 위험 |
| **E-5** | 서비스 간 매장 엔티티 패턴 불일치 | Platform | 크로스서비스 연결 복잡성 |
| **W-3** | K-Cosmetics Application→Store 자동 생성 로직 미확인 | K-Cosmetics | 워크플로우 단절 |
| **T-1** | 템플릿 시스템 Backend Entity 반영 없음 | GlycoPharm | 데이터 영속성 위험 |
| **T-2** | Hero/Event 콘텐츠 DB 저장 구조 불명 | GlycoPharm | 프로덕션 운영 위험 |
| **T-4** | K-Cosmetics B2C 매장 StoreFront 부재 | K-Cosmetics | 매장 UI 없음 |
| **D-1** | GlycoPharm 개별 매장 KPI 대시보드 없음 | GlycoPharm | 매장별 성과 분석 불가 |
| **D-5** | 매장별 주문 추적 화면 없음 | GlycoPharm | 주문 운영 불가 |
| **O-3** | 매장 멤버 관리 UI 전 서비스 부재 | Platform | 멤버 운영 불가 |

### MEDIUM

| ID | GAP | 서비스 |
|----|-----|--------|
| E-2 | CosmeticsStore 커머스 필수 필드 없음 | K-Cosmetics |
| E-4 | PhysicalStore 메타데이터 빈약 | Platform |
| W-4 | 보완 요청 패턴 공통화 부재 | Platform-wide |
| W-5 | 심사 체크포인트 Backend 없음 | GlycoPharm |
| T-3 | 템플릿 공통화 전무 | Platform-wide |
| D-4 | Admin 매장 네트워크 매출 데이터 없음 | Platform |
| O-2 | GlycoPharm suspend/reactivate UI 없음 | GlycoPharm |
| O-4 | 운영자-매장 귀속 구조 없음 | Platform-wide |
| O-5 | 운영자 도구 패턴 공통화 없음 | Platform-wide |

### LOW

| ID | GAP | 서비스 |
|----|-----|--------|
| E-3 | Neture 매장 엔티티 부재 | Neture |

---

## 8. 아키텍처 관찰

### 8.1 매장 모델 분기

플랫폼에 **3가지 매장 모델**이 공존한다:

```
Model A: "Pharmacy-centric" (GlycoPharm/GlucoseView)
  ┌─────────────────────┐
  │ GlycopharmPharmacy   │ ← 약국 = 매장 (1:1)
  │   └─ enabled_services│ ← 서비스 확장은 JSONB 배열
  │   └─ GlucoseViewPharmacy (1:1 연계)
  └─────────────────────┘

Model B: "Store-Member" (K-Cosmetics)
  ┌─────────────────────┐
  │ CosmeticsStore       │ ← 매장 독립 엔티티
  │   ├─ StoreMember (N:M)│ ← 멀티 역할
  │   ├─ StoreListing     │ ← 매장-상품 매핑
  │   └─ StorePlaylist    │ ← 사이니지
  └─────────────────────┘

Model C: "Organization-centric" (KPA)
  ┌─────────────────────┐
  │ KpaOrganization      │ ← 조직 = 매장 (아닌 경우도 있음)
  │   └─ KpaApplication  │ ← 가입 신청
  └─────────────────────┘
```

**관찰**: Model B(K-Cosmetics)가 가장 확장성 있는 구조이나 프론트엔드가 없고,
Model A(GlycoPharm)가 가장 완성도 높은 전체 구현을 가짐.

### 8.2 Cross-Service 연결 현황

```
PhysicalStore (business_number)
    ├── PhysicalStoreLink (cosmetics) → CosmeticsStore.id
    ├── PhysicalStoreLink (glycopharm) → GlycopharmPharmacy.id
    └── PhysicalStoreLink (glucoseview) → GlucoseViewPharmacy.id
```

연결 키: `business_number` (사업자등록번호)
- CosmeticsStore.businessNumber (unique)
- GlycopharmPharmacy.business_number (nullable, not unique)
- GlucoseViewPharmacy.businessNumber (nullable)

**문제**: GlycoPharm과 GlucoseView의 business_number가 nullable이므로 연결 보장 불가

### 8.3 주문-매장 연결 단절

```
EcommerceOrder.storeId ──(존재)──→ ??? (ecommerce_orders 테이블 없음)
CheckoutOrder ──(no storeId)──→ 매장 연결 불가
NetureOrder ──(no storeId)──→ 매장 개념 없음
```

**결론**: 현재 어떤 주문 시스템도 매장과 실질적으로 연결되지 않음

---

## 9. 우선순위 권고

### Phase 1: Foundation Fix (블로커 해소)

1. `ecommerce_orders` CREATE TABLE 마이그레이션 작성 — 매장-주문 연결의 전제 조건
2. K-Cosmetics 매장 신청/승인 프론트엔드 구현 — GlycoPharm 패턴 참조

### Phase 2: GlycoPharm 완성

3. GlycoPharm Entity에 Frontend 타입 필드 반영 (slug, operatingHours, shippingInfo)
4. 템플릿 콘텐츠의 Backend 저장 구조 확립
5. 매장별 주문 추적 / KPI 대시보드

### Phase 3: Platform 공통화

6. 매장 멤버 관리 UI (K-Cosmetics Entity 패턴 기반)
7. 신청/승인 워크플로우 공통 패턴 추출
8. 운영자-매장 귀속 구조

---

## 10. 부록: 조사 범위

### 10.1 조사한 파일

**Backend Entities:**
- `apps/api-server/src/routes/cosmetics/entities/cosmetics-store*.entity.ts` (6 files)
- `apps/api-server/src/routes/glycopharm/entities/glycopharm-pharmacy.entity.ts`
- `apps/api-server/src/routes/glycopharm/entities/glycopharm-application.entity.ts`
- `apps/api-server/src/routes/glucoseview/entities/glucoseview-pharmacy.entity.ts`
- `apps/api-server/src/routes/glucoseview/entities/glucoseview-application.entity.ts`
- `apps/api-server/src/routes/platform/entities/physical-store*.entity.ts` (2 files)
- `apps/api-server/src/routes/kpa/entities/kpa-application.entity.ts`
- `apps/api-server/src/routes/neture/entities/neture-order*.entity.ts` (2 files)
- `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts`

**Frontend:**
- `services/web-glycopharm/src/pages/pharmacy/StoreApplyPage.tsx`
- `services/web-glycopharm/src/pages/operator/StoreApprovalsPage.tsx`
- `services/web-glycopharm/src/pages/operator/StoreApprovalDetailPage.tsx`
- `services/web-glycopharm/src/pages/operator/store-template/StoreTemplateManagerPage.tsx`
- `services/web-glycopharm/src/pages/store/StoreFront.tsx`
- `services/web-glycopharm/src/components/store/template/FranchiseStandardTemplate.tsx`
- `services/web-glycopharm/src/types/store.ts`
- `services/web-k-cosmetics/src/pages/operator/StoreCockpitPage.tsx`
- `apps/admin-dashboard/src/pages/platform/PhysicalStoresPage.tsx`
- `apps/admin-dashboard/src/pages/platform/StoreNetworkPage.tsx`

### 10.2 조사 방법

- 2개 Explore Agent 병렬 투입 (Backend Entity 전수조사 + Frontend/Operator 전수조사)
- 13개 Entity 파일 직접 읽기 + 구조 분석
- Frontend 타입 시스템(`store.ts`) 전체 읽기
- 크로스 레퍼런스: Entity → Controller → Frontend Page 추적

---

*End of Report*
