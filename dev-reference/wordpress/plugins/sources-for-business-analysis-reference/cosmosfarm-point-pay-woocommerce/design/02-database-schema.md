# 02. Database Schema - Cosmosfarm Point Pay for WooCommerce

## 📋 개요

Cosmosfarm Point Pay for WooCommerce는 사용자별 포인트 정보를 `usermeta`에 저장하고, 포인트 지급/차감 이력은 별도 로그 테이블에 기록합니다. WooCommerce 주문과도 연결되어 있어 주문 기반 자동 적립이 가능합니다.

---

## 1. 주요 테이블 및 필드

### ✅ wp_usermeta (포인트 잔액)

| 메타키 | 설명 |
|--------|------|
| `cosmosfarm_point` | 사용자 보유 포인트 (정수형) |

---

### ✅ 포인트 로그 테이블 (커스텀 테이블 또는 CPT 가능성)

| 필드명 | 설명 |
|--------|------|
| `ID` | 로그 ID |
| `user_id` | 사용자 ID |
| `point` | 변동된 포인트 수량 (양수/음수) |
| `type` | 지급 / 차감 / 소멸 구분 |
| `order_id` | WooCommerce 주문 ID (있을 경우) |
| `reason` | 지급/차감 사유 |
| `expire_date` | 소멸 예정일 |
| `created_at` | 생성일시 |

---

## 2. WooCommerce 주문 메타

| 메타키 | 설명 |
|--------|------|
| `_used_cosmosfarm_point` | 해당 주문에서 사용된 포인트 |
| `_earned_cosmosfarm_point` | 주문 완료 후 적립된 포인트 수량 |

---

## 3. 옵션 테이블 (설정값 저장)

| 옵션 키 | 설명 |
|---------|------|
| `cosmosfarm_point_default_rate` | 적립 비율 (%) |
| `cosmosfarm_point_max_usage_rate` | 결제 시 최대 사용 비율 (%) |
| `cosmosfarm_point_expire_days` | 포인트 유효기간 (예: 365일) |
| `cosmosfarm_point_min_amount_to_use` | 사용 가능한 최소 포인트 수치 |

---

## 4. ERD 개요 (텍스트 기반)
[wp_users]──<meta: cosmosfarm_point>──[wp_usermeta] │ │ 지급/차감 발생 ▼ [point_log_table] ▲ │ 적립 기준 │ [woo_order]──<postmeta>──[used/earned point]


---

## 5. rena-retail 설계에 대한 시사점

| 항목 | 제안 방향 |
|------|-----------|
| 포인트 잔액 | usermeta 기반 유지 가능하나, 확장성 위해 별도 테이블 고려 |
| 포인트 로그 | CPT보다 커스텀 테이블이 성능상 유리 (기간별 정렬, 통계 등) |
| 적립 기준 | 상품/스토어/카테고리 단위 적립 비율 확장 설계 필요 |
| 사용 조건 | 복합 조건(최소 사용 포인트, 특정 상품 제외 등) 로직 설계 고려 |

---

**작성일**: 2025-04-30  
**작성자**: ChatGPT

