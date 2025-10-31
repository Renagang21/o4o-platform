# O4O Platform 블록 완전 참조 가이드

> **최종 업데이트**: 2025-10-31
> **블록 개수**: 26개 (6개 카테고리)
> **구현 상태**: ✅ 100% 완료

---

## 📑 목차

### 1. [빠른 참조](#1-빠른-참조)
- [1.1 카테고리별 블록 매트릭스](#11-카테고리별-블록-매트릭스)
- [1.2 기능별 블록 찾기](#12-기능별-블록-찾기)
- [1.3 InnerBlocks 지원 블록](#13-innerblocks-지원-블록)

### 2. [TEXT 블록 (7개)](#2-text-블록-7개)
- [2.1 Paragraph (단락)](#21-paragraph-단락)
- [2.2 Heading (제목)](#22-heading-제목)
- [2.3 List (목록)](#23-list-목록)
- [2.4 Quote (인용)](#24-quote-인용)
- [2.5 Code (코드)](#25-code-코드)
- [2.6 Markdown Reader (마크다운)](#26-markdown-reader-마크다운)
- [2.7 Table (테이블)](#27-table-테이블)

### 3. [MEDIA 블록 (6개)](#3-media-블록-6개)
- [3.1 Image (이미지)](#31-image-이미지)
- [3.2 Gallery (갤러리)](#32-gallery-갤러리)
- [3.3 Cover (커버)](#33-cover-커버)
- [3.4 Slide (슬라이드)](#34-slide-슬라이드)
- [3.5 Video (비디오)](#35-video-비디오)
- [3.6 YouTube (유튜브)](#36-youtube-유튜브)

### 4. [LAYOUT 블록 (4개)](#4-layout-블록-4개)
- [4.1 Columns (컬럼 컨테이너)](#41-columns-컬럼-컨테이너)
- [4.2 Column (컬럼)](#42-column-컬럼)
- [4.3 Group (그룹)](#43-group-그룹)
- [4.4 Conditional (조건부)](#44-conditional-조건부)

### 5. [DESIGN 블록 (2개)](#5-design-블록-2개)
- [5.1 Button (버튼)](#51-button-버튼)
- [5.2 Buttons (버튼 컨테이너)](#52-buttons-버튼-컨테이너)

### 6. [WIDGETS 블록 (2개)](#6-widgets-블록-2개)
- [6.1 Social Links (소셜 링크)](#61-social-links-소셜-링크)
- [6.2 Shortcode (숏코드)](#62-shortcode-숏코드)

### 7. [DYNAMIC 블록 (3개)](#7-dynamic-블록-3개)
- [7.1 Universal Form (통합 폼)](#71-universal-form-통합-폼)
- [7.2 Form Field (폼 필드)](#72-form-field-폼-필드)
- [7.3 Form Submit (폼 제출)](#73-form-submit-폼-제출)

### 8. [EMBED 블록 (2개)](#8-embed-블록-2개)
- [8.1 File (파일)](#81-file-파일)
- [8.2 YouTube (유튜브)](#82-youtube-유튜브)

### 9. [개발 가이드](#9-개발-가이드)
- [9.1 블록 시스템 아키텍처](#91-블록-시스템-아키텍처)
- [9.2 새 블록 만들기](#92-새-블록-만들기)
- [9.3 블록 등록 방법](#93-블록-등록-방법)
- [9.4 InnerBlocks 패턴](#94-innerblocks-패턴)

### 10. [API 참조](#10-api-참조)
- [10.1 BlockDefinition 인터페이스](#101-blockdefinition-인터페이스)
- [10.2 공통 Attributes](#102-공통-attributes)
- [10.3 Inspector Controls](#103-inspector-controls)

---

## 1. 빠른 참조

### 1.1 카테고리별 블록 매트릭스

| 카테고리 | 개수 | 블록 목록 |
|---------|------|----------|
| **TEXT** | 7 | Paragraph, Heading, List, Quote, Code, Markdown, Table |
| **MEDIA** | 6 | Image, Gallery, Cover, Slide, Video, YouTube |
| **LAYOUT** | 4 | Columns, Column, Group, Conditional |
| **DESIGN** | 2 | Button, Buttons |
| **WIDGETS** | 2 | Social Links, Shortcode |
| **DYNAMIC** | 3 | Universal Form, Form Field, Form Submit |
| **EMBED** | 2 | File, YouTube |
| **합계** | **26** | |

### 1.2 기능별 블록 찾기

#### 📝 텍스트 편집이 필요할 때
- **일반 텍스트**: Paragraph
- **제목**: Heading (H1-H6)
- **목록**: List (순서/비순서)
- **인용구**: Quote
- **코드**: Code (신택스 하이라이팅)
- **마크다운**: Markdown Reader
- **표**: Table

#### 🖼️ 이미지/미디어가 필요할 때
- **단일 이미지**: Image
- **여러 이미지**: Gallery
- **히어로 섹션**: Cover
- **슬라이드쇼**: Slide
- **동영상**: Video, YouTube

#### 📐 레이아웃 구성이 필요할 때
- **다단 레이아웃**: Columns + Column
- **섹션 그룹**: Group
- **조건부 표시**: Conditional

#### 🎨 디자인 요소가 필요할 때
- **CTA 버튼**: Button
- **버튼 그룹**: Buttons

#### 🔧 인터랙티브 기능이 필요할 때
- **소셜 미디어 링크**: Social Links
- **폼 생성**: Universal Form + Form Field + Form Submit
- **파일 다운로드**: File
- **숏코드**: Shortcode

### 1.3 InnerBlocks 지원 블록

| 블록 | InnerBlocks | 허용 블록 | 용도 |
|-----|-------------|----------|------|
| **Columns** | ✅ | Column만 | 다단 레이아웃 컨테이너 |
| **Column** | ✅ | 모든 블록 | 컬럼 내부 콘텐츠 |
| **Group** | ✅ | 모든 블록 | 섹션 그룹화 |
| **Conditional** | ✅ | 모든 블록 | 조건부 콘텐츠 |
| **Cover** | ✅ | 모든 블록 | 커버 위 콘텐츠 |
| **Buttons** | ✅ | Button만 | 버튼 그룹 |
| **Universal Form** | ✅ | Form Field, Form Submit | 폼 필드 컨테이너 |

---

## 2. TEXT 블록 (7개)

### 2.1 Paragraph (단락)

#### 기본 정보
- **블록명**: `o4o/paragraph`
- **카테고리**: text
- **아이콘**: Type
- **상태**: ✅ Fully Implemented (Slate.js)

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/paragraph.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/ParagraphBlock.tsx
렌더러: packages/block-renderer/src/renderers/text/ParagraphBlock.tsx
```

#### 주요 기능
- ✅ Slate.js 기반 리치 텍스트 에디터
- ✅ 인라인 포맷팅 (Bold, Italic)
- ✅ 텍스트 정렬 (좌/중/우/양쪽)
- ✅ Drop Cap 지원
- ✅ 색상 제어 (텍스트, 배경)
- ✅ 폰트 크기 조절
- ✅ 네이티브 Selection API

#### Attributes
```typescript
{
  content: string;              // Slate.js 콘텐츠
  align?: 'left' | 'center' | 'right' | 'justify';
  dropCap?: boolean;           // 드롭 캡 활성화
  fontSize?: string;           // 폰트 크기
  textColor?: string;          // 텍스트 색상
  backgroundColor?: string;    // 배경 색상
}
```

#### Inspector Controls
- 정렬 (Alignment)
- 드롭 캡 (Drop Cap)
- 타이포그래피 (폰트 크기)
- 색상 (텍스트, 배경)

#### 사용 예시
```typescript
// 기본 단락
{
  name: 'o4o/paragraph',
  attributes: {
    content: '일반 단락 텍스트입니다.',
    align: 'left'
  }
}

// 드롭 캡이 있는 단락
{
  name: 'o4o/paragraph',
  attributes: {
    content: '첫 글자가 크게 표시됩니다.',
    dropCap: true,
    fontSize: '18px'
  }
}
```

#### 개발 노트
- Phase 1 완료: Slate.js 통합
- 이전 버전 대비 개선: 포커스 관리, 인라인 포맷팅
- 관련 파일: `paragraph/DropCapController.tsx`, `paragraph/TypographyPanel.tsx`

---

### 2.2 Heading (제목)

#### 기본 정보
- **블록명**: `o4o/heading`
- **카테고리**: text
- **아이콘**: Heading
- **상태**: ✅ Fully Implemented (Slate.js)

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/heading.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/gutenberg/GutenbergHeadingBlock.tsx
렌더러: packages/block-renderer/src/renderers/text/HeadingBlock.tsx
```

#### 주요 기능
- ✅ H1-H6 레벨 지원
- ✅ Slate.js 에디터 통합
- ✅ 레벨 전환 툴바
- ✅ 텍스트 정렬
- ✅ 색상 제어
- ✅ 타이포그래피 설정

#### Attributes
```typescript
{
  content: string;              // Slate.js 콘텐츠
  level: 1 | 2 | 3 | 4 | 5 | 6; // 제목 레벨
  align?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: string;
  textColor?: string;
  backgroundColor?: string;
}
```

#### Inspector Controls
- 레벨 선택 (H1-H6)
- 정렬
- 타이포그래피
- 색상

#### 사용 예시
```typescript
// 페이지 제목 (H1)
{
  name: 'o4o/heading',
  attributes: {
    content: '페이지 제목',
    level: 1,
    align: 'center',
    fontSize: '48px'
  }
}

// 섹션 제목 (H2)
{
  name: 'o4o/heading',
  attributes: {
    content: '섹션 제목',
    level: 2,
    textColor: '#333'
  }
}
```

#### 개발 노트
- 3개 버전 통합 → GutenbergHeadingBlock로 단일화
- Slate.js 통합으로 리치 텍스트 편집 가능

---

### 2.3 List (목록)

#### 기본 정보
- **블록명**: `o4o/list`
- **카테고리**: text
- **아이콘**: List
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/list.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/ListBlock.tsx
렌더러: packages/block-renderer/src/renderers/text/ListBlock.tsx
```

#### 주요 기능
- ✅ 순서/비순서 목록 전환
- ✅ 항목 재정렬 (드래그)
- ✅ 중첩 목록 지원
- ✅ 목록 스타일 커스터마이징

#### Attributes
```typescript
{
  items: string[];             // 목록 항목
  ordered: boolean;            // 순서 목록 여부
  type?: 'disc' | 'circle' | 'square' | 'decimal' | 'lower-alpha';
}
```

#### Inspector Controls
- 목록 타입 (순서/비순서)
- 목록 스타일

#### 사용 예시
```typescript
// 비순서 목록
{
  name: 'o4o/list',
  attributes: {
    items: ['항목 1', '항목 2', '항목 3'],
    ordered: false,
    type: 'disc'
  }
}

// 순서 목록
{
  name: 'o4o/list',
  attributes: {
    items: ['첫 번째', '두 번째', '세 번째'],
    ordered: true,
    type: 'decimal'
  }
}
```

#### 개발 노트
- 2개 버전 존재 (`ListBlock.tsx`, `ListBlock.old.tsx`)
- SimplifiedListBlock 사용 권장

---

### 2.4 Quote (인용)

#### 기본 정보
- **블록명**: `o4o/quote`
- **카테고리**: text
- **아이콘**: Quote
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/quote.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/QuoteBlock.tsx
렌더러: packages/block-renderer/src/renderers/text/QuoteBlock.tsx
```

#### 주요 기능
- ✅ 인용문 + 출처
- ✅ 스타일 프리셋
- ✅ 테두리 커스터마이징

#### Attributes
```typescript
{
  text: string;                // 인용문
  citation?: string;           // 출처
  style?: 'default' | 'large' | 'plain';
}
```

#### Inspector Controls
- 스타일 선택
- 색상

#### 사용 예시
```typescript
{
  name: 'o4o/quote',
  attributes: {
    text: '성공은 최종적인 것이 아니며, 실패는 치명적인 것이 아니다.',
    citation: '윈스턴 처칠',
    style: 'large'
  }
}
```

---

### 2.5 Code (코드)

#### 기본 정보
- **블록명**: `o4o/code`
- **카테고리**: text
- **아이콘**: Code
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/code.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/CodeBlock.tsx
렌더러: packages/block-renderer/src/renderers/text/CodeBlock.tsx
```

#### 주요 기능
- ✅ 신택스 하이라이팅
- ✅ 언어 선택 (50+ 언어)
- ✅ 줄 번호
- ✅ 다크/라이트 테마

#### Attributes
```typescript
{
  code: string;                // 코드 내용
  language?: string;           // 프로그래밍 언어
  lineNumbers?: boolean;       // 줄 번호 표시
}
```

#### Inspector Controls
- 언어 선택
- 줄 번호 토글
- 테마 선택

#### 사용 예시
```typescript
{
  name: 'o4o/code',
  attributes: {
    code: 'const hello = () => console.log("Hello World");',
    language: 'javascript',
    lineNumbers: true
  }
}
```

---

### 2.6 Markdown Reader (마크다운)

#### 기본 정보
- **블록명**: `o4o/markdown`
- **카테고리**: text
- **아이콘**: FileText
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/markdown.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/MarkdownBlock.tsx
렌더러: packages/block-renderer/src/renderers/special/MarkdownBlock.tsx
```

#### 주요 기능
- ✅ .md 파일 로드 (미디어 라이브러리)
- ✅ 테마 선택 (GitHub, Monokai, Solarized 등)
- ✅ 폰트 크기 조절
- ✅ 다운로드 링크 옵션
- ✅ 파일 변경 시 자동 새로고침

#### Attributes
```typescript
{
  url?: string;                // .md 파일 URL
  markdownContent?: string;    // 마크다운 내용
  theme?: 'github' | 'monokai' | 'solarized' | 'dracula';
  fontSize?: string;           // 폰트 크기
}
```

#### Inspector Controls
- 파일 선택
- 테마 선택
- 폰트 크기
- 다운로드 링크 표시

#### 사용 예시
```typescript
{
  name: 'o4o/markdown',
  attributes: {
    url: '/media/docs/guide.md',
    theme: 'github',
    fontSize: '16px'
  }
}
```

#### 개발 노트
- 중복 구현 존재: `packages/blocks/dynamic/markdown.tsx`
- 통합 필요

---

### 2.7 Table (테이블)

#### 기본 정보
- **블록명**: `o4o/table`
- **카테고리**: text
- **아이콘**: Table
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/table.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/TableBlock.tsx
렌더러: packages/block-renderer/src/renderers/layout/TableBlock.tsx
```

#### 주요 기능
- ✅ 동적 행/열 추가/삭제
- ✅ 헤더/푸터 섹션
- ✅ 셀 스타일링
- ✅ 고정 레이아웃 옵션
- ✅ 줄무늬 행
- ✅ 캡션 지원

#### Attributes
```typescript
{
  head?: { cells: string[] }[]; // 헤더 행
  body: { cells: string[] }[];  // 본문 행
  hasFixedLayout?: boolean;     // 고정 레이아웃
  caption?: string;             // 캡션
}
```

#### Inspector Controls
- 레이아웃 (고정/자동)
- 스타일 (줄무늬)
- 캡션

#### 사용 예시
```typescript
{
  name: 'o4o/table',
  attributes: {
    head: [{ cells: ['이름', '이메일', '역할'] }],
    body: [
      { cells: ['홍길동', 'hong@example.com', '개발자'] },
      { cells: ['김철수', 'kim@example.com', '디자이너'] }
    ],
    caption: '팀 멤버 목록',
    hasFixedLayout: true
  }
}
```

---

## 3. MEDIA 블록 (6개)

### 3.1 Image (이미지)

#### 기본 정보
- **블록명**: `o4o/image`
- **카테고리**: media
- **아이콘**: Image
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/image.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/EnhancedImageBlock.tsx
렌더러: packages/block-renderer/src/renderers/media/ImageBlock.tsx
```

#### 주요 기능
- ✅ 미디어 라이브러리 통합
- ✅ 이미지 업로드
- ✅ Alt 텍스트 + 캡션
- ✅ 링크 설정
- ✅ 포컬 포인트 에디터
- ✅ 크기 프리셋
- ✅ 동적 소스 지원

#### Attributes
```typescript
{
  url: string;                 // 이미지 URL
  alt?: string;                // 대체 텍스트
  caption?: string;            // 캡션
  align?: 'left' | 'center' | 'right' | 'wide' | 'full';
  size?: 'thumbnail' | 'medium' | 'large' | 'full';
  linkTo?: 'none' | 'media' | 'custom';
  linkUrl?: string;            // 커스텀 링크
  width?: number;
  height?: number;
  mediaId?: number;            // 미디어 라이브러리 ID
  dynamicSource?: string;      // 동적 소스
  useDynamicSource?: boolean;
}
```

#### Inspector Controls
- 크기 선택
- 정렬
- 링크 설정
- 포컬 포인트
- Alt 텍스트
- 동적 소스

#### 사용 예시
```typescript
// 기본 이미지
{
  name: 'o4o/image',
  attributes: {
    url: '/uploads/image.jpg',
    alt: '제품 이미지',
    align: 'center',
    size: 'large'
  }
}

// 링크가 있는 이미지
{
  name: 'o4o/image',
  attributes: {
    url: '/uploads/product.jpg',
    alt: '제품 상세 보기',
    linkTo: 'custom',
    linkUrl: '/products/123',
    caption: '신제품 출시'
  }
}

// 동적 이미지 (Featured Image)
{
  name: 'o4o/image',
  attributes: {
    useDynamicSource: true,
    dynamicSource: 'featured_image',
    alt: '포스트 대표 이미지'
  }
}
```

#### 개발 노트
- 2개 버전 존재: `EnhancedImageBlock`, `image/index.tsx`
- EnhancedImageBlock 사용 권장
- 관련 컴포넌트: `ImageDisplay.tsx`, `ImageSidebar.tsx`, `ImageUploader.tsx`

---

### 3.2 Gallery (갤러리)

#### 기본 정보
- **블록명**: `o4o/gallery`
- **카테고리**: media
- **아이콘**: Images
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/gallery.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/EnhancedGalleryBlock.tsx
렌더러: packages/block-renderer/src/renderers/media/GalleryBlock.tsx
```

#### 주요 기능
- ✅ 다중 레이아웃 (Grid, Masonry, Slider)
- ✅ 컬럼 수 조절 (1-8)
- ✅ 간격 조절
- ✅ 비율 제어
- ✅ 라이트박스 지원
- ✅ 호버 효과
- ✅ 캡션 위치 설정
- ✅ 랜덤 순서 옵션
- ✅ 드래그 앤 드롭 재정렬

#### Attributes
```typescript
{
  images: Array<{
    id: number;
    url: string;
    alt?: string;
    caption?: string;
  }>;
  layout?: 'grid' | 'masonry' | 'slider';
  columns?: number;            // 1-8
  gap?: number;                // 간격 (px)
  aspectRatio?: string;        // '16/9', '4/3', 'square', etc.
  showCaptions?: boolean;
  captionPosition?: 'below' | 'overlay';
  enableLightbox?: boolean;
  lightboxAnimation?: 'fade' | 'slide' | 'zoom';
  randomOrder?: boolean;
  hoverEffect?: 'none' | 'zoom' | 'lift' | 'brightness';
  borderRadius?: number;
  imageCrop?: boolean;
  linkTo?: 'none' | 'media' | 'attachment';
}
```

#### Inspector Controls
- 레이아웃 선택
- 컬럼 수
- 간격
- 비율
- 라이트박스 설정
- 호버 효과
- 캡션 설정

#### 사용 예시
```typescript
// 그리드 갤러리
{
  name: 'o4o/gallery',
  attributes: {
    images: [
      { id: 1, url: '/img1.jpg', alt: '이미지 1' },
      { id: 2, url: '/img2.jpg', alt: '이미지 2' },
      { id: 3, url: '/img3.jpg', alt: '이미지 3' }
    ],
    layout: 'grid',
    columns: 3,
    gap: 16,
    enableLightbox: true
  }
}

// 슬라이더 갤러리
{
  name: 'o4o/gallery',
  attributes: {
    images: [...],
    layout: 'slider',
    showCaptions: true,
    captionPosition: 'overlay',
    hoverEffect: 'zoom'
  }
}
```

#### 관련 컴포넌트
- `gallery/GalleryGrid.tsx` - 그리드 레이아웃
- `gallery/GalleryMasonry.tsx` - 메이슨리 레이아웃
- `gallery/GallerySlider.tsx` - 슬라이더 레이아웃
- `gallery/GalleryLightbox.tsx` - 라이트박스
- `gallery/GallerySettings.tsx` - 설정 패널

---

### 3.3 Cover (커버)

#### 기본 정보
- **블록명**: `o4o/cover`
- **카테고리**: media
- **아이콘**: Image
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/cover.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/EnhancedCoverBlock.tsx
렌더러: packages/block-renderer/src/renderers/special/CoverBlock.tsx
```

#### 주요 기능
- ✅ 배경 타입 (이미지, 비디오, 그라디언트)
- ✅ 오버레이 제어
- ✅ 포컬 포인트
- ✅ 패럴랙스 효과
- ✅ 최소 높이 조절
- ✅ 콘텐츠 위치 설정
- ✅ 비율 옵션
- ✅ Featured Image 지원
- ✅ 드래그 리사이즈

#### Attributes
```typescript
{
  backgroundType: 'image' | 'video' | 'gradient';
  backgroundImage?: string;
  backgroundVideo?: string;
  overlayColor?: string;
  overlayOpacity?: number;      // 0-100
  minHeight?: number;
  contentPosition?: 'top left' | 'top center' | 'top right' |
                    'center left' | 'center center' | 'center right' |
                    'bottom left' | 'bottom center' | 'bottom right';
  focalPoint?: { x: number; y: number };
  hasParallax?: boolean;
  isRepeated?: boolean;
  dimRatio?: number;            // 0-100
  gradient?: string;
  customGradient?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  backgroundRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  tagName?: 'div' | 'header' | 'section' | 'article';
  aspectRatio?: string;
  useFeaturedImage?: boolean;
}
```

#### Inspector Controls
- 배경 타입 선택
- 배경 설정 (이미지/비디오/그라디언트)
- 오버레이 색상 및 투명도
- 최소 높이
- 콘텐츠 위치
- 포컬 포인트
- 패럴랙스 효과
- 비율
- Featured Image 사용

#### InnerBlocks
✅ 지원 - 커버 위에 다른 블록 추가 가능

#### 사용 예시
```typescript
// 이미지 배경 커버
{
  name: 'o4o/cover',
  attributes: {
    backgroundType: 'image',
    backgroundImage: '/hero.jpg',
    overlayColor: '#000000',
    overlayOpacity: 50,
    minHeight: 500,
    contentPosition: 'center center'
  },
  innerBlocks: [
    {
      name: 'o4o/heading',
      attributes: {
        content: '환영합니다',
        level: 1,
        textColor: '#ffffff'
      }
    }
  ]
}

// 그라디언트 배경 커버
{
  name: 'o4o/cover',
  attributes: {
    backgroundType: 'gradient',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: 400,
    hasParallax: true
  },
  innerBlocks: [...]
}

// Featured Image 커버
{
  name: 'o4o/cover',
  attributes: {
    useFeaturedImage: true,
    overlayOpacity: 30,
    contentPosition: 'bottom left'
  },
  innerBlocks: [...]
}
```

#### 관련 컴포넌트
- `cover/CoverBackground.tsx` - 배경 렌더링
- `cover/CoverContent.tsx` - 콘텐츠 영역
- `cover/CoverOverlay.tsx` - 오버레이 레이어
- `cover/CoverSettings.tsx` - 설정 패널

---

### 3.4 Slide (슬라이드)

#### 기본 정보
- **블록명**: `o4o/slide`
- **카테고리**: media
- **아이콘**: Image
- **상태**: ✅ Fully Implemented (M3 Updated)

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/slide/SlideBlock.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/slide/SlideBlockWrapper.tsx
렌더러: packages/block-renderer/src/renderers/media/SlideBlock.tsx
```

#### 주요 기능
- ✅ 다중 슬라이드 타입 (텍스트, 이미지)
- ✅ 자동 재생 (인터랙션 시 일시정지)
- ✅ 루프 제어
- ✅ 네비게이션 화살표
- ✅ 페이지네이션 (점, 썸네일, 분수)
- ✅ 비율 제어
- ✅ WCAG 2.2 접근성 준수
- ✅ 경량화 (6KB)
- ✅ Embla Carousel 통합

#### Attributes
```typescript
{
  slides: Array<{
    id: string;
    type: 'text' | 'image';
    content: string;
    image?: string;
    alt?: string;
  }>;
  autoplay?: {
    enabled: boolean;
    delay: number;             // 밀리초
    pauseOnHover: boolean;
    pauseOnInteraction: boolean;
  };
  loop?: boolean;
  navigation?: {
    enabled: boolean;
    position: 'inside' | 'outside';
  };
  pagination?: {
    enabled: boolean;
    type: 'dots' | 'thumbnails' | 'fraction';
    position: 'bottom' | 'top';
  };
  aspectRatio?: '16/9' | '4/3' | '1/1' | 'custom';
  a11y?: {
    announceSlides: boolean;
    liveRegion: boolean;
  };
}
```

#### Inspector Controls
- 자동 재생 설정
- 루프 옵션
- 네비게이션 설정
- 페이지네이션 타입
- 비율 선택
- 접근성 옵션

#### 사용 예시
```typescript
// 기본 이미지 슬라이더
{
  name: 'o4o/slide',
  attributes: {
    slides: [
      { id: '1', type: 'image', image: '/slide1.jpg', alt: '슬라이드 1' },
      { id: '2', type: 'image', image: '/slide2.jpg', alt: '슬라이드 2' },
      { id: '3', type: 'image', image: '/slide3.jpg', alt: '슬라이드 3' }
    ],
    autoplay: {
      enabled: true,
      delay: 3000,
      pauseOnHover: true
    },
    navigation: { enabled: true, position: 'inside' },
    pagination: { enabled: true, type: 'dots', position: 'bottom' },
    loop: true
  }
}

// 텍스트 슬라이더
{
  name: 'o4o/slide',
  attributes: {
    slides: [
      { id: '1', type: 'text', content: '첫 번째 슬라이드' },
      { id: '2', type: 'text', content: '두 번째 슬라이드' }
    ],
    aspectRatio: '16/9',
    a11y: {
      announceSlides: true,
      liveRegion: true
    }
  }
}
```

#### 개발 노트
- M3 업데이트: Embla Carousel 통합
- 이전 대비 개선: 성능, 접근성, 번들 크기 (6KB)
- WCAG 2.2 준수: 키보드 네비게이션, 스크린 리더 지원

---

### 3.5 Video (비디오)

#### 기본 정보
- **블록명**: `o4o/video`
- **카테고리**: media
- **아이콘**: Video
- **상태**: ✅ Registered

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/video.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/media/StandardVideoBlock.tsx
렌더러: packages/block-renderer/src/renderers/media/VideoBlock.tsx
```

#### 주요 기능
- ✅ 비디오 업로드/URL 입력
- ✅ 자동 재생, 루프, 음소거 제어
- ✅ 포스터 이미지
- ✅ 캡션 지원

#### Attributes
```typescript
{
  src: string;                 // 비디오 URL
  caption?: string;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  poster?: string;             // 포스터 이미지 URL
}
```

#### Inspector Controls
- 자동 재생
- 루프
- 음소거
- 포스터 이미지

#### 사용 예시
```typescript
{
  name: 'o4o/video',
  attributes: {
    src: '/videos/intro.mp4',
    poster: '/videos/intro-poster.jpg',
    autoplay: false,
    loop: true,
    muted: false,
    caption: '제품 소개 영상'
  }
}
```

---

### 3.6 YouTube (유튜브)

#### 기본 정보
- **블록명**: `o4o/youtube`
- **카테고리**: media
- **아이콘**: Youtube
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/youtube.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/embed/StandardYouTubeBlock.tsx
렌더러: packages/block-renderer/src/renderers/special/EmbedBlock.tsx
```

#### 주요 기능
- ✅ YouTube 비디오 ID 입력
- ✅ 임베드 옵션
- ✅ 반응형 크기 조절

#### Attributes
```typescript
{
  videoId: string;             // YouTube 비디오 ID
  embedOptions?: {
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    controls?: boolean;
    modestbranding?: boolean;
  };
}
```

#### Inspector Controls
- 비디오 ID 입력
- 임베드 옵션

#### 사용 예시
```typescript
{
  name: 'o4o/youtube',
  attributes: {
    videoId: 'dQw4w9WgXcQ',
    embedOptions: {
      autoplay: false,
      controls: true,
      modestbranding: true
    }
  }
}
```

---

## 4. LAYOUT 블록 (4개)

### 4.1 Columns (컬럼 컨테이너)

#### 기본 정보
- **블록명**: `o4o/columns`
- **카테고리**: layout
- **아이콘**: Columns
- **상태**: ✅ Fully Implemented (Phase 2 Refactored)

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/columns.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/gutenberg/NewColumnsBlock.tsx
렌더러: packages/block-renderer/src/renderers/layout/ColumnsBlock.tsx
```

#### 주요 기능
- ✅ 동적 컬럼 수 (1-6)
- ✅ 자동 너비 재분배
- ✅ 수직 정렬
- ✅ 모바일 스태킹
- ✅ InnerBlocks 지원 (FIXED)
- ✅ 간격 제어
- ✅ 배경 색상

#### Attributes
```typescript
{
  columnCount: number;         // 1-6
  verticalAlignment?: 'top' | 'center' | 'bottom';
  isStackedOnMobile?: boolean;
  gap?: number;                // 간격 (px)
  backgroundColor?: string;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}
```

#### Inspector Controls
- 컬럼 수
- 정렬
- 간격
- 모바일 스태킹
- 배경 색상
- 패딩

#### InnerBlocks
✅ 지원 - Column 블록만 허용

#### 사용 예시
```typescript
// 2컬럼 레이아웃
{
  name: 'o4o/columns',
  attributes: {
    columnCount: 2,
    gap: 32,
    verticalAlignment: 'top',
    isStackedOnMobile: true
  },
  innerBlocks: [
    {
      name: 'o4o/column',
      attributes: { width: 50 },
      innerBlocks: [
        { name: 'o4o/heading', attributes: { content: '왼쪽 컬럼', level: 2 } }
      ]
    },
    {
      name: 'o4o/column',
      attributes: { width: 50 },
      innerBlocks: [
        { name: 'o4o/heading', attributes: { content: '오른쪽 컬럼', level: 2 } }
      ]
    }
  ]
}

// 3컬럼 레이아웃
{
  name: 'o4o/columns',
  attributes: {
    columnCount: 3,
    gap: 24,
    backgroundColor: '#f5f5f5'
  },
  innerBlocks: [...]
}
```

#### 개발 노트
- Phase 2 완료: InnerBlocks 렌더링 수정
- 자동 너비 재분배 기능 추가
- 드래그 리사이즈 지원

---

### 4.2 Column (컬럼)

#### 기본 정보
- **블록명**: `o4o/column`
- **카테고리**: layout
- **아이콘**: Column
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/column.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/gutenberg/NewColumnBlock.tsx
렌더러: packages/block-renderer/src/renderers/layout/ColumnBlock.tsx
```

#### 주요 기능
- ✅ 너비 제어 (퍼센트)
- ✅ 수직 정렬
- ✅ InnerBlocks 지원 (FIXED)
- ✅ 배경/패딩 제어
- ✅ 툴바에 너비 배지

#### Attributes
```typescript
{
  width?: number;              // 퍼센트 (0-100)
  verticalAlignment?: 'top' | 'center' | 'bottom';
  backgroundColor?: string;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}
```

#### Inspector Controls
- 너비
- 정렬
- 배경 색상
- 패딩

#### InnerBlocks
✅ 지원 - 모든 블록 허용

#### Parent
`o4o/columns` 내부에만 존재 가능

#### 사용 예시
```typescript
{
  name: 'o4o/column',
  attributes: {
    width: 33.33,
    verticalAlignment: 'center',
    backgroundColor: '#ffffff',
    padding: { top: 20, right: 20, bottom: 20, left: 20 }
  },
  innerBlocks: [
    { name: 'o4o/heading', attributes: { content: '제목', level: 3 } },
    { name: 'o4o/paragraph', attributes: { content: '내용...' } }
  ]
}
```

---

### 4.3 Group (그룹)

#### 기본 정보
- **블록명**: `o4o/group`
- **카테고리**: layout
- **아이콘**: Group
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/group.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/GroupBlock.tsx
렌더러: packages/block-renderer/src/renderers/layout/GroupBlock.tsx (존재하지 않음, 필요 시 생성)
```

#### 주요 기능
- ✅ 레이아웃 모드 (flow, flex, grid)
- ✅ 시맨틱 HTML 태그 (div, section, article 등)
- ✅ Flex 제어 (direction, justify, align)
- ✅ Grid 제어 (columns, rows, gap)
- ✅ 배경 및 테두리 스타일
- ✅ 패딩/마진 제어

#### Attributes
```typescript
{
  layout?: 'flow' | 'flex' | 'grid';
  tagName?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'footer' | 'main';
  backgroundColor?: string;
  textColor?: string;
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;

  // Flex 속성
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  gap?: number;

  // Grid 속성
  gridColumns?: number;
  gridRows?: number;

  minHeight?: number;
}
```

#### Inspector Controls
- 레이아웃 모드
- HTML 태그
- Flex/Grid 설정
- 스타일 (색상, 테두리)
- 간격 (패딩, 마진, gap)

#### InnerBlocks
✅ 지원 - 모든 블록 허용

#### 사용 예시
```typescript
// 기본 섹션 그룹
{
  name: 'o4o/group',
  attributes: {
    tagName: 'section',
    backgroundColor: '#f9f9f9',
    padding: { top: 40, bottom: 40 }
  },
  innerBlocks: [...]
}

// Flex 레이아웃
{
  name: 'o4o/group',
  attributes: {
    layout: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 20
  },
  innerBlocks: [...]
}

// Grid 레이아웃
{
  name: 'o4o/group',
  attributes: {
    layout: 'grid',
    gridColumns: 3,
    gap: 24
  },
  innerBlocks: [...]
}
```

---

### 4.4 Conditional (조건부)

#### 기본 정보
- **블록명**: `o4o/conditional`
- **카테고리**: layout
- **아이콘**: Eye
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/conditional.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/ConditionalBlock.tsx
렌더러: 동적 렌더링 (조건 평가)
```

#### 주요 기능
- ✅ 14가지 조건 타입
- ✅ AND/OR 논리 연산자
- ✅ 표시/숨김 토글
- ✅ 에디터 내 시각적 인디케이터
- ✅ 조건 빌더 UI

#### Condition Types (14가지)

**User Conditions (사용자)**
- `logged_in` - 로그인 여부
- `role` - 사용자 역할
- `user_id` - 특정 사용자 ID

**Content Conditions (콘텐츠)**
- `post_type` - 포스트 타입
- `category` - 카테고리
- `post_id` - 특정 포스트 ID

**URL Conditions (URL)**
- `parameter` - URL 파라미터
- `path` - URL 경로
- `subdomain` - 서브도메인

**Time Conditions (시간)**
- `date_range` - 날짜 범위
- `time_range` - 시간 범위
- `day_of_week` - 요일

**Device Conditions (기기)**
- `device_type` - 기기 타입
- `browser_type` - 브라우저 타입

#### Attributes
```typescript
{
  conditions: Array<{
    type: string;              // 조건 타입
    operator?: string;         // 연산자 (is, is_not, contains 등)
    value?: string | number;   // 비교 값
  }>;
  logicOperator: 'AND' | 'OR'; // 논리 연산자
  showWhenMet: boolean;        // 조건 만족 시 표시/숨김
  showIndicator?: boolean;     // 에디터 인디케이터 표시
  indicatorText?: string;      // 인디케이터 텍스트
}
```

#### Inspector Controls
- 조건 추가/제거
- 조건 타입 선택
- 연산자 선택
- 값 입력
- 논리 연산자 (AND/OR)
- 표시/숨김 토글

#### InnerBlocks
✅ 지원 - 모든 블록 허용 (조건부로 표시)

#### 사용 예시
```typescript
// 로그인 사용자만 표시
{
  name: 'o4o/conditional',
  attributes: {
    conditions: [
      { type: 'logged_in', operator: 'is', value: true }
    ],
    logicOperator: 'AND',
    showWhenMet: true
  },
  innerBlocks: [
    { name: 'o4o/paragraph', attributes: { content: '회원 전용 콘텐츠' } }
  ]
}

// 특정 역할 + 특정 페이지에서만 표시
{
  name: 'o4o/conditional',
  attributes: {
    conditions: [
      { type: 'role', operator: 'is', value: 'admin' },
      { type: 'post_type', operator: 'is', value: 'page' }
    ],
    logicOperator: 'AND',
    showWhenMet: true,
    showIndicator: true,
    indicatorText: '관리자 전용 (페이지만)'
  },
  innerBlocks: [...]
}

// 특정 날짜 범위에만 표시
{
  name: 'o4o/conditional',
  attributes: {
    conditions: [
      {
        type: 'date_range',
        operator: 'between',
        value: { start: '2025-01-01', end: '2025-12-31' }
      }
    ],
    logicOperator: 'AND',
    showWhenMet: true
  },
  innerBlocks: [
    { name: 'o4o/paragraph', attributes: { content: '2025년 한정 이벤트!' } }
  ]
}

// 모바일에서만 표시
{
  name: 'o4o/conditional',
  attributes: {
    conditions: [
      { type: 'device_type', operator: 'is', value: 'mobile' }
    ],
    logicOperator: 'AND',
    showWhenMet: true
  },
  innerBlocks: [...]
}
```

#### 활용 사례
- 회원 전용 콘텐츠
- 역할 기반 콘텐츠 (관리자, 에디터 등)
- 기간 한정 프로모션
- 기기별 콘텐츠 (모바일/데스크톱)
- 특정 페이지/카테고리 전용 콘텐츠
- A/B 테스팅

---

## 5. DESIGN 블록 (2개)

### 5.1 Button (버튼)

#### 기본 정보
- **블록명**: `o4o/button`
- **카테고리**: design
- **아이콘**: MousePointerClick
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/button.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/ButtonBlock.tsx
렌더러: packages/block-renderer/src/renderers/layout/ButtonBlock.tsx
```

#### 주요 기능
- ✅ 버튼 텍스트 및 URL
- ✅ 스타일 변형 (fill, outline, ghost, link)
- ✅ 크기 옵션 (sm, md, lg)
- ✅ 아이콘 지원 (50+ Lucide 아이콘)
- ✅ 색상 제어
- ✅ 그라디언트 지원
- ✅ 그림자 효과
- ✅ 전체 너비 옵션
- ✅ 테두리 반경 제어
- ✅ 링크 target 및 rel 속성

#### Attributes
```typescript
{
  text: string;                // 버튼 텍스트
  url?: string;                // 링크 URL
  style?: 'fill' | 'outline' | 'ghost' | 'link';
  width?: 'auto' | 'full';
  align?: 'left' | 'center' | 'right';
  textColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  linkTarget?: '_blank' | '_self';
  rel?: string;                // 예: 'noopener noreferrer'
  fontSize?: string;
  paddingX?: number;
  paddingY?: number;

  // 그라디언트
  gradientEnabled?: boolean;
  gradientType?: 'linear' | 'radial';
  gradientAngle?: number;
  gradientStops?: Array<{ color: string; position: number }>;
  gradientShape?: 'circle' | 'ellipse';
  gradientPosition?: string;

  // 그림자
  shadowEnabled?: boolean;
  shadowHorizontal?: number;
  shadowVertical?: number;
  shadowBlur?: number;
  shadowSpread?: number;
  shadowColor?: string;
  shadowOpacity?: number;
  shadowInset?: boolean;

  // 아이콘
  iconEnabled?: boolean;
  iconName?: string;           // Lucide 아이콘 이름
  iconPosition?: 'left' | 'right';
  iconSize?: number;
  iconGap?: number;
  iconColor?: string;
}
```

#### Inspector Controls
- 스타일 선택
- 크기 선택
- 아이콘 설정
- 색상 (텍스트, 배경)
- 그라디언트 설정
- 그림자 설정
- 링크 설정 (URL, target, rel)
- 간격 (패딩)
- 테두리

#### 사용 예시
```typescript
// 기본 버튼
{
  name: 'o4o/button',
  attributes: {
    text: '더 알아보기',
    url: '/about',
    style: 'fill',
    backgroundColor: '#0066cc',
    textColor: '#ffffff'
  }
}

// 아이콘 버튼
{
  name: 'o4o/button',
  attributes: {
    text: '다운로드',
    url: '/download',
    iconEnabled: true,
    iconName: 'Download',
    iconPosition: 'left',
    iconGap: 8
  }
}

// 그라디언트 버튼
{
  name: 'o4o/button',
  attributes: {
    text: '시작하기',
    url: '/signup',
    gradientEnabled: true,
    gradientType: 'linear',
    gradientAngle: 135,
    gradientStops: [
      { color: '#667eea', position: 0 },
      { color: '#764ba2', position: 100 }
    ]
  }
}

// 전체 너비 버튼
{
  name: 'o4o/button',
  attributes: {
    text: '제출',
    width: 'full',
    style: 'fill',
    backgroundColor: '#28a745'
  }
}
```

#### 관련 컴포넌트
- `button/ButtonInspectorControls.tsx` - Inspector 패널
- `button/GradientEditor.tsx` - 그라디언트 에디터
- `button/ShadowEditor.tsx` - 그림자 에디터
- `button/IconInserter.tsx` - 아이콘 선택기
- `button/AnimationEditor.tsx` - 애니메이션 설정

---

### 5.2 Buttons (버튼 컨테이너)

#### 기본 정보
- **블록명**: `o4o/buttons`
- **카테고리**: design
- **아이콘**: MousePointerClick
- **상태**: ✅ Registered

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/buttons.tsx
컴포넌트: InnerBlocks 컨테이너
렌더러: packages/block-renderer/src/renderers/layout/ButtonsBlock.tsx
```

#### 주요 기능
- ✅ 여러 버튼 컨테이너
- ✅ 가로/세로 레이아웃
- ✅ 정렬 옵션

#### Attributes
```typescript
{
  layout?: 'horizontal' | 'vertical';
  alignment?: 'left' | 'center' | 'right' | 'space-between';
}
```

#### Inspector Controls
- 레이아웃 (가로/세로)
- 정렬

#### InnerBlocks
✅ 지원 - Button 블록만 허용

#### 사용 예시
```typescript
{
  name: 'o4o/buttons',
  attributes: {
    layout: 'horizontal',
    alignment: 'center'
  },
  innerBlocks: [
    {
      name: 'o4o/button',
      attributes: {
        text: '주요 액션',
        style: 'fill',
        backgroundColor: '#0066cc'
      }
    },
    {
      name: 'o4o/button',
      attributes: {
        text: '보조 액션',
        style: 'outline'
      }
    }
  ]
}
```

---

## 6. WIDGETS 블록 (2개)

### 6.1 Social Links (소셜 링크)

#### 기본 정보
- **블록명**: `o4o/social-links`
- **카테고리**: widgets
- **아이콘**: Share2
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/social.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/SocialIconsBlock.tsx
렌더러: 커스텀 렌더링
```

#### 주요 기능
- ✅ 30+ 소셜 플랫폼 지원
- ✅ 아이콘 모양 (원, 둥근 사각형, 사각형)
- ✅ 크기 옵션 (small, medium, large)
- ✅ 색상 모드 (브랜드, 커스텀, 단색)
- ✅ 드래그 앤 드롭 재정렬
- ✅ 간격 제어
- ✅ 개별 아이콘 설정 (새 탭, rel)

#### 지원 플랫폼 (30+)
Facebook, Twitter (X), Instagram, LinkedIn, YouTube, TikTok, Pinterest, Snapchat, Reddit, Tumblr, WhatsApp, Telegram, Discord, Slack, Medium, GitHub, GitLab, Dribbble, Behance, Figma, CodePen, StackOverflow, Dev.to, Twitch, Spotify, SoundCloud, Email, Phone, Website, RSS

#### Attributes
```typescript
{
  items: Array<{
    service: string;           // 플랫폼 이름
    url: string;               // 링크 URL
    openInNewTab?: boolean;
    rel?: string;
  }>;
  shape?: 'circle' | 'rounded' | 'square';
  size?: 'small' | 'medium' | 'large';
  alignment?: 'left' | 'center' | 'right';
  colorMode?: 'brand' | 'custom' | 'monochrome';
  gap?: number;                // 간격 (px)
}
```

#### Inspector Controls
- 소셜 아이템 추가/제거/정렬
- 모양 선택
- 크기 선택
- 정렬
- 색상 모드
- 간격

#### 사용 예시
```typescript
// 기본 소셜 링크
{
  name: 'o4o/social-links',
  attributes: {
    items: [
      { service: 'facebook', url: 'https://facebook.com/mypage' },
      { service: 'twitter', url: 'https://twitter.com/myhandle' },
      { service: 'instagram', url: 'https://instagram.com/myaccount' }
    ],
    shape: 'circle',
    size: 'medium',
    alignment: 'center',
    colorMode: 'brand',
    gap: 16
  }
}

// 커스텀 스타일 소셜 링크
{
  name: 'o4o/social-links',
  attributes: {
    items: [
      { service: 'github', url: 'https://github.com/username', openInNewTab: true },
      { service: 'linkedin', url: 'https://linkedin.com/in/username', openInNewTab: true },
      { service: 'email', url: 'mailto:contact@example.com' }
    ],
    shape: 'rounded',
    size: 'large',
    colorMode: 'monochrome',
    gap: 24
  }
}
```

#### 관련 컴포넌트
- `social/PlatformIcons.tsx` - 플랫폼 아이콘
- `social/ColorModeSelector.tsx` - 색상 모드 선택
- `social/LayoutSelector.tsx` - 레이아웃 선택
- `social/StyleSelector.tsx` - 스타일 선택

---

### 6.2 Shortcode (숏코드)

#### 기본 정보
- **블록명**: `o4o/shortcode`
- **카테고리**: widgets
- **아이콘**: Code
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/shortcode.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/ShortcodeBlock.tsx
렌더러: packages/block-renderer/src/renderers/special/ShortcodeBlock.tsx
```

#### 주요 기능
- ✅ 숏코드 입력
- ✅ 미리보기 렌더링
- ✅ 최근 숏코드 목록
- ✅ 파라미터 검증

#### Attributes
```typescript
{
  shortcode: string;           // 숏코드 문자열
  parameters?: Record<string, any>;
  preview?: string;            // 미리보기 HTML
}
```

#### Inspector Controls
- 숏코드 입력
- 파라미터 설정
- 미리보기 토글

#### 사용 예시
```typescript
// 기본 숏코드
{
  name: 'o4o/shortcode',
  attributes: {
    shortcode: '[contact-form-7 id="123"]'
  }
}

// 파라미터가 있는 숏코드
{
  name: 'o4o/shortcode',
  attributes: {
    shortcode: '[gallery ids="1,2,3" columns="3"]',
    parameters: {
      ids: '1,2,3',
      columns: 3
    }
  }
}

// O4O 커스텀 숏코드
{
  name: 'o4o/shortcode',
  attributes: {
    shortcode: '[cpt-list type="product" limit="10"]',
    parameters: {
      type: 'product',
      limit: 10
    }
  }
}
```

#### 지원 숏코드 (O4O Platform)
- `[cpt-list]` - CPT 목록
- `[cpt-field]` - CPT 필드 값
- `[acf-field]` - ACF 필드 값
- `[meta-field]` - 메타 필드 값
- 기타 WordPress 표준 숏코드

---

## 7. DYNAMIC 블록 (3개)

### 7.1 Universal Form (통합 폼)

#### 기본 정보
- **블록명**: `o4o/universal-form`
- **카테고리**: dynamic
- **아이콘**: FileText
- **상태**: ✅ Fully Implemented (NEW)

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/universal-form.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/UniversalFormBlock.tsx
렌더러: 동적 폼 렌더링
```

#### 주요 기능
- ✅ 통합 폼 (Post + 모든 CPT)
- ✅ 생성/수정 모드
- ✅ 자동 CPT 감지
- ✅ ACF 필드 통합
- ✅ 성공/에러 메시지
- ✅ 제출 후 리디렉션
- ✅ 폼 리셋 옵션
- ✅ 코드 37% 절감 (231줄)

#### Attributes
```typescript
{
  postType: string;            // 'post' 또는 CPT slug
  formAction: 'create' | 'edit';
  postId?: number;             // 수정 모드일 때
  defaultStatus?: 'draft' | 'publish' | 'pending';
  redirectUrl?: string;        // 제출 후 리디렉션
  successMessage?: string;
  errorMessage?: string;
  showSuccessMessage?: boolean;
  resetOnSubmit?: boolean;
  allowedBlocks?: string[];    // ['o4o/form-field', 'o4o/form-submit']
}
```

#### Inspector Controls
- Post Type 선택
- 폼 액션 (생성/수정)
- 기본 상태
- 리디렉션 URL
- 메시지 설정

#### InnerBlocks
✅ 지원 - Form Field, Form Submit 블록만 허용

#### 사용 예시
```typescript
// 포스트 생성 폼
{
  name: 'o4o/universal-form',
  attributes: {
    postType: 'post',
    formAction: 'create',
    defaultStatus: 'draft',
    successMessage: '포스트가 성공적으로 생성되었습니다.',
    redirectUrl: '/my-posts',
    resetOnSubmit: true
  },
  innerBlocks: [
    {
      name: 'o4o/form-field',
      attributes: {
        name: 'title',
        label: '제목',
        fieldType: 'text',
        required: true,
        mapToField: 'post_title'
      }
    },
    {
      name: 'o4o/form-field',
      attributes: {
        name: 'content',
        label: '내용',
        fieldType: 'textarea',
        rows: 10,
        mapToField: 'post_content'
      }
    },
    {
      name: 'o4o/form-submit',
      attributes: {
        text: '포스트 작성',
        variant: 'default',
        size: 'md'
      }
    }
  ]
}

// 제품(CPT) 생성 폼
{
  name: 'o4o/universal-form',
  attributes: {
    postType: 'product',
    formAction: 'create',
    defaultStatus: 'publish',
    successMessage: '제품이 등록되었습니다.'
  },
  innerBlocks: [
    {
      name: 'o4o/form-field',
      attributes: {
        name: 'product_name',
        label: '제품명',
        fieldType: 'text',
        required: true,
        mapToField: 'post_title'
      }
    },
    {
      name: 'o4o/form-field',
      attributes: {
        name: 'price',
        label: '가격',
        fieldType: 'number',
        required: true,
        acfFieldKey: 'field_price'
      }
    },
    {
      name: 'o4o/form-field',
      attributes: {
        name: 'description',
        label: '설명',
        fieldType: 'textarea',
        mapToField: 'post_content'
      }
    },
    {
      name: 'o4o/form-submit',
      attributes: { text: '제품 등록' }
    }
  ]
}

// 포스트 수정 폼
{
  name: 'o4o/universal-form',
  attributes: {
    postType: 'post',
    formAction: 'edit',
    postId: 123,
    successMessage: '포스트가 업데이트되었습니다.'
  },
  innerBlocks: [...]
}
```

#### 개발 노트
- `o4o/post-form`과 `o4o/cpt-form` 통합
- 코드 절감: 231줄 (37%)
- 자동 CPT 감지로 모든 CPT 지원
- ACF 필드 자동 통합

---

### 7.2 Form Field (폼 필드)

#### 기본 정보
- **블록명**: `o4o/form-field`
- **카테고리**: dynamic
- **아이콘**: FormInput
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/form-field.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/FormFieldBlock.tsx
렌더러: 동적 필드 렌더링
```

#### 주요 기능
- ✅ 다양한 필드 타입 (8종)
- ✅ 라벨 및 플레이스홀더
- ✅ 필수 검증
- ✅ 도움말 텍스트
- ✅ ACF 필드 매핑
- ✅ CPT 필드 매핑
- ✅ 고급 검증 (길이, 패턴, 범위)

#### 필드 타입
- `text` - 텍스트 입력
- `email` - 이메일 입력
- `number` - 숫자 입력
- `textarea` - 여러 줄 텍스트
- `select` - 드롭다운 선택
- `checkbox` - 체크박스
- `radio` - 라디오 버튼
- `file` - 파일 업로드

#### Attributes
```typescript
{
  name: string;                // 필드 이름
  label: string;               // 라벨
  fieldType: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'file';
  placeholder?: string;
  defaultValue?: any;
  required?: boolean;
  helpText?: string;
  rows?: number;               // textarea용
  options?: Array<{            // select, radio, checkbox용
    label: string;
    value: string;
  }>;
  acfFieldKey?: string;        // ACF 필드 키
  mapToField?: string;         // 매핑할 필드 (post_title, post_content 등)

  // 검증
  minLength?: number;
  maxLength?: number;
  pattern?: string;            // 정규식
  min?: number;                // number용
  max?: number;                // number용
}
```

#### Inspector Controls
- 필드 타입
- 필드 이름
- 라벨
- 필수 여부
- 검증 규칙
- ACF 매핑
- CPT 필드 매핑

#### Parent
`o4o/universal-form` 내부에만 존재

#### 사용 예시
```typescript
// 텍스트 필드
{
  name: 'o4o/form-field',
  attributes: {
    name: 'title',
    label: '제목',
    fieldType: 'text',
    placeholder: '제목을 입력하세요',
    required: true,
    mapToField: 'post_title',
    minLength: 5,
    maxLength: 100
  }
}

// 이메일 필드
{
  name: 'o4o/form-field',
  attributes: {
    name: 'email',
    label: '이메일',
    fieldType: 'email',
    required: true,
    helpText: '유효한 이메일 주소를 입력하세요'
  }
}

// 텍스트 영역
{
  name: 'o4o/form-field',
  attributes: {
    name: 'content',
    label: '내용',
    fieldType: 'textarea',
    rows: 10,
    mapToField: 'post_content',
    minLength: 50
  }
}

// 선택 필드
{
  name: 'o4o/form-field',
  attributes: {
    name: 'category',
    label: '카테고리',
    fieldType: 'select',
    required: true,
    options: [
      { label: '기술', value: 'tech' },
      { label: '디자인', value: 'design' },
      { label: '마케팅', value: 'marketing' }
    ]
  }
}

// ACF 필드 매핑
{
  name: 'o4o/form-field',
  attributes: {
    name: 'price',
    label: '가격',
    fieldType: 'number',
    acfFieldKey: 'field_product_price',
    min: 0,
    required: true
  }
}

// 파일 업로드
{
  name: 'o4o/form-field',
  attributes: {
    name: 'attachment',
    label: '첨부 파일',
    fieldType: 'file',
    helpText: '최대 5MB까지 업로드 가능합니다'
  }
}
```

---

### 7.3 Form Submit (폼 제출)

#### 기본 정보
- **블록명**: `o4o/form-submit`
- **카테고리**: dynamic
- **아이콘**: Send
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/form-submit.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/FormSubmitBlock.tsx
렌더러: 버튼 렌더링
```

#### 주요 기능
- ✅ 제출 버튼 스타일링
- ✅ 로딩 상태
- ✅ 커스텀 텍스트

#### Attributes
```typescript
{
  text: string;                // 버튼 텍스트
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  loading?: boolean;           // 로딩 상태
}
```

#### Inspector Controls
- 버튼 텍스트
- 스타일 변형
- 크기

#### Parent
`o4o/universal-form` 내부에만 존재

#### 사용 예시
```typescript
// 기본 제출 버튼
{
  name: 'o4o/form-submit',
  attributes: {
    text: '제출',
    variant: 'default',
    size: 'default'
  }
}

// 큰 제출 버튼
{
  name: 'o4o/form-submit',
  attributes: {
    text: '포스트 작성',
    variant: 'default',
    size: 'lg'
  }
}

// 보조 스타일 버튼
{
  name: 'o4o/form-submit',
  attributes: {
    text: '임시 저장',
    variant: 'outline',
    size: 'sm'
  }
}
```

---

## 8. EMBED 블록 (2개)

### 8.1 File (파일)

#### 기본 정보
- **블록명**: `o4o/file`
- **카테고리**: embed
- **아이콘**: File
- **상태**: ✅ Fully Implemented

#### 파일 위치
```
정의: apps/admin-dashboard/src/blocks/definitions/file.tsx
컴포넌트: apps/admin-dashboard/src/components/editor/blocks/FileBlock.tsx
렌더러: 파일 다운로드 링크
```

#### 주요 기능
- ✅ 파일 업로드/선택
- ✅ 다운로드 링크 표시
- ✅ 파일 아이콘
- ✅ 파일 크기 표시

#### Attributes
```typescript
{
  url: string;                 // 파일 URL
  fileName?: string;
  fileSize?: number;           // 바이트
  showDownloadButton?: boolean;
}
```

#### Inspector Controls
- 파일 선택
- 파일명 표시
- 다운로드 버튼 표시

#### 사용 예시
```typescript
{
  name: 'o4o/file',
  attributes: {
    url: '/uploads/document.pdf',
    fileName: '사용자 가이드.pdf',
    fileSize: 2048000,
    showDownloadButton: true
  }
}
```

---

### 8.2 YouTube (유튜브)

**Media 블록 섹션 (3.6) 참조**

---

## 9. 개발 가이드

### 9.1 블록 시스템 아키텍처

#### 핵심 컴포넌트

**BlockRegistry** (`apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts`)
- 싱글톤 패턴으로 중앙 집중식 블록 관리
- TypeScript 기반 타입 안전성
- 카테고리 인덱싱 및 검색 기능
- WordPress 독립적 아키텍처

```typescript
class BlockRegistry {
  private static instance: BlockRegistry;
  private blocks: Map<string, BlockDefinition>;
  private categoryIndex: Map<string, Set<string>>;

  register(definition: BlockDefinition): void;
  unregister(name: string): void;
  get(name: string): BlockDefinition | undefined;
  getAll(): BlockDefinition[];
  getByCategory(category: BlockCategory): BlockDefinition[];
  search(query: string): BlockDefinition[];
}
```

#### 파일 구조

```
apps/admin-dashboard/src/
├── blocks/
│   ├── registry/
│   │   └── BlockRegistry.ts          # 블록 레지스트리
│   ├── definitions/                  # 블록 정의 (28개)
│   │   ├── paragraph.tsx
│   │   ├── heading.tsx
│   │   └── ...
│   └── index.ts                      # 블록 등록
├── components/editor/blocks/         # 블록 컴포넌트
│   ├── ParagraphBlock.tsx
│   ├── EnhancedImageBlock.tsx
│   └── ...
└── ...

packages/block-renderer/src/
└── renderers/                        # 프론트엔드 렌더러
    ├── text/
    ├── media/
    ├── layout/
    └── special/
```

---

### 9.2 새 블록 만들기

#### 1단계: 블록 정의 생성

`apps/admin-dashboard/src/blocks/definitions/my-block.tsx`

```typescript
import { BlockDefinition } from '../registry/BlockRegistry';
import { MyBlock } from '../../components/editor/blocks/MyBlock';
import { Icon } from 'lucide-react';

export const myBlockDefinition: BlockDefinition = {
  name: 'o4o/my-block',
  title: '내 블록',
  category: 'text',
  icon: Icon,
  description: '내 커스텀 블록입니다',
  keywords: ['custom', 'my'],
  component: MyBlock,
  attributes: {
    content: {
      type: 'string',
      default: ''
    },
    align: {
      type: 'string',
      default: 'left'
    }
  },
  supports: {
    anchor: true,
    align: ['left', 'center', 'right'],
    className: true,
    color: {
      text: true,
      background: true
    }
  }
};
```

#### 2단계: 블록 컴포넌트 작성

`apps/admin-dashboard/src/components/editor/blocks/MyBlock.tsx`

```typescript
import React from 'react';
import { BlockComponent } from '../../blocks/registry/BlockRegistry';

export const MyBlock: BlockComponent = ({
  attributes,
  setAttributes,
  isSelected
}) => {
  const { content, align } = attributes;

  return (
    <div
      className={`my-block align-${align}`}
      style={{ textAlign: align }}
    >
      <input
        type="text"
        value={content}
        onChange={(e) => setAttributes({ content: e.target.value })}
        placeholder="내용을 입력하세요"
      />

      {/* Inspector Controls */}
      {isSelected && (
        <div className="inspector-controls">
          <label>정렬</label>
          <select
            value={align}
            onChange={(e) => setAttributes({ align: e.target.value })}
          >
            <option value="left">왼쪽</option>
            <option value="center">가운데</option>
            <option value="right">오른쪽</option>
          </select>
        </div>
      )}
    </div>
  );
};
```

#### 3단계: 블록 등록

`apps/admin-dashboard/src/blocks/index.ts`

```typescript
import { blockRegistry } from './registry/BlockRegistry';
import { myBlockDefinition } from './definitions/my-block';

export function registerAllBlocks(): void {
  // ... 기존 블록 등록

  // 새 블록 등록
  blockRegistry.register(myBlockDefinition);
}
```

#### 4단계: 프론트엔드 렌더러 작성

`packages/block-renderer/src/renderers/text/MyBlock.tsx`

```typescript
import React from 'react';

interface MyBlockProps {
  content: string;
  align?: string;
}

export const MyBlock: React.FC<MyBlockProps> = ({ content, align = 'left' }) => {
  return (
    <div className="my-block" style={{ textAlign: align }}>
      {content}
    </div>
  );
};
```

#### 5단계: 렌더러 등록

`packages/block-renderer/src/renderers/index.ts`

```typescript
import { MyBlock } from './text/MyBlock';

export const blockRenderers = {
  // ... 기존 렌더러
  'o4o/my-block': MyBlock,
};
```

---

### 9.3 블록 등록 방법

#### 기본 등록

```typescript
import { blockRegistry } from './registry/BlockRegistry';

blockRegistry.register({
  name: 'o4o/my-block',
  title: '내 블록',
  category: 'text',
  icon: 'icon-name',
  component: MyBlockComponent,
  attributes: {
    // ...
  }
});
```

#### 등록 해제

```typescript
blockRegistry.unregister('o4o/my-block');
```

#### 블록 가져오기

```typescript
// 특정 블록
const block = blockRegistry.get('o4o/paragraph');

// 모든 블록
const allBlocks = blockRegistry.getAll();

// 카테고리별 블록
const textBlocks = blockRegistry.getByCategory('text');

// 블록 검색
const results = blockRegistry.search('image');
```

---

### 9.4 InnerBlocks 패턴

#### 기본 InnerBlocks 구현

```typescript
export const ContainerBlock: BlockComponent = ({
  attributes,
  setAttributes,
  innerBlocks,
  setInnerBlocks
}) => {
  return (
    <div className="container-block">
      <InnerBlocksRenderer
        blocks={innerBlocks}
        onChange={setInnerBlocks}
        allowedBlocks={['o4o/paragraph', 'o4o/heading']}
      />
    </div>
  );
};
```

#### InnerBlocks 설정

```typescript
{
  name: 'o4o/container',
  // ...
  innerBlocksSettings: {
    allowedBlocks: ['o4o/paragraph', 'o4o/heading'],
    template: [
      ['o4o/heading', { level: 2, content: '제목' }],
      ['o4o/paragraph', { content: '내용...' }]
    ],
    templateLock: false  // 또는 'all', 'insert'
  }
}
```

#### 허용 블록 제한

```typescript
// 특정 블록만 허용
innerBlocksSettings: {
  allowedBlocks: ['o4o/column']
}

// 모든 블록 허용
innerBlocksSettings: {
  allowedBlocks: undefined  // 또는 빈 배열
}
```

#### 템플릿 잠금

```typescript
// 잠금 없음 - 자유롭게 추가/삭제/이동
templateLock: false

// 삽입 잠금 - 새 블록 추가 불가, 이동/삭제 가능
templateLock: 'insert'

// 전체 잠금 - 추가/삭제/이동 모두 불가
templateLock: 'all'
```

---

## 10. API 참조

### 10.1 BlockDefinition 인터페이스

```typescript
interface BlockDefinition {
  // 필수
  name: string;                        // 블록 식별자 (예: 'o4o/paragraph')
  title: string;                       // 표시 이름
  category: BlockCategory;             // 카테고리
  icon: ReactElement | string;         // Lucide 아이콘
  component: BlockComponent;           // React 컴포넌트

  // 선택
  description?: string;                // 블록 설명
  keywords?: string[];                 // 검색 키워드
  attributes?: AttributeSchema;        // 속성 스키마
  supports?: BlockSupports;            // 지원 기능
  parent?: string[];                   // 부모 블록 제한
  innerBlocksSettings?: InnerBlocksSettings;
  variations?: BlockVariation[];       // 블록 변형
  transforms?: BlockTransforms;        // 블록 변환
}
```

### 10.2 공통 Attributes

#### 정렬 (Alignment)

```typescript
{
  align?: 'left' | 'center' | 'right' | 'wide' | 'full' | 'justify';
}
```

#### 색상 (Colors)

```typescript
{
  textColor?: string;          // 텍스트 색상
  backgroundColor?: string;    // 배경 색상
  borderColor?: string;        // 테두리 색상
}
```

#### 간격 (Spacing)

```typescript
{
  padding?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  margin?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}
```

#### 타이포그래피 (Typography)

```typescript
{
  fontSize?: string;           // 폰트 크기 (px, rem, em)
  fontFamily?: string;         // 폰트 패밀리
  fontWeight?: number | string; // 폰트 굵기
  lineHeight?: number | string; // 줄 간격
  letterSpacing?: number | string; // 자간
}
```

#### 테두리 (Border)

```typescript
{
  borderRadius?: number;       // 테두리 반경 (px)
  borderWidth?: number;        // 테두리 두께 (px)
  borderColor?: string;        // 테두리 색상
  borderStyle?: 'solid' | 'dashed' | 'dotted';
}
```

---

### 10.3 Inspector Controls

#### 색상 선택기

```typescript
<ColorPicker
  label="텍스트 색상"
  value={attributes.textColor}
  onChange={(color) => setAttributes({ textColor: color })}
/>
```

#### 범위 슬라이더

```typescript
<RangeControl
  label="폰트 크기"
  value={attributes.fontSize}
  onChange={(value) => setAttributes({ fontSize: value })}
  min={12}
  max={72}
  step={1}
/>
```

#### 토글 스위치

```typescript
<ToggleControl
  label="드롭 캡 활성화"
  checked={attributes.dropCap}
  onChange={(value) => setAttributes({ dropCap: value })}
/>
```

#### 선택 박스

```typescript
<SelectControl
  label="정렬"
  value={attributes.align}
  onChange={(value) => setAttributes({ align: value })}
  options={[
    { label: '왼쪽', value: 'left' },
    { label: '가운데', value: 'center' },
    { label: '오른쪽', value: 'right' }
  ]}
/>
```

#### 텍스트 입력

```typescript
<TextControl
  label="링크 URL"
  value={attributes.url}
  onChange={(value) => setAttributes({ url: value })}
  placeholder="https://"
/>
```

---

## 부록

### A. 블록 구현 상태 매트릭스

| 블록 | 정의 | 컴포넌트 | 렌더러 | InnerBlocks | 상태 |
|-----|------|----------|--------|-------------|------|
| Paragraph | ✅ | ✅ Slate.js | ✅ | ❌ | ✅ 완료 |
| Heading | ✅ | ✅ Slate.js | ✅ | ❌ | ✅ 완료 |
| List | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Quote | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Code | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Markdown | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Table | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Image | ✅ | ✅ Enhanced | ✅ | ❌ | ✅ 완료 |
| Gallery | ✅ | ✅ Enhanced | ✅ | ❌ | ✅ 완료 |
| Cover | ✅ | ✅ Enhanced | ✅ | ✅ | ✅ 완료 |
| Slide | ✅ | ✅ Embla | ✅ | ❌ | ✅ 완료 |
| Video | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| YouTube | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Columns | ✅ | ✅ Phase 2 | ✅ | ✅ | ✅ 완료 |
| Column | ✅ | ✅ | ✅ | ✅ | ✅ 완료 |
| Group | ✅ | ✅ | ⚠️ | ✅ | ✅ 완료 |
| Conditional | ✅ | ✅ | 동적 | ✅ | ✅ 완료 |
| Button | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Buttons | ✅ | InnerBlocks | ✅ | ✅ | ✅ 완료 |
| Social Links | ✅ | ✅ | 커스텀 | ❌ | ✅ 완료 |
| Shortcode | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| Universal Form | ✅ | ✅ NEW | 동적 | ✅ | ✅ 완료 |
| Form Field | ✅ | ✅ | 동적 | ❌ | ✅ 완료 |
| Form Submit | ✅ | ✅ | ✅ | ❌ | ✅ 완료 |
| File | ✅ | ✅ | 커스텀 | ❌ | ✅ 완료 |

**범례**:
- ✅ 완전 구현
- ⚠️ 부분 구현 또는 확인 필요
- ❌ 지원 안 함 (의도적)
- 동적 - 동적 렌더링
- 커스텀 - 커스텀 렌더링

---

### B. 카테고리별 블록 색인

#### TEXT (7개)
`o4o/paragraph`, `o4o/heading`, `o4o/list`, `o4o/quote`, `o4o/code`, `o4o/markdown`, `o4o/table`

#### MEDIA (6개)
`o4o/image`, `o4o/gallery`, `o4o/cover`, `o4o/slide`, `o4o/video`, `o4o/youtube`

#### LAYOUT (4개)
`o4o/columns`, `o4o/column`, `o4o/group`, `o4o/conditional`

#### DESIGN (2개)
`o4o/button`, `o4o/buttons`

#### WIDGETS (2개)
`o4o/social-links`, `o4o/shortcode`

#### DYNAMIC (3개)
`o4o/universal-form`, `o4o/form-field`, `o4o/form-submit`

#### EMBED (2개)
`o4o/file`, `o4o/youtube`

---

### C. 주요 개선 이력

#### 2025-10-31
- ✅ 블록 참조 문서 통합 (26개 블록)
- ✅ 카테고리별 분류 및 목차 작성
- ✅ 모든 블록 상세 설명 추가

#### 2025-10 (Phase 2)
- ✅ Columns/Column 블록 리팩토링
- ✅ InnerBlocks 렌더링 수정
- ✅ 자동 너비 재분배

#### 2025-10 (Phase 1)
- ✅ Slate.js 통합 (Paragraph, Heading)
- ✅ 리치 텍스트 편집 개선
- ✅ 포커스 관리 향상

#### 2025-10 (Universal Form)
- ✅ Universal Form 블록 추가
- ✅ Post + CPT 통합 폼
- ✅ 코드 37% 절감

#### 2025-10 (M3)
- ✅ Slide 블록 Embla 통합
- ✅ 6KB 경량화
- ✅ WCAG 2.2 준수

---

### D. 참고 자료

#### 공식 문서
- [Block Development Guide](BLOCKS_DEVELOPMENT.md)
- [Dynamic Blocks Architecture](blocks/DYNAMIC_BLOCKS_ARCHITECTURE_ANALYSIS.md)
- [Shortcodes Reference](reference/SHORTCODES.md)

#### 코드 위치
- Block Definitions: `apps/admin-dashboard/src/blocks/definitions/`
- Block Components: `apps/admin-dashboard/src/components/editor/blocks/`
- Block Renderers: `packages/block-renderer/src/renderers/`
- Block Registry: `apps/admin-dashboard/src/blocks/registry/BlockRegistry.ts`

#### 외부 참조
- [Slate.js Documentation](https://docs.slatejs.org/)
- [Embla Carousel](https://www.embla-carousel.com/)
- [Lucide Icons](https://lucide.dev/)
- [WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)

---

**문서 버전**: 1.0
**작성일**: 2025-10-31
**작성자**: O4O Platform Team
**라이선스**: MIT
