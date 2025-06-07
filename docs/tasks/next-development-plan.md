# 다음 작업 계획 - TypeScript 백엔드 구현

## 🎯 즉시 진행 (1-2일)

### 1. Express 서버 기본 구조
**파일**: `src/main.ts`
```typescript
// 현재 상태: 기본 파일만 생성됨
// 필요 작업:
- Express 앱 초기화
- 기본 라우팅 설정
- 에러 핸들링 미들웨어
- CORS 설정
- 환경변수 관리
```

**체크리스트**:
- [ ] Express 앱 설정 완료
- [ ] 기본 라우트 (`/`, `/health`) 추가
- [ ] 미들웨어 설정 (cors, morgan, express.json)
- [ ] 환경변수 (.env) 설정
- [ ] 포트 설정 및 서버 시작

### 2. 데이터베이스 연결
**목표**: PostgreSQL 연결 및 기본 설정
```typescript
// 필요 패키지:
- pg (PostgreSQL 드라이버)
- @types/pg
- typeorm 또는 prisma (ORM)
```

**체크리스트**:
- [ ] PostgreSQL 연결 설정
- [ ] ORM 선택 및 설정 (Prisma 추천)
- [ ] 기본 데이터베이스 스키마 설계
- [ ] 마이그레이션 시스템 구축
- [ ] 연결 테스트 및 헬스체크

### 3. 기본 API 엔드포인트
**목표**: RESTful API 기본 구조 생성
```
GET    /api/health       - 서버 상태 확인
GET    /api/version      - 애플리케이션 버전
POST   /api/auth/login   - 사용자 로그인
POST   /api/auth/register - 사용자 등록
GET    /api/users/me     - 현재 사용자 정보
```

**체크리스트**:
- [ ] 라우터 구조 설계 (`src/routes/`)
- [ ] 컨트롤러 구조 설계 (`src/controllers/`)
- [ ] 기본 API 응답 형식 정의
- [ ] 에러 응답 표준화
- [ ] API 문서화 (Swagger) 준비

## 🏗️ 단기 목표 (1주일)

### 4. 인증 시스템 구현
**목표**: JWT 기반 사용자 인증 시스템
```typescript
// 핵심 기능:
- 사용자 등록/로그인
- JWT 토큰 발급/검증
- 비밀번호 해싱 (bcrypt)
- 인증 미들웨어
```

**체크리스트**:
- [ ] User 모델 정의
- [ ] bcrypt 비밀번호 해싱
- [ ] JWT 토큰 생성/검증 유틸리티
- [ ] 인증 미들웨어 구현
- [ ] 로그인/회원가입 API 완성
- [ ] 토큰 갱신 (Refresh Token) 구현

### 5. 사용자 관리 API
**목표**: 사용자 CRUD 및 프로필 관리
```
GET    /api/users        - 사용자 목록 (관리자)
GET    /api/users/:id    - 특정 사용자 조회
PUT    /api/users/:id    - 사용자 정보 수정
DELETE /api/users/:id    - 사용자 삭제
PUT    /api/users/me     - 내 프로필 수정
```

**체크리스트**:
- [ ] 사용자 모델 확장 (프로필 정보)
- [ ] 권한 관리 시스템 (role-based)
- [ ] 사용자 검색 및 필터링
- [ ] 프로필 이미지 업로드
- [ ] 계정 활성화/비활성화

### 6. 프론트엔드 연동
**목표**: React SPA와 API 연결
```typescript
// 필요 작업:
- API 클라이언트 설정
- 인증 상태 관리
- API 에러 처리
- 로딩 상태 관리
```

**체크리스트**:
- [ ] Axios 또는 React Query 설정
- [ ] 인증 토큰 자동 첨부 인터셉터
- [ ] 로그인/회원가입 페이지 연동
- [ ] 보호된 라우트 구현
- [ ] API 에러 toast 알림

## 🚀 중기 목표 (2-4주)

### 7. 비즈니스 로직 구현
**목표**: O4O 플랫폼 핵심 기능 개발
```
- 상품 관리 API
- 주문 처리 시스템
- 재고 관리
- 매장 관리
- 대시보드 데이터 API
```

### 8. 마이크로서비스 분리
**목표**: AI/RPA 서비스 독립화
```
- AI Services (포트 3001)
- RPA Services (포트 3002)  
- Main Platform (포트 3000)
- 서비스 간 통신 (gRPC/REST)
```

### 9. 고급 기능 구현
**목표**: 프로덕션 준비
```
- 실시간 알림 (WebSocket)
- 파일 업로드/다운로드
- 이메일 발송 시스템
- 로깅 및 모니터링
- 캐싱 (Redis)
```

## 📋 기술 스택 결정사항

### 확정된 기술
- **런타임**: Node.js + TypeScript
- **프레임워크**: Express.js
- **데이터베이스**: PostgreSQL
- **ORM**: Prisma (추천)
- **인증**: JWT + bcrypt
- **문서화**: Swagger/OpenAPI

### 검토 필요
- **캐싱**: Redis vs In-Memory
- **파일 저장**: AWS S3 vs 로컬 스토리지
- **이메일**: SendGrid vs SES
- **로깅**: Winston vs Pino
- **테스트**: Jest vs Vitest

## 🔧 개발 환경 설정

### 필요한 패키지 설치
```bash
# 기본 패키지
npm install express cors helmet morgan dotenv

# TypeScript 지원
npm install -D @types/express @types/cors @types/node

# 데이터베이스
npm install prisma @prisma/client pg
npm install -D @types/pg

# 인증
npm install jsonwebtoken bcryptjs
npm install -D @types/jsonwebtoken @types/bcryptjs

# 개발 도구
npm install -D nodemon ts-node concurrently
```

### 개발 스크립트 추가
```json
{
  "scripts": {
    "dev": "nodemon src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  }
}
```

## 📊 진행 상황 추적

### 완료된 작업 ✅
- TypeScript 백엔드 설정
- Docker 컨테이너 설정
- CI/CD 파이프라인 구축
- 기본 프로젝트 구조

### 진행 중인 작업 🔄
- Express 서버 구현 (다음 단계)
- 데이터베이스 설계
- API 설계 문서 작성

### 대기 중인 작업 ⏳
- 인증 시스템
- 비즈니스 로직
- 마이크로서비스 분리
- 프로덕션 배포

## 🎯 우선순위 매트릭스

### 높음 (즉시 진행)
1. Express 서버 기본 구조
2. 데이터베이스 연결
3. 인증 API

### 중간 (1-2주 내)
1. 사용자 관리 API
2. 프론트엔드 연동
3. 기본 비즈니스 로직

### 낮음 (필요시)
1. 고급 기능 (WebSocket, 캐싱)
2. 성능 최적화
3. 모니터링 시스템

---

**📝 작성자**: Claude (Rena와 협업)  
**📅 작성일**: 2025-06-07  
**🔄 업데이트**: 작업 진행에 따라 체크리스트 업데이트  
**📋 관련 문서**: [API 설계](./api-server/02-medusa-commoncore-integration.md), [사용자 등록](./main-site/04-user-registration-implementation.md)
