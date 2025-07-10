# O4O Platform - E2E 테스트 실행 가이드

## 🎯 E2E 테스트 개요

WordPress 스타일 관리자 UI/UX 기반 구축의 핵심 기능들을 검증하는 E2E 테스트가 완성되었습니다.

### 📋 테스트 시나리오

#### 🔐 **인증 및 권한 제어 테스트**
1. **관리자 계정 정상 로그인** → 대시보드 접근 성공
2. **일반 사용자 접근 거부** → 권한 없음 페이지 표시 → 메인사이트 리디렉션
3. **미인증 사용자 차단** → 모든 보호된 경로에서 로그인 페이지로 리디렉션
4. **메인사이트 진입점** → 관리자 링크 클릭 → 관리자 대시보드 이동
5. **로그아웃 기능** → 세션 종료 → 보호된 페이지 접근 차단
6. **세션 지속성** → 페이지 새로고침/다른 탭에서도 로그인 상태 유지
7. **권한별 메뉴 표시** → 관리자 권한에 따른 메뉴 항목 필터링

#### 🎨 **UI/UX 테스트**
1. **브레드크럼 네비게이션** → 경로 표시 및 클릭 네비게이션
2. **반응형 사이드바** → 모바일에서 햄버거 메뉴 동작
3. **WordPress 스타일 레이아웃** → LNB, 헤더, 메인 콘텐츠 영역

---

## 🚀 테스트 실행 방법

### 1. 사전 준비

#### **필수 서비스 실행**
```bash
# 터미널 1: API 서버 실행
cd /path/to/o4o-platform
npm run dev:api

# 터미널 2: 메인 사이트 실행  
npm run dev:main-site

# 터미널 3: 관리자 대시보드 실행
npm run dev:admin
```

#### **Playwright 설치**
```bash
# Playwright 및 의존성 설치
npm install -D @playwright/test
npx playwright install
```

### 2. 테스트 실행

#### **전체 E2E 테스트 실행**
```bash
npx playwright test
```

#### **특정 브라우저에서 실행**
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

#### **헤드리스 모드 비활성화 (브라우저 창 보기)**
```bash
npx playwright test --headed
```

#### **특정 테스트 파일만 실행**
```bash
npx playwright test tests/e2e/admin-auth.spec.ts
```

#### **디버그 모드**
```bash
npx playwright test --debug
```

### 3. 테스트 결과 확인

#### **HTML 리포트 보기**
```bash
npx playwright show-report
```

#### **실패한 테스트만 재실행**
```bash
npx playwright test --only-failed
```

---

## 📊 예상 테스트 결과

### ✅ **성공 시나리오**

```
관리자 인증 및 권한 제어 E2E 테스트
  ✓ 시나리오 1: 관리자 계정 정상 로그인 및 대시보드 접근
  ✓ 시나리오 2: 일반 사용자 계정 접근 거부  
  ✓ 시나리오 3: 미인증 사용자 접근 시 로그인 페이지로 리디렉션
  ✓ 시나리오 4: 메인 사이트에서 관리자 진입점 테스트
  ✓ 시나리오 5: 로그아웃 기능 테스트
  ✓ 시나리오 6: 세션 지속성 테스트
  ✓ 시나리오 7: 권한별 메뉴 표시 테스트

관리자 대시보드 네비게이션 테스트  
  ✓ 브레드크럼 네비게이션 테스트
  ✓ 사이드바 모바일 반응형 테스트

총 9개 테스트 통과 ✨
```

### 🔍 **각 테스트에서 검증하는 항목**

1. **로그인 플로우**: 이메일/비밀번호 입력 → JWT 토큰 발급 → 인증 상태 저장
2. **권한 검증**: `role === 'admin'` 체크 → 접근 허용/거부 분기
3. **UI 컴포넌트**: 사이드바, 헤더, 브레드크럼, 모바일 메뉴 표시
4. **라우팅**: 보호된 경로 접근 제어 및 리디렉션
5. **세션 관리**: 토큰 지속성 및 자동 로그아웃

---

## 🛠️ 트러블슈팅

### ❌ **일반적인 문제들**

#### **1. 서비스 연결 실패**
```
Error: API 서버가 응답하지 않습니다
```
**해결방법**: 
- `npm run dev:api` 실행 확인
- `http://localhost:4000/health` 접속 테스트

#### **2. 테스트 계정 생성 실패**
```
Error: 테스트 관리자 계정 생성 실패
```
**해결방법**:
- 데이터베이스 연결 확인
- API 서버 `/auth/register` 엔드포인트 동작 확인

#### **3. 브라우저 실행 실패**
```
Error: Executable doesn't exist at /path/to/browser
```
**해결방법**:
```bash
npx playwright install
```

#### **4. 포트 충돌**
```
Error: Port 3000 is already in use
```
**해결방법**:
- 실행 중인 프로세스 종료
- 다른 포트로 변경

### 🔧 **커스텀 설정**

#### **테스트 타임아웃 조정**
```typescript
// playwright.config.ts
export default defineConfig({
  timeout: 60000, // 60초로 연장
  expect: {
    timeout: 15000, // 15초로 연장
  }
})
```

#### **환경별 설정**
```bash
# 개발환경
MAIN_SITE_URL=http://localhost:3000 npx playwright test

# 스테이징환경  
MAIN_SITE_URL=https://staging.neture.co.kr npx playwright test
```

---

## 📈 지속적 통합 (CI)

### GitHub Actions 설정 예시

```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Install Playwright
        run: npx playwright install --with-deps
        
      - name: Start services
        run: |
          npm run dev:api &
          npm run dev:main-site &
          npm run dev:admin &
          sleep 10
          
      - name: Run E2E tests
        run: npx playwright test
        
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: test-results/
```

---

## 🎯 다음 단계

이 E2E 테스트 기반을 통해 다음 기능들을 안전하게 개발할 수 있습니다:

1. **Post 메뉴 구현** → 새 기능 추가 시 기존 인증 플로우가 깨지지 않음을 보장
2. **Page 관리 시스템** → 권한 제어 로직 재사용 가능  
3. **Tiptap 에디터 통합** → 기본 레이아웃과 자연스럽게 융합
4. **고급 권한 시스템** → 현재 기반 위에 세밀한 권한 제어 추가

**"기반이 튼튼하면 그 위에 무엇을 올려도 안전하다"** ✨