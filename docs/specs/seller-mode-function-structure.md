# Seller Mode 기능 구조 표

> **작성일**: 2024-12-17
> **대상 App**: cosmetics-seller-extension
> **현재 상태**: DISABLED (ESM import 이슈)
> **버전**: 1.0

---

## 1. 기능 개요

Seller Mode는 화장품 매장 판매원의 오프라인 운영 활동을 지원하는 Extension App입니다.

### 1.1 핵심 도메인

| 도메인 | 설명 |
|--------|------|
| Display | 매장 내 상품 진열 관리 |
| Sample | 테스터/샘플 재고 관리 |
| Inventory | 매장 내 판매 재고 관리 |
| Consultation | 고객 상담 기록 관리 |
| KPI | 판매원 성과 지표 관리 |

---

## 2. 기능 구조 표 (상세)

### 2.1 Display (진열 관리)

| 기능명 | 설명 | 필수 | 담당 App | 연관 API | Frontend 필요 |
|--------|------|------|----------|----------|---------------|
| 진열 등록 | 신규 상품 진열 정보 등록 | ✅ | cosmetics-seller-extension | POST /display | ✅ |
| 진열 조회 | 개별 진열 정보 상세 조회 | ✅ | cosmetics-seller-extension | GET /display/:id | ✅ |
| 판매원별 진열 목록 | 담당 판매원의 전체 진열 목록 | ✅ | cosmetics-seller-extension | GET /display/seller/:sellerId | ✅ |
| 진열 정보 수정 | 위치, 페이싱, 순서 등 수정 | ✅ | cosmetics-seller-extension | PUT /display/:id | ✅ |
| 진열 통계 조회 | 총 진열 수, 평균 페이싱 등 | ⚪ | cosmetics-seller-extension | GET /display/seller/:sellerId/stats | ✅ (대시보드) |
| 진열 삭제 | 진열 정보 삭제 | ⚪ | cosmetics-seller-extension | DELETE /display/:id | ✅ |

**Entity 필드**: `id`, `sellerId`, `productId`, `location`, `faceCount`, `displayOrder`, `isVisible`, `lastCheckedAt`, `metadata`

---

### 2.2 Sample (샘플 관리)

| 기능명 | 설명 | 필수 | 담당 App | 연관 API | Frontend 필요 |
|--------|------|------|----------|----------|---------------|
| 샘플 등록 | 신규 샘플/테스터 등록 | ✅ | cosmetics-seller-extension | POST /sample | ✅ |
| 샘플 조회 | 개별 샘플 상세 조회 | ✅ | cosmetics-seller-extension | GET /sample/:id | ✅ |
| 판매원별 샘플 목록 | 담당 판매원의 전체 샘플 목록 | ✅ | cosmetics-seller-extension | GET /sample/seller/:sellerId | ✅ |
| 샘플 보충 | 샘플 재고 추가 | ✅ | cosmetics-seller-extension | POST /sample/:id/refill | ✅ |
| 샘플 사용 | 샘플 사용량 차감 | ✅ | cosmetics-seller-extension | POST /sample/:id/use | ✅ |
| 부족 샘플 조회 | 재고 부족 샘플 목록 | ⚪ | cosmetics-seller-extension | GET /sample/seller/:sellerId/low-stock | ✅ |
| 샘플 통계 조회 | 총 샘플 수, 부족 품목 등 | ⚪ | cosmetics-seller-extension | GET /sample/seller/:sellerId/stats | ✅ (대시보드) |
| 샘플 삭제 | 샘플 정보 삭제 | ⚪ | cosmetics-seller-extension | DELETE /sample/:id | ✅ |

**Entity 필드**: `id`, `sellerId`, `productId`, `sampleType`, `currentQuantity`, `minQuantity`, `maxQuantity`, `lastRefilledAt`, `metadata`

---

### 2.3 Inventory (매장 재고 관리)

| 기능명 | 설명 | 필수 | 담당 App | 연관 API | Frontend 필요 |
|--------|------|------|----------|----------|---------------|
| 재고 등록 | 신규 상품 재고 등록 | ✅ | cosmetics-seller-extension | POST /inventory | ✅ |
| 재고 조회 | 개별 재고 상세 조회 | ✅ | cosmetics-seller-extension | GET /inventory/:id | ✅ |
| 판매원별 재고 목록 | 담당 판매원의 전체 재고 목록 | ✅ | cosmetics-seller-extension | GET /inventory/seller/:sellerId | ✅ |
| 재고 조정 | 재고 수량 조정 (입고/출고) | ✅ | cosmetics-seller-extension | POST /inventory/:id/adjust | ✅ |
| 부족 재고 조회 | 재고 부족 품목 목록 | ⚪ | cosmetics-seller-extension | GET /inventory/seller/:sellerId/low-stock | ✅ |
| 재고 통계 조회 | 총 품목, 부족/품절 현황 | ⚪ | cosmetics-seller-extension | GET /inventory/seller/:sellerId/stats | ✅ (대시보드) |
| 일괄 재입고 | 다수 품목 일괄 재고 보충 | ⚪ | cosmetics-seller-extension | POST /inventory/seller/:sellerId/bulk-restock | ✅ |
| 재고 삭제 | 재고 정보 삭제 | ⚪ | cosmetics-seller-extension | DELETE /inventory/:id | ✅ |

**Entity 필드**: `id`, `sellerId`, `productId`, `sku`, `currentStock`, `minStock`, `maxStock`, `lastRestockedAt`, `metadata`

---

### 2.4 Consultation (상담 기록)

| 기능명 | 설명 | 필수 | 담당 App | 연관 API | Frontend 필요 |
|--------|------|------|----------|----------|---------------|
| 상담 기록 생성 | 고객 상담 시작/기록 | ✅ | cosmetics-seller-extension | POST /consultation | ✅ |
| 상담 조회 | 개별 상담 상세 조회 | ✅ | cosmetics-seller-extension | GET /consultation/:id | ✅ |
| 판매원별 상담 목록 | 담당 판매원의 전체 상담 목록 | ✅ | cosmetics-seller-extension | GET /consultation/seller/:sellerId | ✅ |
| 세션별 상담 조회 | 워크플로우 세션 연동 상담 | ⚪ | cosmetics-seller-extension | GET /consultation/session/:sessionId | ⚪ |
| 상담 정보 수정 | 상담 내용/결과 수정 | ✅ | cosmetics-seller-extension | PUT /consultation/:id | ✅ |
| 상담 완료 처리 | 상담 완료 및 결과 기록 | ✅ | cosmetics-seller-extension | POST /consultation/:id/complete | ✅ |
| 상담 통계 조회 | 총 상담, 전환율 등 | ⚪ | cosmetics-seller-extension | GET /consultation/seller/:sellerId/stats | ✅ (대시보드) |
| 최근 상담 조회 | 최근 N건 상담 목록 | ⚪ | cosmetics-seller-extension | GET /consultation/seller/:sellerId/recent | ✅ |
| 상담 삭제 | 상담 기록 삭제 | ⚪ | cosmetics-seller-extension | DELETE /consultation/:id | ✅ |

**Entity 필드**: `id`, `sellerId`, `customerId`, `workflowSessionId`, `skinType`, `concerns`, `recommendedProducts`, `purchasedProducts`, `conversionStatus`, `notes`, `startedAt`, `completedAt`, `metadata`

---

### 2.5 KPI (성과 지표)

| 기능명 | 설명 | 필수 | 담당 App | 연관 API | Frontend 필요 |
|--------|------|------|----------|----------|---------------|
| KPI 기록 생성 | 수동 KPI 레코드 생성 | ⚪ | cosmetics-seller-extension | POST /kpi | ⚪ |
| KPI 조회 | 개별 KPI 레코드 조회 | ⚪ | cosmetics-seller-extension | GET /kpi/:id | ⚪ |
| 판매원별 KPI 목록 | 전체 KPI 기록 목록 | ✅ | cosmetics-seller-extension | GET /kpi/seller/:sellerId | ✅ |
| KPI 요약 조회 | 기간별 KPI 요약 정보 | ✅ | cosmetics-seller-extension | GET /kpi/seller/:sellerId/summary | ✅ (대시보드) |
| 일간 KPI 계산 | 일간 KPI 자동 계산 | ✅ | cosmetics-seller-extension | POST /kpi/seller/:sellerId/compute/daily | ⚪ (배치) |
| 주간 KPI 계산 | 주간 KPI 자동 계산 | ⚪ | cosmetics-seller-extension | POST /kpi/seller/:sellerId/compute/weekly | ⚪ (배치) |
| 월간 KPI 계산 | 월간 KPI 자동 계산 | ⚪ | cosmetics-seller-extension | POST /kpi/seller/:sellerId/compute/monthly | ⚪ (배치) |
| KPI 삭제 | KPI 레코드 삭제 | ⚪ | cosmetics-seller-extension | DELETE /kpi/:id | ⚪ |

**Entity 필드**: `id`, `sellerId`, `periodType`, `periodStart`, `periodEnd`, `consultationCount`, `conversionCount`, `conversionRate`, `totalSales`, `sampleToPurchaseRate`, `displayScore`, `metadata`

---

## 3. API 엔드포인트 요약

**Base Path**: `/api/v1/cosmetics-seller`

| 도메인 | 엔드포인트 수 | CRUD | 특수 기능 |
|--------|--------------|------|-----------|
| Display | 6 | 5 | stats |
| Sample | 8 | 4 | refill, use, low-stock, stats |
| Inventory | 8 | 4 | adjust, low-stock, bulk-restock, stats |
| Consultation | 9 | 5 | complete, session, stats, recent |
| KPI | 8 | 3 | summary, compute (daily/weekly/monthly) |
| **총계** | **39** | **21** | **18** |

---

## 4. 의존성 관계

```
dropshipping-core
    └── dropshipping-cosmetics (extends)
            └── cosmetics-seller-extension (extends)
                    ├── SellerDisplay (Entity)
                    ├── SellerSample (Entity)
                    ├── SellerInventory (Entity)
                    ├── SellerConsultationLog (Entity)
                    └── SellerKPI (Entity)
```

---

## 5. 권한 (Permissions)

| 권한 | 설명 | 대상 역할 |
|------|------|----------|
| `cosmetics-seller:view` | 기본 조회 권한 | seller, manager |
| `cosmetics-seller:manage_displays` | 진열 관리 권한 | seller |
| `cosmetics-seller:manage_samples` | 샘플 관리 권한 | seller |
| `cosmetics-seller:manage_inventory` | 재고 관리 권한 | seller |
| `cosmetics-seller:view_consultations` | 상담 조회 권한 | seller, manager |
| `cosmetics-seller:view_kpi` | KPI 조회 권한 | seller, manager |
| `cosmetics-seller:admin` | 전체 관리 권한 | admin |

---

## 6. 기능 우선순위 (구현 권장 순서)

### Phase 1: 핵심 기능 (MVP)
1. Display 진열 관리 (CRUD + 목록)
2. Sample 샘플 관리 (CRUD + refill/use)
3. Consultation 상담 기록 (CRUD + complete)
4. Dashboard 통합 현황 조회

### Phase 2: 운영 지원
5. Inventory 재고 관리 (CRUD + adjust)
6. KPI 기본 조회/계산
7. 부족 재고/샘플 알림

### Phase 3: 고급 기능
8. 일괄 재입고
9. 주간/월간 KPI 자동화
10. 워크플로우 세션 연동

---

## 7. 현재 구현 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| Entity (5개) | ✅ 완료 | TypeORM 정의 완료 |
| Service (5개) | ✅ 완료 | CRUD + 비즈니스 로직 |
| Controller (5개) | ✅ 완료 | Request/Response 처리 |
| Routes | ✅ 완료 | 39개 엔드포인트 |
| Frontend Pages (6개) | ✅ 완료 | React 컴포넌트 |
| Shortcodes (6개) | ✅ 정의 | 경로만 정의 |
| **런타임 상태** | ❌ DISABLED | ESM import 이슈 |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2024-12-17 | 초안 작성 - 조사 결과 기반 |

