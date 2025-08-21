# 📦 O4O Platform 패키지 일람표

> **최종 업데이트**: 2025년 8월 21일  
> **Node.js**: 22.18.0 | **npm**: 10.9.3 | **TypeScript**: 5.9.2

## 🏗️ 프로젝트 구조

```
o4o-platform/
├── apps/                    # 애플리케이션 레이어
│   ├── admin-dashboard/     # 관리자 대시보드 (React)
│   ├── api-server/          # REST API 서버 (NestJS)
│   ├── api-gateway/         # API 게이트웨이
│   ├── main-site/           # 메인 사이트 (Next.js)
│   ├── ecommerce/           # 이커머스
│   ├── forum/               # 포럼
│   ├── crowdfunding/        # 크라우드펀딩
│   └── digital-signage/     # 디지털 사이니지
└── packages/                # 공유 패키지
    ├── types/               # 타입 정의
    ├── utils/               # 유틸리티 함수
    ├── ui/                  # UI 컴포넌트
    ├── auth-client/         # 인증 클라이언트
    ├── auth-context/        # 인증 컨텍스트
    ├── block-core/          # 블록 코어
    ├── blocks/              # WordPress 스타일 블록
    ├── shortcodes/          # 숏코드
    └── supplier-connector/  # 공급업체 연결
```

## 📊 패키지 의존성 매트릭스

### 🎯 핵심 런타임 의존성

| 패키지 | 버전 | 용도 | 사용처 | 호환성 이슈 |
|--------|------|------|--------|------------|
| **React** | 18.3.1 | UI 프레임워크 | 모든 프론트엔드 앱 | ✅ 안정 |
| **React DOM** | 18.3.1 | React 렌더링 | 모든 프론트엔드 앱 | ✅ 안정 |
| **TypeScript** | ~5.9.2 | 타입 시스템 | 전체 프로젝트 | ✅ 안정 |
| **Vite** | 5.4.19 | 빌드 도구 | admin-dashboard | ⚠️ 빌드 타임아웃 |
| **Next.js** | 14.2.24 | 프레임워크 | main-site | ✅ 안정 |
| **NestJS** | 10.4.15 | 백엔드 프레임워크 | api-server | ✅ 안정 |

### 🔧 빌드 도구 & 개발 의존성

| 도구 | 버전 | 용도 | 호환성 |
|------|------|------|--------|
| **@vitejs/plugin-react** | 4.7.0 | React Vite 플러그인 | vite 4-7 지원 |
| **vitest** | 3.2.4 | 테스트 러너 | vite 5-7 지원 |
| **ESLint** | 9.31.0 | 코드 린터 | ✅ |
| **Prettier** | 3.0.0 | 코드 포맷터 | ✅ |
| **TailwindCSS** | 4.1.0 | CSS 프레임워크 | ✅ |
| **PostCSS** | 8.4.49 | CSS 처리 | ✅ |
| **Autoprefixer** | 10.4.20 | CSS 벤더 프리픽스 | ✅ |

## 🚨 문제가 있는 패키지 조합

### 1. **date-fns 버전 충돌** 🔴
```
문제: 
- admin-dashboard: date-fns 2.30.0 사용
- @wordpress/components → react-day-picker v9.9.0 → date-fns v2 스타일 import 기대
- date-fns v3.6.0은 새로운 import 방식 사용

해결책:
✅ date-fns를 v2.30.0으로 유지 (현재 적용됨)
```

### 2. **WordPress 패키지 순환 의존성** 🔴
```
문제:
- @wordpress/block-editor v14.4.0
- @wordpress/components v28.9.0
- 빌드 시 transforming 단계에서 무한 루프

영향 파일 (18개):
- src/utils/wordpress-block-loader.ts
- src/components/editor/WordPressBlockEditor.tsx
- src/blocks/cpt-acf-loop/*.tsx
- 기타 WordPress 관련 컴포넌트
```

### 3. **React 19 호환성** 🟡
```
상태: react-shim.ts로 임시 해결
영향:
- Radix UI 컴포넌트
- WordPress 패키지
- 일부 레거시 라이브러리
```

## 📦 애플리케이션별 주요 패키지

### 🎨 **admin-dashboard** (React + Vite)
| 패키지 | 버전 | 용도 | 문제점 |
|--------|------|------|--------|
| date-fns | 2.30.0 | 날짜 처리 | - |
| @wordpress/block-editor | 14.4.0 | 블록 에디터 | 빌드 차단 |
| @wordpress/components | 28.9.0 | UI 컴포넌트 | react-day-picker 충돌 |
| @tanstack/react-query | 5.78.2 | 데이터 페칭 | ✅ |
| react-router-dom | 7.6.0 | 라우팅 | ✅ |
| @mui/material | 7.3.1 | UI 컴포넌트 | ✅ |
| @radix-ui/* | 다양 | UI 프리미티브 | ✅ |
| @tiptap/* | 2.22.0 | 텍스트 에디터 | ✅ |
| lucide-react | 0.523.0 | 아이콘 | ✅ |
| react-hook-form | 7.48.2 | 폼 관리 | ✅ |
| zustand | 5.0.5 | 상태 관리 | ✅ |
| socket.io-client | 4.7.4 | 실시간 통신 | ✅ |

### 🌐 **main-site** (Next.js)
| 패키지 | 버전 | 용도 | 상태 |
|--------|------|------|------|
| next | 14.2.24 | 프레임워크 | ✅ |
| @tanstack/react-query | 5.78.2 | 데이터 페칭 | ✅ |
| framer-motion | 11.16.0 | 애니메이션 | ✅ |
| embla-carousel-react | 8.4.1 | 캐러셀 | ✅ |

### 🔌 **api-server** (NestJS)
| 패키지 | 버전 | 용도 | 상태 |
|--------|------|------|------|
| @nestjs/core | 10.4.15 | 코어 프레임워크 | ✅ |
| @nestjs/typeorm | 10.0.2 | ORM 통합 | ✅ |
| typeorm | 0.3.21 | ORM | ✅ |
| pg | 8.14.1 | PostgreSQL 드라이버 | ✅ |
| bcrypt | 6.0.0 | 암호화 | ✅ |
| jsonwebtoken | 9.0.2 | JWT 토큰 | ✅ |
| bull | 4.16.5 | 큐 시스템 | ✅ |
| socket.io | 4.8.3 | WebSocket | ✅ |

## 🔄 공유 패키지 (packages/*)

| 패키지 | 빌드 상태 | 의존 앱 | 설명 |
|--------|-----------|---------|------|
| @o4o/types | ✅ | 모든 앱 | 공통 타입 정의 |
| @o4o/utils | ✅ | 모든 앱 | 유틸리티 함수 |
| @o4o/ui | ✅ | 프론트엔드 앱 | 공통 UI 컴포넌트 |
| @o4o/auth-client | ✅ | 프론트엔드 앱 | 인증 클라이언트 |
| @o4o/auth-context | ✅ | 프론트엔드 앱 | React 인증 컨텍스트 |
| @o4o/shortcodes | ✅ | main-site | 숏코드 처리 |
| @o4o/block-core | ⚠️ | admin-dashboard | WordPress 블록 코어 |

## 🔍 빌드 문제 분석

### **현재 빌드 차단 원인**

1. **WordPress 패키지 문제** (가장 심각)
   - 47개의 WordPress import 존재
   - 순환 의존성 또는 무한 루프 의심
   - vite transforming 단계에서 정지

2. **메모리 문제**
   - NODE_OPTIONS='--max-old-space-size=8192' 설정에도 불구하고 실패
   - Bus error 간헐적 발생

3. **버전 호환성**
   - date-fns v2/v3 마이그레이션 이슈 (해결됨)
   - vite 5/6/7 버전 충돌 (해결됨)

## 💡 권장 해결 방안

### **단기 해결책**
1. ✅ date-fns v2.30.0 유지 (완료)
2. ✅ vite v5.4.19 사용 (완료)
3. 🔄 WordPress 패키지 lazy loading 구현
4. 🔄 WordPress 관련 기능 별도 번들로 분리

### **중장기 해결책**
1. WordPress 패키지를 다른 에디터로 교체 고려
2. 블록 에디터 기능을 별도 앱으로 분리
3. Monorepo 구조 최적화 (turborepo 도입 검토)

## 📈 패키지 업데이트 우선순위

### 🟢 **안전한 업데이트**
- TailwindCSS 4.1.0 → 유지 (이미 최신)
- React Query → 유지 (이미 최신)
- TypeScript → 유지 (5.9.2는 안정적)

### 🟡 **주의 필요**
- React 18.3.1 → React 19 (react-shim 필요)
- Next.js 14.2.24 → 15.x (breaking changes 확인 필요)

### 🔴 **업데이트 보류**
- date-fns 2.30.0 → 3.x (WordPress 호환성 문제)
- @wordpress/* 패키지 (빌드 문제 해결 우선)

## 🛠️ 즉시 실행 가능한 조치

1. **WordPress 패키지 임시 비활성화**
   ```bash
   # WordPress 관련 라우트 주석 처리
   # 빌드 테스트
   # 점진적으로 기능 복구
   ```

2. **빌드 설정 최적화**
   ```typescript
   // vite.config.ts
   build: {
     rollupOptions: {
       external: ['@wordpress/*'], // WordPress를 외부 의존성으로
     }
   }
   ```

3. **별도 번들 생성**
   - WordPress 에디터용 별도 엔트리 포인트
   - Dynamic import로 필요시에만 로드

---

*이 문서는 O4O Platform의 패키지 구조와 의존성을 종합적으로 분석한 결과입니다.*
*빌드 문제 해결을 위한 로드맵으로 활용하시기 바랍니다.*