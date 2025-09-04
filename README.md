# O4O Platform

## 📋 프로젝트 개요

O4O Platform은 모던 웹 기술을 활용한 통합 이커머스 및 커뮤니티 플랫폼입니다.

### 주요 기능
- 🛒 이커머스 스토어프론트
- 👤 관리자 대시보드
- 🔌 REST API 서버
- 📦 재사용 가능한 공유 패키지

### 기술 스택
- **Frontend**: React 18, Vite, TypeScript
- **Backend**: Node.js, Express, TypeORM
- **Database**: PostgreSQL
- **Process Manager**: PM2
- **Node Version**: 22.18.0
- **Package Manager**: npm 10.9.3

## 🏗️ 워크스페이스 구조

```
o4o-platform/
├── apps/                    # 애플리케이션
│   ├── admin-dashboard/     # 관리자 대시보드
│   ├── api-server/         # REST API 서버
│   ├── main-site/          # 메인 사이트
│   └── storefront/         # 스토어프론트
├── packages/               # 공유 패키지
│   ├── auth-client/        # 인증 클라이언트
│   ├── auth-context/       # 인증 컨텍스트
│   ├── types/             # 공통 타입 정의
│   ├── ui/                # UI 컴포넌트
│   └── utils/             # 유틸리티 함수
├── scripts/               # 빌드 및 배포 스크립트
│   ├── development/       # 개발 도구
│   ├── deployment/        # 배포 스크립트
│   └── testing/          # 테스트 도구
├── config/               # 설정 템플릿
│   ├── env-templates/    # 환경변수 템플릿
│   ├── pm2-templates/    # PM2 설정 템플릿
│   └── systemd/          # systemd 서비스
└── docs/                 # 프로젝트 문서
    ├── guides/           # 가이드 문서
    ├── reports/          # 분석 보고서
    └── setup/            # 설정 문서
```

### 환경별 워크스페이스 최적화
- **로컬 개발**: 13개 워크스페이스 (전체 스택)
- **웹서버**: 9개 워크스페이스 (31% 최적화)
- **API서버**: 2개 워크스페이스 (85% 최적화)

## 🚀 빠른 시작

### 사전 요구사항
- Node.js 22.18.0 이상
- npm 10.9.3 이상
- PostgreSQL 14 이상

### 설치
```bash
# 저장소 클론
git clone https://github.com/your-org/o4o-platform.git
cd o4o-platform

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
# .env.local 파일 편집하여 설정 입력
```

### 실행

#### 자동 환경 감지 실행
```bash
# 환경 자동 감지하여 실행
pnpm run start

# 개발 모드 (hot reload)
pnpm run dev
```

#### 환경별 실행
```bash
# 로컬 개발 환경
pnpm run pm2:start:local

# 웹서버 환경
pnpm run pm2:start:webserver

# API 서버 환경
pnpm run pm2:start:apiserver
```

### 빌드
```bash
# 환경 자동 감지 빌드
node scripts/environments/build.cjs

# 전체 빌드
pnpm run build

# 패키지만 빌드
pnpm run build:packages

# 앱만 빌드
pnpm run build:apps
```

## 📁 scripts/ 시스템 (Phase 4)

### 환경 자동 감지
시스템이 자동으로 실행 환경을 감지합니다:
1. `SERVER_TYPE` 환경변수 확인
2. PM2 설정 파일 존재 확인
3. `.env` 파일 확인
4. 기본값: `local`

### 주요 스크립트
```bash
# 환경 확인
node scripts/common/detectEnvironment.cjs

# 워크스페이스 구성 확인
node scripts/common/workspaceConfig.cjs

# 빌드 (환경 자동 최적화)
node scripts/environments/build.cjs [options]
  --clean              # 클린 빌드
  --continue-on-error  # 에러 무시

# 시작
node scripts/environments/start.cjs [options]
  --dev    # 개발 모드
  --status # 상태 확인
  --logs   # 로그 표시

# 배포
node scripts/environments/deploy.cjs [options]
  --force         # 강제 배포
  --auto-rollback # 자동 롤백
  --skip-tests    # 테스트 건너뛰기
```

## 🔧 개발 가이드

### 환경 설정
```bash
# 로컬 개발
.env.local

# 웹서버 (프론트엔드)
.env.webserver

# API 서버 (백엔드)
.env.apiserver
```

### 워크스페이스 개발

#### 새 패키지 추가
```bash
# packages/ 폴더에 새 패키지 생성
mkdir packages/new-package
cd packages/new-package
npm init

# 루트 package.json의 workspaces에 자동 포함됨
```

#### 의존성 관리
```bash
# 특정 워크스페이스에 의존성 추가
pnpm install <package> --workspace=@o4o/<workspace-name>

# 로컬 패키지 참조
pnpm install @o4o/types --workspace=@o4o/admin-dashboard
```

### 코드 품질 관리
```bash
# TypeScript 타입 체크
pnpm run type-check

# ESLint 검사
pnpm run lint

# 자동 수정
pnpm run lint:fix

# 테스트 실행
npm test
```

## 🏛️ 아키텍처

### 환경별 구성
| 환경 | 용도 | 워크스페이스 | 최적화 |
|------|------|-------------|--------|
| **로컬** | 전체 개발 | 13개 | - |
| **웹서버** | 프론트엔드 | 9개 | 31% |
| **API서버** | 백엔드 | 2개 | 85% |

### 성능 최적화 성과
- ✅ **동기화 시간**: 95-98% 단축
- ✅ **빌드 시간**: 환경별 선택적 빌드로 최적화
- ✅ **리소스 사용**: 환경별 필요 워크스페이스만 로드

## 🔄 배포 프로세스

### 일반적인 배포 흐름
1. **로컬 개발** → 기능 개발 및 테스트
2. **Git Push** → feature 브랜치에 푸시
3. **Pull Request** → 코드 리뷰
4. **Merge** → main 브랜치에 병합
5. **자동 배포** → 환경별 자동 최적화 적용

### PM2 관리
```bash
# 프로세스 상태 확인
pm2 list

# 로그 확인
pm2 logs

# 재시작
pm2 restart all

# 중지
pm2 stop all
```

## 🧪 테스트

### 테스트 실행
```bash
# 전체 테스트
npm test

# 타입 체크
pnpm run type-check

# 린트 검사
pnpm run lint
```

### 환경별 테스트 전략
- **로컬**: 통합 테스트 및 E2E 테스트
- **웹서버**: 프론트엔드 단위 테스트
- **API서버**: API 통합 테스트

## 📚 추가 문서

프로젝트 관련 상세 문서:
- `WORKSPACE_STRUCTURE_ANALYSIS_REPORT.md` - 워크스페이스 분석
- `SCRIPTS_CENTRALIZATION_REPORT.md` - Phase 4 스크립트 시스템
- `scripts/README.md` - 스크립트 시스템 상세 가이드

## 🤝 기여 방법

### 개발 프로세스
1. 이슈 생성 또는 선택
2. Feature 브랜치 생성 (`feature/issue-number-description`)
3. 로컬에서 개발 및 테스트
4. 커밋 메시지 규칙 준수
5. Pull Request 생성
6. 코드 리뷰 후 병합

### 커밋 메시지 규칙
```
type(scope): description

- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 포맷팅
- refactor: 코드 리팩토링
- test: 테스트 추가
- chore: 빌드 관련 수정
```

### 코딩 컨벤션
- TypeScript 사용
- ESLint 규칙 준수
- Prettier 포맷팅 적용
- 테스트 코드 작성 필수

## 🐛 트러블슈팅

### 일반적인 문제 해결

#### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3001  # API
lsof -i :5173  # Admin
lsof -i :5174  # Storefront

# 프로세스 종료
kill -9 [PID]
```

#### 빌드 실패
```bash
# 캐시 정리 후 재설치
pnpm run clean
rm -rf node_modules package-lock.json
pnpm install
pnpm run build:packages
```

#### 메모리 부족
```bash
# Node.js 메모리 증가
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm run build
```

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](./LICENSE) 파일 참조

## 📞 지원

- 이슈 트래커: GitHub Issues
- 문서: 프로젝트 내 문서 참조

---

*O4O Platform - Modern E-commerce & Community Platform*
*Version: 1.0.0*
*Last Updated: 2025년 8월*# Auto deployment test at Thu Sep  4 02:39:49 AM UTC 2025
