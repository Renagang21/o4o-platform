# O4O Platform Debugging Guide

> **커뮤니티 검증 패턴 기반 디버깅 환경**
>
> AI가 화면을 직접 보는 것이 아니라, **관측 결과를 구조화된 데이터로 분석**하는 방식

---

## 핵심 원칙

### AI 에이전트 디버깅의 올바른 접근

```
❌ AI가 브라우저를 직접 클릭/테스트하게 만들지 않는다
✅ 사람이 관측하고, AI는 관측 결과를 구조적으로 분석한다
```

### 작동 방식

```
[브라우저/런타임]
      ↓ (상태 수집)
[관측 전용 페이지 / Probe]
      ↓ (JSON/로그)
[Claude Code / AI]
      ↓ (분석/지시)
[개발자]
```

---

## 디버그 페이지 사용법

### 1. 로그인 프로브 (`/__debug__/login`)

로그인 과정의 성능과 동작을 분석합니다.

**특징:**
- AuthContext, Guard, Redirect 없이 순수한 API 테스트
- 모든 상태를 JSON으로 화면에 노출
- 타임라인 시각화

**사용법:**
1. `https://{domain}/__debug__/login` 접속
2. 테스트 계정 입력 후 "Run Login Probe" 클릭
3. 결과 확인 (Timeline, API Calls, Role Mapping)
4. "Copy JSON" 클릭하여 결과 복사
5. Claude Code에 JSON 전달하여 분석 요청

**분석 가능 항목:**
- 로그인 API 응답 시간
- 역할 매핑 결과
- 세션 확인 API (me) 호출 시간
- 총 로그인 소요 시간

### 2. 네비게이션 프로브 (`/__debug__/navigation`)

React Router 네비게이션 동작을 테스트합니다.

**특징:**
- NavLink, Link, useNavigate 동작 비교
- URL 변경 여부 확인
- 라우팅 문제 격리

**사용법:**
1. `https://{domain}/__debug__/navigation` 접속
2. 각 네비게이션 방식(NavLink/Link/useNavigate) 테스트
3. 결과 확인 (성공/실패)
4. "Copy JSON" 클릭하여 결과 복사

### 3. API 프로브 (`/__debug__/api`)

API 엔드포인트 성능과 응답을 개별적으로 테스트합니다.

**특징:**
- 모든 API 엔드포인트 개별 테스트
- 응답 시간 측정
- 인증 토큰 관리

**사용법:**
1. `https://{domain}/__debug__/api` 접속
2. 토큰 로드 (localStorage에서 자동 로드)
3. "Run All Tests" 또는 개별 테스트 실행
4. 결과 확인 (Status, Duration, Response)
5. "Copy Summary" 클릭하여 요약 복사

---

## @o4o/debug 패키지 사용법

### 설치

```bash
pnpm add @o4o/debug
```

### 기본 사용

```typescript
import { probe } from '@o4o/debug';

// 세션 시작
probe.startSession('login');

// 타임라인 마크
probe.mark('step1:start');
await someAsyncWork();
probe.mark('step1:end');

// API 추적
probe.trackApiStart('/api/v1/auth/login', 'POST');
const response = await fetch('/api/v1/auth/login', { ... });
probe.trackApiEnd('/api/v1/auth/login', response.status);

// 세션 종료
probe.endSession();

// 결과 출력
console.log(probe.exportSession());
```

### React 컴포넌트 사용

```tsx
import {
  DebugPageLayout,
  DebugPanel,
  JsonDisplay,
  useDebugTest
} from '@o4o/debug/react';

function MyDebugPage() {
  const { runTest, isRunning, result, session } = useDebugTest(
    async () => {
      // 테스트 로직
      return await someTestFunction();
    },
    { config: { name: 'my-test' } }
  );

  return (
    <DebugPageLayout title="My Debug Page">
      <button onClick={runTest} disabled={isRunning}>
        Run Test
      </button>
      {result && <JsonDisplay data={result} title="Result" />}
    </DebugPageLayout>
  );
}
```

### 브라우저 콘솔에서 직접 접근

```javascript
// 전체 상태
window.__PROBE__

// probe 함수들
window.__DEBUG__.probe.startSession('test');
window.__DEBUG__.probe.mark('step1');
window.__DEBUG__.probe.endSession();
window.__DEBUG__.probe.logSessionSummary();

// 모든 세션
window.__DEBUG__.sessions
```

---

## Playwright 테스트 스크립트

### 설치

```bash
pnpm add -D playwright @playwright/test
npx playwright install chromium
```

### 기본 테스트 스크립트

```javascript
// test-auth.mjs
import { chromium } from 'playwright';

const BASE_URL = 'https://glycopharm.co.kr';

async function testAuth() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // 콘솔 로그 캡처
  page.on('console', msg => {
    console.log(`[Console] ${msg.type()}: ${msg.text()}`);
  });

  // 네트워크 응답 캡처
  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`[API] ${response.status()} ${response.url()}`);
    }
  });

  // 테스트 실행
  await page.goto(`${BASE_URL}/login`);
  // ... 테스트 로직

  await browser.close();
}

testAuth();
```

### 실행

```bash
node test-auth.mjs
```

---

## Claude Code에 디버깅 결과 전달하기

### 1. 디버그 페이지 결과 전달

```
다음은 /__debug__/login 페이지의 테스트 결과입니다:

{
  "sessionName": "login-probe",
  "totalDuration": 1234.56,
  "timeline": [...],
  "apiCalls": [...],
  "userRole": "customer",
  "mappedRole": "pharmacy"
}

이 결과를 분석하여 다음을 확인해 주세요:
1. 병목 지점이 있는지
2. 불필요한 API 호출이 있는지
3. 역할 매핑이 올바른지
```

### 2. Playwright 테스트 결과 전달

```
Playwright 테스트 결과입니다:

[API] 200 https://api.neture.co.kr/api/v1/auth/login
[Console] log: User role: customer
[Console] log: Mapped role: pharmacy

현재 URL: https://glycopharm.co.kr/pharmacy
네비게이션 성공 여부: true

이 결과를 바탕으로 네비게이션 문제를 분석해 주세요.
```

---

## 디버그 페이지 추가 방법

### 새 디버그 페이지 생성

1. `src/pages/__debug__/` 폴더에 새 페이지 생성

```tsx
// src/pages/__debug__/MyProbePage.tsx
export default function MyProbePage() {
  // ... 구현
}
```

2. `src/pages/__debug__/index.ts`에 export 추가

```typescript
export { default as MyProbePage } from './MyProbePage';
```

3. `App.tsx`에 라우트 추가

```tsx
<Route path="__debug__">
  <Route path="my-probe" element={<MyProbePage />} />
</Route>
```

### 디버그 페이지 설계 원칙

1. **AuthContext/Guard 없이 구현** - 순수한 테스트 환경
2. **모든 상태를 JSON으로 노출** - AI 분석 용이
3. **타임라인/성능 측정 포함** - 병목 지점 식별
4. **Copy 버튼 제공** - 결과 공유 용이

---

## 서비스별 디버그 URL

| 서비스 | 로그인 프로브 | 네비게이션 프로브 | API 프로브 |
|--------|---------------|-------------------|------------|
| GlycoPharm | `/__debug__/login` | `/__debug__/navigation` | `/__debug__/api` |
| GlucoseView | (추가 예정) | (추가 예정) | (추가 예정) |
| Neture | (추가 예정) | (추가 예정) | (추가 예정) |

---

## 문제 해결 체크리스트

### 로그인이 안 될 때

1. `/__debug__/login`에서 테스트
2. API 응답 상태 확인 (200/401/500)
3. 역할 매핑 확인 (userRole → mappedRole)
4. 토큰 저장 확인 (localStorage)

### 네비게이션이 안 될 때

1. `/__debug__/navigation`에서 테스트
2. NavLink/Link/useNavigate 동작 비교
3. URL 변경 여부 확인
4. ProtectedRoute 조건 확인

### API가 느릴 때

1. `/__debug__/api`에서 전체 테스트
2. 느린 엔드포인트 식별
3. Cold start 여부 확인
4. 불필요한 API 호출 확인

---

*Last Updated: 2026-01-06*
