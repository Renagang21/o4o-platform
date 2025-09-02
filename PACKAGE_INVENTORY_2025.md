# 📦 O4O Platform 패키지 완전 일람표 2025

> **최종 업데이트**: 2025년 9월 2일  
> **Node.js**: 22.18.0 | **npm**: 10.9.3 | **TypeScript**: 5.9.2

## 🏗️ 프로젝트 구조 현황

```
o4o-platform/ (Monorepo)
├── apps/ (8개 애플리케이션)
│   ├── admin-dashboard/     # 관리자 대시보드 (React + Vite)
│   ├── api-server/          # REST API 서버 (Express + TypeORM)
│   ├── api-gateway/         # API 게이트웨이 (Express + Proxy)
│   ├── main-site/           # 메인 사이트 (React + Vite)
│   ├── ecommerce/           # 이커머스 (React + Vite)
│   ├── forum/               # 포럼 (React + Vite)
│   ├── crowdfunding/        # 크라우드펀딩 (React + Vite)
│   └── digital-signage/     # 디지털 사이니지 (React + Vite)
└── packages/ (15개 공유 패키지)
    ├── types/               # TypeScript 타입 정의
    ├── utils/               # 유틸리티 함수
    ├── ui/                  # UI 컴포넌트
    ├── auth-client/         # 인증 클라이언트
    ├── auth-context/        # React 인증 컨텍스트
    ├── shortcodes/          # WordPress 스타일 숏코드
    ├── block-core/          # WordPress 블록 코어
    ├── blocks/              # WordPress 블록들 (4개)
    ├── forum-types/         # 포럼 타입
    ├── crowdfunding-types/  # 크라우드펀딩 타입
    └── supplier-connector/  # 공급업체 연결
```

## 📊 핵심 기술 스택

### 🎯 프론트엔드 공통
| 기술 | 버전 | 용도 | 사용처 |
|------|------|------|--------|
| **React** | 18.3.1 | UI 프레임워크 | 모든 프론트엔드 |
| **React DOM** | 18.3.1 | React 렌더링 | 모든 프론트엔드 |
| **TypeScript** | ~5.9.2 | 타입 시스템 | 전체 프로젝트 |
| **Vite** | 5.4.19 / 7.1.1 | 빌드 도구 | 모든 프론트엔드 |
| **TailwindCSS** | 4.1.0 | CSS 프레임워크 | 전체 |
| **PostCSS** | 8.4.49 | CSS 처리 | 전체 |

### 🔧 백엔드 스택 (api-server)
| 기술 | 버전 | 용도 | 비고 |
|------|------|------|------|
| **Express** | 4.18.2 | 웹 프레임워크 | NestJS 아님 |
| **TypeORM** | 0.3.20 | ORM | |
| **PostgreSQL** | 8.11.3 | 데이터베이스 | |
| **Redis** | 5.6.1 (ioredis) | 캐시/세션 | |
| **Socket.io** | 4.6.1 | WebSocket | |
| **Passport** | 0.7.0 | 인증 | Google, Kakao, Naver |
| **JWT** | 9.0.0 | 토큰 | |
| **Bcrypt** | 6.0.0 | 암호화 | |

## 🎨 애플리케이션별 주요 패키지

### 1️⃣ Admin Dashboard (`@o4o/admin-dashboard`)
**버전**: 1.0.0-deploy-1756353453

| 카테고리 | 패키지 | 버전 | 용도 |
|----------|--------|------|------|
| **UI 프레임워크** | @mui/material | 7.3.1 | Material Design |
| | Radix UI | 1.1.x - 1.2.x | 헤드리스 컴포넌트 |
| **에디터** | @tiptap/* | 2.22.0 | 리치 텍스트 에디터 |
| | @wordpress/block-editor | 14.4.0 | 블록 에디터 |
| **폼/검증** | react-hook-form | 7.48.2 | 폼 관리 |
| | zod | 4.0.5 | 스키마 검증 |
| **상태관리** | zustand | 5.0.5 | 전역 상태 |
| | @tanstack/react-query | 5.78.2 | 서버 상태 |
| **DnD** | @dnd-kit/* | 6.3.1 / 10.0.0 | 드래그앤드롭 |
| **기타** | socket.io-client | 4.7.4 | 실시간 통신 |
| | react-dropzone | 14.3.8 | 파일 업로드 |
| | lucide-react | 0.523.0 | 아이콘 |

### 2️⃣ API Server (`@o4o/api-server`)
**버전**: 1.0.0

| 카테고리 | 패키지 | 버전 | 용도 |
|----------|--------|------|------|
| **웹 프레임워크** | express | 4.18.2 | HTTP 서버 |
| **데이터베이스** | typeorm | 0.3.20 | ORM |
| | pg | 8.11.3 | PostgreSQL 드라이버 |
| **인증** | passport | 0.7.0 | 인증 미들웨어 |
| | passport-google-oauth20 | 2.0.0 | Google OAuth |
| | passport-kakao | 1.0.1 | Kakao 로그인 |
| | passport-naver-v2 | 2.0.8 | Naver 로그인 |
| **보안** | helmet | 6.0.1 | 보안 헤더 |
| | cors | 2.8.5 | CORS |
| | bcrypt | 6.0.0 | 암호 해싱 |
| | jsonwebtoken | 9.0.0 | JWT |
| **캐시/세션** | ioredis | 5.6.1 | Redis 클라이언트 |
| | express-session | 1.18.2 | 세션 관리 |
| **파일처리** | multer | 2.0.1 | 파일 업로드 |
| | sharp | 0.34.3 | 이미지 처리 |
| | pdfkit | 0.17.2 | PDF 생성 |
| | exceljs | 4.4.0 | Excel 처리 |
| **API 문서** | swagger-jsdoc | 6.2.8 | Swagger 생성 |
| | swagger-ui-express | 5.0.1 | Swagger UI |

### 3️⃣ Main Site (`@o4o/main-site`)
**버전**: 1.0.0

| 패키지 | 버전 | 용도 |
|--------|------|------|
| @wordpress/block-editor | 14.4.0 | 블록 에디터 |
| @wordpress/components | 28.9.0 | WordPress UI |
| framer-motion | 10.18.0 | 애니메이션 |
| zustand | 5.0.5 | 상태 관리 |
| @tanstack/react-query | 5.78.2 | 데이터 페칭 |
| react-dropzone | 14.3.8 | 파일 업로드 |
| react-icons | 5.5.0 | 아이콘 |
| date-fns | 3.6.0 | 날짜 처리 |

### 4️⃣ E-commerce (`@o4o/ecommerce`)
| 패키지 | 버전 | 용도 |
|--------|------|------|
| framer-motion | 10.18.0 | 애니메이션 |
| sonner | 2.0.6 | 토스트 알림 |
| react-router-dom | 7.6.0 | 라우팅 |

### 5️⃣ Forum (`@o4o/forum`)
| 패키지 | 버전 | 용도 |
|--------|------|------|
| marked | 12.0.2 | Markdown 파싱 |
| dompurify | 3.1.7 | HTML 정화 |
| date-fns | 3.6.0 | 날짜 처리 |

### 6️⃣ API Gateway (`@o4o/api-gateway`)
| 패키지 | 버전 | 용도 |
|--------|------|------|
| express | 4.21.2 | HTTP 서버 |
| http-proxy-middleware | 3.0.0 | 프록시 |
| express-rate-limit | 7.5.0 | Rate limiting |
| helmet | 8.0.0 | 보안 |

## 📦 공유 패키지 (packages/*)

### 핵심 패키지
| 패키지 | 버전 | 의존성 | 용도 |
|--------|------|--------|------|
| @o4o/types | 1.0.0 | 없음 | TypeScript 타입 정의 |
| @o4o/utils | 1.0.0 | clsx, tailwind-merge | 유틸리티 함수 |
| @o4o/ui | 1.0.0 | React (peer) | 공통 UI 컴포넌트 |

### 인증 패키지
| 패키지 | 버전 | 의존성 | 용도 |
|--------|------|--------|------|
| @o4o/auth-client | 1.0.0 | axios, js-cookie | 인증 클라이언트 |
| @o4o/auth-context | 1.0.0 | React, socket.io-client | React 인증 컨텍스트 |

### WordPress 블록 시스템
| 패키지 | 버전 | 의존성 |
|--------|------|--------|
| @o4o/block-core | 1.0.0 | React 18.2.0, WordPress |
| @o4o/text-content-blocks | 1.0.0 | block-core, classnames |
| @o4o/layout-media-blocks | 1.0.0 | block-core, classnames |
| @o4o/interactive-blocks | 1.0.0 | block-core, classnames |
| @o4o/dynamic-blocks | 1.0.0 | block-core, classnames |

## ⚠️ 버전 충돌 현황

### 🔴 심각한 충돌
| 패키지 | 충돌 버전 | 영향 |
|--------|-----------|------|
| **zod** | 3.24.1 vs 4.0.5 vs 4.0.17 | 타입 비호환 가능 |
| **uuid** | 9.0.1 vs 11.1.0 | 메이저 버전 차이 |
| **vite** | 5.4.19 vs 7.1.1 | 빌드 설정 차이 |

### 🟡 경미한 충돌
| 패키지 | 충돌 버전 | 영향 |
|--------|-----------|------|
| **React** | 18.2.0 vs 18.3.1 | 마이너 버전, 호환 가능 |
| **date-fns** | 3.3.1 vs 3.6.0 | 마이너 버전 차이 |
| **express** | 4.18.2 vs 4.21.2 | 마이너 버전 차이 |

## 🔍 WordPress 패키지 일관성
모든 WordPress 패키지가 일관된 버전 사용:
- @wordpress/block-editor: **14.4.0**
- @wordpress/blocks: **13.9.0**
- @wordpress/components: **28.9.0**
- @wordpress/element: **6.9.0**
- @wordpress/i18n: **5.9.0**

## 📈 가장 많이 사용되는 패키지

### 프론트엔드 TOP 10
1. **React**: 18.3.1 (모든 프론트엔드)
2. **axios**: 1.10.0 (8개 패키지)
3. **@tanstack/react-query**: 5.78.2 (6개 패키지)
4. **zustand**: 5.0.5 (6개 패키지)
5. **react-hook-form**: 7.48.2 (5개 패키지)
6. **lucide-react**: 0.523.0 (5개 패키지)
7. **clsx**: 2.1.1 (4개 패키지)
8. **tailwind-merge**: 2.5.5 (3개 패키지)
9. **framer-motion**: 10.18.0 (3개 패키지)
10. **socket.io-client**: 4.7.4 (3개 패키지)

### 개발 도구 TOP 5
1. **TypeScript**: ~5.9.2 (전체)
2. **ESLint**: 9.31.0+ (전체)
3. **Vite**: 5.4.19 / 7.1.1 (프론트엔드)
4. **Vitest**: 3.2.4 (테스트)
5. **Prettier**: 3.0.0 (포맷팅)

## 💡 권장 조치사항

### 🚨 즉시 수정 필요
1. **Zod 버전 통일**: 4.0.5로 표준화
2. **UUID 버전 통일**: 11.1.0으로 업그레이드
3. **Vite 버전 통일**: 7.1.1로 업그레이드

### ⚠️ 중요도 중간
1. **React 버전 정렬**: 블록 패키지를 18.3.1로 업데이트
2. **date-fns 표준화**: 3.6.0으로 통일
3. **Express 버전 정렬**: 4.21.2로 통일

### 📝 장기 개선
1. **NestJS 마이그레이션 검토**: 현재 Express 기반
2. **Next.js 도입 검토**: 현재 Vite 기반
3. **Monorepo 도구 개선**: Turborepo 도입 검토

## 🎯 결론

O4O Platform은 **Express + TypeORM** 백엔드와 **React + Vite** 프론트엔드로 구성된 대규모 모노레포입니다. WordPress 블록 에디터 통합, 다양한 인증 방식 지원, 그리고 모듈화된 패키지 구조를 갖추고 있습니다.

주요 버전 충돌 문제를 해결하면 안정적인 운영이 가능하며, 현재 빌드는 정상 작동 중입니다.

---

*이 문서는 2025년 9월 2일 실제 코드베이스를 완전 분석하여 작성되었습니다.*