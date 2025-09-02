# 📦 O4O Platform 패키지 현황 분석

> **조사 일시**: 2025년 9월 2일  
> **Node.js**: 22.18.0 | **npm**: 10.9.3 | **TypeScript**: 5.9.2

## 📊 문서와 실제 버전 비교

### ✅ 일치하는 핵심 패키지
| 패키지 | 문서 버전 | 실제 버전 | 상태 |
|--------|-----------|-----------|------|
| React | 18.3.1 | 18.3.1 | ✅ 일치 |
| React DOM | 18.3.1 | 18.3.1 | ✅ 일치 |
| TypeScript | ~5.9.2 | ~5.9.2 | ✅ 일치 |
| Vite | 5.4.19 | 5.4.19 (admin), 5.4.0+ (root) | ✅ 안정화됨 |
| TailwindCSS | 4.1.0 | 4.1.0 | ✅ 최신 |
| PostCSS | 8.4.49 | 8.4.49 | ✅ 일치 |

### ⚠️ 버전 차이가 있는 패키지
| 패키지 | 문서 버전 | 실제 버전 | 변경 사항 |
|--------|-----------|-----------|-----------|
| @tanstack/react-query | 5.78.2 | 5.78.2 | ✅ 문서와 일치 (이전 조사와 다름) |
| @tiptap/* | 2.22.0 | 2.22.0 | ✅ 문서와 일치 |
| autoprefixer | 10.4.20 | 10.4.21 | 🆙 미세 업데이트 |
| @vitejs/plugin-react | 4.7.0 | 4.7.0 | ✅ 일치 |
| date-fns | 2.30.0 (문서) | 3.6.0 (main-site) | 🆙 메이저 업데이트 |

### 🔍 WordPress 패키지 상태
| 패키지 | 버전 | 상태 |
|--------|------|------|
| @wordpress/block-editor | 14.4.0 | ✅ 문서와 일치 |
| @wordpress/components | 28.9.0 | ✅ 문서와 일치 |
| @wordpress/blocks | 13.9.0 | ✅ 문서와 일치 |
| @wordpress/element | 6.9.0 | ✅ 문서와 일치 |
| @wordpress/i18n | 5.9.0 | ✅ 문서와 일치 |

## 🚨 중요 발견 사항

### 1. **NestJS 없음** ❌
- API 서버에 NestJS 패키지가 **전혀 설치되지 않음**
- `@nestjs/core`, `@nestjs/common` 등 핵심 패키지 부재
- `@nestjs/cli`만 devDependencies에 11.0.10 버전으로 존재
- **Express 기반**으로 구성됨 (express 4.18.2)

### 2. **Next.js 없음** ❌
- main-site가 **Next.js가 아닌 Vite + React**로 구성
- 문서에는 Next.js 14.2.24로 표기되어 있으나 실제로는 Vite 사용

### 3. **Redis 미설치** ⚠️
- Redis 서버가 설치되지 않음
- API 서버는 Redis 의존성이 있으나 연결 실패 상태

### 4. **빌드 문제 해결됨** ✅
- Vite 버전 고정으로 빌드 안정화
- WordPress 패키지 빌드 성공
- 타임아웃 문제 해결

## 📁 실제 프로젝트 구조

```
o4o-platform/
├── apps/
│   ├── admin-dashboard/    # React + Vite (포트 5173)
│   ├── api-server/         # Express (NestJS 아님) (포트 3001)
│   └── main-site/          # React + Vite (Next.js 아님) (포트 5174)
└── packages/
    ├── types/              # ✅ 빌드 성공
    ├── utils/              # ✅ 빌드 성공
    ├── ui/                 # ✅ 빌드 성공
    ├── auth-client/        # ✅ 빌드 성공
    ├── auth-context/       # ✅ 빌드 성공
    └── shortcodes/         # ✅ 빌드 성공
```

## 🔧 API Server 실제 스택

### Express 기반 (NestJS 아님)
```json
{
  "express": "4.18.2",
  "typeorm": "0.3.20",
  "pg": "8.11.3",
  "bcrypt": "6.0.0",
  "jsonwebtoken": "9.0.0",
  "socket.io": "4.6.1",
  "ioredis": "5.6.1",
  "helmet": "6.0.1",
  "cors": "2.8.5"
}
```

## 💡 권장 조치사항

### 즉시 필요
1. **API 서버 아키텍처 결정**
   - 현재 Express 유지 또는 NestJS 마이그레이션
   - 문서 업데이트 필요

2. **Redis 설치** (선택사항)
   ```bash
   # Docker로 Redis 실행
   docker run -d -p 6379:6379 redis:alpine
   ```

3. **문서 정정**
   - main-site: Next.js → Vite + React
   - api-server: NestJS → Express

### 중장기
1. **NestJS 마이그레이션** (필요시)
   - 현재 Express 코드를 NestJS로 전환
   - 또는 Express 기반 유지 결정

2. **Next.js 도입** (필요시)
   - main-site를 Next.js로 전환
   - 또는 현재 Vite 기반 유지

## 📈 버전 업데이트 상태

### 안정적인 패키지
- ✅ React 18.3.1 (19 아님)
- ✅ Vite 5.4.19
- ✅ TypeScript 5.9.2
- ✅ TailwindCSS 4.1.0
- ✅ WordPress 패키지들

### 주의 필요
- ⚠️ date-fns 3.6.0 (main-site만, 호환성 확인 필요)
- ⚠️ Redis 연결 (미설치 상태)

## 🎯 결론

1. **문서와 실제 구조가 크게 다름**
   - NestJS → Express
   - Next.js → Vite + React

2. **빌드는 안정화됨**
   - 주요 빌드 문제 해결
   - 패키지 버전 정리됨

3. **아키텍처 재정의 필요**
   - 현재 구조를 유지할지
   - 문서대로 마이그레이션할지 결정 필요

---

*이 문서는 실제 코드베이스를 기준으로 작성되었습니다.*
*문서의 패키지 일람표와 차이가 있으니 주의하시기 바랍니다.*