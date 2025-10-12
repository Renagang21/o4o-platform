# 블록 레퍼런스 (AI용)

> 마지막 업데이트: 2025-10-12

## 텍스트 블록

| 블록명 | 설명 | 주요 속성 | 예시 |
|--------|------|----------|------|
| `core/paragraph` | 문단 텍스트 | content, align, textColor, backgroundColor | `{"type": "core/paragraph", "content": {"text": "텍스트"}}` |
| `core/heading` | 제목 (H1-H6) | content, level(1-6), align, textColor | `{"type": "core/heading", "content": {"text": "제목", "level": 2}}` |
| `core/list` | 목록 | items[], ordered(boolean) | `{"type": "core/list", "content": {"items": ["항목1", "항목2"], "ordered": false}}` |
| `core/quote` | 인용문 | text, citation | `{"type": "core/quote", "content": {"text": "인용문", "citation": "출처"}}` |
| `core/code` | 코드 블록 | code, language | `{"type": "core/code", "content": {"code": "const x = 1;", "language": "javascript"}}` |

## 레이아웃 블록

| 블록명 | 설명 | 주요 속성 | 예시 |
|--------|------|----------|------|
| `core/columns` | 다단 레이아웃 | columnCount, isStackedOnMobile | `{"type": "core/columns", "attributes": {"columnCount": 2}, "innerBlocks": []}` |
| `core/column` | 개별 컬럼 (columns 내부) | width | columns 블록 내부에서만 사용 |
| `core/group` | 블록 그룹화 | backgroundColor, padding | `{"type": "core/group", "attributes": {}, "innerBlocks": []}` |
| `o4o/conditional` | 조건부 표시/숨김 | conditions[], logicOperator, showWhenMet | 아래 상세 참조 |

### Conditional 블록 상세

**조건 타입 (14가지):**
- **User:** user_logged_in, user_role, user_id
- **Content:** post_type, post_category, post_id
- **URL:** url_parameter, current_path, subdomain
- **Time:** date_range, time_range, day_of_week
- **Device:** device_type, browser_type

**예시:**
```json
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {"id": "c1", "type": "user_logged_in", "operator": "is", "value": true}
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": []
}
```

## 미디어 블록

| 블록명 | 설명 | 주요 속성 | 예시 |
|--------|------|----------|------|
| `core/image` | 이미지 | url, alt, caption, width, height | `{"type": "core/image", "attributes": {"url": "/path/to/image.jpg", "alt": "설명"}}` |
| `core/video` | 비디오 | src, caption, autoplay, loop, muted | `{"type": "core/video", "attributes": {"src": "/path/to/video.mp4"}}` |
| `core/gallery` | 갤러리 | images[] | `{"type": "core/gallery", "attributes": {"images": []}}` |

## 인터랙티브 블록

| 블록명 | 설명 | 주요 속성 | 예시 |
|--------|------|----------|------|
| `o4o/button` | 버튼 | text, url, style, backgroundColor, textColor | `{"type": "o4o/button", "attributes": {"text": "클릭", "url": "/page"}}` |
| `core/table` | 테이블 | head[], body[], hasFixedLayout | `{"type": "core/table", "attributes": {"head": [], "body": []}}` |

## 동적 블록

| 블록명 | 설명 | 주요 속성 | 사용처 |
|--------|------|----------|--------|
| `o4o/cpt-acf-loop` | 커스텀 포스트 루프 | postType, postsPerPage, orderBy | 포스트 목록 표시 |

## 숏코드 블록

숏코드는 `core/shortcode` 블록으로 삽입:
```json
{
  "type": "core/shortcode",
  "content": {
    "shortcode": "[product id=\"123\"]"
  }
}
```

## 사용 가능한 숏코드

**E-commerce:**
- `[product id="123"]` - 단일 상품
- `[product_grid category="electronics" limit="8"]` - 상품 그리드
- `[add_to_cart id="123"]` - 장바구니 버튼

**Content:**
- `[recent_posts limit="5"]` - 최근 포스트
- `[post_author]` - 작성자 정보

**Forms:**
- `[contact_form]` - 연락 폼
- `[spectra_form id="1"]` - Spectra 폼

## 블록 구조 규칙

1. **기본 구조:**
```json
{
  "type": "블록타입",
  "attributes": {},
  "content": {}
}
```

2. **내부 블록 (InnerBlocks):**
```json
{
  "type": "core/group",
  "innerBlocks": [
    {"type": "core/paragraph", "content": {"text": "내용"}}
  ]
}
```

3. **조건부 블록 패턴:**
```json
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {"type": "user_role", "operator": "is", "value": "admin"}
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": [여기에 표시할 블록들]
}
```

---

**버전:** 0.5.1
**마지막 업데이트:** 2025-10-12
