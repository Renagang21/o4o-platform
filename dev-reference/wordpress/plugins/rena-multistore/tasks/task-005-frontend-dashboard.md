좋습니다!
이제 프론트엔드에서 판매자(seller)들이 자신의 스토어를 관리할 수 있는 **판매자용 대시보드 화면** 작업을 위한 명세서를 작성해드립니다.

---

### 📄 `task-005-frontend-dashboard.md`

📁 저장 위치:
`dev-mcp/services/wordpress/plugins/rena-retail/rena-multistore/tasks/task-005-frontend-dashboard.md`

---

````markdown
# Task 005: 프론트엔드 판매자 대시보드 구성

## 🧩 작업 목적

판매자(seller)들이 워드프레스 **프론트엔드 화면에서 자신의 스토어를 관리**할 수 있는 UI를 제공합니다.  
이를 위해 로그인된 사용자의 판매자 계정 여부를 확인하고,  
해당 사용자가 등록한 `rena_store` CPT를 기반으로 “내 스토어 관리” 화면을 구성합니다.

---

## ✅ 요구 사항

| 항목 | 설명 |
|------|------|
| 접근 조건 | 로그인 + 사용자 역할: `store_seller` |
| 접근 URL | `/seller-dashboard/` (페이지로 설정하거나 shortcode 처리) |
| 출력 항목 | 스토어 제목, 상태, 등록일, 수정 링크 |
| 등록 안내 | 스토어가 없을 경우 “판매자 등록하기” 버튼 표시 |
| 화면 UI | 기본 WordPress 페이지 구조 활용 (`get_header()` / `get_footer()`)

---

## ✨ HTML UI 예시

```php
<?php get_header(); ?>

<div class="rena-store-dashboard">
  <h2>내 스토어 관리</h2>

  <?php if ($store): ?>
    <ul>
      <li><strong>스토어명:</strong> <?= esc_html($store->post_title) ?></li>
      <li><strong>슬러그:</strong> <?= esc_html($store->post_name) ?></li>
      <li><strong>등록일:</strong> <?= esc_html($store->post_date) ?></li>
      <li><a href="<?= get_edit_post_link($store->ID) ?>" class="button">스토어 정보 수정</a></li>
    </ul>
  <?php else: ?>
    <p>아직 등록된 스토어가 없습니다.</p>
    <a href="/seller-registration/" class="button button-primary">판매자 등록하기</a>
  <?php endif; ?>
</div>

<?php get_footer(); ?>
````

---

## 🧩 처리 로직 요약

1. 현재 로그인된 사용자 확인
2. `rena_store` CPT 중 `post_author = current_user_id()` 인 post 1개 조회
3. 결과를 기반으로 화면에 정보 출력 or 등록 버튼 표시

---

## 🧠 구현 방식

| 구현 방법      | 설명                                                                  |
| ---------- | ------------------------------------------------------------------- |
| 커스텀 템플릿 파일 | `page-seller-dashboard.php` 생성 후, 페이지에 템플릿 지정                       |
| 또는 숏코드 사용  | `[rena_seller_dashboard]` 형태로도 구현 가능                                |
| 사용자 역할 확인  | `current_user_can('store_seller')` 또는 직접 `get_userdata()->roles` 사용 |

---

## 📂 파일/위치 기준

| 역할          | 경로 예시                                   |
| ----------- | --------------------------------------- |
| 프론트 대시보드 출력 | `page-seller-dashboard.php` or 숏코드 함수   |
| 템플릿 위치      | 테마 or 플러그인 내부 `public/templates` 가능     |
| 역할명         | `store_seller` (또는 `rena_store_seller`) |

---



**작성일**: 2025-04-30
**작성자**: Rena

```

