# 블록 레퍼런스 (AI용)

> 마지막 업데이트: 2025-10-15

## ✨ 2025-10 업그레이드 하이라이트

- **향상된 레이아웃 블록**: Columns/Column/Group 블록이 동적 컬럼 추가, 세로 정렬, 레이아웃 토글(Flow/Flex/Grid) 등 고급 툴바를 제공합니다.
- **텍스트 블록 툴바 강화**: Paragraph 블록에서 정렬·볼드·이탤릭·링크 삽입을 인라인 툴바로 제어할 수 있습니다.
- **리치 미디어 지원 확대**: Enhanced Cover는 이미지/비디오/그라디언트, Aspect Ratio, Overlay, 드래그 리사이즈를 지원하며 Gallery는 슬라이더·매슨리·라이트박스 등 새 레이아웃을 제공합니다.
- **신규 유틸리티 블록**: Markdown Reader, Social Icons와 같은 특수 블록이 기본 제공됩니다.

## 텍스트 블록

| 블록명 | 설명 | 주요 속성 | 새 기능 포인트 | 예시 |
|--------|------|----------|---------------|------|
| `core/paragraph` | 문단 텍스트 | content, align, textColor, backgroundColor, fontSize, dropCap | 인라인 툴바(정렬, 볼드·이탤릭, 링크), 드롭캡 | `{"type": "core/paragraph", "attributes": {"align": "center"}, "content": {"text": "본문"}}` |
| `core/heading` | 제목 (H1-H6) | content, level(1-6), align, textColor | 퀵 타입 전환(H1~H6), Outline 동기화 | `{"type": "core/heading", "content": {"text": "섹션", "level": 2}}` |
| `core/list` | 목록 | items[], ordered(boolean), start | 라인별 재정렬, 순서/불릿 토글 | `{"type": "core/list", "content": {"items": ["항목"], "ordered": true}}` |
| `core/quote` | 인용문 | text, citation, style | 스타일 프리셋(표준/큰 인용) | `{"type": "core/quote", "content": {"text": "인용", "citation": "출처"}}` |
| `core/code` | 코드 | code, language, lineNumbers | 다크/라이트 테마 토글 | `{"type": "core/code", "attributes": {"language": "js"}, "content": {"code": "const x=1;"}}` |
| `o4o/markdown-reader` | 마크다운 뷰어 | url, markdownContent, theme, fontSize | 미디어 라이브러리에서 `.md` 선택, GitHub/Monokai 테마 | `{"type": "o4o/markdown-reader", "attributes": {"url": "/media/guide.md"}}` |

## 레이아웃 블록

| 블록명 | 설명 | 주요 속성 | 새 기능 포인트 | 예시 |
|--------|------|----------|---------------|------|
| `core/columns` | 다단 컨테이너 | columnCount, verticalAlignment, gap, backgroundColor, padding | 툴바에서 컬럼 추가/삭제, 세로 정렬, 모바일 스택, 전체 폭 지원 | `{"type": "core/columns", "innerBlocks": [{"type": "core/column"}]}` |
| `core/column` | 개별 컬럼 | width, verticalAlignment | 툴바에서 폭(%), 세로 정렬 토글, 자동 재분배 | columns 내부 전용 |
| `core/group` | 그룹 래퍼 | layout(flow/flex/grid), gap, justifyContent | 툴바 레이아웃 전환, Flex/그리드 옵션, 방향 전환 | `{"type": "core/group", "attributes": {"layout": "grid"}}` |
| `o4o/conditional` | 조건부 영역 | conditions[], logicOperator, showWhenMet | 14종 조건 + 미리보기 시각화 | 아래 상세 참조 |

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

## 미디어/히어로 블록

| 블록명 | 설명 | 주요 속성 | 새 기능 포인트 | 예시 |
|--------|------|----------|---------------|------|
| `core/image` | 이미지 | url, alt, caption, focalPoint | 커버/배경에서 포컬 포인트 편집 | `{"type": "core/image", "attributes": {"url": "/media/hero.jpg"}}` |
| `core/video` | 비디오 | src, autoplay, loop, muted | 커버 블록 배경으로 자동 연동 | `{"type": "core/video", "attributes": {"src": "/media/loop.mp4"}}` |
| `o4o/enhanced-cover` | 커버 히어로 | backgroundType(image/video/gradient), overlay, aspectRatio, minHeight, tagName | 드래그 리사이즈, 오버레이 투명도, 기기 프레이밍, CTA 버튼 지원 | `{"type": "o4o/enhanced-cover", "attributes": {"backgroundType": "image"}}` |
| `o4o/enhanced-gallery` | 고급 갤러리 | layout(grid/masonry/slider), columns, gap, enableLightbox, hoverEffect | 드래그 재정렬, 라이트박스, 무작위 배치, 캡션 위치 | `{"type": "o4o/enhanced-gallery", "attributes": {"layout": "masonry", "columns": 3}}` |
| `o4o/markdown-reader` | 마크다운 뷰어 | url, theme, fontSize | 미디어 선택 후 자동 렌더 | 위 텍스트 섹션 참조 |

> 기존 `core/gallery` 호출은 내부적으로 `o4o/enhanced-gallery`로 매핑됩니다.

## 인터랙티브 & 소셜 블록

| 블록명 | 설명 | 주요 속성 | 새 기능 포인트 | 예시 |
|--------|------|----------|---------------|------|
| `o4o/button` | 버튼 | text, url, variant(primary/outline/ghost), size, icon | 아이콘 삽입, 라운드, 전체 폭 토글 | `{"type": "o4o/button", "attributes": {"text": "자세히", "url": "/detail", "variant": "primary"}}` |
| `core/table` | 테이블 | head[], body[], hasFixedLayout, caption | 셀 병합, 스트라이프, 헤더 고정 | `{"type": "core/table", "attributes": {"head": [["이름","값"]]}}` |
| `o4o/social-icons` | 소셜 링크 | items[{service,url}], shape, size, alignment | 드래그 재정렬, 커스텀 색상, 아이콘 라이브러리 | `{"type": "o4o/social-icons", "attributes": {"items": [{"service": "facebook", "url": "https://fb.com"}]}}` |
| `o4o/shortcode` | 숏코드 래퍼 | shortcode | UI 입력 지원, 최근 숏코드 목록 | `{"type": "o4o/shortcode", "content": {"shortcode": "[product id=123]"}}` |

## 동적 블록

| 블록명 | 설명 | 주요 속성 | 사용처 | 새 기능 포인트 |
|--------|------|----------|--------|---------------|
| `o4o/cpt-acf-loop` | 커스텀 포스트 루프 | postType, postsPerPage, orderBy, taxonomy | CPT 목록/카테고리 랜딩 | 카테고리·태그 기반 필터, 카드/리스트 뷰 스위치 |


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

**버전:** 0.6.0
**마지막 업데이트:** 2025-10-15
