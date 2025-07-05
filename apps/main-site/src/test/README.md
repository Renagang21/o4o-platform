# 테스트 환경 가이드

## 📋 개요

O4O Platform main-site를 위한 종합적인 테스트 환경입니다. Vitest, React Testing Library, MSW를 활용한 현대적인 테스트 스택을 제공합니다.

## 🛠️ 설치된 테스트 도구

### 핵심 테스트 프레임워크
- **Vitest 2.1.9**: 빠른 테스트 실행과 HMR 지원
- **jsdom**: 브라우저 환경 시뮬레이션
- **@testing-library/react**: React 컴포넌트 테스트
- **@testing-library/jest-dom**: 추가 matcher 제공
- **@testing-library/user-event**: 사용자 상호작용 시뮬레이션

### 모킹 도구
- **MSW (Mock Service Worker)**: API 모킹
- **@vitest/coverage-v8**: 코드 커버리지 분석

## 📁 테스트 파일 구조

```
src/test/
├── README.md              # 이 파일
├── setup.ts               # 전역 테스트 설정
├── utils.tsx              # 테스트 유틸리티 (providers 래핑)
├── simple.test.ts         # 기본 테스트 예제
├── example.test.tsx       # React 컴포넌트 테스트 예제
└── mocks/
    ├── server.ts          # MSW 서버 설정
    └── handlers.ts        # API 핸들러 정의
```

## 🚀 테스트 실행 명령어

### 기본 명령어
```bash
# 모든 테스트 실행 (watch 모드)
npm run test

# 단위 테스트 실행 (일회성)
npm run test:unit

# 간단한 테스트만 실행 (Node 환경)
npm run test:simple

# 커버리지 포함 테스트
npm run test:coverage

# 테스트 UI 실행
npm run test:ui
```

### 루트에서 실행
```bash
# 모든 앱의 테스트 실행
npm run test:all

# main-site만 테스트
cd apps/main-site && npm run test
```

## 📝 테스트 작성 가이드

### 1. 기본 단위 테스트
```typescript
import { describe, it, expect } from 'vitest'

describe('Utils', () => {
  it('should format currency correctly', () => {
    const result = formatCurrency(1000)
    expect(result).toBe('₩1,000')
  })
})
```

### 2. React 컴포넌트 테스트
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '../utils' // 우리의 커스텀 render

const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
)

describe('Button Component', () => {
  it('renders and handles clicks', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button')
    expect(button).toHaveTextContent('Click me')
    
    await fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledOnce()
  })
})
```

### 3. API 모킹 활용
```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

describe('API Integration', () => {
  it('handles API errors gracefully', () => {
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json(
          { error: 'Server Error' },
          { status: 500 }
        )
      })
    )
    
    // 에러 상황 테스트...
  })
})
```

## ⚙️ 설정 파일 설명

### vitest.config.ts (완전한 테스트 환경)
- jsdom 환경으로 브라우저 API 시뮬레이션
- React Testing Library와 MSW 통합
- 코드 커버리지 설정

### vitest.config.simple.ts (경량 테스트 환경)
- Node 환경에서 빠른 실행
- 기본 로직 테스트에 적합
- 무거운 React/DOM 의존성 없음

## 🎯 모범 사례

### 1. 테스트 격리
- 각 테스트는 독립적으로 실행되어야 함
- `afterEach`에서 cleanup 수행
- 전역 상태 초기화

### 2. 의미 있는 테스트
```typescript
// ❌ 구현 세부사항 테스트
expect(component.state.isLoading).toBe(true)

// ✅ 사용자 관점에서 테스트
expect(screen.getByText('Loading...')).toBeInTheDocument()
```

### 3. 비동기 처리
```typescript
// waitFor 사용으로 비동기 상태 변화 대기
await waitFor(() => {
  expect(screen.getByText('Data loaded')).toBeInTheDocument()
})
```

## 🔧 문제 해결

### 일반적인 이슈

1. **테스트 타임아웃**
   - `vitest.config.ts`에서 `testTimeout` 조정
   - 무거운 컴포넌트는 `test:simple` 사용

2. **모듈 해상도 오류**
   - `vitest.config.ts`의 `resolve.alias` 확인
   - 패키지 경로가 올바른지 검증

3. **React 19 호환성**
   - `--legacy-peer-deps` 플래그 사용
   - 최신 버전의 testing-library 사용

### 디버깅 팁
```bash
# 특정 테스트 파일만 실행
npx vitest run src/components/Button.test.tsx

# 디버그 모드로 실행
npx vitest --reporter=verbose

# UI에서 시각적으로 확인
npm run test:ui
```

## 📈 커버리지 목표

- **단위 테스트**: 80% 이상
- **통합 테스트**: 주요 사용자 플로우 커버
- **E2E 테스트**: 핵심 비즈니스 로직

## 🚀 다음 단계

1. **API 서비스** 테스트 추가
2. **Zustand 스토어** 테스트 구현  
3. **React Router** 네비게이션 테스트
4. **E2E 테스트** Playwright 설정

---

이 테스트 환경은 O4O Platform의 코드 품질과 안정성을 보장하기 위한 기반입니다. 새로운 기능 개발 시 테스트를 함께 작성해주세요.