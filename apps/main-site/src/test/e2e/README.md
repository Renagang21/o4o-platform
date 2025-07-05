# E2E 테스트 가이드

## 개요

이 디렉토리는 O4O 플랫폼의 메인 사이트에 대한 End-to-End (E2E) 테스트를 포함합니다. 
Playwright를 사용하여 실제 브라우저에서 사용자 시나리오를 자동화하고 검증합니다.

## 테스트 구조

### 📁 테스트 파일

- **`auth.spec.ts`** - SSO 인증 시스템 테스트
  - 로그인/로그아웃 플로우
  - 토큰 자동 갱신
  - 세션 지속성
  - 권한 기반 접근 제어

- **`protected-routes.spec.ts`** - 보호된 라우트 접근 제어 테스트
  - 미인증 사용자 리다이렉트
  - 역할 기반 페이지 접근
  - 권한 없음 처리

- **`user-workflows.spec.ts`** - 실제 사용자 워크플로우 테스트
  - 홈페이지 → 로그인 → 대시보드 플로우
  - 프로필 관리
  - 네비게이션 테스트
  - 반응형 디자인

### 🔧 설정 파일

- **`global-setup.ts`** - 테스트 환경 초기화
  - API/웹 서버 연결 확인
  - 테스트 계정 생성

- **`global-teardown.ts`** - 테스트 후 정리

## 사용법

### 🚀 테스트 실행

```bash
# 모든 E2E 테스트 실행
npm run test:e2e

# UI 모드로 테스트 실행 (디버깅에 유용)
npm run test:e2e:ui

# 브라우저를 보면서 테스트 실행
npm run test:e2e:headed

# 특정 테스트 파일만 실행
npm run test:e2e auth.spec.ts

# 디버그 모드로 테스트 실행
npm run test:e2e:debug

# 테스트 결과 리포트 보기
npm run test:e2e:report
```

### 📋 테스트 계정

E2E 테스트에서 사용하는 테스트 계정들:

```typescript
// 관리자 계정
{
  email: 'test-admin@neture.co.kr',
  password: 'TestAdmin123!',
  role: 'admin'
}

// 일반 사용자 계정
{
  email: 'test-user@neture.co.kr',
  password: 'TestUser123!',
  role: 'customer'
}
```

> **참고**: 이 계정들은 `global-setup.ts`에서 자동으로 생성됩니다.

### 🌐 브라우저 지원

기본적으로 다음 브라우저에서 테스트합니다:

- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5 시뮬레이션)

## 테스트 시나리오

### 🔐 인증 테스트 (`auth.spec.ts`)

1. **로그인 페이지 UI 확인**
   - 로고, 폼 요소, SSO 안내 메시지
   - 개발 환경 테스트 계정 정보

2. **SSO 로그인 플로우**
   - 관리자/사용자 계정별 로그인
   - 로그인 후 적절한 페이지 리다이렉트
   - 인증 상태 표시

3. **로그인 실패 처리**
   - 잘못된 자격증명 처리
   - 에러 메시지 표시

4. **토큰 관리**
   - 자동 토큰 갱신
   - 세션 지속성
   - 다중 탭 세션 공유

### 🛡️ 보호된 라우트 테스트 (`protected-routes.spec.ts`)

1. **미인증 사용자 처리**
   - 보호된 페이지 접근 시 로그인 페이지 리다이렉트
   - 로그인 후 원래 페이지로 복귀

2. **역할 기반 접근 제어**
   - 관리자 전용 페이지 접근 제한
   - 권한 없음 페이지 표시

3. **세션 관리**
   - 세션 만료 시 처리
   - 로딩 상태 표시

### 👤 사용자 워크플로우 테스트 (`user-workflows.spec.ts`)

1. **완전한 사용자 여정**
   - 홈페이지 → 로그인 → 대시보드
   - 테스트 기능 접근 및 사용

2. **관리자 워크플로우**
   - 관리자 대시보드 접근
   - 관리 기능 사용

3. **반응형 디자인**
   - 모바일에서의 전체 플로우
   - 터치 인터랙션

## 환경 설정

### 🔧 필수 조건

E2E 테스트 실행 전에 다음 서비스가 실행되어야 합니다:

1. **API 서버** (`http://localhost:4000`)
   ```bash
   cd ../api-server
   npm run dev
   ```

2. **웹 서버** (`http://localhost:3000`)
   ```bash
   npm run dev
   ```

> **자동 실행**: `playwright.config.ts`에서 `webServer` 설정으로 자동으로 서버를 시작합니다.

### 🗄️ 데이터베이스

테스트는 개발 환경 데이터베이스를 사용합니다. 
테스트 계정은 자동으로 생성되며, 기존 데이터를 손상시키지 않습니다.

## 디버깅

### 🐛 테스트 실패 시

1. **스크린샷 확인**
   ```bash
   # test-results 폴더에 실패 시점 스크린샷 저장
   ls test-results/
   ```

2. **비디오 재생**
   ```bash
   # 실패한 테스트의 비디오 확인
   npm run test:e2e:report
   ```

3. **디버그 모드 실행**
   ```bash
   # 단계별로 테스트 실행
   npm run test:e2e:debug auth.spec.ts
   ```

### 📊 CI/CD 환경

GitHub Actions에서 E2E 테스트를 실행할 때:

- 헤드리스 모드로 실행
- 실패 시 스크린샷과 비디오 아티팩트 저장
- JSON 리포트 생성

## 기여 가이드

### 새로운 E2E 테스트 추가

1. **테스트 파일 생성**
   ```bash
   # 새로운 기능에 대한 테스트 파일
   touch src/test/e2e/new-feature.spec.ts
   ```

2. **테스트 구조 따르기**
   ```typescript
   import { test, expect } from '@playwright/test';
   
   test.describe('새로운 기능', () => {
     test.beforeEach(async ({ page }) => {
       // 각 테스트 전 초기화
     });
   
     test('기본 시나리오', async ({ page }) => {
       // 테스트 로직
     });
   });
   ```

3. **헬퍼 함수 재사용**
   - `loginUser()` - 사용자 로그인
   - `logoutUser()` - 사용자 로그아웃
   - 테스트 계정 상수 사용

### 모범 사례

1. **안정적인 셀렉터 사용**
   ```typescript
   // ✅ 좋음
   page.locator('[data-testid="login-button"]')
   page.locator('button[type="submit"]')
   
   // ❌ 피하기
   page.locator('.btn-primary') // CSS 클래스는 변경될 수 있음
   ```

2. **적절한 대기**
   ```typescript
   // ✅ 좋음
   await page.waitForLoadState('networkidle');
   await expect(page.locator('text=대시보드')).toBeVisible();
   
   // ❌ 피하기
   await page.waitForTimeout(5000); // 하드코딩된 대기
   ```

3. **환경별 테스트**
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     // 개발 환경에서만 실행되는 테스트
   }
   ```

## 문제 해결

### 일반적인 문제

1. **서버 연결 실패**
   - API/웹 서버가 실행 중인지 확인
   - 포트 충돌 확인 (3000, 4000)

2. **테스트 계정 생성 실패**
   - 데이터베이스 연결 확인
   - 중복 계정 오류는 정상 (이미 존재)

3. **타임아웃 오류**
   - 네트워크 속도 확인
   - `playwright.config.ts`에서 타임아웃 조정

### 로그 확인

```bash
# Playwright 디버그 로그
DEBUG=pw:api npm run test:e2e

# 자세한 브라우저 로그
npm run test:e2e -- --reporter=line
```

---

이 E2E 테스트 스위트는 O4O 플랫폼의 품질을 보장하고 사용자 경험을 검증하는 중요한 도구입니다. 
새로운 기능 개발 시 해당 기능에 대한 E2E 테스트도 함께 추가해 주세요.