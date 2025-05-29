
# 데이터베이스 스키마 설계 (Database Schema) - rena-multistore

---

## 1. 개요

rena-multistore 플러그인은 판매자/약국 단위의 스토어를 등록하고  
각 스토어별로 WooCommerce 상품을 선택 진열할 수 있도록  
별도의 데이터 저장 구조를 설계합니다.

스토어는 CPT(또는 전용 테이블)로 관리되며,  
상품 진열 설정은 관계 테이블로 분리 저장됩니다.

---

## 2. 테이블 설계

### ▸ 테이블 1: `wp_rena_stores`

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | BIGINT | 스토어 ID (PK) |
| owner_id | BIGINT | WordPress 사용자 ID |
| store_slug | VARCHAR(100) | 고유 슬러그 (URL 구성) |
| store_name | VARCHAR(255) | 상점 이름 |
| description | TEXT | 설명 |
| status | VARCHAR(20) | 공개 / 비공개 / 대기 |
| logo_url | TEXT | 로고 이미지 URL |
| created_at | DATETIME | 생성일 |
| updated_at | DATETIME | 수정일 |

---

### ▸ 테이블 2: `wp_rena_store_products`

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | BIGINT | PK |
| store_id | BIGINT | `wp_rena_stores.id` FK |
| woo_product_id | BIGINT | WooCommerce 상품 ID |
| display_order | INT | 진열 순서 |
| is_visible | BOOLEAN | 진열 여부 |
| added_at | DATETIME | 등록일 |

※ 상품 ID는 WooCommerce에서 API로 연동한 값이며,  
이 테이블은 **상품 진열 상태만을 저장**합니다.

---

## 3. 추가 구조 (옵션)

### ▸ 사용자 메타 (`wp_usermeta`)

| 메타 키 | 설명 |
|---------|------|
| `rena_store_id` | 해당 사용자가 소유한 스토어 ID |
| `rena_store_role` | seller, supplier 등 구분 |

---

## 4. 설계 원칙

- 가능한 모든 데이터는 `rena_` prefix로 명확히 구분
- 핵심 정보는 커스텀 테이블에 저장 (postmeta는 가급적 사용하지 않음)
- 외래키(FK)는 설정하되, WordPress 테이블 구조와 충돌하지 않도록 주의
- `woo_product_id`는 WooCommerce API에서 가져온 ID 기준

---

## 5. 고려 사항

- WooCommerce와의 동기화를 위해 상품 정보는 API 기준으로 관리됨
- 스토어 정보는 CPT 또는 커스텀 테이블로 전환 가능 (플러그인 설정에 따라 변경 가능성 있음)
- 검색, 필터 성능을 고려해 인덱스 설계 필요

---

# Update History

- [2025-04-30] 최초 작성
