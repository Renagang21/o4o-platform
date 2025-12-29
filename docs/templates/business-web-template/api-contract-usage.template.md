# {Business} API Contract Usage

> **Version**: 1.0
> **Status**: Mandatory (CLAUDE.md 구속 규칙)
> **Created**: {date}

이 문서는 {business}-web에서 {business}-api를 호출하는 규칙을 정의합니다.

---

## 1. API 계약 원칙

### 1.1 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **계약 우선** | OpenAPI spec이 단일 진실 원본 |
| **타입 생성** | OpenAPI에서 TypeScript 타입 자동 생성 |
| **직접 fetch 금지** | 반드시 API 클라이언트 사용 |
| **하드코딩 금지** | URL, 에러 코드 등 모두 상수화 |

### 1.2 OpenAPI 참조

```yaml
# 참조할 OpenAPI spec
docs/services/{business}/openapi.yaml
```

---

## 2. 타입 생성

### 2.1 OpenAPI → TypeScript

```bash
# 타입 생성 명령
npx openapi-typescript docs/services/{business}/openapi.yaml \
  -o apps/{business}-web/src/types/{business}-api.d.ts
```

### 2.2 생성된 타입 사용

```typescript
// types/{business}-api.d.ts (자동 생성)
export interface paths {
  '/{business}/resources': {
    get: operations['listResources'];
  };
  '/{business}/resources/{id}': {
    get: operations['getResource'];
  };
}

export interface components {
  schemas: {
    ResourceSummary: {
      id: string;
      name: string;
      status: 'draft' | 'active' | 'inactive' | 'archived';
    };
  };
}
```

---

## 3. API 클라이언트 구조

### 3.1 기본 클라이언트

```typescript
// services/{business}-api.ts
import type { paths, components } from '@/types/{business}-api';

const API_BASE = process.env.NEXT_PUBLIC_{BUSINESS}_API_URL;

type ResourceSummary = components['schemas']['ResourceSummary'];
type ResourceDetail = components['schemas']['ResourceDetail'];

class {Business}ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE!;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const token = localStorage.getItem('accessToken');

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.code, error.error.message);
    }

    return response.json();
  }

  // Public APIs
  resources = {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      this.request<{ data: ResourceSummary[]; meta: PaginationMeta }>(
        `/{business}/resources?${new URLSearchParams(params as any)}`
      ),

    get: (id: string) =>
      this.request<{ data: ResourceDetail }>(
        `/{business}/resources/${id}`
      ),
  };

  // Admin APIs
  admin = {
    resources: {
      list: (params?: { page?: number; limit?: number }) =>
        this.request<{ data: ResourceSummary[]; meta: PaginationMeta }>(
          `/{business}/admin/resources?${new URLSearchParams(params as any)}`
        ),

      create: (data: CreateResourceRequest) =>
        this.request<{ data: ResourceDetail }>(
          `/{business}/admin/resources`,
          { method: 'POST', body: JSON.stringify(data) }
        ),

      update: (id: string, data: UpdateResourceRequest) =>
        this.request<{ data: ResourceDetail }>(
          `/{business}/admin/resources/${id}`,
          { method: 'PUT', body: JSON.stringify(data) }
        ),

      updateStatus: (id: string, data: UpdateStatusRequest) =>
        this.request<{ data: StatusChangeResponse }>(
          `/{business}/admin/resources/${id}/status`,
          { method: 'PATCH', body: JSON.stringify(data) }
        ),

      delete: (id: string) =>
        this.request<void>(
          `/{business}/admin/resources/${id}`,
          { method: 'DELETE' }
        ),
    },
  };
}

export const {business}Api = new {Business}ApiClient();
```

### 3.2 에러 처리 클래스

```typescript
// lib/api-error.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get isAuthError() {
    return this.code === '{BUSINESS}_401';
  }

  get isForbidden() {
    return this.code === '{BUSINESS}_403';
  }

  get isNotFound() {
    return this.code === '{BUSINESS}_001';
  }
}
```

---

## 4. React Query 통합

### 4.1 Query Hooks

```typescript
// hooks/use-resources.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { {business}Api } from '@/services/{business}-api';

// 목록 조회
export function useResources(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: ['resources', params],
    queryFn: () => {business}Api.resources.list(params),
  });
}

// 상세 조회
export function useResource(id: string) {
  return useQuery({
    queryKey: ['resources', id],
    queryFn: () => {business}Api.resources.get(id),
    enabled: !!id,
  });
}

// 생성
export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: {business}Api.admin.resources.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

// 수정
export function useUpdateResource(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateResourceRequest) =>
      {business}Api.admin.resources.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      queryClient.invalidateQueries({ queryKey: ['resources', id] });
    },
  });
}

// 상태 변경
export function useUpdateResourceStatus(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateStatusRequest) =>
      {business}Api.admin.resources.updateStatus(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}

// 삭제
export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: {business}Api.admin.resources.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });
}
```

### 4.2 에러 처리 통합

```typescript
// hooks/use-api-error.ts
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api-error';

export function useApiErrorHandler() {
  const router = useRouter();

  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.isAuthError) {
        router.push('/login');
        return;
      }

      if (error.isForbidden) {
        // 권한 없음 처리
        return;
      }

      // 번역된 에러 메시지 표시
      showToast(translateError(error.code));
    }
  };
}
```

---

## 5. 금지 패턴

### 5.1 직접 fetch 금지

```typescript
// 금지: 직접 fetch
const response = await fetch('/api/resources');  // ❌
const response = await fetch('https://api.example.com/resources');  // ❌

// 허용: API 클라이언트 사용
const { data } = await {business}Api.resources.list();  // ✅
```

### 5.2 하드코딩 금지

```typescript
// 금지: URL 하드코딩
const API_URL = 'https://{business}-api.neture.co.kr';  // ❌

// 금지: 에러 코드 하드코딩
if (error.code === 'COSMETICS_001') {  // ❌
  // ...
}

// 허용: 환경변수 및 상수 사용
const API_URL = process.env.NEXT_PUBLIC_{BUSINESS}_API_URL;  // ✅
if (error.isNotFound) {  // ✅
  // ...
}
```

### 5.3 API 로직 금지

```typescript
// 금지: 비즈니스 로직 구현
async function createResourceWithValidation(data) {
  if (data.value < 0) {  // ❌ 비즈니스 검증
    throw new Error('Invalid value');
  }
  return {business}Api.admin.resources.create(data);
}

// 허용: 단순 전달
async function createResource(data) {
  return {business}Api.admin.resources.create(data);  // ✅
}
```

---

## 6. 인증 토큰 처리

### 6.1 토큰 저장

```typescript
// lib/auth.ts

// 토큰 저장 (로그인 후)
export function setTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem('accessToken', accessToken);
  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  }
}

// 토큰 조회
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

// 토큰 삭제 (로그아웃)
export function clearTokens() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}
```

### 6.2 토큰 만료 확인 (허용)

```typescript
// lib/auth.ts

// 허용: 만료 시간 확인만
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

// 금지: 서명 검증
import jwt from 'jsonwebtoken';
jwt.verify(token, secret);  // ❌
```

---

## 7. 참조 문서

- docs/services/{business}/openapi.yaml
- docs/architecture/business-web-template.md
- CLAUDE.md §14 API Contract Enforcement Rules
- CLAUDE.md §16 Business Web Template Rules

---

*이 문서는 {business}-web의 API 연동 표준입니다.*
