좋습니다!
지금까지 정리한 내용을 기반으로 실제 Cursor에서 사용 가능한 작업 지시서를 작성해드리겠습니다.

---

### 📄 `task-002-store-url-routing.md`

📁 저장 위치:
`dev-mcp/services/wordpress/plugins/rena-retail/rena-multistore/tasks/task-002-store-url-routing.md`

---

````markdown
# Task 002: 판매자 URL 라우팅 기능 구현

## 🧩 작업 목적

`rena-multistore` 플러그인에서 판매자 CPT(`rena_store`)의 고유 슬러그를 사용하여,  
`/seller/{seller_slug}` 형태의 URL로 해당 판매자의 페이지를 프론트엔드에서 표시할 수 있도록 라우팅 기능을 구현한다.

---

## ✅ 요구 사항

| 항목 | 설명 |
|------|------|
| CPT 타입 | `rena_store` |
| URL 패턴 | `/seller/{seller_slug}` |
| 처리 방식 | rewrite rule → query var → template redirect |
| 출력 템플릿 | `public/templates/store-page.php` |
| 클래스 반영 | `Rena_Multistore_Public` 내부에 처리 함수 작성 |
| 연결 위치 | `Rena_Multistore_Loader`의 `define_public_hooks()`에서 `add_action()` 처리 |

---

## ✨ 구현할 기능 목록

### 1. rewrite rule 등록

```php
add_rewrite_rule(
    '^seller/([^/]+)/?$',
    'index.php?rena_store_slug=$matches[1]',
    'top'
);
````

### 2. query var 등록

```php
add_filter('query_vars', function($vars) {
    $vars[] = 'rena_store_slug';
    return $vars;
});
```

### 3. 템플릿 처리

```php
add_action('template_redirect', function() {
    $slug = get_query_var('rena_store_slug');
    if ($slug) {
        $store = get_page_by_path($slug, OBJECT, 'rena_store');
        if ($store) {
            include plugin_dir_path(__FILE__) . '../templates/store-page.php';
            exit;
        }
    }
});
```

> 위 세 개의 함수는 모두 `class-rena-multistore-public.php` 클래스 내부 메서드로 구현할 것
> Loader 클래스에서 `add_action()`으로 연결 필수

---

## 📂 코드 파일 경로 기준

| 역할         | 경로                                          |
| ---------- | ------------------------------------------- |
| public 클래스 | `public/class-rena-multistore-public.php`   |
| loader 클래스 | `includes/class-rena-multistore-loader.php` |
| 출력 템플릿     | `public/templates/store-page.php` (없으면 생성)  |

---

## 🧠 개발자용 지시어 (Cursor GPT 용)

```
이 문서를 기반으로 라우팅 기능을 구현해줘.
public 클래스 내부에 메서드로 정의하고, loader에서 연결하며,
템플릿도 생성 포함해줘.
```

---

**작성일**: 2025-04-30
**작성자**: Rena


