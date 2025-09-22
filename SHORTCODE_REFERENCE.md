# Shortcode Reference Guide

이 문서는 사이트에서 사용 가능한 모든 shortcode의 상세 정보를 제공합니다.

## 목차
- [E-commerce Shortcodes](#e-commerce-shortcodes)
- [Forms Shortcodes](#forms-shortcodes)
- [Media Shortcodes](#media-shortcodes)
- [Content Shortcodes](#content-shortcodes)
- [Layout Shortcodes](#layout-shortcodes)
- [Social Shortcodes](#social-shortcodes)

---

## E-commerce Shortcodes

### 1. `[product]` - 단일 상품 표시

상품 상세 정보를 페이지에 삽입할 때 사용합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 필수 |
|---------|------|--------|------|------|
| id | string | - | 상품 ID 또는 슬러그 | ✅ |
| show_price | boolean | true | 가격 표시 여부 | |
| show_cart | boolean | true | 장바구니 버튼 표시 여부 | |
| show_description | boolean | false | 상품 설명 표시 여부 | |
| class | string | - | 추가 CSS 클래스 | |

**사용 예시:**
```
[product id="123"]
[product id="awesome-product" show_cart="false"]
[product id="123" show_description="true" class="featured"]
```

---

### 2. `[product_grid]` - 상품 그리드

카테고리 페이지나 상품 목록 페이지에서 사용합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| category | string | - | 카테고리 ID 또는 슬러그 | |
| limit | number | 12 | 표시할 상품 수 | |
| columns | number | 4 | 그리드 열 수 | 1-6 |
| featured | boolean | false | 추천 상품만 표시 | |
| on_sale | boolean | false | 할인 상품만 표시 | |
| orderby | string | created_at | 정렬 기준 | price, name, created_at, popularity |
| order | string | desc | 정렬 순서 | asc, desc |
| show_pagination | boolean | false | 페이지네이션 표시 | |

**사용 예시:**
```
[product_grid category="electronics" limit="8"]
[product_grid featured="true" columns="3"]
[product_grid on_sale="true" orderby="price" order="asc"]
```

---

### 3. `[add_to_cart]` - 장바구니 추가 버튼

블로그 포스트나 페이지 내에서 구매 버튼을 삽입할 때 사용합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| id | string | - | 상품 ID | ✅ |
| text | string | 장바구니에 담기 | 버튼 텍스트 | |
| show_price | boolean | true | 가격 표시 여부 | |
| quantity | number | 1 | 기본 수량 | |
| style | string | primary | 버튼 스타일 | primary, secondary, outline |
| size | string | medium | 버튼 크기 | small, medium, large |
| class | string | - | 추가 CSS 클래스 | |

**사용 예시:**
```
[add_to_cart id="123"]
[add_to_cart id="123" text="구매하기" style="secondary"]
[add_to_cart id="123" quantity="2" size="large"]
```

---

### 4. `[product_carousel]` - 상품 캐러셀

홈페이지나 랜딩 페이지에서 상품을 슬라이더로 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| category | string | - | 카테고리 ID 또는 슬러그 |
| limit | number | 10 | 표시할 상품 수 |
| autoplay | boolean | true | 자동 재생 여부 |
| speed | number | 3000 | 자동 재생 속도(ms) |
| title | string | - | 캐러셀 제목 |
| show_dots | boolean | true | 네비게이션 점 표시 |
| show_arrows | boolean | true | 좌우 화살표 표시 |

**사용 예시:**
```
[product_carousel category="new-arrivals"]
[product_carousel title="베스트셀러" limit="15" speed="5000"]
[product_carousel category="sale" autoplay="false" show_dots="false"]
```

---

### 5. `[featured_products]` - 추천 상품

메인 페이지나 사이드바에서 추천 상품을 노출합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| limit | number | 4 | 표시할 상품 수 |
| columns | number | 4 | 그리드 열 수 |
| title | string | 추천 상품 | 섹션 제목 |
| show_rating | boolean | true | 평점 표시 여부 |
| show_badge | boolean | true | 뱃지(NEW, SALE 등) 표시 |

**사용 예시:**
```
[featured_products]
[featured_products limit="6" columns="3"]
[featured_products title="이달의 추천" show_rating="false"]
```

---

### 6. `[product_categories]` - 상품 카테고리

카테고리 네비게이션이나 카테고리 쇼케이스용입니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| show_count | boolean | true | 상품 수 표시 여부 |
| hide_empty | boolean | true | 빈 카테고리 숨김 |
| columns | number | 3 | 그리드 열 수 |
| parent | string | - | 특정 부모 카테고리의 하위만 표시 |
| show_image | boolean | true | 카테고리 이미지 표시 |

**사용 예시:**
```
[product_categories]
[product_categories show_count="false" columns="4"]
[product_categories parent="fashion" hide_empty="false"]
```

---

## Forms Shortcodes

### 1. `[form]` - 폼 표시

문의, 신청, 설문 등 각종 폼을 페이지에 삽입합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| id | string | - | 폼 ID | ✅ |
| name | string | - | 폼 이름 (ID 대신 사용 가능) | |
| show_title | boolean | true | 폼 제목 표시 | |
| show_description | boolean | true | 폼 설명 표시 | |
| theme | string | default | 폼 테마 | default, minimal, modern, classic |
| layout | string | vertical | 폼 레이아웃 | vertical, horizontal, inline |
| ajax | boolean | true | AJAX 제출 사용 | |

**사용 예시:**
```
[form id="contact-form"]
[form name="newsletter" layout="inline"]
[form id="survey" theme="modern" show_description="false"]
```

---

### 2. `[view]` - 데이터 뷰

제출된 폼 데이터나 사용자 생성 콘텐츠를 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| id | string | - | 뷰 ID | ✅ |
| name | string | - | 뷰 이름 (ID 대신 사용 가능) | |
| show_title | boolean | true | 뷰 제목 표시 | |
| items_per_page | number | 25 | 페이지당 항목 수 | |
| enable_search | boolean | true | 검색 기능 활성화 | |
| enable_filters | boolean | true | 필터 기능 활성화 | |
| enable_export | boolean | false | 내보내기 기능 활성화 | |
| layout | string | table | 표시 레이아웃 | table, grid, list |

**사용 예시:**
```
[view id="submissions"]
[view name="gallery" layout="grid" items_per_page="12"]
[view id="reports" enable_export="true" enable_search="false"]
```

---

## Media Shortcodes

### 1. `[video]` - 비디오 삽입

YouTube, Vimeo 등 비디오를 임베드하거나 직접 업로드한 비디오를 재생합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| url | string | - | 비디오 URL | ✅ |
| width | string | 100% | 비디오 너비 |
| height | string | auto | 비디오 높이 |
| autoplay | boolean | false | 자동 재생 |
| loop | boolean | false | 반복 재생 |
| controls | boolean | true | 컨트롤 표시 |
| muted | boolean | false | 음소거 |
| poster | string | - | 썸네일 이미지 URL |

**사용 예시:**
```
[video url="https://youtube.com/watch?v=xxx"]
[video url="/uploads/demo.mp4" autoplay="true" muted="true"]
[video url="https://vimeo.com/xxx" width="720" height="405"]
```

---

### 2. `[gallery]` - 이미지 갤러리

여러 이미지를 그리드나 슬라이더 형태로 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| ids | string | - | 이미지 ID들 (쉼표로 구분) | ✅ |
| columns | number | 3 | 갤러리 열 수 | |
| size | string | medium | 이미지 크기 | thumbnail, medium, large, full |
| link | string | file | 클릭시 연결 | file, none, attachment |
| orderby | string | menu_order | 정렬 기준 | |

**사용 예시:**
```
[gallery ids="1,2,3,4,5"]
[gallery ids="1,2,3" columns="1" size="large"]
[gallery ids="10,11,12,13" link="none"]
```

---

## Content Shortcodes

### 1. `[recent_posts]` - 최근 게시물

블로그 최신글이나 공지사항을 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| limit | number | 5 | 표시할 게시물 수 |
| category | string | - | 특정 카테고리만 표시 |
| show_date | boolean | true | 날짜 표시 |
| show_excerpt | boolean | false | 요약 표시 |
| show_thumbnail | boolean | true | 썸네일 표시 |
| orderby | string | date | 정렬 기준 |

**사용 예시:**
```
[recent_posts]
[recent_posts limit="10" category="news"]
[recent_posts show_excerpt="true" show_thumbnail="false"]
```

---

### 2. `[author]` - 작성자 정보

게시물 작성자의 프로필이나 정보를 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| id | string | - | 작성자 ID (미지정시 현재 게시물 작성자) |
| show_avatar | boolean | true | 아바타 표시 |
| show_bio | boolean | true | 자기소개 표시 |
| show_posts | boolean | false | 작성한 글 목록 표시 |
| avatar_size | number | 96 | 아바타 크기(px) |

**사용 예시:**
```
[author]
[author id="john-doe" show_posts="true"]
[author show_avatar="false" show_bio="false"]
```

---

## Layout Shortcodes

### 1. `[row]` - 행 레이아웃

컬럼 레이아웃의 컨테이너로 사용합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| class | string | - | 추가 CSS 클래스 |
| style | string | - | 인라인 스타일 |
| gap | string | 20px | 컬럼 간격 |

**사용 예시:**
```
[row][column]내용[/column][/row]
[row gap="40px" class="my-row"]컨텐츠[/row]
```

---

### 2. `[column]` - 열 레이아웃

행 안에서 컬럼을 생성하여 다단 레이아웃을 구성합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| width | string | auto | 컬럼 너비 (1/2, 1/3, 2/3, 1/4 등) |
| class | string | - | 추가 CSS 클래스 |
| style | string | - | 인라인 스타일 |

**사용 예시:**
```
[column width="1/2"]반폭 컨텐츠[/column]
[column width="1/3" class="highlight"]1/3 컨텐츠[/column]
```

---

## Social Shortcodes

### 1. `[social_share]` - 소셜 공유

현재 페이지나 특정 URL을 소셜 미디어에 공유합니다.

| 파라미터 | 타입 | 기본값 | 설명 | 옵션 |
|---------|------|--------|------|------|
| networks | string | facebook,twitter,linkedin | 표시할 소셜 네트워크 | |
| url | string | - | 공유할 URL (미지정시 현재 페이지) | |
| title | string | - | 공유 제목 | |
| style | string | buttons | 표시 스타일 | buttons, icons, text |
| color | boolean | true | 브랜드 컬러 사용 | |

**사용 예시:**
```
[social_share]
[social_share networks="facebook,instagram,kakao"]
[social_share style="icons" color="false"]
```

---

### 2. `[instagram_feed]` - 인스타그램 피드

인스타그램 게시물을 웹사이트에 표시합니다.

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| username | string | - | 인스타그램 사용자명 | ✅ |
| limit | number | 6 | 표시할 게시물 수 |
| columns | number | 3 | 그리드 열 수 |
| show_caption | boolean | false | 캡션 표시 |
| show_likes | boolean | true | 좋아요 수 표시 |

**사용 예시:**
```
[instagram_feed username="myshop"]
[instagram_feed username="myshop" limit="9" columns="3"]
[instagram_feed username="myshop" show_caption="true"]
```

---

## 사용 팁

### 기본 사용법
1. **페이지/게시물 편집기에서 직접 입력**: 텍스트 에디터에 shortcode를 입력
2. **블록 에디터의 "Shortcode 블록" 사용**: 블록 추가 → Shortcode 선택
3. **위젯 영역에서도 사용 가능**: 사이드바, 푸터 등
4. **PHP에서 호출**: `<?php echo do_shortcode('[shortcode_name]'); ?>`

### 주의사항
- ✅ **필수 파라미터**는 반드시 입력해야 합니다
- 파라미터 값에 **공백이 있으면 따옴표** 사용: `title="My Title"`
- **중첩된 shortcode**는 일부만 지원됩니다
- 성능을 위해 **한 페이지에 너무 많이 사용하지 마세요**
- **대소문자 구분 없음**: `[PRODUCT]`와 `[product]` 동일

### 모범 사례
- 필요한 파라미터만 사용하기
- 카테고리 슬러그는 정확히 입력
- 반응형을 고려하여 columns 설정
- 성능을 위해 limit 값 적절히 설정

### 문제 해결
- **Shortcode가 그대로 보이는 경우**: 오타 확인, 플러그인 활성화 확인
- **내용이 표시되지 않는 경우**: ID나 슬러그 확인, 권한 확인
- **스타일이 깨지는 경우**: 테마 충돌 확인, CSS 클래스 확인

---

## 빠른 참조

### 자주 사용되는 조합

**홈페이지 구성:**
```
[product_carousel title="신상품" category="new-arrivals"]
[featured_products title="추천 상품" limit="8" columns="4"]
[product_categories columns="6"]
```

**카테고리 페이지:**
```
[product_grid category="electronics" limit="20" orderby="price" order="asc" show_pagination="true"]
```

**블로그 포스트 내 상품 소개:**
```
이 제품을 추천합니다!
[product id="awesome-gadget" show_cart="true"]

또는 간단한 구매 버튼만:
[add_to_cart id="awesome-gadget" text="지금 구매하기"]
```

**사이드바 위젯:**
```
[recent_posts limit="5" show_thumbnail="false"]
[featured_products limit="3" columns="1"]
```

---

*이 문서는 사이트에서 사용 가능한 shortcode의 완전한 참조 가이드입니다. 추가 질문이나 지원이 필요하면 관리자에게 문의하세요.*