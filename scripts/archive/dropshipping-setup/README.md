# Dropshipping Setup Scripts Archive

이 폴더는 드롭쉬핑 CPT 설정 중 사용된 일회성 스크립트들을 보관합니다.

## 아카이브된 스크립트들

### 1. `initialize-dropshipping-cpts.js`
- 드롭쉬핑 CPT 초기 생성 스크립트
- ds_supplier, ds_partner, ds_product, ds_commission_policy, ds_order 생성

### 2. `fix-dropshipping-cpts.js` / `fix-dropshipping-cpts.sql`
- 잘못된 복수형 CPT 수정 스크립트
- ds_suppliers → ds_supplier 등 정리

### 3. `remove-duplicate-cpts.js`
- 중복 CPT 제거 스크립트
- ds_suppliers, ds_products, ds_orders 삭제

### 4. `check-dropshipping-cpts.js`
- CPT 상태 확인 스크립트

### 5. `create-dropshipping-sample-data.js`
- 테스트용 샘플 데이터 생성 스크립트

## 주의사항

이 스크립트들은 이미 실행 완료되었으며, 재실행하면 데이터 중복이나 오류가 발생할 수 있습니다.

## 현재 활성 CPT 목록

- `ds_supplier` - 공급자
- `ds_partner` - 파트너
- `ds_product` - 드롭쉬핑 상품
- `ds_commission_policy` - 수수료 정책
- `ds_order` - 주문

## 관련 마이그레이션

- `1758897000000-InitializeDropshippingCPTs.ts` - 올바른 드롭쉬핑 CPT 생성
- ~~`1759103000000-CreateCustomPostTypeTables.ts`~~ - 삭제됨 (중복 생성 방지)