# Event Offer 운영 기준 문서

> **WO-EVENT-OFFER-OPERATION-POLICY-DOCUMENT-V1**
>
> Event Offer의 전체 흐름, 역할, 상태, 정책을 정리한 운영 기준 문서.
> 향후 모든 관련 개발/수정 시 이 문서를 기준으로 한다.

---

## 1. 개요

Event Offer는 **공급자(Neture Supplier)의 승인된 상품(SPO)을 KPA 서비스에 이벤트 형태로 노출**하여, 약국 개설자가 참여(주문)할 수 있게 하는 기능이다.

- 공급자가 자신의 상품을 이벤트로 **제안**한다
- KPA 운영자가 **노출을 관리**한다 (승인/심사 개념 없음)
- 약국 개설자가 노출된 이벤트에 **참여(주문)**한다

핵심 데이터 구조는 `organization_product_listings` 테이블이며, `service_key = 'kpa-groupbuy'`로 Event Offer 도메인을 식별한다.

---

## 2. 전체 구조

```
SupplierProductOffer (APPROVED, is_active=true)
        |
        v
공급자 제안 (POST /supplier/event-offers)
        |
        v
OrganizationProductListing (is_active=false)
        |
        v
운영자 노출 설정 (POST /groupbuy-admin/products/:id/visibility)
        |
        v
HUB 노출 (is_active=true)
        |
        v
약국 개설자 참여 (POST /groupbuy/:id/participate)
        |
        v
checkout_orders (metadata.serviceKey = 'kpa-groupbuy')
```

| 단계 | 수행자 | 설명 |
|------|--------|------|
| SPO 승인 | Neture 운영자 | 공급자 상품이 APPROVED 상태가 되어야 제안 가능 |
| 제안 | 공급자 | APPROVED SPO를 KPA 이벤트로 제안 → OPL 생성 (is_active=false) |
| 노출 관리 | KPA 운영자 | is_active 토글로 HUB 노출/미노출 제어 |
| 참여 | 약국 개설자 | 노출 중인 이벤트에 참여 → checkoutService.createOrder() |

> 운영자가 직접 상품을 추가하는 경로도 존재한다 (`POST /groupbuy-admin/products`). 이 경우 `is_active=true`로 즉시 노출된다.

---

## 3. 역할 정의

### 공급자 (Neture Supplier)

| 항목 | 내용 |
|------|------|
| 역할 | **제안자** |
| 할 수 있는 것 | 자신의 APPROVED SPO를 이벤트로 제안, 내 제안 목록 조회 |
| 할 수 없는 것 | 노출 관리, 직접 노출 설정, 다른 공급자 상품 제안 |
| 인증 | `requireAuth` (neture_suppliers.user_id 매핑) |

### KPA 운영자 (Operator)

| 항목 | 내용 |
|------|------|
| 역할 | **노출 관리자** |
| 할 수 있는 것 | 이벤트 목록 조회, 노출/미노출 토글, 직접 상품 추가, 상품 제거(소프트), 통계 조회 |
| 할 수 없는 것 | 승인/심사 (해당 개념 없음), 주문/결제/배송 처리 |
| 인증 | `requireAuth` + `requireKpaScope('kpa:operator')` |

### 약국 개설자 (Pharmacy User)

| 항목 | 내용 |
|------|------|
| 역할 | **참여자** |
| 할 수 있는 것 | 노출 중인 이벤트 조회, 참여(주문 생성), 내 참여 이력 조회 |
| 할 수 없는 것 | 미노출 이벤트 접근, 노출 관리 |
| 인증 | 조회는 `optionalAuth`, 참여는 `requireAuth` |

---

## 4. 상태 정의

| 상태 | 조건 | 의미 |
|------|------|------|
| **제안 가능** | APPROVED + is_active SPO, 미등록 (kpa-groupbuy OPL 없음) | 공급자가 제안할 수 있는 상태 |
| **제안됨** | OPL 존재 + `is_active=false` | 등록되었지만 HUB에 미노출 |
| **노출중** | OPL 존재 + `is_active=true` | HUB에 표시, 약국이 참여 가능 |

- **승인/심사 개념 없음** — 노출 여부만 존재
- 공급자 제안 시 `is_active=false`로 생성 → 운영자가 노출 전환
- 운영자 직접 추가 시 `is_active=true`로 즉시 노출

---

## 5. 상태 흐름

```
제안 가능  ──(공급자 제안)──>  제안됨 (is_active=false)
                                    |
                       (운영자 노출 설정)
                                    |
                                    v
                              노출중 (is_active=true)
                                    |
                       (운영자 미노출 설정 / 제거)
                                    |
                                    v
                              제안됨 (is_active=false)
```

- 노출중 ↔ 제안됨 전환은 `is_active` 토글로 반복 가능
- 삭제(DELETE)는 물리 삭제가 아닌 `is_active=false` 전환 (소프트 삭제)

---

## 6. 핵심 정책

### 제안 정책

- APPROVED + is_active=true인 SPO만 제안 가능
- 공급자 본인 소유 SPO만 제안 가능 (`neture_suppliers.user_id` 검증)
- 이미 등록된 SPO는 제안 불가 (중복 방지)

### 노출 정책

- `organization_product_listings.is_active = true`인 항목만 HUB에 노출
- 공개 조회 쿼리: `service_key = 'kpa-groupbuy' AND is_active = true`

### 중복 정책

- 동일 `offer_id`는 `service_key = 'kpa-groupbuy'` 내에서 1회만 등록 가능
- 공급자 제안 시 중복 → `409 ALREADY_PROPOSED`
- 운영자 추가 시 중복 → `409 ALREADY_REGISTERED`

### 참여 정책

- `is_active=true`인 이벤트만 참여 가능
- 참여 시 SPO 상태 검증: `is_active=true`, `approval_status='APPROVED'`, 공급자 `status='ACTIVE'`
- 가격은 `supplier_product_offers.price_general` 기준 (실시간)
- 주문은 반드시 `checkoutService.createOrder()` 경유 (CLAUDE.md 규칙)
- 주문 데이터: `checkout_orders` 테이블, `metadata->>'serviceKey' = 'kpa-groupbuy'`

### 조직 ID 정책

- OPL의 `organization_id`는 KPA 운영자 조직 ID 자동 주입
- 공급자: `kpa_members WHERE role = 'operator'`에서 조회
- 운영자: 본인 `kpa_members.organization_id` 우선, 없으면 operator 역할 기준 fallback

---

## 7. UX 정책

### 공급자 화면

| 영역 | 설명 |
|------|------|
| 제안 가능 목록 | APPROVED SPO 중 미등록 항목 표시 |
| 내 제안 목록 | 이미 제안한 OPL 목록 (상태: pending / active) |

### 운영자 화면

| 영역 | 설명 |
|------|------|
| 이벤트 목록 | 전체 OPL (is_active 무관), 주문수/참여자수 포함 |
| 등록 가능 목록 | 미등록 APPROVED SPO 드롭다운 |
| 노출 토글 | 미노출 ↔ 노출중 전환 |

### 약국 화면

| 영역 | 설명 |
|------|------|
| 이벤트 목록 | is_active=true 항목만 페이지네이션 |
| 상세 | 단일 이벤트 정보 + 참여 CTA |
| 내 참여 이력 | checkout_orders 기반 주문 목록 |

### 용어 규칙

- **"노출" / "미노출"** 사용
- **"승인" / "심사"** 사용 금지

---

## 8. API 요약

### 공급자 API (`/api/v1/kpa/supplier/*`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/supplier/my-offers` | 제안 가능한 SPO 목록 | requireAuth |
| GET | `/supplier/event-offers` | 내 제안 OPL 목록 | requireAuth |
| POST | `/supplier/event-offers` | SPO → 이벤트 제안 (is_active=false) | requireAuth |

### 운영자 API (`/api/v1/kpa/groupbuy-admin/*`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/groupbuy-admin/available-offers` | 등록 가능한 SPO 목록 | kpa:operator |
| GET | `/groupbuy-admin/products` | 이벤트 상품 목록 (전체) | kpa:operator |
| POST | `/groupbuy-admin/products` | 이벤트 상품 추가 (is_active=true) | kpa:operator |
| POST | `/groupbuy-admin/products/:id/visibility` | 노출/미노출 토글 | kpa:operator |
| DELETE | `/groupbuy-admin/products/:id` | 상품 제거 (is_active=false) | kpa:operator |
| GET | `/groupbuy-admin/stats` | 집계 통계 | kpa:operator |
| GET | `/groupbuy-admin/supplier-status` | 공급자 연계 상태 | kpa:operator |

### 약국/공개 API (`/api/v1/kpa/groupbuy/*`)

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| GET | `/groupbuy` | 이벤트 목록 (페이지네이션) | optionalAuth |
| GET | `/groupbuy/:id` | 이벤트 상세 | optionalAuth |
| GET | `/groupbuy/stats` | 운영자 통계 | kpa:operator |
| GET | `/groupbuy/my-participations` | 내 참여 이력 | requireAuth |
| POST | `/groupbuy/:id/participate` | 참여(주문 생성) | requireAuth |

---

## 9. 금지 사항

| # | 금지 항목 | 이유 |
|---|----------|------|
| 1 | DB 스키마 변경 | 현재 구조로 운영 완료, 추가 테이블/컬럼 불필요 |
| 2 | `offer_id` nullable 변경 | SPO 연결이 Event Offer의 핵심 구조 |
| 3 | GroupbuyCampaign 엔티티 사용 | 레거시, OPL 기반 구조로 대체 완료 |
| 4 | 새로운 승인 단계 추가 | 노출 중심 구조 유지, 승인/심사 개념 도입 금지 |
| 5 | 독립 주문 테이블 생성 | `checkoutService.createOrder()` 필수 (CLAUDE.md 규칙) |
| 6 | 구조 변경 없이 확장 | 기존 OPL + checkout_orders 구조 내에서만 확장 |

---

## 10. 한 줄 정의

> **Event Offer는 공급자가 기존 승인 상품(SPO)을 서비스에 제안하고, 운영자가 노출을 관리하며, 약국이 참여하는 구조이다.**

---

*작성일: 2026-04-15*
*기준: 실 운영 코드 (WO-EVENT-OFFER-MINIMAL-COMPLETION-V1 ~ WO-EVENT-OFFER-OPERATOR-UX-REFINE-V1)*
*Status: Active Policy*
