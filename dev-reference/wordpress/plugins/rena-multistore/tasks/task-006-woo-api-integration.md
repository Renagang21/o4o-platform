좋습니다!
이제 `rena-multistore`에서 WooCommerce REST API를 통해 **판매자가 공급자 상품을 가져와 자신의 스토어에 등록하는 기능**에 대한 작업 명세서를 작성해드리겠습니다.

---

### 📄 `task-006-woo-api-integration.md`

📁 저장 위치:
`dev-mcp/services/wordpress/plugins/rena-retail/rena-multistore/tasks/task-006-woo-api-integration.md`

---

````markdown
# Task 006: WooCommerce 상품 API 연동 및 스토어 상품 등록

## 🧩 작업 목적

판매자가 WooCommerce에 등록된 상품을 **REST API를 통해 가져와**,  
본인의 스토어(`rena_store`)에 등록할 수 있도록 연결하는 기능을 구현한다.  
공급자(공식 관리자)만 상품을 등록하며, 판매자는 API를 통해 공급자 상품 중 일부를 선택하여 본인의 상품으로 가져올 수 있다.

---

## ✅ 요구 사항 요약

| 항목 | 설명 |
|------|------|
| WooCommerce API | `https://woocommerce.site/wp-json/wc/v3/products` |
| 인증 방식 | API Key (Consumer Key / Secret) or JWT |
| 판매자 상품 필터 | 공급자 ID 또는 태그/메타 정보 기준 필터링 |
| 가져오기 방식 | API 호출 → 선택 → 로컬 등록 (CPT or WooCommerce 상품) |
| 저장 방식 | 복제 or 연동 → 우선 복제 방식 사용 (로컬 DB에 저장)

---

## 🛠 처리 흐름

1. 판매자가 Woo API 상품 목록 요청 (`GET /products`)
2. 상품 카드형 리스트 UI 구성 (썸네일, 이름, 가격 등)
3. 개별 상품에 대해 “가져오기” 버튼 제공
4. 버튼 클릭 시:
   - 상품 정보를 로컬 CPT 또는 WooCommerce 상품으로 저장
   - 저장 시 `post_author = 현재 판매자 사용자 ID` 지정

---

## 🧠 상품 구조 변환 예시

| WooCommerce API 상품 | 로컬 DB 등록 항목 |
|----------------------|-------------------|
| `name` | `post_title` |
| `description` | `post_content` |
| `images[0].src` | 썸네일 (meta) |
| `price` | 커스텀 필드로 저장 |
| `id` | 원본 Woo 상품 ID → 추적용 meta 저장

---

## ✨ UI 예시

```php
<div class="woo-product">
  <img src="..." />
  <h4>상품명</h4>
  <p>가격: ₩00,000</p>
  <form method="post">
    <input type="hidden" name="origin_id" value="123" />
    <input type="submit" name="import_product" value="내 스토어에 등록" class="button-primary" />
  </form>
</div>
````

---

## 📂 관련 구성

| 요소         | 경로/설정 예                                                  |
| ---------- | -------------------------------------------------------- |
| API 연동 클래스 | `includes/class-rena-api-client.php`                     |
| 저장 CPT     | `product_post` 또는 WooCommerce product (API 연동 방식에 따라 선택) |
| 저장 위치      | `rena_store_product` 등 판매자별로 meta 저장 고려                  |
| 프론트 UI 위치  | `/seller-dashboard/products` 또는 숏코드 기반                   |


---

## 🚧 후속 고려 사항

| 항목           | 설명                         |
| ------------ | -------------------------- |
| 상품 가격 동기화 여부 | 원본 Woo 상품이 바뀌었을 때 자동 반영 여부 |
| 재고, 배송 정보    | 현재는 제외 (1차 MVP)            |
| 이미지 다운로드     | 외부 링크 유지 or 서버에 복사 여부      |

---

**작성일**: 2025-04-30
**작성자**: Rena

```


