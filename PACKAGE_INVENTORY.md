# 📦 O4O Platform 패키지 일람표
*최종 업데이트: 2025년 1월*

## 🏗️ 모노레포 구조
- **패키지 매니저**: pnpm v10.15.1+ 
- **Node.js**: v22.18.0
- **TypeScript**: v5.9.2
- **Vite**: v5.4.19

## 📋 전체 패키지 요약

### 🔧 빌드 도구 & 번들러
| 패키지 | 버전 | 용도 |
|--------|------|------|
| vite | ~5.4.19 | 프론트엔드 빌드 도구 |
| @vitejs/plugin-react | ~4.7.0 | React용 Vite 플러그인 |
| typescript | ~5.9.2 | TypeScript 컴파일러 |
| @swc/core | 1.13.5 | 고속 JavaScript/TypeScript 컴파일러 |
| rollup-plugin-visualizer | 6.0.3 | 번들 크기 분석 |
| terser | 5.43.1 | JavaScript 압축기 |

### 🎨 UI 프레임워크 & 스타일링
| 패키지 | 버전 | 용도 |
|--------|------|------|
| react | 18.3.1 | UI 라이브러리 |
| react-dom | 18.3.1 | React DOM 렌더링 |
| tailwindcss | ~3.4.17 | CSS 프레임워크 |
| @mui/material | 7.3.1 | Material-UI 컴포넌트 |
| @mui/icons-material | 7.3.1 | Material 아이콘 |
| @radix-ui/* | 1.x | Headless UI 컴포넌트 |
| lucide-react | ^0.523.0 | 아이콘 라이브러리 |
| @emotion/react | 11.14.0 | CSS-in-JS |
| @emotion/styled | 11.14.1 | Styled Components |
| clsx | ^2.1.1 | 클래스명 유틸리티 |
| tailwind-merge | ^2.5.5 | Tailwind 클래스 병합 |
| class-variance-authority | ^0.7.1 | 컴포넌트 변형 관리 |

### 📡 상태 관리 & 데이터 페칭
| 패키지 | 버전 | 용도 |
|--------|------|------|
| @tanstack/react-query | ^5.78.2 | 서버 상태 관리 |
| zustand | ^5.0.5 | 클라이언트 상태 관리 |
| axios | ^1.10.0 | HTTP 클라이언트 |
| socket.io-client | ^4.7.4 | WebSocket 클라이언트 |

### 🔐 인증 & 보안
| 패키지 | 버전 | 용도 |
|--------|------|------|
| jsonwebtoken | 9.0.2 | JWT 토큰 |
| bcrypt | 6.0.0 | 비밀번호 해싱 |
| passport | ^0.7.0 | 인증 미들웨어 |
| passport-google-oauth20 | ^2.0.0 | Google OAuth |
| passport-kakao | ^1.0.1 | Kakao OAuth |
| passport-naver-v2 | ^2.0.8 | Naver OAuth |
| helmet | ^6.0.1 | 보안 헤더 |
| express-rate-limit | ^6.7.0 | API Rate Limiting |

### 📝 에디터 & 콘텐츠
| 패키지 | 버전 | 용도 |
|--------|------|------|
| @wordpress/block-editor | 14.4.0 | WordPress 블록 에디터 |
| @wordpress/blocks | 13.9.0 | WordPress 블록 시스템 |
| @wordpress/components | 28.9.0 | WordPress 컴포넌트 |
| @tiptap/react | ^2.22.0 | Rich Text 에디터 |
| @tiptap/starter-kit | ^2.22.0 | TipTap 기본 확장 |
| lowlight | ^3.3.0 | 코드 하이라이팅 |

### 🗄️ 백엔드 & 데이터베이스
| 패키지 | 버전 | 용도 |
|--------|------|------|
| express | ^4.18.2 | 웹 프레임워크 |
| typeorm | ^0.3.20 | ORM |
| pg | ^8.11.3 | PostgreSQL 클라이언트 |
| redis | - | Redis 클라이언트 (ioredis 사용) |
| ioredis | ^5.6.1 | Redis 클라이언트 |
| node-cache | 5.1.2 | 인메모리 캐싱 |
| lru-cache | 11.1.0 | LRU 캐시 |

### 📊 데이터 처리 & 파일
| 패키지 | 버전 | 용도 |
|--------|------|------|
| exceljs | 4.4.0 | Excel 파일 처리 |
| csv-writer | 1.6.0 | CSV 파일 생성 |
| json2csv | ^6.0.0-alpha.2 | JSON to CSV 변환 |
| xlsx | 0.18.5 | Excel 파일 읽기/쓰기 |
| pdfkit | 0.17.2 | PDF 생성 |
| sharp | 0.34.3 | 이미지 처리 |
| multer | 2.0.2 | 파일 업로드 |
| adm-zip | 0.5.16 | ZIP 파일 처리 |

### 🧪 테스트 도구
| 패키지 | 버전 | 용도 |
|--------|------|------|
| vitest | 3.2.4 | 테스트 러너 |
| jest | 29.7.0 | 테스트 프레임워크 |
| @testing-library/react | 16.3.0 | React 테스트 |
| @testing-library/jest-dom | 6.6.4 | DOM 매처 |
| @playwright/test | ^1.53.2 | E2E 테스트 |
| msw | ^2.10.3 | API 모킹 |
| supertest | 7.1.4 | HTTP 테스트 |

### 🔍 코드 품질
| 패키지 | 버전 | 용도 |
|--------|------|------|
| eslint | ~9.33.0 | 린터 |
| @typescript-eslint/eslint-plugin | 8.39.0 | TypeScript ESLint |
| prettier | ~3.0.0 | 코드 포맷터 |
| eslint-plugin-react | 7.37.5 | React ESLint |
| eslint-plugin-react-hooks | 5.2.0 | React Hooks 린트 |

### 🛠️ 유틸리티
| 패키지 | 버전 | 용도 |
|--------|------|------|
| uuid | 9.0.1 | UUID 생성 |
| slugify | ^1.6.6 | URL Slug 생성 |
| dayjs | 1.11.18 | 날짜 처리 |
| date-fns | 3.6.0 | 날짜 유틸리티 |
| js-cookie | ^3.0.5 | 쿠키 관리 |
| xml2js | 0.6.2 | XML 파싱 |
| js-yaml | 4.1.0 | YAML 파싱 |
| dompurify | ^3.2.6 | HTML 살균 |

### 📧 커뮤니케이션
| 패키지 | 버전 | 용도 |
|--------|------|------|
| nodemailer | 7.0.5 | 이메일 발송 |
| socket.io | ^4.6.1 | WebSocket 서버 |
| node-cron | 4.3.3 | 작업 스케줄링 |
| cron | 4.3.3 | Cron 작업 |

### 🎯 폼 & 유효성 검증
| 패키지 | 버전 | 용도 |
|--------|------|------|
| react-hook-form | ^7.48.2 | 폼 관리 |
| @hookform/resolvers | ^5.1.1 | 폼 유효성 검증 |
| zod | ~4.0.17 | 스키마 유효성 검증 |
| joi | 18.0.1 | 객체 스키마 검증 |
| class-validator | 0.14.2 | 클래스 유효성 검증 |
| express-validator | ^6.15.0 | Express 유효성 검증 |

### 🎮 UI 인터랙션
| 패키지 | 버전 | 용도 |
|--------|------|------|
| @dnd-kit/core | ^6.3.1 | 드래그 앤 드롭 |
| @dnd-kit/sortable | ^10.0.0 | 정렬 가능한 리스트 |
| react-dnd | ^16.0.1 | React 드래그 앤 드롭 |
| react-dropzone | ^14.3.8 | 파일 드롭존 |
| framer-motion | ^10.18.0 | 애니메이션 |
| react-hot-toast | ^2.4.1 | 토스트 알림 |
| react-intersection-observer | ^9.16.0 | Intersection Observer |

### 📚 API 문서화
| 패키지 | 버전 | 용도 |
|--------|------|------|
| swagger-jsdoc | 6.2.8 | Swagger 문서 생성 |
| swagger-ui-express | 5.0.1 | Swagger UI |

## 🏢 앱별 주요 패키지

### 📱 Admin Dashboard (`apps/admin-dashboard`)
- WordPress 블록 에디터 통합
- TipTap 리치 텍스트 에디터
- Material-UI + Radix UI 컴포넌트
- 드래그 앤 드롭 (dnd-kit)
- 차트 및 데이터 시각화

### 🖥️ API Server (`apps/api-server`)
- Express.js 웹 프레임워크
- TypeORM + PostgreSQL
- Redis 캐싱
- 소셜 로그인 (Google, Kakao, Naver)
- 파일 처리 (Excel, PDF, Image)
- 이메일 발송 (Nodemailer)

### 🛍️ Main Site / Storefront (`apps/main-site`)
- Next.js 스타일 라우팅 (React Router v7)
- Framer Motion 애니메이션
- WordPress 컴포넌트 통합
- 실시간 통신 (Socket.io)

## 📦 워크스페이스 패키지

### 내부 패키지 (`packages/*`)
| 패키지 | 경로 | 설명 |
|--------|------|------|
| @o4o/types | packages/types | 공통 타입 정의 |
| @o4o/utils | packages/utils | 유틸리티 함수 |
| @o4o/ui | packages/ui | 공통 UI 컴포넌트 |
| @o4o/auth-client | packages/auth-client | 인증 클라이언트 |
| @o4o/auth-context | packages/auth-context | 인증 컨텍스트 |
| @o4o/shortcodes | packages/shortcodes | 숏코드 시스템 |
| @o4o/block-core | packages/block-core | 블록 코어 |
| @o4o/crowdfunding-types | packages/crowdfunding-types | 크라우드펀딩 타입 |
| @o4o/forum-types | packages/forum-types | 포럼 타입 |
| @o4o/supplier-connector | packages/supplier-connector | 공급업체 연결 |

## 🔄 최근 변경사항
1. **npm → pnpm 마이그레이션 완료**
   - 설치 속도 80% 향상 (8-12분 → 2-3분)
   - 디스크 사용량 60% 감소 (2-3GB → 1GB)

2. **WordPress 스타일 관리자 UI 적용**
   - WordPress 테이블 컴포넌트
   - WordPress 필터 컴포넌트
   - 다크모드 지원 강화

3. **패키지 버전 업데이트**
   - React 18.3.1
   - TypeScript 5.9.2
   - Vite 5.4.19
   - Node.js 22.18.0

## 🚀 개발 환경 요구사항
```json
{
  "engines": {
    "node": ">=22.18.0",
    "pnpm": ">=10.0.0"
  }
}
```

## 📝 패키지 관리 명령어
```bash
# 의존성 설치
pnpm install

# 패키지 추가
pnpm add [package-name]
pnpm add -D [dev-package-name]

# 특정 앱에 패키지 추가
pnpm --filter=@o4o/admin-dashboard add [package-name]

# 패키지 업데이트
pnpm update

# 패키지 제거
pnpm remove [package-name]

# 워크스페이스 패키지 빌드
pnpm run build:packages
```

## ⚠️ 주의사항
1. **zod 버전 고정**: `~4.0.17` (호환성 문제)
2. **@vitejs/plugin-react 버전 고정**: `~4.7.0` (빌드 안정성)
3. **@babel/runtime 오버라이드**: `^7.26.10` (Admin Dashboard)
4. **pnpm 필수**: npm이나 yarn 사용 금지

---
*이 문서는 O4O Platform의 현재 패키지 상태를 반영합니다.*
*패키지 추가/제거 시 이 문서를 업데이트해 주세요.*