# O4O Web Server Reference

> **Status**: Reference Implementation
> **Phase**: G5 - Web Server Reference

프론트엔드(Web Server) 기준 구현체입니다.
`web-server-architecture.md`에 정의된 규칙을 따르며,
모든 새 Web Server는 이 구조를 복사해 시작합니다.

## 구조

```
apps/web-server-reference/
├── src/
│   ├── components/     # UI 컴포넌트
│   ├── pages/          # 라우트 페이지
│   ├── hooks/          # 커스텀 훅
│   ├── services/       # API 호출 함수
│   ├── stores/         # 상태 관리
│   ├── App.tsx         # 메인 앱
│   └── main.tsx        # 엔트리포인트
├── public/             # 정적 파일
├── index.html          # HTML 템플릿
└── vite.config.ts      # 빌드 설정
```

## 핵심 규칙

### 1. authClient 사용 필수

```typescript
// ✅ 올바른 방법
import { authClient } from '@o4o/auth-client';
const response = await authClient.api.get('/api/v1/users/me');

// ❌ 금지
import axios from 'axios';
axios.get('https://api.example.com/users');
```

### 2. API URL 하드코딩 금지

```typescript
// ❌ 금지
const API_URL = 'https://api.neture.co.kr';

// ✅ authClient가 관리
const { baseURL } = authClient;
```

### 3. JWT는 authClient가 관리

- localStorage 직접 조작 금지
- authClient.login() / authClient.logout() 사용
- 토큰 자동 갱신 내장

## 실행

```bash
# 개발 서버
pnpm -F @o4o/web-server-reference dev

# 빌드
pnpm -F @o4o/web-server-reference build

# 타입 체크
pnpm -F @o4o/web-server-reference type-check
```

## 연동 API

| API | 용도 |
|-----|------|
| Core API | 인증, 사용자 관리 |
| Forum API | 포럼 기능 (도메인 API 예제) |

## 배포

Vite 빌드 결과물 (`dist/`)을 배포합니다.

```bash
# Cloud Run 또는
# Nginx Static Hosting
rsync -avz dist/ user@server:/var/www/example.com/
```
