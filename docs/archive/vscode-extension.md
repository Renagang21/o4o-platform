# VSCode Extension 삭제 전 최종 아카이브

> **작성일**: 2025-12-01
> **목적**: VSCode Extension 삭제 전 핵심 지식 완전 보존
> **재구축 시**: 이 문서만으로 새 시스템 재작성 가능
> **상태**: ⚠️ Extension 삭제 예정 → 새 "페이지 생성기 앱"으로 대체

---

## 📋 목차

1. [삭제 대상 범위](#1-삭제-대상-범위)
2. [핵심 아키텍처](#2-핵심-아키텍처)
3. [JSX → O4O Block 변환 규칙](#3-jsx--o4o-block-변환-규칙)
4. [Tailwind → Appearance Token 매핑](#4-tailwind--appearance-token-매핑)
5. [Placeholder 전략](#5-placeholder-전략)
6. [인증 및 토큰 관리](#6-인증-및-토큰-관리)
7. [API 호출 패턴](#7-api-호출-패턴)
8. [변환 흐름](#8-변환-흐름)
9. [_generated 폴더 구조](#9-_generated-폴더-구조)
10. [실제 코드 샘플](#10-실제-코드-샘플)
11. [재구축 가이드](#11-재구축-가이드)

---

## 1. 삭제 대상 범위

### 📂 삭제할 폴더
```
extensions/o4o-integration/          # VSCode Extension 전체
apps/vscode-extension/               # Extension 관련 앱 (있다면)
```

### 📂 삭제할 파일
```
o4o-integration-1.0.0.vsix          # 빌드된 Extension 패키지
```

### 🌿 삭제할 브랜치
```
feature/o4o-integration             # Extension 개발 브랜치
```

### 🔐 정리할 Secrets
```
VSCode SecretStorage:
  - o4o_token
  - o4o_refresh_token
```

### 📄 삭제할 문서 (선택적)
```
docs/dev/spec/extension_app_pattern.md  # Extension 패턴 문서
```

**⚠️ 보존 대상**: 이 아카이브 문서만 유지

---

## 2. 핵심 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────┐
│                     VSCode Extension                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Commands   │  │  Converter   │  │     Auth     │     │
│  │              │  │              │  │              │     │
│  │ • Login      │  │ • Parser     │  │ • JWT Login  │     │
│  │ • Convert    │  │ • Mapper     │  │ • Refresh    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│                    ┌──────▼───────┐                        │
│                    │  PageClient  │                        │
│                    └──────┬───────┘                        │
└───────────────────────────┼────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  O4O Platform  │
                    │   API Server   │
                    └────────────────┘
```

### 2.2 디렉토리 구조

```
extensions/o4o-integration/
├── src/
│   ├── api/
│   │   ├── pageClient.ts       ← API 호출 클라이언트
│   │   └── types.ts            ← API 타입 정의
│   ├── auth/
│   │   ├── authManager.ts      ← JWT 인증 관리
│   │   └── tokenStorage.ts     ← SecretStorage 래퍼
│   ├── converter/
│   │   ├── blockMapper.ts      ← JSX → Block 변환 핵심
│   │   ├── reactParser.ts      ← Babel AST 파싱
│   │   └── tailwindParser.ts   ← Tailwind 클래스 파싱
│   ├── commands/
│   │   ├── convertCommand.ts   ← 변환 & 저장 명령
│   │   └── loginCommand.ts     ← 로그인 명령
│   ├── extension.ts            ← Extension 진입점
│   └── types.ts                ← 공통 타입
├── package.json
├── tsconfig.json
└── README.md
```

### 2.3 핵심 의존성

```json
{
  "dependencies": {
    "@babel/parser": "^7.23.6",      // JSX → AST 파싱
    "@babel/traverse": "^7.23.6",    // AST 순회
    "@babel/types": "^7.23.6",       // AST 타입
    "axios": "^1.6.2",               // HTTP 클라이언트
    "uuid": "^9.0.1"                 // Block ID 생성
  }
}
```

---

## 3. JSX → O4O Block 변환 규칙

### 3.1 블록 타입 매핑 테이블

| JSX Element | O4O Block Type | Attributes Extracted |
|-------------|----------------|---------------------|
| `<h1>` ~ `<h6>` | `o4o/heading` | content, level, align, fontSize, textColor, backgroundColor |
| `<p>` | `o4o/paragraph` | content, align, fontSize, textColor, backgroundColor |
| `<img>` | `o4o/image` | url, alt, width, height, align |
| `<button>` | `o4o/button` | text, url, backgroundColor, textColor, borderRadius, fontSize |
| `<div>` (grid) | `o4o/columns` | columnCount, isStackedOnMobile, innerBlocks |
| `<div>` (flex) | `o4o/group` | layout='flex', flexDirection, gap, justifyContent, alignItems, padding, borderRadius |
| `<div>` (일반) | `o4o/group` | layout='flow', backgroundColor, padding, borderRadius, innerBlocks |
| `<ul>` | `o4o/list` | type='unordered', content |
| `<ol>` | `o4o/list` | type='ordered', content |
| `<blockquote>` | `o4o/quote` | quote, align |
| `<a>` (버튼 스타일) | `o4o/button` | text, url, backgroundColor, textColor |
| `<a>` (일반) | `o4o/paragraph` | content (HTML 포함) |
| **기타** | `o4o/placeholder` | componentName, reason, notes (원본 JSX), props |

### 3.2 Layout 분기 로직

```typescript
// Grid Layout 감지
if (TailwindParser.hasGrid(className)) {
  // → o4o/columns 생성
  // → grid-cols-N에서 열 개수 추출
  // → 각 자식을 o4o/column으로 변환
}

// Flex Layout 감지
if (TailwindParser.hasFlex(className)) {
  // → o4o/group (layout='flex') 생성
  // → flexDirection, gap, justify, align 추출
}

// 일반 Div
// → o4o/group (layout='flow') 생성
// → innerBlocks에 자식 재귀 변환
```

### 3.3 핵심 변환 함수

```typescript
// blockMapper.ts 핵심 로직

export function mapReactElementToBlock(element: ReactElement): Block {
  const blockId = uuidv4();
  const className = element.props.className || '';

  switch (element.type) {
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6':
      return {
        id: blockId,
        type: 'o4o/heading',
        attributes: {
          content: extractTextContent(element.children),
          level: parseInt(element.type.slice(1)),
          align: TailwindParser.parseTextAlign(className),
          fontSize: TailwindParser.parseFontSize(className),
          textColor: TailwindParser.parseTextColor(className),
          backgroundColor: TailwindParser.parseBackgroundColor(className),
        },
      };

    // ... 다른 케이스들

    default:
      // ⚠️ 핵심: Placeholder 전략
      return {
        id: blockId,
        type: 'o4o/placeholder',
        attributes: {
          componentName: element.type,
          reason: '기존 O4O 블록으로 매핑할 수 없는 커스텀 컴포넌트입니다.',
          notes: serializeJSX(element), // 원본 JSX 보존
          props: element.props,
        },
      };
  }
}
```

### 3.4 Text Content 추출

```typescript
// 재귀적으로 children에서 텍스트 추출
function extractTextContent(children: (string | ReactElement)[]): string {
  return children
    .map((child) =>
      typeof child === 'string'
        ? child
        : extractTextContent(child.children || [])
    )
    .join('');
}
```

---

## 4. Tailwind → Appearance Token 매핑

### 4.1 Typography 매핑

```typescript
// parseFontSize(): Tailwind class → pixel
const sizeMap: Record<string, number> = {
  'xs': 12,
  'sm': 14,
  'base': 16,
  'lg': 18,
  'xl': 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
};

// 예: className="text-3xl" → fontSize: 30
```

### 4.2 Color 매핑

```typescript
// parseTextColor(): Tailwind class → hex color
const colorMap: Record<string, string> = {
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-500': '#6b7280',
  'gray-900': '#111827',
  'blue-600': '#2563eb',
  'blue-700': '#1d4ed8',
  'red-500': '#ef4444',
  'green-500': '#22c55e',
};

// 예: className="text-blue-600" → textColor: "#2563eb"
```

### 4.3 Spacing 매핑

```typescript
// parsePadding(): Tailwind class → pixel (4px base)
// p-4 → { top: 16, right: 16, bottom: 16, left: 16 }
// px-6 → { left: 24, right: 24 }
// py-3 → { top: 12, bottom: 12 }

// parseGap(): Tailwind class → pixel
// gap-4 → 16 (4 * 4px)
```

### 4.4 Layout 매핑

```typescript
// parseFlexDirection()
'flex-col' → 'column'
'flex-row-reverse' → 'row-reverse'

// parseJustifyContent()
'justify-center' → 'center'
'justify-between' → 'space-between'

// parseAlignItems()
'items-center' → 'center'
'items-start' → 'flex-start'
```

### 4.5 Border 매핑

```typescript
// parseBorderRadius(): Tailwind class → pixel
const radiusMap: Record<string, number> = {
  'sm': 2,
  '': 4,
  'md': 6,
  'lg': 8,
  'xl': 12,
  '2xl': 16,
  '3xl': 24,
  'full': 9999,
};

// 예: className="rounded-lg" → borderRadius: 8
```

### 4.6 ⚠️ 새 Appearance System V2 확장 포인트

```typescript
// 현재: 하드코딩된 color map
// 미래: Appearance System V2 토큰 매핑

// 예시 (새 구조):
// 'text-blue-600' → token('colors.primary.600')
// 'bg-gray-100' → token('colors.surface.100')
// 'p-4' → token('spacing.md')
// 'rounded-lg' → token('radius.lg')

// 구현 시:
// 1. Appearance API에서 토큰 정의 가져오기
// 2. Tailwind class → Token key 매핑 테이블 생성
// 3. 블록 속성에 토큰 키 저장 (하드코딩된 값 대신)
```

---

## 5. Placeholder 전략

### 5.1 핵심 개념

**문제**: AI가 생성한 JSX에 O4O 블록으로 매핑 불가능한 커스텀 컴포넌트가 포함될 수 있음

**해결**: 삭제하지 않고 `o4o/placeholder` 블록으로 보존

**장점**:
1. ✅ 레이아웃 구조 유지 (빈 공간 대신 placeholder)
2. ✅ 원본 JSX 코드 보존 (나중에 수동 재구성 가능)
3. ✅ 향후 Mapping Engine 고도화 시 재처리 가능
4. ✅ 사용자에게 "어떤 부분을 수동 처리해야 하는지" 명확히 표시

### 5.2 Placeholder 블록 구조

```typescript
{
  id: 'uuid-xxx',
  type: 'o4o/placeholder',
  attributes: {
    componentName: 'CustomCarousel',           // 컴포넌트 이름
    reason: '기존 O4O 블록으로 매핑할 수 없는 커스텀 컴포넌트입니다.',
    notes: '<CustomCarousel items={...} />',   // 원본 JSX (serializeJSX 결과)
    props: {                                   // Props 보존
      items: '[expression]',
      autoPlay: true
    }
  }
}
```

### 5.3 JSX 직렬화 로직

```typescript
// serializeJSX(): React Element → JSX string
function serializeJSX(element: ReactElement): string {
  const { type, props, children } = element;

  // Props 문자열 생성
  const propsStr = Object.entries(props)
    .map(([key, value]) => {
      if (key === 'children') return '';
      if (typeof value === 'string') return `${key}="${value}"`;
      if (typeof value === 'number') return `${key}={${value}}`;
      return `${key}={${JSON.stringify(value)}}`;
    })
    .filter(Boolean)
    .join(' ');

  // Children 재귀 직렬화
  const childrenStr = children
    .map((child) => typeof child === 'string' ? child : serializeJSX(child))
    .join('');

  return `<${type}${propsStr ? ' ' + propsStr : ''}>${childrenStr}</${type}>`;
}

// 예:
// Input: { type: 'Carousel', props: { items: [...] }, children: [] }
// Output: "<Carousel items={[...]}></Carousel>"
```

### 5.4 Admin UI에서의 처리

```typescript
// O4O Admin Dashboard에서 placeholder 렌더링 예시

function renderPlaceholderBlock(block: Block) {
  return (
    <div className="placeholder-block border-2 border-yellow-500 bg-yellow-50 p-4 rounded">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <span className="font-semibold">수동 처리 필요</span>
      </div>
      <div className="text-sm text-gray-700 mb-2">
        <strong>컴포넌트:</strong> {block.attributes.componentName}
      </div>
      <details className="text-xs">
        <summary>원본 JSX 보기</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-x-auto">
          {block.attributes.notes}
        </pre>
      </details>
      <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm">
        O4O 블록으로 교체
      </button>
    </div>
  );
}
```

### 5.5 ⚠️ 새 시스템 구현 시 주의사항

**반드시 유지해야 할 것**:
- ✅ Placeholder 블록 타입 (`o4o/placeholder`)
- ✅ 원본 JSX 보존 (notes 필드)
- ✅ Props 정보 보존
- ✅ Admin UI에서 눈에 잘 띄는 표시

**확장 가능한 부분**:
- 🔧 AI를 활용한 자동 제안 ("이 컴포넌트는 o4o/carousel로 변환 가능합니다")
- 🔧 매핑 규칙 학습 (사용자가 수동 변환한 패턴 저장)
- 🔧 커스텀 블록 생성 지원 (Placeholder → 새 O4O 블록 타입 등록)

---

## 6. 인증 및 토큰 관리

### 6.1 인증 흐름

```
┌────────────────┐
│ User           │
└────────┬───────┘
         │ 1. Login Command
         ▼
┌────────────────┐
│ AuthManager    │
│                │ 2. POST /api/v1/auth/login
│                ├──────────────────────────►  ┌─────────────┐
│                │                             │ O4O API     │
│                │ ◄────────────────────────── │             │
│                │   3. { accessToken, refreshToken }
│                │                             └─────────────┘
│                │ 4. Store in SecretStorage
│                ├──────────────────────────►  ┌─────────────┐
│                │                             │ VSCode      │
│                │                             │ Secrets     │
└────────────────┘                             └─────────────┘
```

### 6.2 TokenStorage (VSCode SecretStorage 래퍼)

```typescript
// tokenStorage.ts

export class TokenStorage {
  private static readonly ACCESS_TOKEN_KEY = 'o4o_token';
  private static readonly REFRESH_TOKEN_KEY = 'o4o_refresh_token';

  constructor(private secretStorage: vscode.SecretStorage) {}

  async storeTokens(tokens: AuthTokens): Promise<void> {
    await this.secretStorage.store(
      TokenStorage.ACCESS_TOKEN_KEY,
      tokens.accessToken
    );
    await this.secretStorage.store(
      TokenStorage.REFRESH_TOKEN_KEY,
      tokens.refreshToken
    );
  }

  async getAccessToken(): Promise<string | undefined> {
    return await this.secretStorage.get(TokenStorage.ACCESS_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | undefined> {
    return await this.secretStorage.get(TokenStorage.REFRESH_TOKEN_KEY);
  }

  async clearTokens(): Promise<void> {
    await this.secretStorage.delete(TokenStorage.ACCESS_TOKEN_KEY);
    await this.secretStorage.delete(TokenStorage.REFRESH_TOKEN_KEY);
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getAccessToken();
    return token !== undefined;
  }
}
```

**⚠️ SecretStorage 특징**:
- 암호화된 저장소 (OS 키체인 사용)
- 사용자별, Workspace별 격리
- Extension 제거 시 자동 삭제 안 됨 (수동 정리 필요)

### 6.3 AuthManager (JWT 로그인 & Refresh)

```typescript
// authManager.ts 핵심 로직

export class AuthManager {
  private static readonly API_BASE_URL = 'https://api.neture.co.kr';

  // 로그인
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const response = await this.apiClient.post<AuthResponse>(
      '/api/v1/auth/login',
      credentials
    );

    const tokens = {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
    };

    await this.tokenStorage.storeTokens(tokens);
    return tokens;
  }

  // 토큰 갱신
  async refreshToken(): Promise<AuthTokens> {
    const refreshToken = await this.tokenStorage.getRefreshToken();

    const response = await this.apiClient.post<AuthResponse>(
      '/api/v1/auth/refresh',
      { refreshToken }
    );

    const tokens = {
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
    };

    await this.tokenStorage.storeTokens(tokens);
    return tokens;
  }

  // 유효한 토큰 가져오기
  async getValidToken(): Promise<string> {
    const accessToken = await this.tokenStorage.getAccessToken();

    if (!accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    // TODO: JWT 만료 체크 → 만료 시 자동 refresh
    return accessToken;
  }
}
```

### 6.4 ⚠️ 새 시스템 구현 시 (웹 앱)

VSCode Extension → 웹 앱 전환 시 변경 사항:

| VSCode Extension | 웹 앱 (Browser) |
|------------------|-----------------|
| `vscode.SecretStorage` | `localStorage` + `httpOnly cookie` |
| Extension 설치 필요 | 브라우저만 있으면 OK |
| OS 키체인 암호화 | HTTPS + Secure Cookie |
| 수동 삭제 필요 | 브라우저 쿠키 삭제로 간단 |

**추천 구조 (웹 앱)**:
```typescript
// localStorage: accessToken만 저장 (단기)
// httpOnly cookie: refreshToken 저장 (장기, XSS 공격 방지)

class BrowserAuthManager {
  async login(credentials: LoginCredentials) {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      credentials: 'include' // httpOnly cookie 자동 설정
    });

    const { accessToken } = await response.json();
    localStorage.setItem('o4o_token', accessToken);
  }

  async getValidToken(): Promise<string> {
    let token = localStorage.getItem('o4o_token');

    // JWT 만료 체크
    if (isTokenExpired(token)) {
      token = await this.refreshToken();
    }

    return token;
  }

  async refreshToken(): Promise<string> {
    // refreshToken은 httpOnly cookie로 자동 전송됨
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    });

    const { accessToken } = await response.json();
    localStorage.setItem('o4o_token', accessToken);
    return accessToken;
  }
}
```

---

## 7. API 호출 패턴

### 7.1 PageClient 구조

```typescript
// pageClient.ts

export class PageClient {
  private apiClient: AxiosInstance;

  constructor(private authManager: AuthManager) {
    this.apiClient = axios.create({
      baseURL: 'https://api.neture.co.kr',
      headers: { 'Content-Type': 'application/json' }
    });

    // Request Interceptor: JWT 자동 추가
    this.apiClient.interceptors.request.use(async (config) => {
      const token = await this.authManager.getValidToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // Response Interceptor: 401 시 자동 refresh
    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          await this.authManager.refreshToken();
          const token = await this.authManager.getValidToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;

          return this.apiClient(originalRequest);
        }

        return Promise.reject(error);
      }
    );
  }

  async createPage(pageData: PageCreateRequest): Promise<PageResponse> {
    const response = await this.apiClient.post<PageResponse>(
      '/api/admin/pages',
      pageData
    );
    return response.data;
  }
}
```

### 7.2 API 요청/응답 타입

```typescript
// types.ts

// 페이지 생성 요청
export interface PageCreateRequest {
  title: string;
  slug: string;
  content: Block[];  // O4O 블록 배열
  excerpt?: string;
  status: 'draft' | 'publish';
  type: 'page' | 'post';
  showInMenu?: boolean;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
  };
}

// 페이지 생성 응답
export interface PageResponse {
  success: boolean;
  data: {
    id: string;
    title: string;
    slug: string;
    content: Block[];
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

// 블록 구조
export interface Block {
  id: string;
  type: string;  // 'o4o/heading', 'o4o/paragraph', etc.
  attributes: Record<string, any>;
  innerBlocks?: Block[];
}
```

### 7.3 API 엔드포인트

| Method | Endpoint | 설명 | 인증 |
|--------|----------|------|------|
| POST | `/api/v1/auth/login` | 로그인 | ❌ |
| POST | `/api/v1/auth/refresh` | 토큰 갱신 | ❌ (refreshToken 필요) |
| POST | `/api/admin/pages` | 페이지 생성 | ✅ Bearer JWT |
| PUT | `/api/admin/pages/:id` | 페이지 수정 | ✅ Bearer JWT |
| GET | `/api/admin/pages/:id` | 페이지 조회 | ✅ Bearer JWT |

---

## 8. 변환 흐름

### 8.1 전체 프로세스

```
┌────────────────────────────────────────────────────────────────┐
│ 1. 사용자 액션                                                  │
│    - VSCode에서 .jsx/.tsx 파일 열기                            │
│    - Command Palette → "O4O: Convert & Save Page" 실행         │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 2. 인증 체크 (convertCommand.ts)                               │
│    - authManager.isAuthenticated() 확인                        │
│    - 미인증 시 → 로그인 프롬프트 표시                           │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 3. JSX 코드 추출                                                │
│    - activeTextEditor.document.getText()                        │
│    - 빈 파일 체크                                               │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 4. 페이지 제목 입력                                             │
│    - vscode.window.showInputBox()                               │
│    - 제목 → slug 자동 생성 (generateSlug)                      │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 5. JSX → AST 파싱 (reactParser.ts)                             │
│    - Babel parser로 JSX 코드 파싱                               │
│    - AST 순회하여 JSXElement 추출                              │
│    - ReactElement 객체로 변환                                   │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 6. React → Block 변환 (blockMapper.ts)                         │
│    - 각 ReactElement에 대해 mapReactElementToBlock() 호출      │
│    - Tailwind 클래스 파싱 (tailwindParser.ts)                  │
│    - O4O Block 객체 생성                                        │
│    - Placeholder 블록 처리 (매핑 불가 컴포넌트)                 │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 7. 페이지 데이터 생성                                           │
│    - PageCreateRequest 객체 구성                                │
│    - blocks 배열 포함                                           │
│    - SEO 메타데이터 자동 생성                                   │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 8. API 호출 (pageClient.ts)                                    │
│    - POST /api/admin/pages                                      │
│    - Authorization: Bearer <JWT>                                │
│    - 자동 토큰 갱신 (401 시)                                    │
└────────────┬───────────────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────────────┐
│ 9. 결과 표시                                                    │
│    - 성공 메시지 + placeholder 경고 (있는 경우)                │
│    - "Open in Browser" 버튼 → Admin UI로 이동                  │
└────────────────────────────────────────────────────────────────┘
```

### 8.2 코드 레벨 흐름

```typescript
// convertCommand.ts

export async function convertAndSaveCommand(
  authManager: AuthManager,
  pageClient: PageClient
): Promise<void> {
  // 1. 인증 체크
  const isAuth = await authManager.isAuthenticated();
  if (!isAuth) {
    // 로그인 프롬프트
    return;
  }

  // 2. 에디터 & 코드 가져오기
  const editor = vscode.window.activeTextEditor;
  const jsxCode = editor.document.getText();

  // 3. 페이지 제목 입력
  const pageTitle = await vscode.window.showInputBox({
    prompt: 'Enter page title'
  });

  // 4-9. Progress 표시하며 변환
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification },
    async (progress) => {
      // Step 1: JSX 파싱
      progress.report({ message: 'Parsing JSX code...' });
      const reactElements = parseReactCode(jsxCode);

      // Step 2: Block 변환
      progress.report({ message: 'Converting to O4O blocks...' });
      const blocks = convertReactToBlocks(reactElements);

      // Step 3: 페이지 데이터 생성
      const pageData: PageCreateRequest = {
        title: pageTitle,
        slug: generateSlug(pageTitle),
        content: blocks,
        status: 'draft',
        type: 'page',
      };

      // Step 4: API 호출
      progress.report({ message: 'Saving to O4O Platform...' });
      const response = await pageClient.createPage(pageData);

      // Step 5: 결과 표시
      const pageUrl = `https://admin.neture.co.kr/pages/${response.data.id}`;
      vscode.window.showInformationMessage(
        '✅ Page created successfully!',
        'Open in Browser'
      );
    }
  );
}
```

---

## 9. _generated 폴더 구조

### 9.1 현재 Extension이 사용한 구조

```
/_generated/
   └── antigravity/
        └── ui/
             └── {timestamp}/
                  ├── preview.png
                  ├── metadata.json
                  └── code.jsx
```

### 9.2 권장 확장 구조 (새 시스템용)

```
/_generated/
   └── {app_name}/           # 예: antigravity, shop-manager
        └── {feature}/        # 예: ui, api, db
             └── {timestamp}/ # 예: 2025-01-15_14-30-25
                  ├── images/
                  │   ├── preview.png       # 전체 미리보기
                  │   ├── component-1.png   # 개별 컴포넌트 스크린샷
                  │   └── component-2.png
                  ├── html/
                  │   └── index.html        # 정적 HTML 미리보기
                  ├── react/
                  │   ├── App.tsx           # 메인 컴포넌트
                  │   ├── components/       # 분리된 컴포넌트들
                  │   │   ├── Header.tsx
                  │   │   └── Footer.tsx
                  │   └── package.json      # 의존성
                  ├── o4o-blocks/
                  │   └── blocks.json       # 변환된 O4O 블록 (새 추가!)
                  └── metadata.json         # 메타데이터
```

### 9.3 metadata.json 구조

```json
{
  "version": "1.0.0",
  "timestamp": "2025-01-15T14:30:25Z",
  "appName": "antigravity",
  "feature": "ui",
  "prompt": "Create a landing page for an anti-gravity device with hero section and CTA",
  "aiModel": "claude-3-5-sonnet-20250116",
  "generation": {
    "status": "success",
    "blockCount": 12,
    "placeholderCount": 2,
    "componentCount": 5
  },
  "conversion": {
    "jsxToBlocks": true,
    "tailwindParsed": true,
    "placeholdersCreated": ["CustomCarousel", "PricingTable"]
  },
  "files": {
    "preview": "images/preview.png",
    "react": "react/App.tsx",
    "html": "html/index.html",
    "blocks": "o4o-blocks/blocks.json"
  },
  "stats": {
    "linesOfCode": 245,
    "estimatedTokens": 3200
  }
}
```

### 9.4 blocks.json 구조 (새 추가)

```json
{
  "version": "1.0.0",
  "blocks": [
    {
      "id": "uuid-1",
      "type": "o4o/heading",
      "attributes": {
        "content": "Welcome to AntiGravity",
        "level": 1,
        "align": "center",
        "fontSize": 48
      }
    },
    {
      "id": "uuid-2",
      "type": "o4o/placeholder",
      "attributes": {
        "componentName": "CustomCarousel",
        "reason": "커스텀 캐러셀 컴포넌트",
        "notes": "<CustomCarousel items={[...]} />",
        "props": {
          "items": "[expression]",
          "autoPlay": true
        }
      }
    }
  ],
  "metadata": {
    "totalBlocks": 12,
    "placeholders": 2,
    "successfulConversions": 10
  }
}
```

---

## 10. 실제 코드 샘플

### 10.1 Example Input (Antigravity가 생성한 JSX)

```jsx
export default function AntiGravityLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <h1 className="text-5xl font-bold text-center text-white mb-4">
          Defy Gravity, Embrace the Future
        </h1>
        <p className="text-xl text-center text-gray-300 mb-8">
          Experience the world's first commercial anti-gravity device
        </p>

        <div className="grid grid-cols-3 gap-6">
          <div className="p-6 bg-blue-800 rounded-lg">
            <h3 className="text-2xl font-semibold text-white mb-2">Safe</h3>
            <p className="text-gray-200">Certified by international safety standards</p>
          </div>
          <div className="p-6 bg-blue-800 rounded-lg">
            <h3 className="text-2xl font-semibold text-white mb-2">Efficient</h3>
            <p className="text-gray-200">90% energy reduction compared to traditional flight</p>
          </div>
          <div className="p-6 bg-blue-800 rounded-lg">
            <h3 className="text-2xl font-semibold text-white mb-2">Eco-Friendly</h3>
            <p className="text-gray-200">Zero carbon emissions, powered by renewable energy</p>
          </div>
        </div>

        <div className="flex justify-center mt-12">
          <button className="px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-full hover:bg-blue-700">
            Pre-Order Now
          </button>
        </div>
      </section>

      {/* Custom Component (Not mappable) */}
      <CustomCarousel items={productImages} autoPlay={true} />
    </div>
  );
}
```

### 10.2 Example Output (O4O Blocks)

```json
[
  {
    "id": "uuid-001",
    "type": "o4o/group",
    "attributes": {
      "layout": "flow",
      "backgroundColor": "#1e3a8a",
      "padding": { "top": 80, "right": 16, "bottom": 80, "left": 16 }
    },
    "innerBlocks": [
      {
        "id": "uuid-002",
        "type": "o4o/heading",
        "attributes": {
          "content": "Defy Gravity, Embrace the Future",
          "level": 1,
          "align": "center",
          "fontSize": 48,
          "textColor": "#ffffff"
        }
      },
      {
        "id": "uuid-003",
        "type": "o4o/paragraph",
        "attributes": {
          "content": "Experience the world's first commercial anti-gravity device",
          "align": "center",
          "fontSize": 20,
          "textColor": "#d1d5db"
        }
      },
      {
        "id": "uuid-004",
        "type": "o4o/columns",
        "attributes": {
          "columnCount": 3,
          "isStackedOnMobile": true
        },
        "innerBlocks": [
          {
            "id": "uuid-005",
            "type": "o4o/column",
            "attributes": { "width": 33.33 },
            "innerBlocks": [
              {
                "id": "uuid-006",
                "type": "o4o/group",
                "attributes": {
                  "backgroundColor": "#1e40af",
                  "padding": { "top": 24, "right": 24, "bottom": 24, "left": 24 },
                  "borderRadius": 8
                },
                "innerBlocks": [
                  {
                    "id": "uuid-007",
                    "type": "o4o/heading",
                    "attributes": {
                      "content": "Safe",
                      "level": 3,
                      "fontSize": 24,
                      "textColor": "#ffffff"
                    }
                  },
                  {
                    "id": "uuid-008",
                    "type": "o4o/paragraph",
                    "attributes": {
                      "content": "Certified by international safety standards",
                      "textColor": "#e5e7eb"
                    }
                  }
                ]
              }
            ]
          }
          // ... 나머지 2개 column 생략
        ]
      },
      {
        "id": "uuid-015",
        "type": "o4o/group",
        "attributes": {
          "layout": "flex",
          "justifyContent": "center"
        },
        "innerBlocks": [
          {
            "id": "uuid-016",
            "type": "o4o/button",
            "attributes": {
              "text": "Pre-Order Now",
              "url": "#",
              "backgroundColor": "#2563eb",
              "textColor": "#ffffff",
              "borderRadius": 9999,
              "fontSize": 18
            }
          }
        ]
      },
      {
        "id": "uuid-017",
        "type": "o4o/placeholder",
        "attributes": {
          "componentName": "CustomCarousel",
          "reason": "기존 O4O 블록으로 매핑할 수 없는 커스텀 컴포넌트입니다.",
          "notes": "<CustomCarousel items={productImages} autoPlay={true} />",
          "props": {
            "items": "[expression]",
            "autoPlay": true
          }
        }
      }
    ]
  }
]
```

### 10.3 생성된 페이지 미리보기 (Admin UI)

```
┌──────────────────────────────────────────────────────────────┐
│ 📄 Page: "AntiGravity Landing"                               │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ [Heading] Defy Gravity, Embrace the Future             │  │
│ │ [Paragraph] Experience the world's first...            │  │
│ │                                                         │  │
│ │ [Columns - 3]                                           │  │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                │  │
│ │ │   Safe   │ │Efficient │ │Eco-Friendly│              │  │
│ │ │   ...    │ │   ...    │ │    ...   │                │  │
│ │ └──────────┘ └──────────┘ └──────────┘                │  │
│ │                                                         │  │
│ │ [Button] Pre-Order Now                                 │  │
│ │                                                         │  │
│ │ ⚠️ [Placeholder] CustomCarousel                        │  │
│ │    수동 처리 필요 - 원본 JSX 보기 ▼                      │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ [Publish]  [Save Draft]                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 11. 재구축 가이드

### 11.1 새 "페이지 생성기 앱" 요구사항

**핵심 기능**:
1. ✅ AI Prompt → JSX 코드 생성
2. ✅ JSX → O4O Block 자동 변환 (이 문서의 규칙 재사용)
3. ✅ O4O Admin API 연동 (페이지 생성)
4. ✅ 브라우저 미리보기
5. ✅ Placeholder 블록 수동 교체 UI

**VSCode Extension 대비 장점**:
- ❌ Extension 설치 불필요
- ✅ 브라우저만 있으면 바로 사용
- ✅ 실시간 미리보기 (iframe)
- ✅ 드래그 앤 드롭으로 Placeholder 교체
- ✅ 협업 가능 (다른 사용자와 공유)

### 11.2 재사용 가능한 모듈

| 모듈 | 파일 | 재사용 가능성 | 변경 필요 사항 |
|------|------|---------------|----------------|
| JSX Parser | `reactParser.ts` | ✅ 100% | Babel 의존성만 추가 |
| Block Mapper | `blockMapper.ts` | ✅ 95% | `uuid` import만 변경 |
| Tailwind Parser | `tailwindParser.ts` | ✅ 100% | 그대로 사용 |
| API Client | `pageClient.ts` | ✅ 80% | Axios → Fetch API |
| Auth Manager | `authManager.ts` | ❌ 30% | VSCode SecretStorage → Browser Storage |
| Placeholder 전략 | 전체 로직 | ✅ 100% | 그대로 유지 |

### 11.3 새 시스템 아키텍처 제안

```
┌─────────────────────────────────────────────────────────────┐
│                    웹 앱 (Browser)                           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  AI Prompt   │  │  Converter   │  │  Preview     │     │
│  │   Editor     │  │              │  │   Panel      │     │
│  │              │  │ • Parser     │  │              │     │
│  │ [Textarea]   │  │ • Mapper     │  │  <iframe>    │     │
│  │              │  │ • Tailwind   │  │              │     │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘     │
│         │                 │                                │
│         └─────────────────┼───────────────┐                │
│                           │               │                │
│                    ┌──────▼───────┐  ┌───▼────────┐       │
│                    │  Block Editor│  │ Placeholder│       │
│                    │  (수동 수정) │  │  Manager   │       │
│                    └──────┬───────┘  └────────────┘       │
│                           │                                │
│                    ┌──────▼───────┐                        │
│                    │  API Client  │                        │
│                    └──────┬───────┘                        │
└───────────────────────────┼────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  O4O Platform  │
                    │   Admin API    │
                    └────────────────┘
```

### 11.4 구현 단계

**Phase 1: 핵심 변환 엔진** (1-2주)
- [ ] `reactParser.ts` 이식
- [ ] `blockMapper.ts` 이식
- [ ] `tailwindParser.ts` 이식
- [ ] 단위 테스트 작성

**Phase 2: UI 개발** (2-3주)
- [ ] AI Prompt 입력 UI
- [ ] JSX 코드 에디터 (Monaco Editor)
- [ ] 실시간 미리보기 (iframe)
- [ ] Placeholder 교체 UI

**Phase 3: API 연동** (1주)
- [ ] Browser 기반 Auth (localStorage + httpOnly cookie)
- [ ] Fetch API 클라이언트
- [ ] JWT 자동 갱신
- [ ] 에러 핸들링

**Phase 4: 고도화** (2-3주)
- [ ] AI 기반 Placeholder 자동 제안
- [ ] 변환 히스토리 저장
- [ ] 템플릿 라이브러리
- [ ] 협업 기능 (공유 링크)

### 11.5 필수 참고 문서

이 아카이브 문서 외에 추가로 확인해야 할 문서들:

1. **O4O Block Specification**
   - `docs/blocks/BLOCK_SPEC.md` (있다면)
   - 모든 블록 타입의 정의
   - Attributes 스키마

2. **Appearance System V2**
   - `docs/appearance/APPEARANCE_SYSTEM_V2.md` (있다면)
   - 새 토큰 시스템
   - Tailwind 매핑 확장

3. **API Documentation**
   - `/api/admin/pages` endpoint 상세 스펙
   - `/api/v1/auth/*` endpoint 상세 스펙

4. **_generated 폴더 표준**
   - 현재 사용 중인 구조 확인
   - 새 시스템에 맞게 확장

### 11.6 마이그레이션 체크리스트

**삭제 전 체크**:
- [ ] 이 아카이브 문서 작성 완료
- [ ] VSCode Extension 빌드 파일 백업 (`.vsix`)
- [ ] 테스트용 JSX 샘플 백업
- [ ] 생성된 페이지 예시 백업

**삭제 작업**:
- [ ] `extensions/o4o-integration/` 삭제
- [ ] `apps/vscode-extension/` 삭제 (있다면)
- [ ] `feature/o4o-integration` 브랜치 삭제
- [ ] VSCode SecretStorage 정리
- [ ] `.vsix` 파일 삭제

**새 시스템 시작**:
- [ ] 새 웹 앱 프로젝트 생성
- [ ] Converter 모듈 이식
- [ ] Browser Auth 구현
- [ ] UI 개발

---

## 📌 중요 알림

### ⚠️ 절대 잃으면 안 되는 지식

1. **Placeholder 전략** - 이게 없으면 매핑 실패한 컴포넌트 복구 불가
2. **Tailwind → Token 매핑 규칙** - 이게 없으면 스타일 정보 전부 유실
3. **JSX 직렬화 로직** - 원본 코드 보존에 필수
4. **Block 구조** - O4O 시스템 전체의 핵심

### ✅ 이 문서의 활용

**재구축 시**:
- 섹션 3, 4, 5번을 그대로 코드로 변환
- 섹션 6, 7번을 브라우저 환경에 맞게 수정
- 섹션 8번 흐름을 웹 앱 UI로 구현

**확장 시**:
- Tailwind Parser에 새 유틸리티 클래스 추가
- Block Mapper에 새 O4O 블록 타입 추가
- Placeholder Manager에 AI 제안 기능 추가

**디버깅 시**:
- 섹션 10번 샘플로 입출력 검증
- 섹션 8번 흐름으로 어느 단계에서 실패했는지 확인

---

**작성자**: Claude Code
**마지막 수정**: 2025-12-01
**버전**: 1.0.0
**상태**: ✅ 최종 완성본

