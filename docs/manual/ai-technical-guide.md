# AI 페이지 자동 생성 - 기술 가이드

> 마지막 업데이트: 2025-10-19

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처](#아키텍처)
3. [데이터베이스 (참조 시스템)](#데이터베이스-참조-시스템)
4. [작동 방식](#작동-방식)
5. [API 엔드포인트](#api-엔드포인트)
6. [개발자 가이드](#개발자-가이드)
7. [확장 방법](#확장-방법)

---

## 시스템 개요

AI 페이지 자동 생성 시스템은 **서버 우선 전략**으로 최신 블록/숏코드 정보를 제공하고, **프록시 패턴**으로 AI API 키를 안전하게 관리합니다.

### 핵심 설계 원칙

1. **SSOT (Single Source of Truth)**: 서버가 블록/숏코드의 유일한 출처
2. **보안 우선**: API 키는 서버에서만 관리, 프론트엔드 노출 금지
3. **폴백 전략**: 서버 실패 시 로컬 데이터로 폴백
4. **성능 최적화**: ETag 캐싱으로 불필요한 데이터 전송 방지

---

## 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자                                 │
└───────────────────────┬─────────────────────────────────────┘
                        │ 1. 프롬프트 입력
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Admin Dashboard (React)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SimpleAIGenerator.ts                                 │   │
│  │  - 프롬프트 구성                                        │   │
│  │  - 진행 상황 관리                                        │   │
│  │  - 블록 검증                                             │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ 2. 참조 데이터 요청                     │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  reference-fetcher.service.ts                         │   │
│  │  - 서버 우선 전략                                        │   │
│  │  - ETag 캐싱                                             │   │
│  │  - 로컬 폴백                                             │   │
│  └──────────────────┬───────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ 3. GET /api/ai/blocks/reference
                     │    GET /api/ai/shortcodes/reference
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Server (Node.js/Express)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  block-registry.service.ts                            │   │
│  │  - 블록 메타데이터 관리 (메모리)                          │   │
│  │  - AI 참조 데이터 생성                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  shortcode-registry.service.ts                        │   │
│  │  - 숏코드 메타데이터 관리 (메모리)                         │   │
│  │  - AI 참조 데이터 생성                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                     │ 4. 참조 데이터 반환                     │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Admin Dashboard                                      │   │
│  │  - 시스템 프롬프트 구성                                   │   │
│  │  - 사용자 프롬프트 구성                                   │   │
│  └──────────────────┬───────────────────────────────────┘   │
│                     │ 5. POST /api/ai/generate              │
│                     ▼                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AI Proxy (ai-proxy.controller.ts)                    │   │
│  │  - API 키 주입 (환경변수)                                 │   │
│  │  - 인증 및 권한 검증                                      │   │
│  │  - 레이트리밋 적용                                        │   │
│  └──────────────────┬───────────────────────────────────┘   │
└────────────────────┼────────────────────────────────────────┘
                     │ 6. AI API 호출
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              AI Providers                                    │
│  - OpenAI (GPT-5, GPT-4.1)                                  │
│  - Google Gemini (2.5 Flash, 2.5 Pro)                       │
│  - Anthropic Claude (Sonnet 4.5, Opus 4)                    │
└────────────────────┬────────────────────────────────────────┘
                     │ 7. AI 응답 (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              API Server                                      │
│  - 응답 검증                                                  │
│  - 사용량 로깅                                                │
│  - 에러 처리                                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ 8. 블록 배열 반환
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Admin Dashboard                                 │
│  - 블록 검증 및 ID 추가                                        │
│  - 편집기에 삽입                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 데이터베이스 (참조 시스템)

AI가 페이지를 생성할 때 참조하는 "데이터베이스"는 **서버 측 메모리**와 **정적 문서**로 구성됩니다.

### 서버 측 동적 데이터베이스 (실시간 SSOT)

#### 위치
```
/apps/api-server/src/services/
├── block-registry.service.ts       # 블록 레지스트리
└── shortcode-registry.service.ts   # 숏코드 레지스트리
```

#### 블록 레지스트리 (block-registry.service.ts)

**역할**: 모든 블록의 메타데이터를 메모리에서 관리

**데이터 구조**:
```typescript
interface BlockInfo {
  name: string;                    // 블록 이름 (예: 'core/paragraph')
  title: string;                   // 표시 이름 (예: '단락')
  description: string;             // 설명
  category: string;                // 카테고리 (text, media, design 등)
  attributes: Record<string, any>; // 블록 속성
  example: {
    text: string;                  // 텍스트 설명
    json: any;                     // JSON 예제
  };
  aiPrompts?: string[];            // AI용 힌트
  parent?: string[];               // 부모 블록 제약
  supports?: {
    align?: boolean;
    customClassName?: boolean;
  };
}
```

**주요 메서드**:
- `register(name, info)`: 블록 등록
- `get(name)`: 블록 조회
- `getAll()`: 모든 블록 조회
- `getByCategory(category)`: 카테고리별 조회
- `search(query)`: 블록 검색
- `getAIReference()`: AI용 참조 데이터 생성

**API 엔드포인트**: `GET /api/ai/blocks/reference`

#### 숏코드 레지스트리 (shortcode-registry.service.ts)

**역할**: 모든 숏코드의 메타데이터를 메모리에서 관리

**데이터 구조**:
```typescript
interface ShortcodeInfo {
  name: string;                    // 숏코드 이름 (예: 'product')
  description: string;             // 설명
  category: string;                // 카테고리
  parameters: Record<string, {
    type: string;                  // 파라미터 타입
    default?: any;                 // 기본값
    description: string;           // 설명
    required?: boolean;            // 필수 여부
  }>;
  examples: string[];              // 사용 예제
  permissions?: string[];          // 필요 권한
  aiPrompts?: string[];            // AI용 힌트
}
```

**주요 메서드**:
- `register(name, info)`: 숏코드 등록
- `get(name)`: 숏코드 조회
- `getAll()`: 모든 숏코드 조회
- `getByCategory(category)`: 카테고리별 조회
- `search(query)`: 숏코드 검색
- `getAIReference()`: AI용 참조 데이터 생성

**API 엔드포인트**: `GET /api/ai/shortcodes/reference`

### 정적 문서 (백업/가이드)

#### 위치
```
/docs/ai/
├── README.md                              # 전체 개요
├── shortcode-system.md                    # 숏코드 아키텍처
├── shortcode-registry.md                  # 숏코드 메타데이터
├── shortcode-best-practices.md            # AI 생성 규칙
├── shortcode-examples.md                  # 실제 사용 패턴
├── AI_BLOCK_REFERENCE_SYSTEM.md          # 블록 시스템 참조
└── AI_DYNAMIC_REFERENCE_SUMMARY.md       # 동적 컨텐츠 참조
```

**용도**:
- AI 어시스턴트(Claude Code 등)용 가이드
- 서버 다운 시 폴백 데이터
- 개발자 레퍼런스

---

## 작동 방식

### 1. 참조 데이터 로딩

```typescript
// reference-fetcher.service.ts
async fetchCompleteReference(): Promise<string> {
  try {
    // 서버에서 최신 데이터 가져오기
    const [blocksRef, shortcodesRef] = await Promise.all([
      this.fetchFromServer('/api/ai/blocks/reference', 'blocks'),
      this.fetchFromServer('/api/ai/shortcodes/reference', 'shortcodes')
    ]);

    return this.formatServerReference(blocksRef, shortcodesRef);
  } catch (error) {
    // 서버 실패 시 로컬 폴백
    return this.fetchLocalFallback();
  }
}
```

**전략**:
1. **서버 우선**: 항상 서버에서 최신 데이터 요청
2. **ETag 캐싱**: 변경 없으면 304 Not Modified 응답
3. **로컬 폴백**: 서버 실패 시 로컬 데이터 사용

### 2. AI 프롬프트 구성

```typescript
// SimpleAIGenerator.ts
private getSystemPrompt(template: string, availableBlocks: string): string {
  const baseRules = `
중요한 규칙:
1. 반드시 JSON 형식으로만 응답하세요: {"blocks": [...]}
2. 이미지 URL은 절대 사용하지 마세요
3. 이미지 블록에는 alt 텍스트만 포함하고 src는 비워두세요
4. 버튼은 실제 링크 대신 "#" 사용
5. 한국어로 작성하세요
6. 사용자가 요청한 내용에 정확히 맞춰 생성하세요`;

  const prompts = {
    landing: `${baseRules}\n\n${availableBlocks}\n\n랜딩 페이지 구성 요소: ...`,
    about: `${baseRules}\n\n${availableBlocks}\n\n회사 소개 페이지 구성: ...`,
    // ...
  };

  return prompts[template];
}
```

**시스템 프롬프트 구성**:
- 기본 규칙 (JSON 형식, 이미지 제약 등)
- 사용 가능한 블록/숏코드 목록
- 템플릿별 구성 가이드

### 3. AI API 호출 (프록시 패턴)

```typescript
// SimpleAIGenerator.ts
private async generateWithProxy(
  systemPrompt: string,
  userPrompt: string,
  config: AIConfig,
  signal?: AbortSignal
): Promise<Block[]> {
  const token = this.getAuthToken();

  const response = await fetch(`${this.API_BASE}/api/ai/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      provider: config.provider,
      model: config.model,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: config.provider === 'gemini' ? 8192 : 4000,
    }),
    signal,
  });

  const data = await response.json();
  return data.result.blocks || [];
}
```

**보안 특징**:
- ✅ API 키는 서버에서만 관리 (환경변수)
- ✅ JWT 토큰으로 사용자 인증
- ✅ 레이트리밋 적용 (분당 60회)
- ✅ 권한 검증 (`content:write` 필요)

### 4. 응답 처리 및 검증

```typescript
// SimpleAIGenerator.ts
private validateBlocks(blocks: any[]): Block[] {
  if (!Array.isArray(blocks)) {
    throw new Error('유효하지 않은 블록 형식입니다');
  }

  return blocks.map((block, index) => ({
    id: `block-${Date.now()}-${index}`,
    type: block.type || 'o4o/paragraph',
    content: block.content || { text: '' },
    attributes: block.attributes || {}
  }));
}
```

**검증 단계**:
1. 배열 형식 확인
2. 각 블록에 고유 ID 부여
3. 기본값 설정 (type, content, attributes)
4. 편집기 호환 형식으로 변환

---

## API 엔드포인트

### 참조 데이터 API

#### GET /api/ai/blocks/reference

블록 참조 데이터 조회 (인증 필수)

**응답**:
```json
{
  "success": true,
  "data": {
    "schemaVersion": "1.0.0",
    "lastUpdated": "2025-10-19T...",
    "total": 25,
    "categories": [
      { "name": "text", "title": "텍스트", "priority": 1 },
      // ...
    ],
    "blocks": [
      {
        "name": "core/paragraph",
        "title": "단락",
        "description": "텍스트 단락을 추가합니다",
        "category": "text",
        "example": { "json": {...} }
      },
      // ...
    ]
  }
}
```

**캐싱**: ETag 지원 (304 Not Modified)

#### GET /api/ai/shortcodes/reference

숏코드 참조 데이터 조회 (인증 필수)

**응답**:
```json
{
  "success": true,
  "data": {
    "schemaVersion": "1.0.0",
    "lastUpdated": "2025-10-19T...",
    "total": 19,
    "categories": [...],
    "shortcodes": [
      {
        "name": "product",
        "description": "단일 상품 표시",
        "category": "ecommerce",
        "parameters": {...},
        "examples": ["[product id=\"123\"]"]
      },
      // ...
    ]
  }
}
```

### AI 생성 API

#### POST /api/ai/generate

AI 페이지 생성 (인증 필수)

**요청**:
```json
{
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "systemPrompt": "...",
  "userPrompt": "친환경 화장품 회사 소개 페이지",
  "temperature": 0.7,
  "maxTokens": 8192
}
```

**응답**:
```json
{
  "success": true,
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "usage": {
    "promptTokens": 1500,
    "completionTokens": 2000,
    "totalTokens": 3500
  },
  "result": {
    "blocks": [
      {
        "type": "core/heading",
        "content": { "text": "친환경 화장품 브랜드" },
        "attributes": { "level": 1 }
      },
      // ...
    ]
  }
}
```

**에러 응답**:
```json
{
  "success": false,
  "error": "Provider error message",
  "type": "PROVIDER_ERROR",
  "retryable": true
}
```

**레이트리밋**: 분당 60회 (사용자별)

---

## 개발자 가이드

### 새 블록 추가하기

```typescript
// apps/api-server/src/services/block-registry.service.ts

private registerBuiltinBlocks() {
  // ... 기존 블록들 ...

  // 새 블록 추가
  this.register('o4o/custom-block', {
    name: 'o4o/custom-block',
    title: '커스텀 블록',
    description: '커스텀 블록 설명',
    category: 'widgets',
    attributes: {
      customAttribute: {
        type: 'string',
        default: 'default value',
        description: '커스텀 속성'
      }
    },
    example: {
      text: '커스텀 블록 예제 설명',
      json: {
        type: 'o4o/custom-block',
        content: { text: '예제 텍스트' },
        attributes: { customAttribute: 'value' }
      }
    },
    aiPrompts: [
      '특수 위젯이 필요할 때 사용',
      '커스텀 기능 구현 시 활용'
    ]
  });
}
```

**등록 후**:
1. 서버 재시작
2. `GET /api/ai/blocks/reference` 호출 시 자동 포함
3. AI가 즉시 사용 가능

### 새 숏코드 추가하기

```typescript
// apps/api-server/src/services/shortcode-registry.service.ts

private registerBuiltinShortcodes() {
  // ... 기존 숏코드들 ...

  // 새 숏코드 추가
  this.register('custom_widget', {
    name: 'custom_widget',
    description: '커스텀 위젯을 표시합니다',
    category: 'utility',
    parameters: {
      id: {
        type: 'string',
        required: true,
        description: '위젯 ID'
      },
      display: {
        type: 'string',
        default: 'default',
        description: '표시 모드'
      }
    },
    examples: [
      '[custom_widget id="widget-1"]',
      '[custom_widget id="widget-2" display="compact"]'
    ],
    permissions: ['content:read'],
    aiPrompts: [
      '특수 위젯 표시가 필요할 때',
      '동적 컨텐츠 삽입 시'
    ]
  });
}
```

### 새 AI 모델 추가하기

```typescript
// apps/admin-dashboard/src/services/ai/SimpleAIGenerator.ts

export const AI_MODELS = {
  // ... 기존 모델들 ...

  // 새 모델 추가
  'new-model-id': 'New Model Name',
} as const;
```

**서버 프록시 업데이트**:
```typescript
// apps/api-server/src/controllers/ai-proxy.controller.ts

switch (provider) {
  case 'openai':
    // ...
  case 'gemini':
    // ...
  case 'new-provider':
    // 새 제공자 처리 로직
    break;
}
```

---

## 확장 방법

### 1. 커스텀 템플릿 추가

```typescript
// SimpleAIGenerator.ts

private getSystemPrompt(template: string, availableBlocks: string): string {
  const prompts = {
    // ... 기존 템플릿들 ...

    'custom-template': `${baseRules}

${availableBlocks}

커스텀 템플릿 구성:
- 섹션 1 설명
- 섹션 2 설명
- ...
    `
  };

  return prompts[template as keyof typeof prompts] || prompts.landing;
}
```

### 2. AI 프롬프트 최적화

**블록 힌트 추가**:
```typescript
this.register('core/heading', {
  // ...
  aiPrompts: [
    '제목이나 헤드라인이 필요할 때 사용',
    '페이지 섹션을 구분할 때 활용',
    'SEO 최적화를 위해 H1은 페이지당 1개만 사용'
  ]
});
```

**숏코드 힌트 추가**:
```typescript
this.register('product_grid', {
  // ...
  aiPrompts: [
    '상품 목록을 그리드 형태로 표시할 때',
    '여러 제품을 한눈에 보여줄 때',
    '카테고리별 상품 진열 시 활용'
  ]
});
```

### 3. 캐싱 전략 변경

```typescript
// reference-fetcher.service.ts

class ReferenceFetcherService {
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  // TTL 변경:
  // - 개발 환경: 1분 (빠른 업데이트)
  // - 프로덕션: 10분 (성능 우선)
}
```

### 4. 에러 처리 개선

```typescript
// AI 프록시에서 재시도 로직 추가
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, i) * 1000)
      );
    }
  }
}
```

---

## 성능 최적화

### 1. ETag 캐싱

서버는 참조 데이터에 ETag를 부여하여 클라이언트가 변경 여부를 확인할 수 있습니다.

```typescript
// ai-blocks.ts
const etag = `"${Buffer.from(reference.lastUpdated).toString('base64')}"`;

if (req.headers['if-none-match'] === etag) {
  return res.status(304).end(); // 변경 없음
}

res.set('ETag', etag);
res.json(reference);
```

### 2. 메모리 관리

레지스트리는 싱글톤 패턴으로 메모리에 1회만 로드됩니다.

```typescript
class BlockRegistryService {
  private static instance: BlockRegistryService;

  static getInstance(): BlockRegistryService {
    if (!BlockRegistryService.instance) {
      BlockRegistryService.instance = new BlockRegistryService();
    }
    return BlockRegistryService.instance;
  }
}
```

### 3. 레이트리밋

AI 엔드포인트는 분당 60회로 제한됩니다.

```typescript
const aiReadRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.userId || req.ip
});
```

---

## 보안 고려사항

### 1. API 키 관리

- ✅ 환경변수로만 관리 (`.env` 파일)
- ✅ 프론트엔드에 절대 노출 금지
- ✅ Git에 커밋 금지 (`.gitignore` 적용)

### 2. 인증 및 권한

- ✅ JWT 토큰 검증
- ✅ `content:write` 권한 확인
- ✅ 레이트리밋으로 남용 방지

### 3. 입력 검증

- ✅ 프롬프트 길이 제한 (2000자)
- ✅ XSS 방지 (생성된 블록 검증)
- ✅ SQL Injection 방지 (파라미터 검증)

---

## 모니터링 및 로깅

### 로그 구조

```typescript
logger.info('AI blocks reference - Success', {
  userId: authReq.user?.userId,
  route: '/api/ai/blocks/reference',
  status: 200,
  etag: etag,
  schemaVersion: reference.schemaVersion,
  totalBlocks: reference.total,
  duration: `${duration}ms`,
  timestamp: new Date().toISOString()
});
```

### 주요 메트릭

- AI 생성 요청 수
- 평균 응답 시간
- 토큰 사용량
- 에러율
- 캐시 히트율

---

## 관련 문서

- [AI 사용자 가이드](./ai-user-guide.md)
- [블록 레퍼런스](./blocks-reference.md)
- [숏코드 레퍼런스](/SHORTCODES.md)
- [API 문서](/docs/api-analysis/API_DOCUMENTATION.md)

---

**마지막 업데이트**: 2025-10-19
**버전**: 3.0.0
**작성자**: O4O Platform Team
