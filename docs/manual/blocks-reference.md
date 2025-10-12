# 블록 레퍼런스

> 마지막 업데이트: 2025-10-12

## 개요

O4O 플랫폼의 편집기에서 사용할 수 있는 모든 블록의 레퍼런스입니다. 각 블록의 속성, 사용법, 예시를 포함합니다.

## 📦 블록 플러그인

O4O 플랫폼의 블록은 4개의 플러그인으로 구성되어 있습니다:

### 1. Text Content Blocks (텍스트 콘텐츠)
- **우선순위:** 1 (최우선 로드)
- **로딩 전략:** Immediate (즉시 로드)
- **용도:** 기본 텍스트 편집

### 2. Layout & Media Blocks (레이아웃 & 미디어)
- **우선순위:** 2
- **로딩 전략:** Lazy (지연 로드)
- **용도:** 레이아웃 구성 및 미디어 삽입

### 3. Interactive Blocks (인터랙티브)
- **우선순위:** 3
- **로딩 전략:** On-demand (요청시 로드)
- **용도:** 사용자 상호작용

### 4. Dynamic Blocks (동적 블록)
- **우선순위:** 4
- **로딩 전략:** On-demand (요청시 로드)
- **용도:** 고급 기능 및 동적 콘텐츠

---

## 📝 텍스트 콘텐츠 블록

### Paragraph (문단)

**블록명:** `o4o/paragraph`
**카테고리:** text
**키워드:** text, paragraph, p

**설명:** 모든 콘텐츠의 기본 블록입니다.

**속성:**
- `content` (string): HTML 콘텐츠
- `align` (string): 정렬 (left, center, right)
- `dropCap` (boolean): 드롭캡 사용 여부
- `fontSize` (string): 폰트 크기 (small, medium, large, x-large)
- `textColor` (string): 텍스트 색상
- `backgroundColor` (string): 배경 색상

**지원 기능:**
- 정렬: left, center, right, wide, full
- 앵커, 클래스명, 색상(배경/텍스트/그라디언트)
- 여백(margin/padding), 타이포그래피(fontSize/lineHeight)

**사용 예시:**
```html
<!-- 기본 문단 -->
<p class="wp-block-paragraph">안녕하세요</p>

<!-- 중앙 정렬 + 큰 글씨 -->
<p class="wp-block-paragraph has-text-align-center has-large-font-size">제목 문단</p>

<!-- 드롭캡 -->
<p class="wp-block-paragraph has-drop-cap">첫 글자가 큽니다</p>
```

---

### Heading (제목)

**블록명:** `o4o/heading`
**카테고리:** text
**키워드:** heading, title, h1, h2, h3

**설명:** 페이지 제목 및 섹션 헤더를 만듭니다.

**속성:**
- `content` (string): 제목 텍스트
- `level` (number): 제목 레벨 (1-6)
- `align` (string): 정렬
- `textColor` (string): 텍스트 색상

**사용 예시:**
```html
<!-- H2 제목 -->
<h2 class="wp-block-heading">섹션 제목</h2>

<!-- 중앙 정렬 H1 -->
<h1 class="wp-block-heading has-text-align-center">메인 제목</h1>
```

---

### List (목록)

**블록명:** `o4o/list`
**카테고리:** text
**키워드:** list, ul, ol, bullet

**설명:** 순서 있는 목록/순서 없는 목록을 만듭니다.

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

**블록명:** `o4o/quote`
**카테고리:** text
**키워드:** quote, citation, blockquote

**설명:** 인용문을 표시합니다.

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

**블록명:** `o4o/code`
**카테고리:** text
**키워드:** code, pre

**설명:** 코드 블록을 표시합니다.

**속성:**
- `content` (string): 코드 내용

**사용 예시:**
```html
<pre class="wp-block-code"><code>const hello = "world";</code></pre>
```

---

### HTML (HTML 블록)

**블록명:** `o4o/html`
**카테고리:** text
**키워드:** html, raw

**설명:** 커스텀 HTML을 삽입합니다.

**속성:**
- `content` (string): HTML 내용

---

## 🎨 레이아웃 & 미디어 블록

### Columns (컬럼)

**블록명:** `o4o/columns`
**카테고리:** layout
**키워드:** columns, layout, grid

**설명:** 여러 컬럼 레이아웃을 만듭니다.

**속성:**
- `columnCount` (number): 컬럼 개수
- `isStackedOnMobile` (boolean): 모바일에서 세로 배치

**사용 예시:**
```html
<div class="wp-block-columns">
  <div class="wp-block-column">왼쪽 컬럼</div>
  <div class="wp-block-column">오른쪽 컬럼</div>
</div>
```

---

### Column (개별 컬럼)

**블록명:** `o4o/column`
**카테고리:** layout

**설명:** Columns 블록 내의 개별 컬럼입니다.

**속성:**
- `width` (string): 컬럼 너비 (%, px)

---

### Group (그룹)

**블록명:** `o4o/group`
**카테고리:** layout
**키워드:** group, container, wrapper

**설명:** 여러 블록을 그룹화합니다.

**속성:**
- `backgroundColor` (string): 배경색
- `padding` (object): 여백 설정

**사용 예시:**
```html
<div class="wp-block-group">
  <!-- 내부 블록들 -->
</div>
```

---

### Spacer (여백)

**블록명:** `o4o/spacer`
**카테고리:** layout
**키워드:** spacer, space, margin

**설명:** 블록 사이에 여백을 추가합니다.

**속성:**
- `height` (number): 높이 (px)

**사용 예시:**
```html
<div class="wp-block-spacer" style="height: 50px;"></div>
```

---

### Separator (구분선)

**블록명:** `o4o/separator`
**카테고리:** layout
**키워드:** separator, divider, hr

**설명:** 콘텐츠 구분선을 추가합니다.

**사용 예시:**
```html
<hr class="wp-block-separator" />
```

---

### Conditional (조건부 블록)

**블록명:** `o4o/conditional`
**카테고리:** layout
**키워드:** conditional, visibility, logic, conditions, show, hide

**설명:** 조건에 따라 콘텐츠를 표시하거나 숨깁니다. WordPress Toolset 스타일의 조건 빌더를 제공합니다.

**속성:**
- `conditions` (array): 조건 배열
  - `id` (string): 조건 고유 ID
  - `type` (string): 조건 타입 (user_logged_in, user_role, user_id, post_type, post_category, post_id, url_parameter, current_path, subdomain, date_range, time_range, day_of_week, device_type, browser_type)
  - `operator` (string): 연산자 (is, is_not, contains, not_contains, greater_than, less_than, between, exists, not_exists)
  - `value` (any): 비교 값
- `logicOperator` (string): 조건 간 논리 연산자 (AND, OR)
- `showWhenMet` (boolean): true = 조건 충족 시 표시, false = 조건 충족 시 숨김
- `showIndicator` (boolean): 편집기에서 시각적 표시기 표시
- `indicatorText` (string): 표시기 텍스트

**지원하는 조건 타입:**

1. **User Conditions (사용자 조건)**
   - `user_logged_in`: 로그인 여부
   - `user_role`: 사용자 역할 (admin, editor, author, contributor, subscriber, customer, supplier, retailer)
   - `user_id`: 특정 사용자 ID

2. **Content Conditions (콘텐츠 조건)**
   - `post_type`: 포스트 타입
   - `post_category`: 포스트 카테고리
   - `post_id`: 특정 포스트 ID

3. **URL Conditions (URL 조건)**
   - `url_parameter`: URL 파라미터 (예: `key=value` 또는 `key`)
   - `current_path`: 현재 경로
   - `subdomain`: 서브도메인

4. **Time Conditions (시간 조건)**
   - `date_range`: 날짜 범위
   - `time_range`: 시간 범위
   - `day_of_week`: 요일 (0=일요일, 6=토요일)

5. **Device Conditions (디바이스 조건)**
   - `device_type`: 디바이스 타입 (mobile, tablet, desktop)
   - `browser_type`: 브라우저 타입 (chrome, firefox, safari, edge, other)

**사용 예시:**

```json
// 로그인한 사용자에게만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "user_logged_in",
        "operator": "is",
        "value": true
      }
    ],
    "logicOperator": "AND",
    "showWhenMet": true
  },
  "innerBlocks": [
    {
      "type": "core/paragraph",
      "content": { "text": "로그인한 사용자만 볼 수 있는 콘텐츠" }
    }
  ]
}

// 관리자 또는 에디터에게만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "user_role",
        "operator": "is",
        "value": "admin"
      },
      {
        "id": "cond2",
        "type": "user_role",
        "operator": "is",
        "value": "editor"
      }
    ],
    "logicOperator": "OR",
    "showWhenMet": true
  },
  "innerBlocks": []
}

// 특정 경로에서만 숨김
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "current_path",
        "operator": "is",
        "value": "/admin"
      }
    ],
    "logicOperator": "AND",
    "showWhenMet": false
  },
  "innerBlocks": []
}

// 모바일에서만 표시
{
  "type": "o4o/conditional",
  "attributes": {
    "conditions": [
      {
        "id": "cond1",
        "type": "device_type",
        "operator": "is",
        "value": "mobile"
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
2. "Add Condition" 버튼 클릭
3. 조건 타입, 연산자, 값 선택
4. 여러 조건 추가 가능 (AND/OR 선택)
5. Show/Hide when met 선택
6. 내부에 표시/숨길 블록 추가

---

### Image (이미지)

**블록명:** `o4o/image`
**카테고리:** media
**키워드:** image, photo, picture, img

**설명:** 이미지를 삽입합니다.

**속성:**
- `url` (string): 이미지 URL
- `alt` (string): 대체 텍스트
- `caption` (string): 캡션
- `align` (string): 정렬
- `width` (number): 너비
- `height` (number): 높이
- `linkTo` (string): 링크 대상 (none, media, custom)
- `href` (string): 커스텀 링크 URL

**지원 기능:**
- 정렬: left, center, right, wide, full
- 앵커, 클래스명

**사용 예시:**
```html
<figure class="wp-block-image">
  <img src="/path/to/image.jpg" alt="설명" />
  <figcaption>이미지 캡션</figcaption>
</figure>
```

---

### Video (비디오)

**블록명:** `o4o/video`
**카테고리:** media
**키워드:** video, movie

**설명:** 비디오를 삽입합니다.

**속성:**
- `src` (string): 비디오 URL
- `caption` (string): 캡션
- `autoplay` (boolean): 자동 재생
- `loop` (boolean): 반복 재생
- `muted` (boolean): 음소거

---

### Gallery (갤러리) 🚧

**블록명:** `o4o/gallery`
**카테고리:** media
**상태:** 개발 예정

---

### Audio (오디오) 🚧

**블록명:** `o4o/audio`
**카테고리:** media
**상태:** 개발 예정

---

### Embed (임베드) 🚧

**블록명:** `o4o/embed`
**카테고리:** media
**상태:** 개발 예정

---

## 🎯 인터랙티브 블록

### Button (버튼)

**블록명:** `o4o/button`
**카테고리:** interactive
**키워드:** button, link, cta, call to action

**설명:** 클릭 가능한 버튼을 추가합니다.

**속성:**
- `text` (string): 버튼 텍스트
- `url` (string): 링크 URL
- `linkTarget` (string): 링크 타겟 (_blank 등)
- `rel` (string): rel 속성
- `style` (string): 스타일 (fill, outline)
- `backgroundColor` (string): 배경색
- `textColor` (string): 텍스트 색상
- `width` (number): 너비

**지원 기능:**
- 정렬, 앵커, 클래스명
- 색상(배경/텍스트/그라디언트)
- 여백(padding), 타이포그래피(fontSize)

**사용 예시:**
```html
<!-- 기본 버튼 -->
<div class="wp-block-button">
  <a class="wp-block-button__link" href="/contact">문의하기</a>
</div>

<!-- 아웃라인 스타일 + 새 창 열기 -->
<div class="wp-block-button">
  <a class="wp-block-button__link is-style-outline"
     href="https://example.com"
     target="_blank"
     rel="noopener">
    자세히 보기
  </a>
</div>
```

---

### Buttons (버튼 그룹)

**블록명:** `o4o/buttons`
**카테고리:** interactive
**키워드:** buttons, button group

**설명:** 여러 버튼을 그룹화합니다.

**속성:**
- `layout` (string): 레이아웃 (flex, fill)
- `orientation` (string): 방향 (horizontal, vertical)

**사용 예시:**
```html
<div class="wp-block-buttons">
  <div class="wp-block-button">
    <a class="wp-block-button__link" href="#">버튼 1</a>
  </div>
  <div class="wp-block-button">
    <a class="wp-block-button__link" href="#">버튼 2</a>
  </div>
</div>
```

---

### Table (테이블)

**블록명:** `o4o/table`
**카테고리:** interactive
**키워드:** table, grid

**설명:** 데이터 테이블을 만듭니다.

**속성:**
- `head` (array): 헤더 행
- `body` (array): 본문 행
- `hasFixedLayout` (boolean): 고정 레이아웃

---

### Search (검색)

**블록명:** `o4o/search`
**카테고리:** interactive
**키워드:** search, find

**설명:** 검색 입력 필드를 추가합니다.

**속성:**
- `placeholder` (string): 플레이스홀더 텍스트
- `buttonText` (string): 버튼 텍스트
- `buttonPosition` (string): 버튼 위치

---

### Navigation (네비게이션)

**블록명:** `o4o/navigation`
**카테고리:** interactive
**키워드:** navigation, menu, nav

**설명:** 네비게이션 메뉴를 만듭니다.

---

### Social Links (소셜 링크)

**블록명:** `o4o/social-links`
**카테고리:** interactive
**키워드:** social, links

**설명:** 소셜 미디어 링크를 표시합니다.

---

## ⚡ 동적 블록

### CPT ACF Loop (커스텀 포스트 루프)

**블록명:** `o4o/cpt-acf-loop`
**카테고리:** dynamic
**키워드:** cpt, acf, loop, query

**설명:** 커스텀 포스트 타입의 데이터를 반복 표시합니다.

**속성:**
- `postType` (string): 포스트 타입
- `postsPerPage` (number): 페이지당 포스트 수
- `orderBy` (string): 정렬 기준
- `order` (string): 정렬 순서 (ASC, DESC)

**사용 예시:**
```html
<div class="wp-block-cpt-acf-loop">
  <div class="post-grid">
    <!-- 동적으로 생성된 포스트들 -->
  </div>
</div>
```

---

### Reusable Block (재사용 블록)

**블록명:** `o4o/reusable`
**카테고리:** dynamic
**키워드:** reusable, reuse

**설명:** 저장된 블록을 재사용합니다.

**속성:**
- `ref` (number): 재사용 블록 ID

---

### Spectra Form (Spectra 폼)

**블록명:** `o4o/spectra-form`
**카테고리:** dynamic
**키워드:** form, contact, spectra

**설명:** Spectra 플러그인의 폼을 표시합니다.

**속성:**
- `formId` (number): 폼 ID
- `showLabels` (boolean): 레이블 표시
- `successMessage` (string): 성공 메시지

---

### Markdown Reader (마크다운 리더)

**블록명:** `o4o/markdown-reader`
**카테고리:** dynamic
**키워드:** markdown, md, reader

**설명:** 마크다운 파일을 읽어서 표시합니다.

**속성:**
- `url` (string): 마크다운 파일 URL

**사용 예시:**
```
[markdown_reader url="/docs/manual/shortcode-reference.md"]
```

---

## 🎨 CSS 클래스

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

## 🔧 블록 개발 가이드

### 블록 구조

모든 블록은 다음 구조를 따릅니다:

```typescript
import { BlockDefinition } from '@o4o/block-core';

const MyBlock: BlockDefinition = {
  // 블록 식별
  name: 'o4o/my-block',           // 고유 이름
  title: 'My Block',               // 표시 이름
  category: 'text',                // 카테고리
  icon: 'block-default',           // 아이콘
  description: '블록 설명',         // 설명
  keywords: ['키워드1', '키워드2'], // 검색 키워드

  // 속성 정의
  attributes: {
    content: {
      type: 'string',
      default: ''
    }
  },

  // 지원 기능
  supports: {
    align: true,
    anchor: true,
    className: true
  },

  // 컴포넌트
  edit: EditComponent,    // 편집 화면
  save: SaveComponent     // 저장된 HTML
};
```

### 새 블록 만들기

1. **블록 파일 생성**
   ```bash
   # 적절한 플러그인 폴더에 생성
   packages/blocks/text-content/src/blocks/my-block/index.tsx
   ```

2. **블록 정의 작성**
   ```typescript
   import React from 'react';
   import { BlockDefinition } from '@o4o/block-core';

   const Edit = ({ attributes, setAttributes }) => {
     // 편집 UI
   };

   const Save = ({ attributes }) => {
     // 저장된 HTML
   };

   export default {
     name: 'o4o/my-block',
     // ... 나머지 설정
     edit: Edit,
     save: Save
   } as BlockDefinition;
   ```

3. **플러그인에 등록**
   ```typescript
   // packages/blocks/text-content/src/index.ts
   import MyBlock from './blocks/my-block';

   class TextContentBlocksPlugin {
     blocks = [
       // ... 기존 블록들
       MyBlock
     ];
   }
   ```

4. **빌드 및 테스트**
   ```bash
   npm run build
   npm run dev
   ```

---

## 📚 관련 문서

- [숏코드 레퍼런스](./shortcode-reference.md)
- [AI 페이지 생성 가이드](./ai-page-generation.md)
- [외모 커스터마이징 가이드](./appearance-customize.md)

---

## 💡 팁

### 블록 검색하기

편집기에서 `/` 키를 누르면 블록을 검색할 수 있습니다:

- `/paragraph` - 문단 블록
- `/heading` - 제목 블록
- `/image` - 이미지 블록
- `/button` - 버튼 블록

### 키보드 단축키

- `Ctrl+Shift+7` - 순서 있는 목록
- `Ctrl+Shift+8` - 순서 없는 목록
- `Ctrl+Shift+K` - 블록 삭제

### 블록 변환

블록을 선택한 후 변환 아이콘을 클릭하면 다른 블록 타입으로 변환할 수 있습니다:
- Paragraph ↔ Heading
- Paragraph ↔ List
- Paragraph ↔ Quote

---

**버전:** 0.5.1
**마지막 업데이트:** 2025-10-12
