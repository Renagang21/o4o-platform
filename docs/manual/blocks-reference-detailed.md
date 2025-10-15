# 블록 레퍼런스 상세 가이드 (개발자/사용자용)

> 마지막 업데이트: 2025-10-15
> AI용 간단 버전은 [blocks-reference.md](./blocks-reference.md) 참조

## 개요

O4O 플랫폼의 편집기에서 사용할 수 있는 모든 블록의 상세 레퍼런스입니다.

## 📦 블록 플러그인 구조

O4O 플랫폼의 블록은 4개의 플러그인으로 구성:

1. **Text Content Blocks** - 우선순위 1 (즉시 로드)
2. **Layout & Media Blocks** - 우선순위 2 (지연 로드)
3. **Interactive Blocks** - 우선순위 3 (요청시 로드)
4. **Dynamic Blocks** - 우선순위 4 (요청시 로드)

---

## 📝 텍스트 블록 상세

### Paragraph (문단)

**블록명:** `core/paragraph`

**설명:** 모든 콘텐츠의 기본 블록

**2025-10 개선 사항:**
- `EnhancedBlockWrapper` 기반 인라인 툴바 추가: 좌·우·가운데·양쪽 정렬 버튼, Bold/Italic, 링크 삽입을 즉시 제어할 수 있습니다.
- 드롭캡, 폰트 크기(px), 줄간격, 텍스트/배경 색상 조합이 사이드바뿐 아니라 툴바에서 즉시 반영됩니다.
- 키보드 단축키: `Cmd/Ctrl + B`, `Cmd/Ctrl + I`, `Cmd/Ctrl + K`가 툴바 버튼과 연동됩니다.

**속성:**
- `content` (string): HTML 콘텐츠
- `align` (string): left, center, right
- `dropCap` (boolean): 드롭캡 사용
- `fontSize` (string): small, medium, large, x-large
- `textColor` (string): 텍스트 색상
- `backgroundColor` (string): 배경 색상

**지원 기능:**
- 정렬: left, center, right, wide, full
- 앵커, 클래스명
- 색상(배경/텍스트/그라디언트)
- 여백(margin/padding)
- 타이포그래피(fontSize/lineHeight)

**사용 예시:**
```html
<!-- 기본 -->
<p class="wp-block-paragraph">안녕하세요</p>

<!-- 중앙 정렬 + 큰 글씨 -->
<p class="wp-block-paragraph has-text-align-center has-large-font-size">제목 문단</p>

<!-- 드롭캡 -->
<p class="wp-block-paragraph has-drop-cap">첫 글자가 큽니다</p>
```

---

### Heading (제목)

**블록명:** `core/heading`

**속성:**
- `content` (string): 제목 텍스트
- `level` (number): 1-6 (H1-H6)
- `align` (string): 정렬
- `textColor` (string): 텍스트 색상

**사용 예시:**
```html
<h2 class="wp-block-heading">섹션 제목</h2>
<h1 class="wp-block-heading has-text-align-center">메인 제목</h1>
```

---

### List (목록)

**블록명:** `core/list`

**속성:**
- `ordered` (boolean): 순서 있는 목록 여부
- `values` (string): 목록 항목들 (HTML)

**사용 예시:**
```html
<!-- 순서 없는 목록 -->
<ul class="wp-block-list">
  <li>항목 1</li>
  <li>항목 2</li>
</ul>

<!-- 순서 있는 목록 -->
<ol class="wp-block-list">
  <li>첫 번째</li>
  <li>두 번째</li>
</ol>
```

---

### Quote (인용)

**블록명:** `core/quote`

**속성:**
- `value` (string): 인용 내용
- `citation` (string): 출처

**사용 예시:**
```html
<blockquote class="wp-block-quote">
  <p>인용문 내용</p>
  <cite>- 출처</cite>
</blockquote>
```

---

### Code (코드)

**블록명:** `core/code`

**속성:**
- `content` (string): 코드 내용

**사용 예시:**
```html
<pre class="wp-block-code"><code>const hello = "world";</code></pre>
```

---

## 🎨 레이아웃 블록 상세

### Columns (컬럼)

**블록명:** `core/columns`

**속성:**
- `columnCount` (number): 컬럼 개수
- `isStackedOnMobile` (boolean): 모바일에서 세로 배치
- `verticalAlignment` (string): 세로 정렬
- `gap` (number): 컬럼 간격

**2025-10 개선 사항:**
- `ColumnsBlockNew` 구현으로 툴바의 **Add Column** 버튼으로 컬럼을 추가/삭제하면 모든 컬럼 폭이 자동 재분배됩니다.
- 상단 툴바에서 Top/Center/Bottom 세로 정렬을 즉시 전환할 수 있으며, 배경색·패딩·모바일 스택 여부를 실시간 미리보기로 확인할 수 있습니다.
- 빈 컬럼에는 “Add blocks…” 플레이스홀더가 노출되어 드롭 영역이 명확하게 표시됩니다.

**사용 예시:**
```html
<div class="wp-block-columns">
  <div class="wp-block-column">왼쪽 컬럼</div>
  <div class="wp-block-column">오른쪽 컬럼</div>
</div>
```

#### Column (개별 컬럼)

- 툴바에 폭 표시 배지(%)와 Vertical Alignment 토글이 추가되었습니다.
- 컬럼을 삭제하면 남은 컬럼의 폭이 균등하게 재계산됩니다.
- 드래그 시 점선 보더와 하이라이트 배경이 표시되어 위치를 명확히 파악할 수 있습니다.

---

### Group (그룹)

**블록명:** `core/group`

**속성:**
- `layout` (string): flow, flex, grid
- `tagName` (string): div, section, article, aside, header, footer
- `backgroundColor` (string): 배경색
- `padding` (object): 여백 설정
- `flexDirection` (string): row, column
- `justifyContent` (string): flex-start, center, flex-end, space-between
- `alignItems` (string): stretch, flex-start, center, flex-end

**사용 예시:**
```html
<div class="wp-block-group">
  <!-- 내부 블록들 -->
</div>
```

**2025-10 개선 사항:**
- 툴바에서 Flow / Flex / Grid 레이아웃을 즉시 전환할 수 있으며, 선택 상태에서 아이콘으로 현재 모드를 확인할 수 있습니다.
- Flex 모드는 방향(Flex Direction) 및 정렬(Justify/Align) 설정이 사이드바와 연동되어 실시간으로 적용됩니다.
- Grid 모드에서는 열/행 갯수, 갭, 아이템 정렬을 설정하면 미리보기에서 즉시 레이아웃을 확인할 수 있습니다.

---

### Conditional (조건부 블록)

**블록명:** `o4o/conditional`

**설명:** WordPress Toolset 스타일의 조건 빌더를 제공하여 조건에 따라 콘텐츠를 표시/숨김

**속성:**
- `conditions` (array): 조건 배열
  - `id` (string): 조건 고유 ID
  - `type` (ConditionType): 조건 타입
  - `operator` (ConditionOperator): 연산자
  - `value` (any): 비교 값
  - `label` (string): UI 표시용 레이블
- `logicOperator` (LogicOperator): 'AND' | 'OR'
- `showWhenMet` (boolean): true = 조건 충족시 표시, false = 조건 충족시 숨김
- `showIndicator` (boolean): 편집기에서 시각적 표시기 표시
- `indicatorText` (string): 표시기 텍스트

**조건 타입 (14가지):**

1. **User Conditions (사용자 조건)**
   - `user_logged_in`: 로그인 여부 (boolean)
   - `user_role`: 사용자 역할 (admin, editor, author, contributor, subscriber, customer, supplier, retailer)
   - `user_id`: 특정 사용자 ID (string/number)

2. **Content Conditions (콘텐츠 조건)**
   - `post_type`: 포스트 타입 (string)
   - `post_category`: 포스트 카테고리 (string)
   - `post_id`: 특정 포스트 ID (string/number)

3. **URL Conditions (URL 조건)**
   - `url_parameter`: URL 파라미터 (key 또는 key=value 형식)
   - `current_path`: 현재 경로 (string)
   - `subdomain`: 서브도메인 (string)

4. **Time Conditions (시간 조건)**
   - `date_range`: 날짜 범위 ({start: ISO date, end: ISO date})
   - `time_range`: 시간 범위 ({start: "HH:mm", end: "HH:mm"})
   - `day_of_week`: 요일 (0-6, 0=일요일)

5. **Device Conditions (디바이스 조건)**
   - `device_type`: 디바이스 타입 (mobile, tablet, desktop)
   - `browser_type`: 브라우저 타입 (chrome, firefox, safari, edge, other)

**연산자:**
- `is`: 같음
- `is_not`: 같지 않음
- `contains`: 포함
- `not_contains`: 포함하지 않음
- `greater_than`: 큰
- `less_than`: 작은
- `between`: 사이 (date_range, time_range에서 사용)
- `exists`: 존재
- `not_exists`: 존재하지 않음

**사용 예시:**

```json
// 1. 로그인한 사용자에게만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "user_logged_in",
        "operator": "is",
        "value": true,
        "label": "User Login Status"
      }
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": [
    {"type": "core/paragraph", "content": {"text": "회원 전용 콘텐츠"}}
  ]
}

// 2. 관리자 또는 에디터에게만 표시 (OR 로직)
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {"id": "cond1", "type": "user_role", "operator": "is", "value": "admin"},
      {"id": "cond2", "type": "user_role", "operator": "is", "value": "editor"}
    ],
    "logicOperator": "OR",
    "showWhenMet": true
  },
  "innerBlocks": []
}

// 3. 특정 경로에서만 숨김
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {"id": "cond1", "type": "current_path", "operator": "is", "value": "/admin"}
    ],
    "logicOperator": "AND",
    "showWhenMet": false
  },
  "innerBlocks": []
}

// 4. 모바일에서만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {"id": "cond1", "type": "device_type", "operator": "is", "value": "mobile"}
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": []
}

// 5. 특정 날짜 범위에서만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "date_range",
        "operator": "between",
        "value": {
          "start": "2025-01-01",
          "end": "2025-12-31"
        }
      }
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": []
}
```

**편집기 사용법:**
1. Conditional 블록 추가
2. "Add Condition" 버튼 클릭하여 ConditionBuilder 모달 열기
3. 조건 타입 선택 (드롭다운)
4. 연산자 선택
5. 값 입력 (타입에 따라 자동으로 입력 UI 변경)
6. 여러 조건 추가 가능 (각 조건 사이에 AND/OR 표시)
7. "Show when met" 또는 "Hide when met" 선택
8. 저장 후 내부에 표시/숨길 블록 추가

---

## 🖼️ 미디어 블록 상세

### Image (이미지)

**블록명:** `core/image`

**속성:**
- `url` (string): 이미지 URL
- `alt` (string): 대체 텍스트
- `caption` (string): 캡션
- `align` (string): 정렬
- `width` (number): 너비
- `height` (number): 높이
- `linkTo` (string): none, media, custom
- `href` (string): 커스텀 링크 URL

**사용 예시:**
```html
<figure class="wp-block-image">
  <img src="/path/to/image.jpg" alt="설명" />
  <figcaption>이미지 캡션</figcaption>
</figure>
```

---

### Video (비디오)

**블록명:** `core/video`

**속성:**
- `src` (string): 비디오 URL
- `caption` (string): 캡션
- `autoplay` (boolean): 자동 재생
- `loop` (boolean): 반복 재생
- `muted` (boolean): 음소거

---

### Enhanced Cover (히어로)

**블록명:** `o4o/enhanced-cover`

**설명:** 배경 이미지·비디오·그라디언트를 지원하는 히어로 섹션 블록

**핵심 속성:**
- `backgroundType`: `image` \| `video` \| `gradient`
- `backgroundImage` / `backgroundVideo`: 미디어 객체 및 focalPoint 좌표
- `overlay`: 색상, 불투명도, 블렌드 모드 설정
- `aspectRatio`, `minHeight`, `padding`, `layout`
- `tagName`: section, header 등 시맨틱 태그

**2025-10 개선 사항:**
- 배경 미디어 교체/삭제, 오버레이 불투명도 슬라이더, 기기별 프레임(Desktop/Tablet/Mobile) 미리보기를 지원합니다.
- 커버 높이를 드래그 핸들로 조절할 수 있고, 사이드바에서 패딩·앵커 ID·커스텀 클래스를 즉시 적용할 수 있습니다.
- 내부에 버튼/헤딩을 배치하면 `CoverContentNew`가 자동으로 중앙 정렬 및 반응형 타이포그래피를 적용합니다.

---

### Enhanced Gallery (갤러리)

**블록명:** `o4o/enhanced-gallery`

**설명:** 그리드, 매슨리, 슬라이더, 라이트박스를 지원하는 고급 이미지 갤러리

**핵심 속성:**
- `layout`: `grid` \| `masonry` \| `slider`
- `columns`, `gap`, `aspectRatio`
- `showCaptions`, `captionPosition`
- `enableLightbox`, `lightboxAnimation`
- `hoverEffect`, `randomOrder`, `borderRadius`

**2025-10 개선 사항:**
- 드래그&드롭으로 이미지 순서를 변경하고, 라이트박스에서 키보드 및 스와이프 네비게이션을 지원합니다.
- 슬라이더 모드에서 자동 재생, 방향 버튼, 인디케이터 점을 설정할 수 있으며, 매슨리 모드는 동적 높이 계산을 제공합니다.
- 미디어 라이브러리/로컬 업로드를 동시에 지원하고, 이미지별 캡션·링크·Alt 텍스트를 개별로 수정할 수 있습니다.

---

### Markdown Reader (마크다운 뷰어)

**블록명:** `o4o/markdown-reader`

**설명:** 미디어 라이브러리에 저장된 `.md` 파일을 불러와 HTML로 렌더링하는 뷰어

**핵심 속성:**
- `url`: 선택한 마크다운 파일 경로
- `markdownContent`: 변환된 HTML 캐시
- `theme`: `github`, `monokai`, `solarized`
- `fontSize`: 표시 폰트 크기 (px)

**사용 방법:**
1. 블록 추가 후 **Select Markdown** 버튼으로 미디어 라이브러리에서 `.md` 파일을 선택합니다.
2. 파일을 교체하거나 다운로드 링크로 연결할 수 있으며, 로드 실패 시 재시도 버튼이 노출됩니다.
3. 테마와 글자 크기를 사이드바에서 조절하면 미리보기 즉시 반영됩니다.

---

## 🎯 인터랙티브 블록 상세

### Button (버튼)

**블록명:** `o4o/button`

**속성:**
- `text` (string): 버튼 텍스트
- `url` (string): 링크 URL
- `linkTarget` (string): `_blank` 등
- `rel` (string): rel 속성
- `variant` (string): `primary`, `outline`, `ghost`, `link`
- `size` (string): `sm`, `md`, `lg`
- `icon` (string): 좌측 아이콘(lucide id)
- `align` (string): left, center, right, wide, full
- `backgroundColor` (string): 배경색
- `textColor` (string): 텍스트 색상
- `width` (number): 너비

**2025-10 개선 사항:**
- 버튼 툴바에서 Variant/Size를 즉시 전환할 수 있고, 아이콘 피커로 50+ 아이콘을 추가할 수 있습니다.
- `Full width` 토글과 둥근 모서리, 그림자 옵션이 사이드바에 추가되었습니다.
- `Cmd/Ctrl + D` 복제 시 링크 속성까지 그대로 복사되며, 프론트엔드와 동일한 미리보기를 제공합니다.

**사용 예시:**
```html
<!-- 기본 -->
<div class="wp-block-button">
  <a class="wp-block-button__link" href="/contact">문의하기</a>
</div>

<!-- 아웃라인 + 새 창 -->
<div class="wp-block-button">
  <a class="wp-block-button__link is-style-outline"
     href="https://example.com"
     target="_blank"
     rel="noopener">
    자세히 보기
  </a>
</div>
```

### Social Icons (소셜 링크)

**블록명:** `o4o/social-icons`

**설명:** 여러 소셜 플랫폼 아이콘과 링크를 한 번에 배치하는 블록

**속성:**
- `items` (array): `{ service: 'facebook', url: 'https://...' }` 구조
- `shape` (string): circle, rounded, square
- `size` (string): small, medium, large
- `alignment` (string): left, center, right
- `colorMode` (string): brand, custom, monochrome
- `gap` (number): 아이콘 간 간격(px)

**2025-10 개선 사항:**
- 드래그&드롭으로 아이콘 순서를 변경하고 검색으로 30개 이상의 서비스를 빠르게 추가할 수 있습니다.
- 커스텀 색상 모드에서 사용자 지정 HEX 값을 적용하거나 테마 색상을 자동으로 따를 수 있습니다.
- 서비스별 새 창 열기, `rel="nofollow"` 등 SEO 옵션을 개별로 제어할 수 있습니다.

---

### Table (테이블)

**블록명:** `core/table`

**속성:**
- `head` (array): 헤더 행
- `body` (array): 본문 행
- `hasFixedLayout` (boolean): 고정 레이아웃

---

## 🎨 CSS 클래스 레퍼런스

### 정렬 클래스
- `.has-text-align-left` - 왼쪽 정렬
- `.has-text-align-center` - 중앙 정렬
- `.has-text-align-right` - 오른쪽 정렬
- `.alignleft` - 왼쪽 플로트
- `.alignright` - 오른쪽 플로트
- `.aligncenter` - 블록 중앙 정렬
- `.alignwide` - 넓은 너비 (1200px)
- `.alignfull` - 전체 너비

### 색상 클래스
- `.has-{color}-color` - 텍스트 색상
- `.has-{color}-background-color` - 배경 색상
- `.has-primary-color` - 기본 텍스트 색상
- `.has-secondary-color` - 보조 텍스트 색상

### 폰트 크기 클래스
- `.has-small-font-size` - 작은 글씨 (0.875em)
- `.has-medium-font-size` - 중간 글씨 (1.125em)
- `.has-large-font-size` - 큰 글씨 (1.5em)
- `.has-x-large-font-size` - 아주 큰 글씨 (2em)

### 특수 클래스
- `.has-drop-cap` - 드롭캡 (Paragraph)
- `.is-style-fill` - 채우기 스타일 (Button)
- `.is-style-outline` - 아웃라인 스타일 (Button)
- `.is-vertical` - 세로 방향 (Buttons)
- `.is-not-stacked-on-mobile` - 모바일에서도 가로 배치 (Columns)

---

## 💡 사용 팁

### 블록 검색
편집기에서 `/` 키를 누르면 블록 검색:
- `/paragraph` - 문단 블록
- `/heading` - 제목 블록
- `/image` - 이미지 블록
- `/button` - 버튼 블록

### 키보드 단축키
- `Ctrl+Shift+7` - 순서 있는 목록
- `Ctrl+Shift+8` - 순서 없는 목록
- `Ctrl+Shift+K` - 블록 삭제

### 블록 변환
블록을 선택한 후 변환 아이콘 클릭:
- Paragraph ↔ Heading
- Paragraph ↔ List
- Paragraph ↔ Quote

---

## 🔧 블록 개발 가이드

### 블록 구조
```typescript
import { BlockDefinition } from '@o4o/block-core';

const MyBlock: BlockDefinition = {
  name: 'o4o/my-block',
  title: 'My Block',
  category: 'text',
  icon: 'block-default',
  description: '블록 설명',
  keywords: ['키워드1', '키워드2'],

  attributes: {
    content: {
      type: 'string',
      default: ''
    }
  },

  supports: {
    align: true,
    anchor: true,
    className: true
  },

  edit: EditComponent,
  save: SaveComponent
};
```

### 새 블록 만들기
1. 적절한 플러그인 폴더에 블록 파일 생성
2. 블록 정의 작성 (Edit, Save 컴포넌트)
3. 플러그인에 등록
4. 빌드 및 테스트

---

**버전:** 0.5.1
**마지막 업데이트:** 2025-10-12
