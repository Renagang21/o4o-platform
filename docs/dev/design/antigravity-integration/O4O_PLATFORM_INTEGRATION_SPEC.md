# O4O 플랫폼 AI 디자인 통합 규격서

> **작성일:** 2025-11-30
> **작성자:** O4O Platform Development Team
> **목적:** Google Antigravity AI 에이전트가 생성한 React/Tailwind 디자인을 O4O 플랫폼 블록 시스템으로 자동 변환 및 저장하기 위한 기술 규격

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [블록 시스템 구조](#2-블록-시스템-구조)
3. [API 규격](#3-api-규격)
4. [인증/인가 방식](#4-인증인가-방식)
5. [React/Tailwind 사용 규약](#5-reacttailwind-사용-규약)
6. [통합 워크플로우](#6-통합-워크플로우)
7. [예제 코드](#7-예제-코드)

---

## 1. 프로젝트 개요

### 1.1 목표
AI 에이전트(Google Antigravity)가 생성한 **React/Tailwind 컴포넌트 코드**를 O4O 플랫폼의 **내부 블록 시스템**으로 변환하여 **페이지 단위로 자동 저장**하는 시스템 구축.

### 1.2 핵심 요구사항
- AI 생성 코드 → O4O 블록 구조로 매핑
- 기존 블록 최대 재활용 (31개 등록 블록)
- 새로운 디자인 요소는 소스코드 블록으로 저장 (현재 미구현)
- 페이지 메타데이터 + 블록 배열 구조로 자동 저장
- JWT 기반 인증으로 안전한 API 통신

---

## 2. 블록 시스템 구조

### 2.1 블록 카테고리

O4O 플랫폼은 **31개의 사전 정의된 블록**을 제공합니다:

| 카테고리 | 블록 개수 | 주요 블록 |
|---------|----------|----------|
| **text** | 7 | paragraph, heading, quote, code, markdown, list, table |
| **media** | 7 | image, cover, gallery, slide, video, youtube, file |
| **layout** | 6 | columns, column, group, conditional, spacer, separator |
| **design** | 2 | button, buttons |
| **widgets** | 8 | social-links, accordion-item, faq-accordion, feature-card, role-card, icon-feature-list, shortcode, placeholder |
| **dynamic** | 2 | form-field, form-submit |

### 2.2 블록 데이터 구조

모든 블록은 다음 TypeScript 인터페이스를 따릅니다:

```typescript
interface Block {
  id: string;                    // 고유 식별자 (UUID)
  type: string;                  // 블록 이름 (예: "o4o/paragraph")
  content: any;                  // 블록별 콘텐츠 데이터
  attributes: Record<string, unknown>;  // 블록 설정 옵션
  settings?: Record<string, unknown>;   // 추가 설정 (선택적)
  innerBlocks?: Block[];         // 중첩 블록 (layout 블록용)
  order?: number;                // 표시 순서
  clientId?: string;             // React 키용 클라이언트 ID
}
```

### 2.3 대표 블록 스키마

#### 2.3.1 o4o/paragraph (텍스트)
```json
{
  "name": "o4o/paragraph",
  "attributes": {
    "content": { "type": "string", "default": "" },
    "align": { "type": "string", "default": "left" },
    "dropCap": { "type": "boolean", "default": false },
    "fontSize": { "type": "number", "default": 16 },
    "textColor": { "type": "string", "default": "#1e293b" },
    "backgroundColor": { "type": "string", "default": "" }
  }
}
```

#### 2.3.2 o4o/heading (제목)
```json
{
  "name": "o4o/heading",
  "attributes": {
    "content": { "type": "string", "default": "" },
    "level": { "type": "number", "default": 2 },
    "align": { "type": "string", "default": "left" },
    "fontSize": { "type": "number" },
    "textColor": { "type": "string" },
    "backgroundColor": { "type": "string" }
  }
}
```

#### 2.3.3 o4o/image (이미지)
```json
{
  "name": "o4o/image",
  "attributes": {
    "url": { "type": "string", "default": "" },
    "alt": { "type": "string", "default": "" },
    "caption": { "type": "string", "default": "" },
    "align": { "type": "string", "default": "left" },
    "size": { "type": "string", "default": "large" },
    "width": { "type": "number" },
    "height": { "type": "number" },
    "linkUrl": { "type": "string", "default": "" }
  }
}
```

#### 2.3.4 o4o/button (버튼)
```json
{
  "name": "o4o/button",
  "attributes": {
    "text": { "type": "string", "default": "Click me" },
    "url": { "type": "string", "default": "" },
    "style": { "type": "string", "default": "fill" },
    "textColor": { "type": "string", "default": "#ffffff" },
    "backgroundColor": { "type": "string", "default": "#0073aa" },
    "borderRadius": { "type": "number", "default": 4 },
    "fontSize": { "type": "number", "default": 16 },
    "paddingX": { "type": "number", "default": 24 },
    "paddingY": { "type": "number", "default": 12 },
    "gradientEnabled": { "type": "boolean", "default": false },
    "shadowEnabled": { "type": "boolean", "default": false },
    "iconEnabled": { "type": "boolean", "default": false }
  }
}
```

#### 2.3.5 o4o/columns (레이아웃)
```json
{
  "name": "o4o/columns",
  "attributes": {
    "columnCount": { "type": "number", "default": 2 },
    "verticalAlignment": { "type": "string", "default": "top" },
    "isStackedOnMobile": { "type": "boolean", "default": true }
  },
  "innerBlocks": true,
  "innerBlocksSettings": {
    "allowedBlocks": ["o4o/column"],
    "orientation": "horizontal"
  }
}
```

#### 2.3.6 o4o/group (컨테이너)
```json
{
  "name": "o4o/group",
  "attributes": {
    "layout": { "type": "string", "default": "flow" },
    "tagName": { "type": "string", "default": "div" },
    "backgroundColor": { "type": "string", "default": "" },
    "padding": { "type": "object", "default": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
    "margin": { "type": "object", "default": { "top": 0, "right": 0, "bottom": 0, "left": 0 } },
    "borderRadius": { "type": "number", "default": 0 },
    "flexDirection": { "type": "string", "default": "row" },
    "justifyContent": { "type": "string", "default": "flex-start" },
    "alignItems": { "type": "string", "default": "stretch" },
    "gap": { "type": "number", "default": 16 }
  },
  "innerBlocks": true
}
```

### 2.4 InnerBlocks 지원 블록

다음 블록들은 **중첩 콘텐츠**(innerBlocks)를 지원합니다:

- `o4o/columns` - 다단 레이아웃
- `o4o/column` - 단일 컬럼 (columns 내부 전용)
- `o4o/group` - 범용 컨테이너
- `o4o/cover` - 배경 이미지/동영상 + 오버레이
- `o4o/buttons` - 버튼 그룹
- `o4o/conditional` - 조건부 표시 컨테이너

### 2.5 커스텀 코드 블록

**⚠️ 중요:** 현재 O4O 플랫폼에는 **사용자 정의 HTML/CSS/JS 실행 블록이 없습니다**.

**대안:**
1. **o4o/code** - 코드 표시 전용 (실행 안 됨, 구문 강조만)
2. **o4o/shortcode** - WordPress 스타일 숏코드
3. **o4o/markdown** - 마크다운 (인라인 HTML 허용)

**권장 사항:**
AI가 기존 블록으로 매핑할 수 없는 복잡한 커스텀 디자인을 생성하는 경우:
1. `o4o/group` + `o4o/paragraph` + `o4o/image` 등의 조합으로 재구성
2. 또는 **신규 블록 정의 제안** (개발팀 검토 필요)

---

## 3. API 규격

### 3.1 페이지 생성 API

**엔드포인트:** `POST /api/admin/pages`

**인증:** JWT Bearer Token (필수)

**Request Body:**
```json
{
  "title": "페이지 제목",
  "slug": "page-slug",
  "content": [
    {
      "id": "block-1",
      "type": "o4o/heading",
      "attributes": {
        "content": "메인 제목",
        "level": 1,
        "align": "center"
      }
    },
    {
      "id": "block-2",
      "type": "o4o/paragraph",
      "attributes": {
        "content": "본문 텍스트...",
        "fontSize": 16
      }
    },
    {
      "id": "block-3",
      "type": "o4o/columns",
      "attributes": {
        "columnCount": 2
      },
      "innerBlocks": [
        {
          "id": "block-4",
          "type": "o4o/column",
          "attributes": { "width": 50 },
          "innerBlocks": [
            {
              "id": "block-5",
              "type": "o4o/paragraph",
              "attributes": { "content": "왼쪽 컬럼 내용" }
            }
          ]
        },
        {
          "id": "block-6",
          "type": "o4o/column",
          "attributes": { "width": 50 },
          "innerBlocks": [
            {
              "id": "block-7",
              "type": "o4o/paragraph",
              "attributes": { "content": "오른쪽 컬럼 내용" }
            }
          ]
        }
      ]
    }
  ],
  "excerpt": "페이지 요약 (선택)",
  "status": "draft",
  "type": "page",
  "template": "default",
  "parentId": null,
  "menuOrder": 0,
  "showInMenu": true,
  "isHomepage": false,
  "seo": {
    "metaTitle": "SEO 제목",
    "metaDescription": "SEO 설명",
    "focusKeyword": "키워드"
  },
  "customFields": {},
  "publishedAt": null,
  "scheduledAt": null,
  "layoutSettings": {}
}
```

**Response (성공):**
```json
{
  "success": true,
  "data": {
    "id": "uuid-generated",
    "title": "페이지 제목",
    "slug": "page-slug",
    "content": [ /* 블록 배열 */ ],
    "status": "draft",
    "createdAt": "2025-11-30T12:34:56.789Z",
    "updatedAt": "2025-11-30T12:34:56.789Z",
    "author": { /* 사용자 정보 */ }
  },
  "message": "Page created successfully"
}
```

**Response (실패):**
```json
{
  "success": false,
  "message": "Failed to create page",
  "error": "상세 에러 메시지"
}
```

### 3.2 페이지 수정 API

**엔드포인트:** `PUT /api/admin/pages/:id`

**인증:** JWT Bearer Token (필수)

**Request Body:** 생성 API와 동일 (수정할 필드만 전송)

**Response:** 생성 API와 동일

### 3.3 페이지 조회 API

**엔드포인트:** `GET /api/admin/pages/:id`

**인증:** JWT Bearer Token (필수)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "page-uuid",
    "title": "페이지 제목",
    "content": [ /* 블록 배열 */ ],
    "status": "published",
    "author": { /* 사용자 정보 */ },
    "customFields": {}
  }
}
```

### 3.4 페이지 목록 조회 API

**엔드포인트:** `GET /api/admin/pages`

**Query Parameters:**
- `page`: 페이지 번호 (default: 1)
- `pageSize`: 페이지당 항목 수 (default: 20)
- `status`: 필터 상태 (draft, publish 등)
- `search`: 검색어
- `orderBy`: 정렬 기준 (title, createdAt, updatedAt 등)
- `order`: 정렬 방향 (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": [ /* 페이지 배열 */ ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 42,
    "pageSize": 20
  }
}
```

---

## 4. 인증/인가 방식

### 4.1 인증 메커니즘

O4O 플랫폼은 **JWT (JSON Web Token) 기반 인증**을 사용합니다.

### 4.2 토큰 획득 방법

**방법 1: Authorization Header (권장)**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { /* 사용자 정보 */ },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**방법 2: httpOnly Cookie (프로덕션)**
- 로그인 성공 시 자동으로 `accessToken` 쿠키 설정
- 브라우저가 자동으로 쿠키 전송 (XSS 공격 방어)

### 4.3 API 요청 시 인증 헤더

```http
POST /api/admin/pages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{ /* Request Body */ }
```

### 4.4 토큰 갱신

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-access-token...",
    "refreshToken": "new-refresh-token..."
  }
}
```

### 4.5 에러 응답

| HTTP Status | Code | Message | 설명 |
|------------|------|---------|------|
| 401 | AUTH_REQUIRED | Authentication required | 토큰 없음 |
| 401 | INVALID_TOKEN | Access token is invalid or has expired | 토큰 무효/만료 |
| 401 | INVALID_USER | User account not found | 사용자 삭제됨 |
| 401 | USER_INACTIVE | User account is inactive | 계정 비활성화 |
| 403 | FORBIDDEN | Access denied | 권한 없음 |

---

## 5. React/Tailwind 사용 규약

### 5.1 Tailwind CSS 설정

O4O Admin Dashboard는 **Tailwind CSS 3.x**를 사용합니다.

**주요 설정:**
```javascript
// tailwind.config.js
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./node_modules/@o4o/ui/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          // ... (full palette)
          900: '#1e3a8a'
        },
        // 기타 커스텀 색상
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography')
  ]
}
```

### 5.2 React 컴포넌트 규약

#### 5.2.1 함수형 컴포넌트 사용
```tsx
// ✅ 올바른 방식
const MyComponent: FC<Props> = ({ title, content }) => {
  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-gray-600">{content}</p>
    </div>
  );
};

// ❌ 피해야 할 방식 (클래스 컴포넌트)
class MyComponent extends React.Component {
  render() { /* ... */ }
}
```

#### 5.2.2 TypeScript 타입 정의
```tsx
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const Button: FC<ButtonProps> = ({
  text,
  onClick,
  variant = 'primary',
  disabled = false
}) => {
  const baseClasses = "px-4 py-2 rounded-lg font-medium transition-colors";
  const variantClasses = variant === 'primary'
    ? "bg-blue-600 text-white hover:bg-blue-700"
    : "bg-gray-200 text-gray-800 hover:bg-gray-300";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {text}
    </button>
  );
};
```

### 5.3 코딩 컨벤션

#### 5.3.1 네이밍 규칙
- **컴포넌트 파일:** PascalCase (예: `MyComponent.tsx`)
- **유틸 함수 파일:** camelCase (예: `formatDate.ts`)
- **상수 파일:** UPPER_SNAKE_CASE (예: `API_ENDPOINTS.ts`)

#### 5.3.2 Tailwind 클래스 순서 (권장)
```tsx
<div className="
  flex items-center justify-between   /* Layout */
  w-full h-16 p-4                    /* Sizing & Spacing */
  bg-white border border-gray-200    /* Colors & Borders */
  rounded-lg shadow-md               /* Effects */
  hover:shadow-lg transition-shadow  /* Interactive */
">
  {/* Content */}
</div>
```

#### 5.3.3 조건부 클래스
```tsx
// ✅ clsx 또는 classnames 사용 (권장)
import clsx from 'clsx';

const Button = ({ isActive, isDisabled }) => (
  <button className={clsx(
    'px-4 py-2 rounded',
    isActive && 'bg-blue-600 text-white',
    isDisabled && 'opacity-50 cursor-not-allowed'
  )}>
    Click me
  </button>
);
```

### 5.4 디자인 토큰

**색상 팔레트:**
```typescript
// @o4o/ui/theme/colors.ts
export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    500: '#6b7280',
    900: '#111827'
  },
  success: {
    50: '#f0fdf4',
    500: '#22c55e',
    900: '#14532d'
  },
  error: {
    50: '#fef2f2',
    500: '#ef4444',
    900: '#7f1d1d'
  }
};
```

**간격 시스템:**
```typescript
// Tailwind의 기본 간격 시스템 사용
// 4px 기준: 1 = 4px, 2 = 8px, 4 = 16px, 8 = 32px ...
const spacing = {
  xs: '0.5rem',  // 8px
  sm: '1rem',    // 16px
  md: '1.5rem',  // 24px
  lg: '2rem',    // 32px
  xl: '3rem'     // 48px
};
```

---

## 6. 통합 워크플로우

### 6.1 AI → O4O 변환 프로세스

```
┌─────────────────────┐
│ 1. AI 디자인 생성    │
│ (Google Antigravity)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. React/Tailwind   │
│    코드 추출         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 코드 파싱 &       │
│    블록 매핑         │
│ • 컴포넌트 분석      │
│ • 기존 블록 매칭     │
│ • attributes 추출    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. Block[] 생성      │
│ • ID 생성 (UUID)     │
│ • innerBlocks 처리   │
│ • 순서 정렬          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. Page 데이터 구성  │
│ • title, slug 설정   │
│ • content = blocks   │
│ • metadata 추가      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. API 요청          │
│ POST /api/admin/pages│
│ (JWT 인증 포함)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 7. DB 저장 완료      │
│ • 페이지 생성        │
│ • 응답 반환          │
└─────────────────────┘
```

### 6.2 매핑 규칙 예시

| AI 생성 요소 | O4O 블록 | 매핑 로직 |
|-------------|---------|----------|
| `<h1>...</h1>` | `o4o/heading` | `level: 1` |
| `<p>...</p>` | `o4o/paragraph` | `content: "..."` |
| `<img src="..." />` | `o4o/image` | `url: src, alt: alt` |
| `<button>...</button>` | `o4o/button` | `text: innerHTML, style 분석` |
| `<div className="grid grid-cols-2">` | `o4o/columns` | `columnCount: 2, innerBlocks 재귀 처리` |
| `<div className="flex gap-4">` | `o4o/group` | `layout: "flex", gap: 16` |
| 커스텀 컴포넌트 | `o4o/group` 조합 | 기존 블록으로 재구성 시도 |

### 6.3 에러 처리

```typescript
// 변환 실패 시 대안
try {
  const blocks = parseReactToBlocks(aiGeneratedCode);
  await createPage({ title, slug, content: blocks });
} catch (error) {
  if (error.type === 'UNMAPPABLE_COMPONENT') {
    // 대안 1: o4o/placeholder 블록 사용 (개발팀 검토용)
    const placeholderBlock = {
      type: 'o4o/placeholder',
      attributes: {
        componentName: error.componentName,
        reason: 'AI가 생성한 커스텀 컴포넌트, 기존 블록 매핑 불가',
        props: error.extractedProps
      }
    };

    // 대안 2: 사용자에게 수동 매핑 요청
    showManualMappingUI(error.componentCode);
  }
}
```

---

## 7. 예제 코드

### 7.1 페이지 생성 전체 예제 (TypeScript)

```typescript
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

// 1. 인증 토큰 획득
async function login(email: string, password: string): Promise<string> {
  const response = await axios.post('https://api.neture.co.kr/api/v1/auth/login', {
    email,
    password
  });
  return response.data.data.accessToken;
}

// 2. AI 생성 코드 → 블록 변환 (예시)
function parseReactToBlocks(reactCode: string): any[] {
  // 실제 구현은 파서 라이브러리 사용 (예: @babel/parser)
  // 여기서는 간단한 예시만 제공
  return [
    {
      id: uuidv4(),
      type: 'o4o/heading',
      attributes: {
        content: 'AI로 생성된 페이지',
        level: 1,
        align: 'center',
        textColor: '#1e293b'
      }
    },
    {
      id: uuidv4(),
      type: 'o4o/paragraph',
      attributes: {
        content: 'Google Antigravity가 자동으로 생성한 콘텐츠입니다.',
        fontSize: 16,
        align: 'left'
      }
    },
    {
      id: uuidv4(),
      type: 'o4o/columns',
      attributes: {
        columnCount: 2,
        isStackedOnMobile: true
      },
      innerBlocks: [
        {
          id: uuidv4(),
          type: 'o4o/column',
          attributes: { width: 50 },
          innerBlocks: [
            {
              id: uuidv4(),
              type: 'o4o/feature-card',
              attributes: {
                icon: 'star',
                title: '기능 1',
                description: 'AI가 제안한 첫 번째 기능'
              }
            }
          ]
        },
        {
          id: uuidv4(),
          type: 'o4o/column',
          attributes: { width: 50 },
          innerBlocks: [
            {
              id: uuidv4(),
              type: 'o4o/feature-card',
              attributes: {
                icon: 'zap',
                title: '기능 2',
                description: 'AI가 제안한 두 번째 기능'
              }
            }
          ]
        }
      ]
    },
    {
      id: uuidv4(),
      type: 'o4o/button',
      attributes: {
        text: '자세히 보기',
        url: '/about',
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
        borderRadius: 8,
        paddingX: 32,
        paddingY: 16
      }
    }
  ];
}

// 3. 페이지 생성 API 호출
async function createAIGeneratedPage(
  token: string,
  aiReactCode: string
): Promise<void> {
  const blocks = parseReactToBlocks(aiReactCode);

  const pageData = {
    title: 'AI 생성 페이지',
    slug: `ai-generated-${Date.now()}`,
    content: blocks,
    excerpt: 'Google Antigravity를 통해 자동 생성된 페이지입니다.',
    status: 'draft',
    type: 'page',
    showInMenu: true,
    seo: {
      metaTitle: 'AI 생성 페이지',
      metaDescription: '자동으로 생성된 페이지입니다.',
      focusKeyword: 'AI'
    }
  };

  try {
    const response = await axios.post(
      'https://api.neture.co.kr/api/admin/pages',
      pageData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('페이지 생성 성공:', response.data.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('페이지 생성 실패:', error.response?.data);
    } else {
      console.error('알 수 없는 에러:', error);
    }
  }
}

// 4. 실행
(async () => {
  const token = await login('admin@example.com', 'password123');

  const aiGeneratedReactCode = `
    <div>
      <h1>AI로 생성된 페이지</h1>
      <p>Google Antigravity가 자동으로 생성한 콘텐츠입니다.</p>
      <div className="grid grid-cols-2 gap-4">
        <div>기능 1</div>
        <div>기능 2</div>
      </div>
      <button>자세히 보기</button>
    </div>
  `;

  await createAIGeneratedPage(token, aiGeneratedReactCode);
})();
```

### 7.2 블록 매핑 헬퍼 함수

```typescript
// React 요소 → O4O 블록 매핑 유틸리티
interface ReactElement {
  type: string;
  props: Record<string, any>;
  children: (string | ReactElement)[];
}

function mapReactElementToBlock(element: ReactElement): any {
  const blockId = uuidv4();

  switch (element.type) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return {
        id: blockId,
        type: 'o4o/heading',
        attributes: {
          content: extractTextContent(element.children),
          level: parseInt(element.type.slice(1)),
          align: element.props.className?.includes('text-center') ? 'center' : 'left'
        }
      };

    case 'p':
      return {
        id: blockId,
        type: 'o4o/paragraph',
        attributes: {
          content: extractTextContent(element.children),
          fontSize: parseFontSize(element.props.className),
          textColor: parseTextColor(element.props.className)
        }
      };

    case 'img':
      return {
        id: blockId,
        type: 'o4o/image',
        attributes: {
          url: element.props.src || '',
          alt: element.props.alt || '',
          width: element.props.width,
          height: element.props.height
        }
      };

    case 'button':
      return {
        id: blockId,
        type: 'o4o/button',
        attributes: {
          text: extractTextContent(element.children),
          url: element.props.onClick ? '#' : (element.props.href || ''),
          backgroundColor: parseBackgroundColor(element.props.className),
          textColor: parseTextColor(element.props.className)
        }
      };

    case 'div':
      // Grid 레이아웃 감지
      if (element.props.className?.includes('grid-cols-')) {
        const columnCount = parseGridColumns(element.props.className);
        return {
          id: blockId,
          type: 'o4o/columns',
          attributes: {
            columnCount,
            isStackedOnMobile: true
          },
          innerBlocks: element.children.map(child =>
            typeof child === 'string' ? null : mapReactElementToBlock(child)
          ).filter(Boolean)
        };
      }

      // Flex 컨테이너
      if (element.props.className?.includes('flex')) {
        return {
          id: blockId,
          type: 'o4o/group',
          attributes: {
            layout: 'flex',
            flexDirection: element.props.className.includes('flex-col') ? 'column' : 'row',
            gap: parseGap(element.props.className),
            justifyContent: parseJustifyContent(element.props.className),
            alignItems: parseAlignItems(element.props.className)
          },
          innerBlocks: element.children.map(child =>
            typeof child === 'string' ? null : mapReactElementToBlock(child)
          ).filter(Boolean)
        };
      }

      // 일반 div는 group 블록으로
      return {
        id: blockId,
        type: 'o4o/group',
        attributes: {
          backgroundColor: parseBackgroundColor(element.props.className),
          padding: parsePadding(element.props.className),
          borderRadius: parseBorderRadius(element.props.className)
        },
        innerBlocks: element.children.map(child =>
          typeof child === 'string' ? null : mapReactElementToBlock(child)
        ).filter(Boolean)
      };

    default:
      // 매핑 불가능한 요소 → placeholder
      return {
        id: blockId,
        type: 'o4o/placeholder',
        attributes: {
          componentName: element.type,
          reason: '기존 블록으로 매핑할 수 없는 커스텀 컴포넌트',
          props: element.props
        }
      };
  }
}

// 유틸리티 함수들
function extractTextContent(children: (string | ReactElement)[]): string {
  return children.map(child =>
    typeof child === 'string' ? child : extractTextContent(child.children || [])
  ).join('');
}

function parseFontSize(className?: string): number {
  if (!className) return 16;
  const match = className.match(/text-(xs|sm|base|lg|xl|2xl|3xl)/);
  const sizeMap: Record<string, number> = {
    'xs': 12, 'sm': 14, 'base': 16, 'lg': 18,
    'xl': 20, '2xl': 24, '3xl': 30
  };
  return sizeMap[match?.[1] || 'base'] || 16;
}

function parseTextColor(className?: string): string {
  if (!className) return '#000000';
  const match = className.match(/text-(\w+)-(\d+)/);
  // Tailwind color → hex 변환 (간단한 예시)
  return match ? `#${match[1]}${match[2]}` : '#000000';
}

function parseBackgroundColor(className?: string): string {
  if (!className) return '';
  const match = className.match(/bg-(\w+)-(\d+)/);
  return match ? `#${match[1]}${match[2]}` : '';
}

function parseGridColumns(className: string): number {
  const match = className.match(/grid-cols-(\d+)/);
  return parseInt(match?.[1] || '2');
}

function parseGap(className?: string): number {
  if (!className) return 16;
  const match = className.match(/gap-(\d+)/);
  return parseInt(match?.[1] || '4') * 4; // Tailwind gap-4 = 16px
}

function parseJustifyContent(className?: string): string {
  if (!className) return 'flex-start';
  if (className.includes('justify-center')) return 'center';
  if (className.includes('justify-between')) return 'space-between';
  if (className.includes('justify-end')) return 'flex-end';
  return 'flex-start';
}

function parseAlignItems(className?: string): string {
  if (!className) return 'stretch';
  if (className.includes('items-center')) return 'center';
  if (className.includes('items-start')) return 'flex-start';
  if (className.includes('items-end')) return 'flex-end';
  return 'stretch';
}

function parsePadding(className?: string): { top: number, right: number, bottom: number, left: number } {
  // Tailwind p-4, px-4, py-4 등 파싱
  const defaultPadding = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!className) return defaultPadding;

  const pMatch = className.match(/p-(\d+)/);
  if (pMatch) {
    const value = parseInt(pMatch[1]) * 4;
    return { top: value, right: value, bottom: value, left: value };
  }

  // px, py, pt, pr, pb, pl 각각 처리...
  return defaultPadding;
}

function parseBorderRadius(className?: string): number {
  if (!className) return 0;
  const match = className.match(/rounded-(\w+)/);
  const radiusMap: Record<string, number> = {
    'sm': 2, 'DEFAULT': 4, 'md': 6, 'lg': 8, 'xl': 12, '2xl': 16, 'full': 9999
  };
  return radiusMap[match?.[1] || 'DEFAULT'] || 0;
}
```

---

## 8. 부록

### 8.1 전체 블록 목록 (JSON)

전체 31개 블록의 상세 스키마는 별도 첨부 파일 참조:
- `O4O_BLOCKS_SCHEMA.json` (31개 블록 전체 스키마)
- `O4O_BLOCK_CATEGORIES.json` (카테고리별 블록 분류)

### 8.2 API 엔드포인트 전체 목록

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/v1/auth/login` | 로그인 | ❌ |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 | ❌ |
| GET | `/api/admin/pages` | 페이지 목록 조회 | ✅ |
| GET | `/api/admin/pages/:id` | 페이지 상세 조회 | ✅ |
| POST | `/api/admin/pages` | 페이지 생성 | ✅ |
| PUT | `/api/admin/pages/:id` | 페이지 수정 | ✅ |
| DELETE | `/api/admin/pages/:id` | 페이지 삭제 | ✅ |
| POST | `/api/admin/pages/:id/clone` | 페이지 복제 | ✅ |
| POST | `/api/v1/content/media/upload` | 미디어 업로드 | ⚠️ (임시 미인증) |

### 8.3 환경 변수 설정

```bash
# .env (Antigravity Extension)
O4O_API_BASE_URL=https://api.neture.co.kr
O4O_API_ADMIN_EMAIL=ai-agent@example.com
O4O_API_ADMIN_PASSWORD=secure-password-here
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

### 8.4 참고 자료

- **O4O Platform Docs:** https://docs.neture.co.kr
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **React TypeScript Cheatsheet:** https://react-typescript-cheatsheet.netlify.app/

---

**문서 버전:** 1.0.0
**마지막 업데이트:** 2025-11-30
**문의:** dev@neture.co.kr
