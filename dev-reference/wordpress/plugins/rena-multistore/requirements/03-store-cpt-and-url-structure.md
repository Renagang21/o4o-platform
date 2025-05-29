
# 스토어 CPT 및 URL 구조 설계

## 1. 목적

본 문서는 `rena-multistore` 플러그인에서 판매자(store)의 정보를  
**커스텀 포스트 타입(CPT)**과 **서브디렉토리 기반 URL 구조**를 통해 구성하는 방식을 정의합니다.

---

## 2. 기본 구조

- 사이트 URL: `https://site-domain`
- 판매자 URL: `https://site-domain/seller/슬러그`

예시:
- `https://neture.co.kr/seller/johnstore`
- `https://neture.co.kr/seller/pharm123`

---

## 3. 판매자 CPT 정의

| 항목 | 값 |
|------|----|
| post_type | `rena_store` |
| slug | 판매자 고유 URL 슬러그 |
| post_author | 연결된 사용자 (판매자 계정) |
| 상태 | `publish`, `pending`, `disabled` 등 |
| 기타 필드 | 이름, 소개글, 연락처, 대표 이미지, 테마 설정 등

---

## 4. URL 구조와 처리 방식

### ✅ URL 패턴

```

/seller/{seller\_slug}

````

### ✅ rewrite rule 등록

```php
add_rewrite_rule(
    '^seller/([^/]+)/?$',
    'index.php?rena_store_slug=$matches[1]',
    'top'
);
````

### ✅ query var 등록

```php
function rena_store_query_vars($vars) {
    $vars[] = 'rena_store_slug';
    return $vars;
}
add_filter('query_vars', 'rena_store_query_vars');
```

### ✅ 템플릿 처리

```php
function rena_store_template_redirect() {
    $slug = get_query_var('rena_store_slug');
    if ($slug) {
        $store = get_page_by_path($slug, OBJECT, 'rena_store');
        if ($store) {
            include plugin_dir_path(__FILE__) . 'public/templates/store-page.php';
            exit;
        }
    }
}
add_action('template_redirect', 'rena_store_template_redirect');
```

---

## 5. seller\_slug의 유일성 및 등록 방식

* 등록 시 `wp_unique_post_slug()` 사용하여 중복 방지
* 사용자 정보 기반 자동 생성 가능 (예: `user_login`, `user_nicename`)
* 관리자 승인 시 슬러그 수동 편집도 허용 가능

---

## 6. 추가 고려사항

| 항목           | 설명                                                            |
| ------------ | ------------------------------------------------------------- |
| 슬러그 변경 허용 여부 | 기본 비허용 (기존 링크 유지 위해), 요청 시 변경 로그 저장 고려                        |
| URL 충돌 방지    | `seller` 슬러그 하위에만 적용되므로 워드프레스 페이지와 충돌 없음                      |
| 서브도메인 방식 전환  | 향후 `seller-name.main.site` 구조로 확장 가능성 있음 (프록시 또는 Nginx 설정 필요) |

---

## 7. 향후 확장 고려

| 항목                  | 설명                                  |
| ------------------- | ----------------------------------- |
| seller 전용 페이지 UI 구성 | Gutenberg 블록 or 플러그인 템플릿 기반         |
| seller 상품 필터링       | WooCommerce REST API에서 공급자 ID 기준 필터 |
| seller 전용 관리자 메뉴    | 프론트엔드에서 “내 상품”, “스토어 설정” 메뉴 구성      |

---

**작성일**: 2025-04-30
**작성자**: Rena

