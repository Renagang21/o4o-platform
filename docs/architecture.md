# 🏗️ O4O Platform 아키텍처

## 📋 **시스템 개요**

O4O Platform은 **마이크로서비스 아키텍처** 기반으로 설계된 확장 가능한 플랫폼입니다.

---

## 🌐 **전체 아키텍처**

### **🎯 아키텍처 원칙**
- **마이크로서비스**: 독립적 서비스 배포 및 확장
- **API-First**: REST API 중심 설계
- **컨테이너화**: Docker 기반 일관된 환경
- **AI 통합**: 개발부터 운영까지 AI 협업

### **🔄 서비스 통신 구조**
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │◄──►│ Main-Site   │◄──►│ API-Server  │
│ (Browser)   │    │   (React)   │    │ (Express)   │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                   ┌─────────────┬────────────┼────────────┐
                   │             │            │            │
            ┌──────▼──────┐ ┌───▼───┐ ┌──────▼──────┐ ┌──▼────┐
            │ Crowdfunding│ │Forum  │ │ Ecommerce   │ │Signage│
            │  Service    │ │Service│ │  Service    │ │Service│
            └─────────────┘ └───────┘ └─────────────┘ └───────┘
                                              │
                                    ┌─────────┼─────────┐
                                    │         │         │
                               ┌────▼───┐ ┌──▼──┐ ┌───▼───┐
                               │PostgreSQL│ │Redis│ │ MCP   │
                               │ Database │ │Cache│ │Servers│
                               └──────────┘ └─────┘ └───────┘
```

---

## 📁 **폴더 구조 및 역할**

### **🗂️ 루트 구조**
```
o4o-platform/
├── 📁 .cursor/              # Cursor AI 설정
│   ├── rules/               # AI 개발 가이드라인
│   └── mcp.json            # MCP 서버 설정
├── 📁 services/             # 마이크로서비스들
│   ├── api-server/         # 중앙 API 허브
│   ├── main-site/          # 메인 웹사이트
│   ├── crowdfunding/       # 크라우드펀딩
│   ├── ecommerce/          # 전자상거래
│   ├── forum/              # 커뮤니티
│   └── signage/            # 디지털 사이니지
├── 📁 scripts/              # 자동화 스크립트
│   ├── smart-dev-start.js  # 개발환경 시작
│   ├── generate-component.js # 컴포넌트 생성
│   └── deploy.js           # 배포 스크립트
├── 📁 tests/                # E2E 테스트
├── 📁 docs/                 # 프로젝트 문서
└── 📄 package.json          # 루트 의존성 관리
```

### **🏢 서비스별 구조 (예: api-server)**
```
services/api-server/
├── src/
│   ├── controllers/        # API 컨트롤러
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   └── ...
│   ├── services/           # 비즈니스 로직
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   └── ...
│   ├── entities/           # TypeORM 엔티티
│   │   ├── User.entity.ts
│   │   ├── Product.entity.ts
│   │   └── ...
│   ├── routes/             # API 라우터
│   │   ├── auth.routes.ts
│   │   ├── api.routes.ts
│   │   └── ...
│   ├── middleware/         # 미들웨어
│   │   ├── auth.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── ...
│   ├── config/             # 설정 파일
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── ...
│   └── utils/              # 유틸리티
│       ├── logger.ts
│       ├── validator.ts
│       └── ...
├── tests/                  # 서비스 테스트
├── package.json           # 서비스 의존성
├── tsconfig.json          # TypeScript 설정
└── Dockerfile            # 컨테이너 설정
```

---

## 🛠️ **기술 스택**

### **📱 Frontend Stack**
```
┌─────────────────────────────────────────┐
│                Frontend                 │
├─────────────────────────────────────────┤
│ • React 19.1.0 (UI 라이브러리)           │
│ • Vite 6.1.0 (빌드 도구)                │
│ • TypeScript 5.8.3 (타입 시스템)        │
│ • Tailwind CSS 4.1.7 (스타일링)         │
│ • React Router (라우팅)                 │
│ • Zustand (상태 관리)                   │
│ • React Query (서버 상태)               │
└─────────────────────────────────────────┘
```

### **⚙️ Backend Stack**
```
┌─────────────────────────────────────────┐
│                Backend                  │
├─────────────────────────────────────────┤
│ • Node.js 22.16.0 (LTS 런타임)          │
│ • Express 4.18.2 (웹 프레임워크)        │
│ • TypeScript 5.8.3 (타입 시스템)        │
│ • TypeORM (ORM)                        │
│ • PostgreSQL 15+ (메인 DB)             │
│ • Redis (캐시/세션)                     │
│ • JWT (인증)                           │
│ • Winston (로깅)                       │
└─────────────────────────────────────────┘
```

### **🔧 DevOps & Infrastructure**
```
┌─────────────────────────────────────────┐
│            Infrastructure               │
├─────────────────────────────────────────┤
│ • Docker (컨테이너화)                    │
│ • Docker Compose (로컬 개발)            │
│ • GitHub Actions (CI/CD)               │
│ • Nginx (리버스 프록시)                 │
│ • PM2 (프로세스 관리)                   │
│ • Playwright (E2E 테스트)               │
│ • Jest (단위 테스트)                    │
└─────────────────────────────────────────┘
```

### **🤖 AI & Development Tools**
```
┌─────────────────────────────────────────┐
│              AI Tools                   │
├─────────────────────────────────────────┤
│ • Cursor 1.0 (AI IDE)                  │
│ • Background Agent (코딩 어시스턴트)      │
│ • BugBot (자동 리뷰)                     │
│ • Memories (패턴 학습)                   │
│ • MCP Protocol (컨텍스트 통합)           │
└─────────────────────────────────────────┘
```

---

## 🌐 **API 아키텍처**

### **🔗 API 엔드포인트 구조**
```
/api/v1/
├── /auth                   # 인증 관련
│   ├── POST /login         # 로그인
│   ├── POST /register      # 회원가입
│   ├── POST /refresh       # 토큰 갱신
│   └── POST /logout        # 로그아웃
├── /users                  # 사용자 관리
│   ├── GET    /            # 사용자 목록
│   ├── GET    /:id         # 사용자 상세
│   ├── PUT    /:id         # 사용자 수정
│   └── DELETE /:id         # 사용자 삭제
├── /crowdfunding          # 크라우드펀딩
│   ├── GET    /projects    # 프로젝트 목록
│   ├── POST   /projects    # 프로젝트 생성
│   ├── GET    /projects/:id # 프로젝트 상세
│   └── POST   /projects/:id/fund # 펀딩하기
├── /ecommerce             # 전자상거래
│   ├── GET    /products    # 상품 목록
│   ├── POST   /products    # 상품 등록
│   ├── GET    /orders      # 주문 목록
│   └── POST   /orders      # 주문 생성
├── /forum                 # 포럼
│   ├── GET    /posts       # 게시글 목록
│   ├── POST   /posts       # 게시글 작성
│   ├── GET    /posts/:id   # 게시글 상세
│   └── POST   /posts/:id/comments # 댓글 작성
└── /signage               # 사이니지
    ├── GET    /displays    # 디스플레이 목록
    ├── POST   /displays    # 디스플레이 등록
    └── PUT    /displays/:id/content # 콘텐츠 업데이트
```

### **📊 API 응답 형식**
```typescript
// 성공 응답
{
  "success": true,
  "data": any,
  "message": string,
  "timestamp": string
}

// 에러 응답
{
  "success": false,
  "error": {
    "code": string,
    "message": string,
    "details": any
  },
  "timestamp": string
}
```

---

## 🗄️ **데이터베이스 스키마**

### **🏗️ 핵심 엔티티 관계**
```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Users    │◄─────►│   Orders    │◄─────►│  Products   │
│             │       │             │       │             │
│ • id        │       │ • id        │       │ • id        │
│ • email     │       │ • user_id   │       │ • name      │
│ • password  │       │ • total     │       │ • price     │
│ • role      │       │ • status    │       │ • category  │
│ • created_at│       │ • created_at│       │ • created_at│
└─────────────┘       └─────────────┘       └─────────────┘
       │                      
       ▼                      
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Projects  │       │    Posts    │       │  Displays   │
│             │       │             │       │             │
│ • id        │       │ • id        │       │ • id        │
│ • title     │       │ • title     │       │ • name      │
│ • goal      │       │ • content   │       │ • location  │
│ • raised    │       │ • author_id │       │ • status    │
│ • creator_id│       │ • created_at│       │ • content   │
│ • created_at│       └─────────────┘       │ • created_at│
└─────────────┘                            └─────────────┘
```

### **🔐 인증 & 권한 스키마**
```typescript
// User 엔티티
interface User {
  id: string;
  email: string;
  password: string; // bcrypt 해시
  role: 'admin' | 'user' | 'creator';
  profile: UserProfile;
  createdAt: Date;
  updatedAt: Date;
}

// JWT 토큰 구조
interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}
```

---

## 🚀 **배포 아키텍처**

### **🌍 인프라 구조**
```
Internet
    │
    ▼
┌─────────────┐
│  Load       │
│  Balancer   │ ◄── HTTPS/SSL 터미네이션
│  (Nginx)    │
└─────────────┘
    │
    ▼
┌─────────────────────────────────────────────┐
│               Docker Swarm                  │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ Main-Site   │  │ API-Server  │           │
│  │ Container   │  │ Container   │           │
│  │ (Port 3000) │  │ (Port 4000) │           │
│  └─────────────┘  └─────────────┘           │
│                                             │
│  ┌─────────────┐  ┌─────────────┐           │
│  │ PostgreSQL  │  │   Redis     │           │
│  │ Container   │  │ Container   │           │
│  └─────────────┘  └─────────────┘           │
└─────────────────────────────────────────────┘
```

### **🔄 CI/CD 파이프라인**
```
GitHub Push
    │
    ▼
┌─────────────┐
│ GitHub      │
│ Actions     │
│             │
│ 1. 테스트    │
│ 2. 빌드      │
│ 3. 이미지    │
│ 4. 배포      │
└─────────────┘
    │
    ▼
┌─────────────┐
│ Docker      │
│ Registry    │
└─────────────┘
    │
    ▼
┌─────────────┐
│ Production  │
│ Server      │
└─────────────┘
```

---

## 🔧 **개발 환경 아키텍처**

### **💻 로컬 개발 환경**
```bash
# 개발 서버 실행
npm run dev:all

# 서비스별 포트
- Main-Site:    http://localhost:3000
- API-Server:   http://localhost:4000
- PostgreSQL:   localhost:5432
- Redis:        localhost:6379
```

### **🤖 AI 통합 환경**
```
Cursor IDE
    │
    ▼
┌─────────────────────────────────────────────┐
│              MCP Protocol               │
│                                             │
│ ┌─────────────┐ ┌─────────────┐            │
│ │ Filesystem  │ │ PostgreSQL  │            │
│ │ MCP Server  │ │ MCP Server  │            │
│ └─────────────┘ └─────────────┘            │
│                                             │
│ ┌─────────────┐ ┌─────────────┐            │
│ │ GitHub      │ │ Memory      │            │
│ │ MCP Server  │ │ MCP Server  │            │
│ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────┘
```

---

## 📈 **확장성 고려사항**

### **🔄 수평적 확장**
- **서비스별 독립 스케일링**: 트래픽에 따라 개별 확장
- **로드 밸런싱**: 서비스 인스턴스 간 트래픽 분산
- **데이터베이스 샤딩**: 데이터 분산 저장

### **⚡ 성능 최적화**
- **Redis 캐싱**: 자주 조회되는 데이터 캐시
- **CDN 활용**: 정적 자원 글로벌 배포
- **연결 풀링**: 데이터베이스 연결 최적화

### **🛡️ 보안 강화**
- **API 게이트웨이**: 중앙화된 보안 정책
- **Rate Limiting**: API 남용 방지
- **모니터링**: 실시간 보안 위협 탐지

---

## 📊 **모니터링 & 관찰가능성**

### **📈 메트릭스**
- **응답 시간**: API 엔드포인트별 성능
- **처리량**: 초당 요청 수 (RPS)
- **에러율**: 4xx, 5xx 에러 비율
- **리소스 사용률**: CPU, 메모리, 디스크

### **📋 로깅**
- **구조화된 로그**: JSON 형태 로그
- **로그 레벨**: ERROR, WARN, INFO, DEBUG
- **분산 추적**: 서비스 간 요청 추적
- **중앙화된 로그**: ELK 스택 활용

---

**🎯 이 아키텍처는 확장성, 유지보수성, 개발 생산성을 모두 고려하여 설계되었습니다.**

---

**📅 마지막 업데이트**: 2025-06-19  
**🏗️ 상태**: 핵심 아키텍처 완성, 서비스별 구현 진행 중  
**📈 다음 단계**: 성능 최적화 및 모니터링 강화
