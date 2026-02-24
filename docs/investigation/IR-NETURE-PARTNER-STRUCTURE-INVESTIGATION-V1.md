# IR-NETURE-PARTNER-STRUCTURE-INVESTIGATION-V1

> **Neture 파트너 구조 조사 보고서**
> WO-NETURE-PARTNER-STRUCTURE-INVESTIGATION-V1
> 2026-02-24

---

## 종합 판정

```
구조 단계: B (부분 구현)

모집/신청/승인 흐름 완성.
계약 독립 테이블 없음 (승인 = 계약 활성화).
정산 인프라 없음.
```

---

## 조사 요약 (5줄)

1. 모집(`neture_partner_recruitments`) + 신청(`neture_partner_applications`) + 승인 워크플로우 **구현 완료**
2. Seller↔Supplier 관계(`neture_supplier_requests`)에 6단계 상태 머신 + 감사 로그 **구현 완료**
3. `commission_rate` 필드(decimal 5,2) 저장 구조 **존재**, 그러나 정산/지급 테이블 **없음**
4. seller_id + partner_id가 **동일 테이블에 공존하지 않음** — Recruitment FK를 통한 간접 참조만 존재
5. Frontend에 Collaboration/Promotions/Settlements 페이지 **placeholder로만 존재** (API 미연결)

---

## 리스크 포인트 3가지

| # | 리스크 | 심각도 | 설명 |
|:-:|-------|:------:|------|
| R-1 | **계약 독립 Entity 부재** | HIGH | 승인(approved) = 계약 활성화로 처리. 계약 기간, 갱신, 해지 조건을 독립 관리하는 테이블 없음. `effectiveUntil` 필드가 `neture_supplier_requests`에 존재하나, Seller↔Partner 계약에는 해당 구조 없음 |
| R-2 | **정산 인프라 전무** | HIGH | `commission_rate` 저장은 가능하나, 실적 집계·정산 주기·지급 이력 테이블 없음. Settlements 페이지는 placeholder |
| R-3 | **이중 Entity 구조** | MEDIUM | `neture_partners` (routes/neture, neture schema)와 `neture_suppliers` (modules/neture, public schema)가 별도 존재. Partner type이 seller/supplier/partner를 모두 포함하나, Supplier 전용 Entity와 역할 중복 |

---

# Phase 1 — DB 구조 조사

## 1-1. Partner 관련 테이블 목록

| 테이블명 | 스키마 | 관련 필드 | 추정 역할 |
|---------|:------:|----------|----------|
| `neture_partners` | neture | type(seller/supplier/partner), status, userId | 통합 파트너 프로필 |
| `neture_partner_recruitments` | public | seller_id, product_id, commission_rate, status | Seller의 파트너 모집 공고 |
| `neture_partner_applications` | public | recruitment_id(FK), partner_id, status | Partner의 모집 참여 신청 |
| `neture_partnership_requests` | public | seller_id, revenue_structure, promotion_*, status | Seller의 파트너십 제안 (게시판 형태) |
| `neture_partnership_products` | public | partnership_request_id(FK), name, category | 파트너십 제안 내 상품 |
| `neture_suppliers` | public | slug, status, user_id, contact_*_visibility | 공급자 디렉토리 |
| `neture_supplier_products` | public | supplier_id(FK), distribution_type, allowed_seller_ids | 공급자 상품 (유통 정책 포함) |
| `neture_supplier_requests` | public | seller_id, supplier_id, product_id, status(6단계) | Seller→Supplier 관계 신청 |
| `neture_supplier_request_events` | public | request_id, event_type, from_status, to_status | 신청 감사 로그 |
| `neture_supplier_contents` | public | supplier_id(FK), type, status | 공급자 참고 콘텐츠 |
| `neture_partner_dashboard_items` | public | partner_user_id, product_id, service_id | 파트너 대시보드 상품 선택 |
| `neture_partner_dashboard_item_contents` | public | dashboard_item_id(FK), content_id, content_source | 대시보드 콘텐츠 연결 |

**확장 필드**:
| 테이블 | 필드 | 용도 |
|--------|------|------|
| `glycopharm_products` | `is_partner_recruiting` (boolean) | 모집 대상 상품 표시 (partial index) |

---

## 1-2. Seller ↔ Partner 관계 테이블 존재 여부

### 직접 관계 (seller_id + partner_id 동일 테이블)

**없음.**

seller_id와 partner_id가 동일 테이블에 공존하는 구조가 존재하지 않는다.

### 간접 관계

```
neture_partner_recruitments (seller_id)
  └─ FK → neture_partner_applications (recruitment_id, partner_id)

간접 경로: seller_id ← recruitment → application → partner_id
```

| 참조 방식 | 테이블 | seller 필드 | partner 필드 | 관계 |
|----------|--------|:-----------:|:------------:|------|
| 간접 (FK chain) | recruitments → applications | `seller_id` (recruitments) | `partner_id` (applications) | Recruitment FK 통한 간접 |
| 직접 (Supplier 경로) | `neture_supplier_requests` | `seller_id` | — | Seller→Supplier (Partner 아님) |

**결론**: 계약 모델 **미존재**. 승인(approved)이 곧 관계 활성화.

---

## 1-3. Commission 저장 구조

| 테이블 | 필드 | 타입 | 용도 | 상태 |
|--------|------|------|------|:----:|
| `neture_partner_recruitments` | `commission_rate` | decimal(5,2) | 모집 공고 커미션율 | 존재 |
| `neture_partnership_requests` | `revenue_structure` | text | 수익 구조 설명 (자유 텍스트) | 존재 |
| — | settlement_policy | — | — | **없음** |
| — | payout / earnings | — | — | **없음** |
| — | settlement_history | — | — | **없음** |

**결론**: 커미션율 **저장 가능**, 정산 **계산/지급 불가** (인프라 없음).

---

# Phase 2 — Entity / Model 조사

## Entity 전체 목록

| Entity | 테이블 | 관계 정의 | 상태 필드 | 계약 필드 |
|--------|--------|----------|----------|----------|
| `NeturePartner` | neture_partners | OneToMany → NetureProduct | pending/active/suspended/inactive | 없음 |
| `NetureSupplier` | neture_suppliers | OneToMany → SupplierProduct, Content | active/inactive | 없음 |
| `NetureSupplierRequest` | neture_supplier_requests | — (soft ref) | pending/approved/rejected/suspended/revoked/expired | `effectiveUntil` |
| `NetureSupplierRequestEvent` | neture_supplier_request_events | — (audit) | eventType enum | 없음 |
| `NeturePartnerRecruitment` | neture_partner_recruitments | — (soft ref) | recruiting/closed | `commissionRate` |
| `NeturePartnerApplication` | neture_partner_applications | — (soft ref to recruitment) | pending/approved/rejected | 없음 |
| `NeturePartnershipRequest` | neture_partnership_requests | OneToMany → PartnershipProduct | OPEN/MATCHED/CLOSED | `revenueStructure` |
| `NetureSupplierProduct` | neture_supplier_products | ManyToOne ← Supplier | purpose enum | `distributionType`, `allowedSellerIds` |
| `NeturePartnerDashboardItem` | neture_partner_dashboard_items | — (soft ref) | active/inactive | 없음 |

### 핵심 관찰

1. **이중 Entity 구조**: `NeturePartner` (neture schema, type 구분)와 `NetureSupplier` (public schema, 전용 Entity)가 별도 존재
2. **상태 머신 성숙도**:
   - `NetureSupplierRequest`: 6단계 (pending→approved→suspended→revoked→expired) + 감사 로그 **성숙**
   - `NeturePartnerApplication`: 3단계 (pending/approved/rejected) **기본**
   - `NeturePartnershipRequest`: 3단계 (OPEN/MATCHED/CLOSED) **기본**
3. **계약 Entity**: 독립 Entity **없음**. 승인 상태 = 계약 활성화

---

# Phase 3 — API 조사

## 모집/신청/승인 API

| 기능 | 존재 여부 | 엔드포인트 | 파일 위치 | 판정 |
|------|:--------:|-----------|----------|:----:|
| 모집 공고 조회 | YES | `GET /partner/recruitments` | `modules/neture/neture.routes.ts` | 구현됨 |
| 모집 상품 조회 | YES | `GET /partner/recruiting-products` | `modules/neture/neture.routes.ts` | 구현됨 |
| 파트너 신청 | YES | `POST /partner/applications` | `modules/neture/neture.routes.ts` | 구현됨 |
| 신청 승인 | YES | `POST /partner/applications/:id/approve` | `modules/neture/neture.routes.ts` | 구현됨 |
| 신청 거절 | YES | `POST /partner/applications/:id/reject` | `modules/neture/neture.routes.ts` | 구현됨 |
| 계약 활성화 | NO | — | — | **미구현** |
| 정산 조회 | NO | — | — | **미구현** |
| 커미션 계산 | NO | — | — | **미구현** |

## Seller → Supplier 관계 API

| 기능 | 존재 여부 | 엔드포인트 | 판정 |
|------|:--------:|-----------|:----:|
| 공급 신청 | YES | `POST /supplier/requests` | 구현됨 |
| 신청 목록 | YES | `GET /supplier/requests` | 구현됨 |
| 승인 | YES | `POST /supplier/requests/:id/approve` | 구현됨 |
| 거절 | YES | `POST /supplier/requests/:id/reject` | 구현됨 |
| 일시정지 | YES | `POST /supplier/requests/:id/suspend` | 구현됨 |
| 재활성화 | YES | `POST /supplier/requests/:id/reactivate` | 구현됨 |
| 해지 | YES | `POST /supplier/requests/:id/revoke` | 구현됨 |
| 감사 로그 | YES | `GET /supplier/requests/:id/events` | 구현됨 |

## Partnership (게시판형) API

| 기능 | 존재 여부 | 엔드포인트 | 판정 |
|------|:--------:|-----------|:----:|
| 파트너십 생성 | YES | `POST /partnership/requests` | 구현됨 |
| 목록 조회 | YES | `GET /partnership/requests` | 구현됨 |
| 상세 조회 | YES | `GET /partnership/requests/:id` | 구현됨 |
| 상태 변경 | YES | `PATCH /partnership/requests/:id` (admin) | 구현됨 |

## Partner Dashboard API

| 기능 | 존재 여부 | 엔드포인트 | 판정 |
|------|:--------:|-----------|:----:|
| 대시보드 요약 | YES | `GET /partner/dashboard/summary` | 구현됨 |
| 상품 추가 | YES | `POST /partner/dashboard/items` | 구현됨 |
| 상품 목록 | YES | `GET /partner/dashboard/items` | 구현됨 |
| 콘텐츠 연결 | YES | `POST /partner/dashboard/items/:id/contents` | 구현됨 |
| 콘텐츠 정렬 | YES | `PATCH /partner/dashboard/items/:id/contents/reorder` | 구현됨 |

---

# Phase 4 — 화면 구조 조사

## Seller 공간

| 영역 | 화면 존재 | 데이터 연결 | 상태 |
|------|:--------:|:----------:|:----:|
| 파트너 모집 생성 | YES (`PartnershipRequestCreatePage`) | `POST /partnership/requests` | **구현됨** |
| 신청자 관리 | YES (approve/reject API) | `POST /partner/applications/:id/approve\|reject` | **API만** (전용 UI 미확인) |
| 활동 파트너 목록 | NO | — | **미구현** |

## Partner HUB

| 영역 | 화면 존재 | 데이터 연결 | 상태 |
|------|:--------:|:----------:|:----:|
| 모집 리스트 | YES (`PartnershipRequestListPage`) | `GET /partner/recruitments` | **구현됨** |
| 모집 상세 | YES (`PartnershipRequestDetailPage`) | `GET /partnership/requests/:id` | **구현됨** |
| 신청 버튼 | YES (리스트 내 Apply) | `POST /partner/applications` | **구현됨** |
| 모집 상품 카드 | YES (`RecruitingProductsPage`) | `GET /partner/recruiting-products` | **구현됨** |

## Partner 개인 공간

| 영역 | 화면 존재 | 데이터 연결 | 상태 |
|------|:--------:|:----------:|:----:|
| 대시보드 (Overview) | YES (`PartnerOverviewPage`) | `GET /partner/dashboard/summary`, `/items` | **구현됨** |
| 콘텐츠 연결 모달 | YES (PartnerOverviewPage 내) | `POST/DELETE /partner/dashboard/items/:id/contents` | **구현됨** |
| Collaboration | **PLACEHOLDER** (`CollaborationPage`) | API 미연결 (빈 배열) | **미구현** |
| Promotions | **PLACEHOLDER** (`PromotionsPage`) | API 미연결 (빈 배열) | **미구현** |
| Settlements | **PLACEHOLDER** (`SettlementsPage`) | API 미연결 (빈 배열) | **미구현** |
| 승인된 판매자 목록 | NO | — | **미구현** |
| 실적/정산 표시 | NO | — | **미구현** |

## Admin 공간

| 영역 | 화면 존재 | 데이터 연결 | 상태 |
|------|:--------:|:----------:|:----:|
| 파트너 목록/관리 | YES (`PartnerListPage`) | `GET /neture/admin/partners` | **구현됨** |
| 파트너 상세 | YES (`PartnerDetailPage`) | 상태 변경/삭제 포함 | **구현됨** |
| 파트너십 요청 목록 | YES (`PartnershipRequestListPage`) | 읽기 전용 | **구현됨** |

---

# 최종 판정

## 구조 단계: B (부분 구현)

### 판정 근거

| 기준 | 충족 여부 | 근거 |
|------|:--------:|------|
| 모집 테이블 | **YES** | `neture_partner_recruitments` — commission_rate 포함 |
| 신청 테이블 | **YES** | `neture_partner_applications` — pending/approved/rejected |
| 승인 워크플로우 | **YES** | API + 상태 전이 구현 완료 |
| **계약 독립 테이블** | **NO** | seller_id + partner_id 동일 테이블 없음. 승인 = 계약 |
| 정산 인프라 | **NO** | commission_rate 저장만 가능, 실적 집계/지급 테이블 없음 |
| Frontend 정산 화면 | **PLACEHOLDER** | SettlementsPage 존재하나 API 미연결 |

### A/B/C 분류

```
A. 구조 없음          → 해당 없음 (모집/신청/승인 존재)
B. 부분 구현          → ★ 해당 (모집+신청+승인 있음, 계약 테이블 없음)
C. 계약 구조 존재     → 미달 (seller_id + partner_id 계약 테이블 없음)
```

### 상세 판정: B+ (부분 구현 — 고도화 단계)

일반적인 "부분 구현"보다 성숙한 이유:
1. Supplier 경로(`neture_supplier_requests`)에 6단계 상태 머신 + 감사 로그 완비
2. `commission_rate` 저장 구조 존재
3. Partner Dashboard + 콘텐츠 연결 시스템 구현 완료
4. 10개 이상 WO 이력 (점진적 고도화 흔적)

그러나 C(계약 구조 존재)에 미달하는 이유:
1. seller_id + partner_id 계약 Entity 없음
2. 계약 기간/갱신/해지 조건 독립 관리 불가
3. 정산 계산/지급 이력 인프라 전무

---

## 구조 다이어그램

```
현재 구현 상태:

Supplier ─────── neture_suppliers (Entity 존재, 상태 관리)
    │
    ├── Products → neture_supplier_products (유통 정책: PUBLIC/PRIVATE)
    │
    └── 관계 신청 → neture_supplier_requests ← Seller
                    (6단계 상태 머신, 감사 로그)

Seller ──────── (전용 Entity 없음, userId/sellerId로 식별)
    │
    ├── 모집 공고 → neture_partner_recruitments (commission_rate 포함)
    │                  └── 신청 → neture_partner_applications ← Partner
    │                              (pending/approved/rejected)
    │
    └── 파트너십 → neture_partnership_requests (게시판형, revenue_structure)
                    └── 상품 → neture_partnership_products

Partner ─────── neture_partners (type: seller|supplier|partner)
    │
    └── Dashboard → neture_partner_dashboard_items
                      └── Contents → neture_partner_dashboard_item_contents

                    ┌───────────────────────┐
                    │   ❌ 없는 것           │
                    │                       │
                    │  • 계약 Entity         │
                    │  • 정산 테이블          │
                    │  • 실적 집계 테이블     │
                    │  • 지급 이력 테이블     │
                    └───────────────────────┘
```

---

*Generated: 2026-02-24*
*WO: WO-NETURE-PARTNER-STRUCTURE-INVESTIGATION-V1*
*Status: Investigation Complete*
*Classification: Investigation Report*
