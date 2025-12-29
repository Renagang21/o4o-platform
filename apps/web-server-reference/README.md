# O4O Web Server Reference

> **Status**: 🔒 FROZEN (G6 Phase)
> **Frozen Date**: 2025-12-25

이 디렉토리는 **동결된 Reference Implementation**입니다.
모든 새 Web Server는 이 디렉토리를 복사하여 시작해야 합니다.

## 동결 상태

```
🔒 구조 변경 금지
🔒 기능 추가 금지
🔒 의존성 추가 금지
⭕ 버그 수정만 허용
⭕ 보안 패치만 허용
```

수정이 필요한 경우 [reference-freeze-policy.md](../../docs/_platform/reference-freeze-policy.md)를 참조하세요.

---

## Quick Start

```bash
# 새 Web Server 생성
cp -r apps/web-server-reference apps/{new-web-app}

# 의존성 설치
pnpm install

# 개발 서버
pnpm -F @o4o/{new-web-app} dev

# 빌드
pnpm -F @o4o/{new-web-app} build
```

## Structure

```
apps/web-server-reference/
├── src/
│   ├── components/     # UI 컴포넌트
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── pages/          # 라우트 페이지
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ForumListPage.tsx
│   │   └── ForumDetailPage.tsx
│   ├── hooks/          # 커스텀 훅
│   │   └── useForumData.ts
│   ├── services/       # API 호출 함수
│   │   └── api.service.ts
│   ├── stores/         # 상태 관리
│   │   └── AuthContext.tsx
│   ├── App.tsx         # 라우팅
│   └── main.tsx        # 엔트리포인트
├── public/             # 정적 파일
├── index.html          # HTML 템플릿
├── vite.config.ts      # 빌드 설정
└── tailwind.config.js  # 스타일 설정
```

## Key Principles

| 원칙 | 설명 |
|------|------|
| **authClient 필수** | 모든 API 호출은 `authClient.api` 사용 |
| **API URL 금지** | URL 하드코딩 금지, authClient가 관리 |
| **JWT 직접 관리 금지** | authClient가 토큰 저장/갱신 |
| **DB 직접 접근 금지** | API 호출만 허용 |

## 핵심 패턴

### 1. authClient 사용

```typescript
// ✅ 올바른 방법
import { authClient } from '@o4o/auth-client';
const response = await authClient.api.get('/users/me');

// ❌ 금지
import axios from 'axios';
axios.get('https://api.example.com/users');
```

### 2. AuthContext 사용

```typescript
// ✅ 올바른 방법
import { useAuth } from './stores/AuthContext';
const { user, isAuthenticated, login, logout } = useAuth();

// ❌ 금지
localStorage.getItem('token');
```

### 3. 서비스 함수 패턴

```typescript
// src/services/api.service.ts
import { authClient } from '@o4o/auth-client';

export const userService = {
  async getProfile() {
    return authClient.api.get('/users/me');
  },
};
```

## 새 Web Server 생성 절차

### 1단계: Reference 복사

```bash
cp -r apps/web-server-reference apps/{new-web-app}
```

### 2단계: 필수 수정

```bash
# package.json
- "name": "@o4o/web-server-reference" → "@o4o/{new-web-app}"
- "description": 변경

# index.html
- <title> 변경

# vite.config.ts
- port 변경 (충돌 방지)
```

### 3단계: 페이지 및 서비스 추가

```bash
# 새 페이지 생성
src/pages/{NewPage}.tsx

# 새 서비스 생성
src/services/{domain}.service.ts

# App.tsx에 라우트 추가
<Route path="/new" element={<NewPage />} />
```

### 4단계: 검증

```bash
pnpm -F @o4o/{new-web-app} type-check
pnpm -F @o4o/{new-web-app} build
```

## ❌ 복사 후 금지 사항

| 금지 | 이유 |
|------|------|
| AuthProvider 제거 | 인증 상태 관리 필수 |
| authClient 미사용 | 아키텍처 규칙 위반 |
| API URL 하드코딩 | 환경 분리 위반 |
| 직접 axios/fetch 사용 | authClient 우회 |
| localStorage 직접 조작 | 토큰 관리 규칙 위반 |

## 연동 API

| API | 용도 | 서비스 |
|-----|------|--------|
| Core API | 인증, 사용자 관리 | `authClient.login()` 등 |
| Forum API | 포럼 기능 | `forumService` 예제 |

## 배포

```bash
# 빌드
pnpm -F @o4o/{app-name} build

# 결과물 배포 (dist/)
rsync -avz dist/ user@server:/var/www/example.com/
```

## Reference

- [reference-freeze-policy.md](../../docs/_platform/reference-freeze-policy.md) - 동결 정책
- [web-server-architecture.md](../../docs/_platform/web-server-architecture.md) - 아키텍처 규칙
- [CLAUDE.md](../../CLAUDE.md) - 플랫폼 헌법
