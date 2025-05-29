

### 📄 `task-003-admin-dashboard.md`

📁 저장 위치:
`dev-mcp/services/wordpress/plugins/rena-retail/rena-multistore/tasks/task-003-admin-dashboard.md`

---


# Task 003: 관리자 대시보드 화면 구성

## 🧩 작업 목적

현재 `rena-multistore` 플러그인의 관리자 메뉴는 표시되지만, 클릭 시 내용이 없는 상태입니다.  
본 작업은 관리자 메뉴 클릭 시 나타나는 기본 대시보드 화면을 구성하고,  
등록된 판매자(`rena_store` CPT)의 리스트를 테이블 형태로 표시하는 기능을 구현하는 데 목적이 있습니다.

---

## ✅ 요구 사항

| 항목 | 설명 |
|------|------|
| 파일 위치 | `admin/partials/rena-multistore-admin-display.php` |
| 데이터 소스 | post_type = `rena_store` |
| 출력 항목 | 판매자명, 슬러그, 상태, 등록일, 액션 버튼(편집 등) |
| UI 구성 | 기본 WordPress 테이블 스타일 사용 (`wp-list-table` 형태 아님) |
| 관리자 권한 확인 | `current_user_can('manage_options')` 필수 |

---

## ✨ 화면 예시 구조 (HTML)

```html
<h2>판매자 목록</h2>
<table class="widefat striped">
  <thead>
    <tr>
      <th>판매자명</th>
      <th>슬러그</th>
      <th>상태</th>
      <th>등록일</th>
      <th>관리</th>
    </tr>
  </thead>
  <tbody>
    <?php foreach ($stores as $store): ?>
      <tr>
        <td><?= esc_html($store->post_title) ?></td>
        <td><?= esc_html($store->post_name) ?></td>
        <td><?= esc_html($store->post_status) ?></td>
        <td><?= esc_html($store->post_date) ?></td>
        <td>
          <a href="<?= get_edit_post_link($store->ID) ?>" class="button">편집</a>
        </td>
      </tr>
    <?php endforeach; ?>
  </tbody>
</table>
````

---

## 🧩 백엔드 로직 위치

파일: `class-rena-multistore-admin.php`
함수: `display_plugin_main_page()` 내부에 아래 로직 포함

```php
$stores = get_posts([
  'post_type' => 'rena_store',
  'post_status' => ['publish', 'pending', 'draft'],
  'numberposts' => -1
]);

include plugin_dir_path(__FILE__) . 'partials/rena-multistore-admin-display.php';
```

> `$stores` 변수를 `partials` 템플릿에 넘기도록 할 것

---

## 📂 코드 파일 위치 기준

| 역할       | 경로                                                 |
| -------- | -------------------------------------------------- |
| 관리자 표시 뷰 | `admin/partials/rena-multistore-admin-display.php` |
| 관리자 클래스  | `admin/class-rena-multistore-admin.php`            |
| 데이터 쿼리   | `get_posts()` + CPT 조건 필터                          |

---

## ✅ Cursor GPT 요청 예시

```
이 task 문서를 기반으로 관리자 메뉴 클릭 시
판매자 목록이 출력되는 화면을 구성해줘.
admin-display.php 파일에 테이블을 넣고,
admin 클래스에서는 get_posts로 데이터 조회하도록 구성해줘.
```

---

**작성일**: 2025-04-30
**작성자**: Rena



