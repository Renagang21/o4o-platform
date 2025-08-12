# O4O Platform - 프로젝트 가이드

## 작업 환경
**현재 작업 환경: WSL2 (Windows Subsystem for Linux 2) - 로컬 환경**
- 이 환경은 로컬 개발 환경입니다
- 빌드, 테스트, 커밋 등 모든 작업을 직접 수행할 수 있습니다
- 서버가 아닌 로컬에서 작업 중입니다

## 프로젝트 구조
O4O Platform은 모노레포 구조로 구성된 대규모 플랫폼입니다.

### 주요 디렉토리
- `apps/` - 애플리케이션들
  - `admin-dashboard/` - 어드민 대시보드
  - `api-server/` - API 서버 
  - `crowdfunding/` - 크라우드펀딩 앱
  - `ecommerce/` - 이커머스 앱
  - `forum/` - 포럼 앱
  - `main-site/` - 메인 사이트
  - `digital-signage/` - 디지털 사이니지
- `packages/` - 공유 패키지들
  - `types/` - 공유 타입 정의
  - `utils/` - 유틸리티 함수
  - `ui/` - UI 컴포넌트
  - `auth-client/` - 인증 클라이언트
  - `auth-context/` - 인증 컨텍스트

## 빌드 관리

### 📌 중요: 빌드 및 배포 프로세스
**vite.config.ts나 소스 코드를 수정한 경우 반드시 다시 빌드해야 합니다.**

현재 작업 환경(WSL2)은 로컬이므로 직접 빌드를 실행할 수 있고, 실행해야 합니다:

1. **코드 수정 후 반드시 로컬에서 빌드 실행**
2. **dist 폴더를 git에 포함하여 커밋**
3. **GitHub으로 푸시**
4. **웹서버에서 pull하여 배포**

⚠️ **주의: dist/index.html만 수정하는 것은 불완전합니다. 전체 빌드를 다시 실행해야 합니다.**

### 빌드 명령어
```bash
# 전체 프로젝트 빌드
npm run build

# 개별 앱 빌드
npm run build:api        # API 서버
npm run build:main-site  # 메인 사이트
npm run build:admin      # 어드민 대시보드
npm run build:ecommerce  # 이커머스
npm run build:crowdfunding # 크라우드펀딩
npm run build:forum      # 포럼
npm run build:signage    # 디지털 사이니지
```

### dist 폴더 위치
빌드가 완료되면 각 앱의 dist 폴더가 생성됩니다:
- `/apps/main-site/dist` - 메인 사이트 빌드 결과
- `/apps/admin-dashboard/dist` - 어드민 대시보드 빌드 결과
- `/apps/api-server/dist` - API 서버 빌드 결과
- `/apps/ecommerce/dist` - 이커머스 빌드 결과
- `/apps/crowdfunding/dist` - 크라우드펀딩 빌드 결과
- `/apps/forum/dist` - 포럼 빌드 결과
- `/apps/digital-signage/dist` - 디지털 사이니지 빌드 결과

### 배포 프로세스
1. 로컬에서 빌드 실행: `npm run build`
2. 생성된 dist 폴더를 웹서버로 업로드
3. 웹서버에서 적절한 위치에 배포

## 개발 환경

### 필수 요구사항
- Node.js >= 22.18.0
- npm >= 10.9.3

### 개발 서버 실행
```bash
# 주요 앱들 동시 실행
npm run dev

# 개별 앱 실행
npm run dev:api         # API 서버
npm run dev:web         # 메인 사이트
npm run dev:admin       # 어드민 대시보드
npm run dev:ecommerce   # 이커머스
npm run dev:crowdfunding # 크라우드펀딩
npm run dev:signage     # 디지털 사이니지
```

## 코드 품질 관리

### 타입 체크
```bash
npm run type-check
```

### 린트
```bash
npm run lint
npm run lint:fix  # 자동 수정
```

### 테스트

#### 로컬 환경에서 테스트 실행
서버의 npm 타임아웃 문제로 인해 테스트는 **반드시 로컬 환경에서 실행**해야 합니다:

```bash
# 로컬에서 의존성 설치
npm install

# 전체 테스트 실행
npm run test

# 워크스페이스별 테스트
npm run test --workspace=@o4o/admin-dashboard
npm run test --workspace=@o4o/api-server
npm run test --workspace=@o4o/main-site

# E2E 테스트
npm run test:e2e
```

**주의사항:**
- CI/CD 환경에서 npm 설치 타임아웃이 발생할 수 있으므로, 테스트는 로컬에서 수행하고 결과를 확인하세요
- 테스트 의존성(vitest, jest)이 제대로 설치되지 않으면 `npm install`을 다시 실행하세요

## 주의사항
- TypeScript 버전은 5.9.2로 고정되어 있습니다
- React 버전은 19.1.1을 사용합니다
- 빌드 시 메모리 사용량이 많으므로 `--max-old-space-size=8192` 옵션이 적용됩니다

## Git 관리
- main 브랜치가 기본 브랜치입니다
- 커밋 전 반드시 타입 체크와 린트를 실행하세요

## 최근 업데이트
- 2025-08-12: API 서버 TypeScript 타입 오류 수정 완료
- 2025-08-12: 로컬 빌드 및 dist 폴더 관리 방식으로 변경