좋습니다!
다음 작업인 **관리자에서 판매자(rena\_store)를 직접 등록할 수 있는 UI와 기능**에 대한 명세서를 준비해드리겠습니다.

---

### 📄 `task-004-admin-create-seller.md`

📁 저장 위치:
`dev-mcp/services/wordpress/plugins/rena-retail/rena-multistore/tasks/task-004-admin-create-seller.md`

---

````markdown
# Task 004: 관리자에서 판매자 등록 기능 구현

## 🧩 작업 목적

플러그인 관리자 화면에서 판매자(post_type = `rena_store`)를 직접 등록할 수 있는 폼을 구현한다.  
기존 판매자 리스트 위 또는 아래에 간단한 입력 폼을 구성하여, 새 판매자를 빠르게 등록할 수 있도록 한다.

---

## ✅ 요구 사항

| 항목 | 설명 |
|------|------|
| 입력 항목 | 판매자명, 슬러그, 설명 |
| 처리 방식 | `wp_insert_post()` 함수 사용 |
| 슬러그 유효성 | 중복 방지 (`wp_unique_post_slug()`) 적용됨 |
| 등록 결과 | 성공 시 상단 메시지 출력 후 목록 갱신 |
| 권한 체크 | `current_user_can('manage_options')` 필수 |

---

## ✨ 관리자 입력 폼 (HTML)

```html
<h2>새 판매자 등록</h2>
<form method="post">
  <table class="form-table">
    <tr>
      <th><label for="seller_name">판매자명</label></th>
      <td><input type="text" name="seller_name" id="seller_name" class="regular-text" required></td>
    </tr>
    <tr>
      <th><label for="seller_slug">슬러그</label></th>
      <td><input type="text" name="seller_slug" id="seller_slug" class="regular-text"></td>
    </tr>
    <tr>
      <th><label for="seller_desc">설명</label></th>
      <td><textarea name="seller_desc" id="seller_desc" rows="3" class="large-text"></textarea></td>
    </tr>
  </table>
  <p><input type="submit" name="create_seller" class="button-primary" value="판매자 등록"></p>
</form>
````

---

## 🧩 백엔드 처리

`class-rena-multistore-admin.php`의 `display_plugin_main_page()` 또는 별도 메서드에서:

```php
if (isset($_POST['create_seller']) && current_user_can('manage_options')) {
  $title = sanitize_text_field($_POST['seller_name']);
  $slug  = sanitize_title($_POST['seller_slug']);
  $desc  = sanitize_textarea_field($_POST['seller_desc']);

  $new_id = wp_insert_post([
    'post_type'   => 'rena_store',
    'post_title'  => $title,
    'post_name'   => $slug,
    'post_status' => 'publish',
    'post_content'=> $desc,
    'post_author' => get_current_user_id()
  ]);

  if ($new_id) {
    echo '<div class="notice notice-success is-dismissible"><p>판매자가 등록되었습니다.</p></div>';
  }
}
```

---

## 📂 코드 파일 위치 기준

| 역할        | 경로                                                 |
| --------- | -------------------------------------------------- |
| 관리자 화면 출력 | `admin/partials/rena-multistore-admin-display.php` |
| 폼 처리 위치   | `class-rena-multistore-admin.php` 내부               |

---

## ✅ Cursor GPT 요청 예시


이 task 문서를 기반으로 관리자 페이지에서
판매자를 등록할 수 있는 입력 폼을 구성해줘.
admin-display.php에 폼을 추가하고,
폼 입력이 submit되면 wp_insert_post로 rena_store CPT를 등록하도록 해줘.


---

**작성일**: 2025-04-30
**작성자**: Rena

```

