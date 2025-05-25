# 🧪 16. 프론트엔드 개발용 API Mock 가이드

## 🎯 목적
백엔드가 아직 준비되지 않았거나 연동 중일 때,  
yaksa.site의 프론트 기능을 독립적으로 개발하고 테스트할 수 있도록  
API 응답을 모킹(mocking)하여 UI 흐름을 점검합니다.

---

## 🔧 1. 적용 방식

| 방법 | 설명 |
|------|------|
| `msw` (Mock Service Worker) | API 요청을 가로채 가짜 응답 반환 (권장) |
| 수동 `mockData.ts` import | API 호출 대신 직접 파일 import (간단) |
| fetch() → 조건 분기 | `process.env.USE_MOCK === 'true'`일 때만 가짜 응답 사용 |

---

## ✅ 2. 추천 방식: MSW (Mock Service Worker)

### 2.1 설치 및 초기화

```bash
# MSW 설치
npm install msw --save-dev

# 브라우저용 핸들러 생성
npx msw init public/ --save
```

### 2.2 기본 구성

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // 인증 관련
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    // 테스트 계정 체크
    if (email === 'test@b2c.com' && password === 'test1234') {
      return res(
        ctx.json({
          token: 'mock-token-b2c',
          user: {
            id: '1',
            email: 'test@b2c.com',
            name: '테스트 사용자',
            role: 'b2c',
          },
        })
      );
    }
    
    if (email === 'test@yaksa.com' && password === 'test1234') {
      return res(
        ctx.json({
          token: 'mock-token-yaksa',
          user: {
            id: '2',
            email: 'test@yaksa.com',
            name: '테스트 약사',
            role: 'yaksa',
          },
        })
      );
    }
    
    if (email === 'admin@yaksa.com' && password === 'admin1234') {
      return res(
        ctx.json({
          token: 'mock-token-admin',
          user: {
            id: '3',
            email: 'admin@yaksa.com',
            name: '관리자',
            role: 'admin',
          },
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' })
    );
  }),

  // 사용자 프로필
  rest.get('/api/user/profile', (req, res, ctx) => {
    const token = req.headers.get('Authorization')?.split(' ')[1];
    
    // 토큰에 따른 사용자 정보 반환
    const users = {
      'mock-token-b2c': {
        id: '1',
        email: 'test@b2c.com',
        name: '테스트 사용자',
        role: 'b2c',
      },
      'mock-token-yaksa': {
        id: '2',
        email: 'test@yaksa.com',
        name: '테스트 약사',
        role: 'yaksa',
      },
      'mock-token-admin': {
        id: '3',
        email: 'admin@yaksa.com',
        name: '관리자',
        role: 'admin',
      },
    };
    
    const user = users[token as keyof typeof users];
    
    if (!user) {
      return res(
        ctx.status(401),
        ctx.json({ message: '인증되지 않은 사용자입니다.' })
      );
    }
    
    return res(ctx.json(user));
  }),

  // 상품 관련
  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: '비타민C 1000',
          description: '고함량 비타민C로 면역력 강화에 도움을 줍니다.',
          price: 12000,
          stock: 50,
          imageUrl: '',
          isActive: true,
          createdAt: '2024-03-15T10:00:00Z',
        },
        {
          id: '2',
          name: '오메가3',
          description: '혈행 개선과 두뇌 건강에 좋은 오메가3.',
          price: 18000,
          stock: 30,
          imageUrl: '',
          isActive: false,
          createdAt: '2024-03-15T11:30:00Z',
        },
      ])
    );
  }),

  // 관리자 승인 목록
  rest.get('/api/admin/approvals', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: '1',
          name: '김약사',
          email: 'pharmacist1@example.com',
          licenseNumber: '12345',
          status: 'pending',
          createdAt: '2024-03-15T10:00:00Z',
        },
        {
          id: '2',
          name: '이약사',
          email: 'pharmacist2@example.com',
          licenseNumber: '67890',
          status: 'pending',
          createdAt: '2024-03-15T11:30:00Z',
        },
      ])
    );
  }),
];
```

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// MSW 초기화
async function prepare() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser');
    return worker.start();
  }
  return Promise.resolve();
}

prepare().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

---

## 🧪 3. 적용 대상 API 예시

| 경로 | 메서드 | 설명 | 응답 예시 |
|------|--------|------|-----------|
| `/api/auth/login` | POST | 로그인 | `{ token, user }` |
| `/api/auth/register` | POST | 회원가입 | `{ token, user }` |
| `/api/user/profile` | GET | 사용자 정보 | `{ id, name, email, role }` |
| `/api/products` | GET | 상품 목록 | `Product[]` |
| `/api/products` | POST | 상품 등록 | `Product` |
| `/api/admin/approvals` | GET | 승인 대기 목록 | `ApprovalUser[]` |
| `/api/admin/approvals/:id` | PUT | 승인/거절 처리 | `{ success, message }` |

---

## 💡 4. 모킹 시 이점

* 백엔드 개발 전에도 전체 UI 흐름 테스트 가능
* 특정 상태 (승인된 약사, 승인되지 않은 약사 등) 재현 용이
* 테스트 자동화 및 UI 유닛 테스트 구성 가능
* 네트워크 지연, 에러 상태 등 다양한 시나리오 테스트 가능

---

## 🧭 5. 기타

* 추후 실제 API 연동 시, 조건문 또는 `.env`로 분기하여 모드 전환 가능
* Next.js, Vite 등 모두에서 사용 가능
* API 구조와 프론트 상태(Context) 연결 방식 유지 가능

---

## 📁 코드 기준

| 파일 | 설명 |
|------|------|
| `src/mocks/handlers.ts` | API 응답 정의 |
| `src/mocks/browser.ts` | worker 초기화 |
| `src/main.tsx` | 개발 환경에서 모킹 적용 시작 |

---

## ⚠️ 6. 주의사항

* 실제 API 연동 전에 반드시 모킹 코드 제거
* 민감한 정보는 모킹 데이터에 포함하지 않기
* 프로덕션 빌드에서는 모킹 코드가 포함되지 않도록 주의
* API 응답 구조는 실제 백엔드와 일치시켜 유지

---

## 📝 7. 테스트 시나리오

### 7.1 로그인 테스트
```typescript
// handlers.ts에 추가
rest.post('/api/auth/login', (req, res, ctx) => {
  const { email, password } = req.body as any;
  
  // 잘못된 비밀번호
  if (email === 'test@b2c.com' && password !== 'test1234') {
    return res(
      ctx.status(401),
      ctx.json({ message: '비밀번호가 일치하지 않습니다.' })
    );
  }
  
  // 존재하지 않는 이메일
  if (!['test@b2c.com', 'test@yaksa.com', 'admin@yaksa.com'].includes(email)) {
    return res(
      ctx.status(404),
      ctx.json({ message: '존재하지 않는 계정입니다.' })
    );
  }
  
  // 정상 로그인
  return res(ctx.json({ token: 'mock-token', user: { /* ... */ } }));
});
```

### 7.2 네트워크 지연 테스트
```typescript
// handlers.ts에 추가
rest.get('/api/products', (req, res, ctx) => {
  return res(
    ctx.delay(1000), // 1초 지연
    ctx.json([/* ... */])
  );
});
```

### 7.3 에러 상태 테스트
```typescript
// handlers.ts에 추가
rest.get('/api/user/profile', (req, res, ctx) => {
  return res(
    ctx.status(500),
    ctx.json({ message: '서버 오류가 발생했습니다.' })
  );
});
``` 