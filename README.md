# 🚀 O4O Platform - Cursor 1.0 Enhanced

> **Next-Generation Development with Cursor 1.0 Integration**  
> 마이크로서비스 아키텍처 기반의 플랫폼 with AI-powered development workflow

[![Cursor 1.0](https://img.shields.io/badge/Cursor-1.0-blue)](https://cursor.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.1+-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-blue)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://postgresql.org/)

## 📋 목차

- [✨ 주요 기능](#-주요-기능)
- [🎯 Cursor 1.0 통합](#-cursor-10-통합)
- [🚀 빠른 시작](#-빠른-시작)
- [🏗️ 프로젝트 구조](#️-프로젝트-구조)
- [🛠️ 개발 환경 설정](#️-개발-환경-설정)
- [📋 사용 가능한 스크립트](#-사용-가능한-스크립트)
- [🧪 테스트](#-테스트)
- [🚀 배포](#-배포)
- [🤝 기여하기](#-기여하기)

## ✨ 주요 기능

### 🏗️ **마이크로서비스 아키텍처**
- **API 서버**: Express + TypeScript + PostgreSQL
- **웹 애플리케이션**: React + Vite + TypeScript
- **AI 서비스 통합**: Python AI 서비스와 연동
- **컨테이너화**: Docker 기반 배포

### 🤖 **AI-Powered Development**
- **OCR 처리**: 이미지에서 텍스트 추출
- **이미지 분석**: 객체 감지 및 장면 분석
- **텍스트 생성**: LLM 기반 콘텐츠 생성
- **비동기 처리**: Redis 큐를 통한 작업 관리

### 🔐 **보안 & 인증**
- JWT 토큰 기반 인증
- Role-based 접근 제어
- API Rate Limiting
- CORS 설정

## 🎯 Cursor 1.0 통합

### 🆕 **새로운 Cursor 1.0 기능 활용**

#### **🤖 BugBot - 자동 코드 리뷰**
- PR에서 자동으로 버그와 이슈 탐지
- GitHub PR에 자동 코멘트 작성
- "Fix in Cursor" 원클릭 수정

#### **🧠 Background Agent - 지능형 코딩 어시스턴트**
```bash
# Background Agent 활성화
Cmd/Ctrl + E
```

#### **💾 Memories - 프로젝트 패턴 학습**
- 팀 개발 스타일 자동 학습
- 코드베이스 전반의 컨텍스트 유지
- 일관된 코딩 패턴 제안

#### **🔌 MCP (Model Context Protocol) 통합**
- **o4o-filesystem**: 프로젝트 파일 시스템 접근
- **o4o-postgres**: 데이터베이스 직접 쿼리
- **o4o-memory**: 지속적 대화 메모리
- **o4o-github**: Git 저장소 관리

### 📋 **Cursor Rules 시스템**
프로젝트 전용 AI 가이드라인:
- `o4o-architecture.mdc`: 아키텍처 표준
- `backend-dev.mdc`: API 개발 가이드
- `frontend-dev.mdc`: React 컴포넌트 가이드
- `testing-guide.mdc`: 테스트 작성 규칙
- `ai-integration.mdc`: AI 서비스 통합 패턴

## 🚀 빠른 시작

### 📋 **전제 조건**
- **Node.js** 18+ 
- **npm** 9+
- **PostgreSQL** 15+
- **Docker** (선택사항)
- **Cursor** 1.0+ (권장)

### ⚡ **1분 설정 (Cursor 1.0 Enhanced)**

```bash
# 1. 저장소 클론
git clone https://github.com/your-org/o4o-platform.git
cd o4o-platform

# 2. Cursor 1.0 환경 마이그레이션
npm run cursor:migrate

# 3. 의존성 설치 및 환경 설정
npm run install:all
cp .env.example .env

# 4. 스마트 개발 환경 시작 (Cursor 1.0 통합)
npm run dev:smart
```

### 🔧 **수동 설정**

```bash
# 의존성 설치
npm install

# 서비스별 의존성 설치
cd services/api-server && npm install
cd ../main-site && npm install
cd ../..

# 환경변수 설정
cp .env.example .env
# .env 파일 편집 필요

# 데이터베이스 설정
npm run db:migrate

# 개발 서버 시작
npm run dev:all
```

## 🏗️ 프로젝트 구조

```
o4o-platform/
├── 📁 .cursor/                 # Cursor 1.0 설정
│   ├── rules/                  # AI 개발 가이드라인
│   └── mcp.json               # MCP 서버 설정
├── 📁 services/
│   ├── 📁 api-server/         # Express API 서버
│   │   ├── src/
│   │   │   ├── controllers/   # API 컨트롤러
│   │   │   ├── services/      # 비즈니스 로직
│   │   │   ├── entities/      # TypeORM 엔티티
│   │   │   ├── routes/        # API 라우터
│   │   │   └── middleware/    # 미들웨어
│   │   └── tests/            # API 테스트
│   └── 📁 main-site/         # React 웹앱
│       ├── src/
│       │   ├── components/    # React 컴포넌트
│       │   ├── pages/        # 페이지 컴포넌트
│       │   ├── hooks/        # 커스텀 훅
│       │   └── utils/        # 유틸리티
│       └── tests/            # 프론트엔드 테스트
├── 📁 scripts/               # 자동화 스크립트
│   ├── smart-dev-start.js    # 스마트 개발 환경
│   ├── generate-component.js # 컴포넌트 생성기
│   ├── generate-api.js       # API 생성기
│   └── cursor-health-check.js # Cursor 설정 검증
├── 📁 tests/                 # E2E 테스트
└── 📁 docs/                  # 프로젝트 문서
```

## 🛠️ 개발 환경 설정

### 🎯 **Cursor 1.0 최적화 설정**

```bash
# Cursor 설정 동기화
npm run cursor:sync-team

# MCP 서버 설정
npm run setup:mcp

# Git hooks 설정
npm run setup:git-hooks

# 환경 상태 확인
npm run cursor:health-check
```

### 🔧 **환경변수 설정**

```bash
# 데이터베이스
DATABASE_URL=postgresql://localhost:5432/o4o_platform
REDIS_URL=redis://localhost:6379

# JWT 설정
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# AI 서비스
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_API_KEY=your-ai-api-key

# MCP 설정
GITHUB_TOKEN=your-github-token
```

## 📋 사용 가능한 스크립트

### 🚀 **개발 환경**
```bash
npm run dev:smart           # 스마트 개발 환경 (Cursor 1.0 통합)
npm run dev:all            # 모든 서비스 시작
npm run dev:api            # API 서버만 시작
npm run dev:web            # 웹앱만 시작
```

### 🎨 **코드 생성 (Cursor 1.0 Enhanced)**
```bash
# 컴포넌트 생성
npm run cursor:generate-component -- --name UserProfile --type component

# API 엔드포인트 생성
npm run cursor:generate-api -- --resource user --operations create,read,update,delete

# 페이지 생성
npm run cursor:generate-component -- --name Dashboard --type page
```

### 🧪 **테스트**
```bash
npm run test               # 모든 테스트
npm run test:unit          # 단위 테스트
npm run test:integration   # 통합 테스트
npm run test:e2e           # E2E 테스트
npm run test:coverage      # 커버리지 리포트
```

### 🔧 **코드 품질**
```bash
npm run lint               # ESLint 검사
npm run lint:fix           # ESLint 자동 수정
npm run type-check         # TypeScript 타입 검사
npm run format             # Prettier 포맷팅
```

### 🚀 **빌드 & 배포**
```bash
npm run build:all          # 전체 빌드
npm run deploy:staging     # 스테이징 배포
npm run deploy:production  # 프로덕션 배포
```

### ⚙️ **Cursor 1.0 관리**
```bash
npm run cursor:migrate     # Cursor 1.0 마이그레이션
npm run cursor:sync-team   # 팀 설정 동기화
npm run cursor:health-check # 설정 상태 확인
npm run setup:mcp          # MCP 서버 설정
```

## 🧪 테스트

### 🎯 **테스트 전략**
- **단위 테스트**: Jest + Testing Library
- **통합 테스트**: Supertest (API)
- **E2E 테스트**: Playwright
- **커버리지 목표**: 80% 이상

### 🚀 **테스트 실행**

```bash
# 개발 중 테스트 (watch mode)
npm run test:watch

# 특정 테스트 파일
npm test -- auth.test.ts

# E2E 테스트 (브라우저별)
npx playwright test --project=chromium
npx playwright test --project=firefox
```

### 📊 **테스트 커버리지**
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## 🚀 배포

### 🌍 **배포 환경**
- **Staging**: https://staging.o4o-platform.com
- **Production**: https://o4o-platform.com

### 📦 **Docker 배포**

```bash
# 이미지 빌드
docker build -t o4o-api:latest ./services/api-server
docker build -t o4o-web:latest ./services/main-site

# 컨테이너 실행
docker-compose up -d
```

### ⚡ **자동 배포**

```bash
# 스테이징 환경 배포
npm run deploy:staging

# 프로덕션 환경 배포 (E2E 테스트 포함)
npm run deploy:production -- --full-test
```

### 🔄 **CI/CD 파이프라인**
1. **코드 푸시** → GitHub
2. **자동 테스트** → GitHub Actions
3. **BugBot 리뷰** → Cursor 1.0
4. **빌드 & 배포** → Docker
5. **헬스체크** → 자동 확인

## 🤝 기여하기

### 📋 **개발 워크플로우**

1. **브랜치 생성**
```bash
git checkout -b feature/your-feature-name
```

2. **Cursor 1.0 개발**
```bash
# Background Agent 활성화
Cmd/Ctrl + E

# Long Context Chat 사용
@codebase "전체 프로젝트 컨텍스트로 작업"
```

3. **코드 작성 & 테스트**
```bash
npm run test
npm run lint:fix
```

4. **커밋 & 푸시**
```bash
git commit -m "feat(auth): add OAuth2 integration"
git push origin feature/your-feature-name
```

5. **Pull Request 생성**
- BugBot이 자동으로 리뷰 수행
- 팀원 2명 이상의 승인 필요

### 📏 **코딩 표준**
- **커밋 메시지**: Conventional Commits
- **코드 스타일**: ESLint + Prettier
- **타입 안전성**: TypeScript strict mode
- **테스트**: 80% 이상 커버리지

### 🎯 **Cursor 1.0 활용 팁**

#### **효과적인 프롬프트**
```
# 컴포넌트 생성
"@UserProfile 컴포넌트의 스타일을 개선하고 반응형 디자인을 적용해줘"

# API 개발
"@backend-dev Rule을 따라 User CRUD API를 생성해줘"

# 테스트 작성
"@testing-guide 에 따라 UserService의 단위 테스트를 작성해줘"
```

#### **MCP 도구 활용**
```
# 데이터베이스 쿼리
"o4o-postgres로 users 테이블의 스키마를 확인해줘"

# 파일 검색
"o4o-filesystem에서 인증 관련 파일들을 찾아줘"

# GitHub 관리
"o4o-github로 최근 PR 상태를 확인해줘"
```

## 🆘 문제 해결

### 🔧 **일반적인 문제**

#### **Cursor 1.0 설정 문제**
```bash
# 설정 상태 확인
npm run cursor:health-check

# 마이그레이션 재실행
npm run cursor:migrate

# 팀 설정 동기화
npm run cursor:sync-team
```

#### **MCP 연결 문제**
```bash
# MCP 서버 재설정
npm run setup:mcp

# 환경변수 확인
echo $GITHUB_TOKEN
echo $DATABASE_URL
```

#### **개발 서버 문제**
```bash
# 포트 확인
lsof -i :3000
lsof -i :5173

# 프로세스 정리
npm run clean:processes
```

### 📚 **추가 리소스**
- [Cursor 1.0 공식 문서](https://docs.cursor.com/)
- [MCP 프로토콜 가이드](https://modelcontextprotocol.io/)
- [팀 개발 가이드](./docs-hub/guides/)

## 📄 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

- **Cursor Team** - 혁신적인 AI-powered IDE 제공
- **OpenAI** - GPT 모델 및 API 지원  
- **Anthropic** - Claude 모델 통합
- **Open Source Community** - 사용된 모든 오픈소스 라이브러리들

---

<div align="center">

**🚀 Cursor 1.0과 함께하는 차세대 개발 경험을 시작하세요!**

[Getting Started](#-빠른-시작) • [Documentation](./docs/) • [Issues](../../issues) • [Discussions](../../discussions)

</div>
