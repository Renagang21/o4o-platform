# O4O Platform Services Status & Guide

**마지막 업데이트**: 2025-07-02  
**분석 기준**: 실제 코드 및 package.json 검사 결과  

---

## 🎯 서비스 상태 개요

| 서비스 | 상태 | React 버전 | 포트 | 배포 상태 | 우선순위 |
|--------|------|------------|------|-----------|----------|
| **api-server** | 🟢 활성 | - | 4000 | ✅ 프로덕션 | 높음 |
| **main-site** | 🟢 활성 | 19.1.0 | 3000 | ✅ 프로덕션 | 높음 |
| **admin-dashboard** | 🟢 활성 | 18.3.1 | - | 🔄 개발중 | 높음 |
| **shared** | 🟢 활성 | - | - | ✅ 라이브러리 | 높음 |
| **crowdfunding** | 🟡 부분 | 18.2.0 | - | ❌ 개발중 | 중간 |
| **image-service** | 🟡 독립 | - | - | ❌ 개발중 | 중간 |
| **ecommerce** | 🔴 레거시 | 19.1.0 | - | ❌ 미사용 | 낮음 |
| **forum** | ⚪ 계획 | - | - | ❌ 계획중 | 낮음 |
| **signage** | ⚪ 계획 | - | - | ❌ 계획중 | 낮음 |

---

## 🟢 활성 서비스 (Production Ready)

### **1. API Server** (`services/api-server/`)

#### **📊 상태 정보**
- **상태**: 🟢 완전 활성
- **기술스택**: Node.js 20 + Express.js + TypeORM + PostgreSQL
- **포트**: 4000
- **배포**: AWS Lightsail 프로덕션 환경

#### **📦 의존성 정보**
```json
{
  "주요 의존성": {
    "express": "^4.x",
    "typeorm": "^0.3.x",
    "pg": "^8.11.3",
    "jsonwebtoken": "^9.x",
    "bcryptjs": "^2.x"
  }
}
```

#### **🚀 개발 명령어**
```bash
cd services/api-server

# 개발 서버 시작
npm run dev              # nodemon + ts-node

# 빌드 및 실행
npm run build           # TypeScript 컴파일
npm run start           # 프로덕션 실행

# 데이터베이스
npm run migration:generate
npm run migration:run
npm run migration:revert

# 테스트 및 품질
npm run test            # Jest 테스트
npm run type-check      # TypeScript 체크
npm run lint            # ESLint 검사
```

#### **🗂️ 디렉토리 구조**
```
api-server/
├── src/
│   ├── controllers/     # API 컨트롤러 (12개)
│   ├── entities/        # TypeORM 엔티티 (20+개)
│   ├── middleware/      # Express 미들웨어
│   ├── routes/          # API 라우트 정의
│   ├── database/        # DB 연결 및 설정
│   └── main.ts          # 애플리케이션 진입점
├── dist/                # 컴파일된 JavaScript
└── package.json
```

#### **🔗 주요 API 엔드포인트**
- `/api/auth/*` - 인증 관련 (로그인, 회원가입)
- `/api/ecommerce/products/*` - 상품 관리
- `/api/ecommerce/cart/*` - 장바구니 관리
- `/api/ecommerce/orders/*` - 주문 처리
- `/api/admin/*` - 관리자 기능

---

### **2. Main Site** (`services/main-site/`)

#### **📊 상태 정보**
- **상태**: 🟢 완전 활성
- **기술스택**: React 19 + Vite + TailwindCSS
- **포트**: 3000
- **배포**: AWS Lightsail (neture.co.kr)

#### **📦 의존성 정보**
```json
{
  "주요 의존성": {
    "react": "^19.1.0",
    "vite": "^6.3.5",
    "react-router": "^7.6.0",
    "tailwindcss": "^4.1.11",
    "axios": "^1.10.0",
    "@o4o/shared": "file:../../shared"
  }
}
```

#### **🚀 개발 명령어**
```bash
cd services/main-site

# 개발 서버 시작
npm run dev             # Vite dev server (port 3000)

# 빌드
npm run build           # 프로덕션 빌드
npm run build:clean     # 클린 빌드
npm run preview         # 빌드 결과 미리보기

# 테스트 및 품질
npm run test            # Vitest
npm run type-check      # TypeScript 체크
npm run lint            # ESLint 검사
```

#### **🗂️ 디렉토리 구조**
```
main-site/
├── src/
│   ├── components/      # React 컴포넌트
│   ├── pages/           # 페이지 컴포넌트
│   ├── api/             # API 클라이언트
│   ├── hooks/           # 커스텀 Hooks
│   ├── store/           # 상태 관리 (Zustand)
│   ├── styles/          # 스타일 파일
│   └── App.tsx          # 메인 앱 컴포넌트
├── public/              # 정적 자원
├── dist/                # 빌드 결과
└── package.json
```

#### **🔧 설정 파일**
- `vite.config.ts` - Vite 설정 (별칭 경로 포함)
- `tailwind.config.js` - TailwindCSS 설정
- `.env` - 환경 변수 설정

---

### **3. Admin Dashboard** (`services/admin-dashboard/`)

#### **📊 상태 정보**
- **상태**: 🟢 활성 (React 18 → 19 마이그레이션 필요)
- **기술스택**: React 18 + Vite + TailwindCSS
- **포트**: 별도 포트 (개발중)
- **배포**: 로컬 개발 단계

#### **⚠️ 주요 이슈**
- **React 버전 불일치**: 18.3.1 → 19.1.0 업그레이드 필요
- **Axios 버전 불일치**: ^1.6.2 → ^1.10.0 업그레이드 필요

#### **🚀 개발 명령어**
```bash
cd services/admin-dashboard

# 개발 서버 시작
npm run dev             # Vite dev server

# 빌드
npm run build           # 프로덕션 빌드

# 품질 검사
npm run type-check      # TypeScript 체크
npm run lint            # ESLint 검사
```

---

### **4. Shared Library** (`shared/`)

#### **📊 상태 정보**
- **상태**: 🟢 완전 활성
- **패키지명**: `@o4o/shared`
- **용도**: 공통 컴포넌트 및 유틸리티 라이브러리

#### **📦 주요 구성요소**
```
shared/
├── components/
│   ├── admin/           # 관리자 컴포넌트
│   ├── dropshipping/    # 드롭쉬핑 비즈니스 로직
│   ├── editor/          # TipTap 에디터 시스템
│   ├── healthcare/      # 헬스케어 컴포넌트
│   ├── theme/           # 테마 시스템 (다크모드)
│   └── ui/              # 기본 UI 컴포넌트
├── lib/                 # 유틸리티 라이브러리
├── hooks/               # 공통 React Hooks
├── types/               # TypeScript 타입 정의
└── utils/               # 헬퍼 함수들
```

#### **🔗 Import 사용법**
```typescript
// 올바른 import 패턴
import { HealthcareMainPage } from '@shared/components/healthcare';
import { TiptapEditor } from '@shared/components/editor/TiptapEditor';
import { MultiThemeProvider } from '@shared/components/theme/MultiThemeContext';
import { Button, Modal } from '@shared/components/ui';
```

---

## 🟡 개발 중 서비스

### **5. Crowdfunding** (`services/crowdfunding/`)

#### **📊 상태 정보**
- **상태**: 🟡 프론트엔드만 구현
- **기술스택**: React 18 + Vite
- **이슈**: 백엔드 API 연동 필요, React 버전 업그레이드 필요

#### **🔧 필요 작업**
1. **React 18 → 19 마이그레이션**
2. **백엔드 API 엔드포인트 개발**
3. **데이터베이스 스키마 설계**
4. **결제 시스템 통합**

#### **🚀 개발 명령어**
```bash
cd services/crowdfunding/web

npm run dev             # 개발 서버
npm run build           # 빌드
```

---

### **6. Image Service** (`src/`)

#### **📊 상태 정보**
- **상태**: 🟡 독립적 서비스
- **기술스택**: Node.js + Sharp + WebP
- **용도**: 이미지 최적화, 압축, 포맷 변환

#### **🔧 권장 작업**
1. **`services/image-service/`로 이동**
2. **package.json 추가하여 워크스페이스 통합**
3. **API 서버와 연동**

#### **🗂️ 현재 구조**
```
src/
├── components/          # 이미지 관련 React 컴포넌트
├── hooks/               # 이미지 최적화 Hooks
├── pages/               # 이미지 테스트 페이지
├── server/              # 이미지 처리 서버
└── utils/               # 이미지 유틸리티
```

---

## 🔴 레거시 서비스

### **7. E-commerce** (`services/ecommerce/`)

#### **📊 상태 정보**
- **상태**: 🔴 레거시 (main-site로 통합됨)
- **기술스택**: React 19 + Express (분리된 구조)
- **권장**: 완전한 검토 후 제거 고려

#### **🗂️ 구조 분석**
```
ecommerce/
├── admin/               # 관리자 인터페이스 (별도)
├── web/                 # 고객 인터페이스
└── shared/              # 공통 로직
```

#### **🔧 처리 방안**
1. **기능 검토**: main-site와 중복 기능 확인
2. **데이터 마이그레이션**: 필요시 데이터 이전
3. **점진적 제거**: 안전한 제거 계획 수립

---

## ⚪ 계획 중 서비스

### **8. Forum** (`services/forum/`)

#### **📊 상태 정보**
- **상태**: ⚪ 계획 단계 (README만 존재)
- **예정 기능**: 커뮤니티 포럼, 댓글 시스템, 사용자 포인트

#### **📋 계획된 기능**
- 게시판 시스템
- 댓글 및 대댓글
- 사용자 포인트/레벨 시스템
- 검색 및 필터링
- 모더레이션 도구

---

### **9. Digital Signage** (`services/signage/`)

#### **📊 상태 정보**
- **상태**: ⚪ 계획 단계 (README만 존재)
- **예정 기능**: 디지털 사이니지 콘텐츠 관리, 스케줄링

#### **📋 계획된 기능**
- 콘텐츠 관리 시스템
- 다중 디스플레이 지원
- 스케줄링 기능
- 실시간 콘텐츠 업데이트
- 템플릿 관리

---

## 🔧 권장 작업 우선순위

### **🔥 즉시 해결 (1주 내)**
1. **admin-dashboard React 19 마이그레이션**
2. **crowdfunding React 18 → 19 업그레이드**
3. **Axios 버전 통일 (^1.10.0)**
4. **TypeScript strict 모드 활성화**

### **⚡ 단기 작업 (1개월 내)**
1. **src/ → services/image-service/ 이동**
2. **ecommerce 서비스 레거시 검토**
3. **admin-dashboard 배포 설정**
4. **의존성 버전 표준화**

### **🎯 중기 작업 (3개월 내)**
1. **forum 서비스 개발 시작**
2. **signage 서비스 개발 시작**
3. **crowdfunding 백엔드 API 개발**
4. **성능 최적화 및 모니터링**

---

## 📋 서비스별 체크리스트

### **개발 시작 전 확인사항**
- [ ] `package.json` 의존성 버전 확인
- [ ] React 버전 통일성 확인
- [ ] TypeScript 설정 점검
- [ ] 빌드 성공 여부 확인
- [ ] API 서버 연결 상태 확인

### **배포 전 확인사항**
- [ ] 프로덕션 빌드 성공
- [ ] 환경 변수 설정 완료
- [ ] API 엔드포인트 정상 작동
- [ ] 보안 설정 점검
- [ ] 성능 테스트 완료

### **유지보수 체크리스트**
- [ ] 정기 의존성 업데이트
- [ ] 보안 패치 적용
- [ ] 로그 모니터링
- [ ] 백업 상태 확인
- [ ] 성능 지표 추적

---

## 📞 서비스별 담당자 및 연락처

| 서비스 | 주 담당자 | 보조 담당자 | 상태 |
|--------|-----------|-------------|------|
| api-server | 개발팀 | 시스템팀 | 운영중 |
| main-site | 프론트팀 | 개발팀 | 운영중 |
| admin-dashboard | 프론트팀 | 개발팀 | 개발중 |
| shared | 전체팀 | 개발팀 | 운영중 |

---

**이 문서는 O4O Platform의 모든 서비스 상태를 실시간으로 반영합니다. 서비스 상태 변경 시 반드시 이 문서를 업데이트해주세요.**

*최종 업데이트: 2025-07-02*