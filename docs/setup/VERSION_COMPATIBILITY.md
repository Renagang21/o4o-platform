# 🔧 O4O Platform - 버전 호환성 가이드

> **최신 업데이트**: 2025-06-30  
> **플랫폼 버전**: v0.1.0  
> **대상 환경**: WSL Ubuntu + AWS Lightsail

---

## 📋 핵심 의존성 버전

### 🛠️ 런타임 환경
```json
{
  "node": "20.18.0",
  "npm": "10.9.2",
  "typescript": "5.8.3"
}
```

### 🎯 백엔드 (API Server)
```json
{
  "express": "^4.18.2",
  "typeorm": "^0.3.20",
  "pg": "^8.11.3",
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.0",
  "cors": "^2.8.5",
  "helmet": "^6.0.1",
  "socket.io": "^4.6.1"
}
```

### ⚛️ 프론트엔드 (Main Site)
```json
{
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "react-router-dom": "^7.6.0",
  "vite": "^6.3.5",
  "tailwindcss": "^4.1.11",
  "zustand": "^5.0.5",
  "axios": "^1.10.0",
  "@tanstack/react-query": "^5.0.0"
}
```

### 🗄️ 데이터베이스
```
PostgreSQL: 15+
```

### ☁️ 인프라
```
AWS Lightsail (Production)
Local Node.js + PostgreSQL (Development)
```

---

## ⚠️ 중요한 호환성 주의사항

### 1. React 19 호환성
- **React 19.1.0**: 최신 안정 버전 사용
- **React Router 7.6.0**: React 19와 호환되는 최신 버전
- **Vite 6.3.5**: React 19 완전 지원

### 2. Node.js 버전 제약
- **필수**: Node.js 20.x (18.x에서는 패키지 호환성 문제 발생)
- **Volta 설정**: `"node": "20.18.0", "npm": "10.9.2"`
- **Engine 제약**: `"node": ">=20.0.0 <21.0.0"`

### 3. TypeScript 호환성
- **TypeScript 5.8.3**: 최신 안정 버전
- **@types/react 19.1.8**: React 19 타입 정의
- **emitDecoratorMetadata**: TypeORM 사용 시 필수

### 4. TailwindCSS v4
- **TailwindCSS 4.1.11**: 최신 메이저 버전
- **@tailwindcss/postcss 4.1.11**: PostCSS 플러그인
- **autoprefixer 10.4.21**: 브라우저 호환성

---

## 🚨 알려진 문제 및 해결책

### 1. TypeORM Decorator 에러
**문제**: `Column type undefined` 에러
```
ColumnTypeUndefinedError: Column type for User#lastLoginAt is not defined
```

**해결책**: 모든 컬럼에 명시적 타입 지정
```typescript
@Column({ type: 'timestamp', nullable: true })
lastLoginAt?: Date;

@Column({ type: 'varchar', nullable: true })
approvedBy?: string;
```

### 2. Circular Dependency (MediaFile)
**문제**: `Cannot access 'MediaFolder' before initialization`

**해결책**: 엔터티 import 순서 조정 또는 지연 로딩 사용
```typescript
@ManyToOne(() => MediaFolder, { lazy: true })
folder?: Promise<MediaFolder>;
```

### 3. Import Path 문제
**문제**: Vite에서 `@/components/dropshipping/...` import 실패

**해결책**: `@shared` alias 사용
```typescript
// ❌ 틀린 방법
import { DropshippingRouter } from '@/components/dropshipping/DropshippingRouter';

// ✅ 올바른 방법  
import { DropshippingRouter } from '@shared/components/dropshipping/DropshippingRouter';
```

### 4. UI 컴포넌트 Import 문제
**문제**: `@/components/ui/card` 같은 UI 컴포넌트 import 실패

**해결책**: Shared UI 컴포넌트 사용
```typescript
// ❌ 틀린 방법
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ✅ 올바른 방법
import { Card, CardContent, CardHeader, CardTitle } from '@shared/ui/Card';
```

**Main-Site 구조**:
- UI 컴포넌트: `src/components/common/` (Card, Button, Tabs 등)
- Shared UI: `shared/components/ui/` (통합 UI 라이브러리)
- Alias 설정: `@shared/ui` → `shared/components/ui/`

### 5. WSL 포트 바인딩 문제
**해결책**: Vite 설정에서 host 명시
```typescript
// vite.config.ts
server: {
  host: '0.0.0.0',
  port: 3011,
  strictPort: false
}
```

---

## 🔄 업그레이드 경로

### Node.js 18 → 20 업그레이드
```bash
# 1. Node.js 20 설치
nvm install 20.18.0
nvm use 20.18.0

# 2. 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 3. 모든 서비스 의존성 업데이트
npm run install:all
```

### React 18 → 19 업그레이드 (완료됨)
- `react@19.1.0`, `react-dom@19.1.0` 업그레이드 완료
- 타입 정의 업데이트 완료
- Vite 설정 React 19 호환성 확보

---

## 📦 의존성 설치 체크리스트

### 전체 프로젝트 설치
```bash
# 루트에서 모든 서비스 의존성 설치
npm run install:all

# 타입 체크
npm run type-check:all

# 빌드 테스트
npm run build:all
```

### 개별 서비스 확인
```bash
# API 서버
cd services/api-server
npm install
npm run type-check
npm run build

# Main Site
cd services/main-site  
npm install
npm run type-check
npm run build
```

---

## 🎯 테스트 환경 실행

### 개발 서버 시작
```bash
# 웹 서버만 (포트 3011)
VITE_DEV_SERVER_PORT=3011 npm run dev:web

# API 서버 (포트 4000) - 현재 엔터티 문제로 비활성화
# npm run dev:api

# 전체 서비스 (수정 후)
# npm run dev:all
```

### 브라우저 접속
- **메인 사이트**: http://localhost:3011
- **테스트 배너**: 페이지 상단에 빨간 테두리로 표시
- **테스트 계정**: 배너에서 확인 가능

---

## 📚 버전 관리 원칙

### 1. 호환성 우선
- 메이저 버전 업그레이드 시 충분한 테스트
- 개발/프로덕션 환경 버전 일치

### 2. 안정성 중심
- LTS 버전 우선 사용 (Node.js 20 LTS)
- 베타/RC 버전 사용 금지

### 3. 문서화
- 모든 버전 변경사항 기록
- 호환성 문제 및 해결책 문서화

---

**📝 이 문서는 O4O Platform의 의존성 버전 관리를 위한 가이드입니다.**  
**문제 발생 시 이 문서를 먼저 참조하세요.**